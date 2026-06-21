import type { WordStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { displayWord } from "./moderation";
import {
  normalizeWord,
  validateWordInput,
  WordValidationError,
  MIN_SEGMENT_SAMPLE,
} from "./words";
import { parseSegmentFilter, userWhereFromSegment, type SegmentFilter } from "./word-service-utils";

export { WordValidationError };
export type { SegmentFilter };

export async function findOrCreateWord(text: string, userId?: string) {
  const validated = validateWordInput(text);
  const normalizedText = normalizeWord(validated);

  const existing = await prisma.word.findUnique({ where: { normalizedText } });
  if (existing) return existing;

  return prisma.word.create({
    data: {
      text: validated,
      normalizedText,
      createdById: userId,
    },
  });
}

export async function createWordWithConnections(
  centerText: string,
  connectionTexts: string[],
  userId: string,
) {
  if (connectionTexts.length === 0) {
    throw new WordValidationError("연결 단어를 1개 이상 입력해 주세요.");
  }
  if (connectionTexts.length > 5) {
    throw new WordValidationError("연결 단어는 최대 5개까지 등록할 수 있습니다.");
  }

  const center = await findOrCreateWord(centerText, userId);

  for (const targetText of connectionTexts) {
    const target = await findOrCreateWord(targetText, userId);
    if (center.id === target.id) continue;

    await prisma.wordConnection.upsert({
      where: {
        sourceWordId_targetWordId_userId: {
          sourceWordId: center.id,
          targetWordId: target.id,
          userId,
        },
      },
      create: {
        sourceWordId: center.id,
        targetWordId: target.id,
        userId,
      },
      update: {},
    });
  }

  return center;
}

export async function getTrendingWords(limit = 20, filter: SegmentFilter = {}) {
  const hasSegment = filter.gender || filter.ageGroup;

  if (!hasSegment) {
    const words = await prisma.word.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ empathyCount: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return {
      items: words.map((w, i) => ({
        id: w.id,
        text: displayWord(w.text, w.status),
        empathyCount: w.empathyCount,
        score: w.empathyCount,
        rank: i + 1,
        status: w.status,
      })),
      sampleSufficient: true,
    };
  }

  const grouped = await prisma.empathy.groupBy({
    by: ["targetId"],
    where: {
      targetType: "WORD",
      user: userWhereFromSegment(filter),
    },
    _sum: { score: true },
    orderBy: { _sum: { score: "desc" } },
    take: limit * 3,
  });

  const totalSample = grouped.reduce((sum, g) => sum + (g._sum.score ?? 0), 0);
  const wordIds = grouped.map((g) => g.targetId);
  const words = await prisma.word.findMany({
    where: { id: { in: wordIds }, status: "ACTIVE" },
  });
  const wordMap = new Map(words.map((w) => [w.id, w]));
  const scoreMap = new Map(grouped.map((g) => [g.targetId, g._sum.score ?? 0]));

  const items = wordIds
    .map((id) => {
      const word = wordMap.get(id);
      if (!word) return null;
      return {
        id: word.id,
        text: displayWord(word.text, word.status),
        empathyCount: scoreMap.get(id) ?? 0,
        score: scoreMap.get(id) ?? 0,
        status: word.status,
      };
    })
    .filter(Boolean)
    .slice(0, limit)
    .map((item, i) => ({ ...item!, rank: i + 1 }));

  return {
    items,
    sampleSufficient: totalSample >= MIN_SEGMENT_SAMPLE,
  };
}

export async function searchWords(query: string, limit = 20) {
  const normalized = normalizeWord(query.trim());
  if (normalized.length < 1) return [];

  const words = await prisma.word.findMany({
    where: {
      status: "ACTIVE",
      normalizedText: { contains: normalized },
    },
    orderBy: { empathyCount: "desc" },
    take: limit,
  });

  return words.map((w) => ({
    id: w.id,
    text: w.text,
    empathyCount: w.empathyCount,
    score: w.empathyCount,
  }));
}

export async function getWordDetail(
  wordId: string,
  userId?: string,
  _filter: SegmentFilter = {},
) {
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) return null;

  async function getUserScoreData(connectionIds: string[]) {
    let userConnectionScores = new Map<string, number>();
    if (userId) {
      const empathies = await prisma.empathy.findMany({
        where: {
          userId,
          targetType: "CONNECTION",
          targetId: { in: connectionIds },
        },
      });
      userConnectionScores = new Map(empathies.map((e) => [e.targetId, e.score]));
    }

    const wordEmpathy = userId
      ? await prisma.empathy.findUnique({
          where: {
            userId_targetType_targetId: {
              userId,
              targetType: "WORD",
              targetId: wordId,
            },
          },
        })
      : null;

    return { userConnectionScores, userWordScore: wordEmpathy?.score ?? 0 };
  }

  const wordPayload = {
    id: word.id,
    text: displayWord(word.text, word.status),
    empathyCount: word.empathyCount,
    score: word.empathyCount,
    status: word.status as WordStatus,
    canReport: word.status === "ACTIVE",
  };

  const [outgoing, incoming] = await Promise.all([
    prisma.wordConnection.findMany({
      where: { sourceWordId: wordId },
      include: { targetWord: true },
      orderBy: { empathyCount: "desc" },
      take: 60,
    }),
    prisma.wordConnection.findMany({
      where: { targetWordId: wordId },
      include: { sourceWord: true },
      orderBy: { empathyCount: "desc" },
      take: 60,
    }),
  ]);

  type LinkedRow = {
    id: string;
    word: (typeof outgoing)[0]["targetWord"];
    empathyCount: number;
    linkSourceId: string;
    linkTargetId: string;
  };

  const byWordId = new Map<string, LinkedRow>();

  for (const c of outgoing) {
    const existing = byWordId.get(c.targetWord.id);
    if (existing && existing.empathyCount >= c.empathyCount) continue;
    byWordId.set(c.targetWord.id, {
      id: c.id,
      word: c.targetWord,
      empathyCount: c.empathyCount,
      linkSourceId: wordId,
      linkTargetId: c.targetWord.id,
    });
  }

  for (const c of incoming) {
    const existing = byWordId.get(c.sourceWord.id);
    if (existing && existing.empathyCount >= c.empathyCount) continue;
    byWordId.set(c.sourceWord.id, {
      id: c.id,
      word: c.sourceWord,
      empathyCount: c.empathyCount,
      linkSourceId: c.sourceWord.id,
      linkTargetId: wordId,
    });
  }

  const connections = [...byWordId.values()].sort((a, b) => b.empathyCount - a.empathyCount).slice(0, 80);
  const { userConnectionScores, userWordScore } = await getUserScoreData(connections.map((c) => c.id));

  return {
    word: wordPayload,
    direction: "both" as const,
    connections: connections.map((c) => ({
      id: c.id,
      word: {
        id: c.word.id,
        text: displayWord(c.word.text, c.word.status),
        empathyCount: c.word.empathyCount,
        score: c.word.empathyCount,
      },
      empathyCount: c.empathyCount,
      score: c.empathyCount,
      userScore: userConnectionScores.get(c.id) ?? 0,
      linkSourceId: c.linkSourceId,
      linkTargetId: c.linkTargetId,
    })),
    userWordScore,
    sampleSufficient: true,
  };
}

export { parseSegmentFilter };

export type MindMapNode = {
  id: string;
  text: string;
  empathyCount: number;
  group: "center" | "linked" | "trending";
  depth?: number;
};

export type MindMapLink = {
  source: string;
  target: string;
  empathyCount: number;
  connectionId?: string;
};

export type MindMapGraph = {
  nodes: MindMapNode[];
  links: MindMapLink[];
  centerId?: string;
};

type WordDetailConnection = {
  id: string;
  word: { id: string; text: string; empathyCount: number };
  empathyCount: number;
  linkSourceId?: string;
  linkTargetId?: string;
};

export function buildMindMapFromWordDetail(
  word: { id: string; text: string; empathyCount: number },
  connections: WordDetailConnection[],
): MindMapGraph {
  const nodes: MindMapNode[] = [
    {
      id: word.id,
      text: word.text,
      empathyCount: word.empathyCount,
      group: "center",
    },
    ...connections.map((c) => ({
      id: c.word.id,
      text: c.word.text,
      empathyCount: c.word.empathyCount,
      group: "linked" as const,
      depth: 1,
    })),
  ];

  const links: MindMapLink[] = connections.map((c) => ({
    source: c.linkSourceId ?? word.id,
    target: c.linkTargetId ?? c.word.id,
    empathyCount: c.empathyCount,
    connectionId: c.id,
  }));

  return { nodes, links, centerId: word.id };
}

export async function getWordMindMap(wordId: string): Promise<MindMapGraph | null> {
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) return null;

  const MAX_DEPTH = 4;
  const MAX_NODES = 200;
  const MAX_LINKS = 500;

  const nodeMap = new Map<string, MindMapNode>();
  const links: MindMapLink[] = [];
  const linkKeys = new Set<string>();

  nodeMap.set(word.id, {
    id: word.id,
    text: displayWord(word.text, word.status),
    empathyCount: word.empathyCount,
    group: "center",
    depth: 0,
  });

  let frontier = [wordId];
  const visited = new Set<string>([wordId]);

  for (let depth = 0; depth < MAX_DEPTH && frontier.length > 0 && nodeMap.size < MAX_NODES; depth++) {
    const [outgoing, incoming] = await Promise.all([
      prisma.wordConnection.findMany({
        where: { sourceWordId: { in: frontier } },
        include: { targetWord: true },
        orderBy: { empathyCount: "desc" },
      }),
      prisma.wordConnection.findMany({
        where: { targetWordId: { in: frontier } },
        include: { sourceWord: true },
        orderBy: { empathyCount: "desc" },
      }),
    ]);

    const nextFrontier: string[] = [];

    const addNeighbor = (linked: (typeof outgoing)[0]["targetWord"], neighborId: string) => {
      if (visited.has(neighborId) || nodeMap.size >= MAX_NODES) return;
      visited.add(neighborId);
      nodeMap.set(neighborId, {
        id: linked.id,
        text: displayWord(linked.text, linked.status),
        empathyCount: linked.empathyCount,
        group: "linked",
        depth: depth + 1,
      });
      nextFrontier.push(neighborId);
    };

    for (const c of outgoing) {
      const key = [c.sourceWordId, c.targetWordId].sort().join("-");
      if (!linkKeys.has(key) && links.length < MAX_LINKS) {
        linkKeys.add(key);
        links.push({
          source: c.sourceWordId,
          target: c.targetWordId,
          empathyCount: c.empathyCount,
          connectionId: c.id,
        });
      }
      addNeighbor(c.targetWord, c.targetWordId);
    }

    for (const c of incoming) {
      const key = [c.sourceWordId, c.targetWordId].sort().join("-");
      if (!linkKeys.has(key) && links.length < MAX_LINKS) {
        linkKeys.add(key);
        links.push({
          source: c.sourceWordId,
          target: c.targetWordId,
          empathyCount: c.empathyCount,
          connectionId: c.id,
        });
      }
      addNeighbor(c.sourceWord, c.sourceWordId);
    }

    frontier = nextFrontier;
  }

  return {
    nodes: [...nodeMap.values()],
    links,
    centerId: word.id,
  };
}

export async function getTrendingMindMap(limit = 10): Promise<MindMapGraph> {
  const trending = await getTrendingWords(limit);
  const nodeMap = new Map<string, MindMapNode>();
  const links: MindMapLink[] = [];
  const linkKeys = new Set<string>();

  for (const [index, item] of trending.items.entries()) {
    nodeMap.set(item.id, {
      id: item.id,
      text: item.text,
      empathyCount: item.empathyCount,
      group: index === 0 ? "center" : "trending",
    });

    const [outgoing, incoming] = await Promise.all([
      prisma.wordConnection.findMany({
        where: { sourceWordId: item.id },
        include: { targetWord: true },
        orderBy: { empathyCount: "desc" },
        take: 6,
      }),
      prisma.wordConnection.findMany({
        where: { targetWordId: item.id },
        include: { sourceWord: true },
        orderBy: { empathyCount: "desc" },
        take: 6,
      }),
    ]);

    for (const c of outgoing) {
      nodeMap.set(c.targetWord.id, {
        id: c.targetWord.id,
        text: displayWord(c.targetWord.text, c.targetWord.status),
        empathyCount: c.targetWord.empathyCount,
        group: "linked",
      });

      const key = [c.sourceWordId, c.targetWordId].sort().join("-");
      if (linkKeys.has(key)) continue;
      linkKeys.add(key);

      links.push({
        source: c.sourceWordId,
        target: c.targetWordId,
        empathyCount: c.empathyCount,
        connectionId: c.id,
      });
    }

    for (const c of incoming) {
      nodeMap.set(c.sourceWord.id, {
        id: c.sourceWord.id,
        text: displayWord(c.sourceWord.text, c.sourceWord.status),
        empathyCount: c.sourceWord.empathyCount,
        group: "linked",
      });

      const key = [c.sourceWordId, c.targetWordId].sort().join("-");
      if (linkKeys.has(key)) continue;
      linkKeys.add(key);

      links.push({
        source: c.sourceWordId,
        target: c.targetWordId,
        empathyCount: c.empathyCount,
        connectionId: c.id,
      });
    }
  }

  return {
    nodes: [...nodeMap.values()],
    links,
    centerId: trending.items[0]?.id,
  };
}

