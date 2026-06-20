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
    _count: { _all: true },
    orderBy: { _count: { targetId: "desc" } },
    take: limit * 3,
  });

  const totalSample = grouped.reduce((sum, g) => sum + g._count._all, 0);
  const wordIds = grouped.map((g) => g.targetId);
  const words = await prisma.word.findMany({
    where: { id: { in: wordIds }, status: "ACTIVE" },
  });
  const wordMap = new Map(words.map((w) => [w.id, w]));
  const countMap = new Map(grouped.map((g) => [g.targetId, g._count._all]));

  const items = wordIds
    .map((id) => {
      const word = wordMap.get(id);
      if (!word) return null;
      return {
        id: word.id,
        text: displayWord(word.text, word.status),
        empathyCount: countMap.get(id) ?? 0,
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
  }));
}

export async function getWordDetail(
  wordId: string,
  direction: "out" | "in" = "out",
  userId?: string,
  _filter: SegmentFilter = {},
) {
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) return null;

  async function getUserEmpathySets(ids: string[]) {
    let userConnectionEmpathies = new Set<string>();
    if (userId) {
      const empathies = await prisma.empathy.findMany({
        where: {
          userId,
          targetType: "CONNECTION",
          targetId: { in: ids },
        },
      });
      userConnectionEmpathies = new Set(empathies.map((e) => e.targetId));
    }

    const wordEmpathized = userId
      ? !!(await prisma.empathy.findUnique({
          where: {
            userId_targetType_targetId: {
              userId,
              targetType: "WORD",
              targetId: wordId,
            },
          },
        }))
      : false;

    return { userConnectionEmpathies, wordEmpathized };
  }

  const wordPayload = {
    id: word.id,
    text: displayWord(word.text, word.status),
    empathyCount: word.empathyCount,
    status: word.status as WordStatus,
    canReport: word.status === "ACTIVE",
  };

  if (direction === "out") {
    const connections = await prisma.wordConnection.findMany({
      where: { sourceWordId: wordId },
      include: { targetWord: true },
      orderBy: { empathyCount: "desc" },
      take: 50,
    });
    const { userConnectionEmpathies, wordEmpathized } = await getUserEmpathySets(
      connections.map((c) => c.id),
    );

    return {
      word: wordPayload,
      direction,
      connections: connections.map((c) => ({
        id: c.id,
        word: {
          id: c.targetWord.id,
          text: displayWord(c.targetWord.text, c.targetWord.status),
          empathyCount: c.targetWord.empathyCount,
        },
        empathyCount: c.empathyCount,
        userEmpathized: userConnectionEmpathies.has(c.id),
      })),
      userWordEmpathized: wordEmpathized,
      sampleSufficient: true,
    };
  }

  const connections = await prisma.wordConnection.findMany({
    where: { targetWordId: wordId },
    include: { sourceWord: true },
    orderBy: { empathyCount: "desc" },
    take: 50,
  });
  const { userConnectionEmpathies, wordEmpathized } = await getUserEmpathySets(
    connections.map((c) => c.id),
  );

  return {
    word: wordPayload,
    direction,
    connections: connections.map((c) => ({
      id: c.id,
      word: {
        id: c.sourceWord.id,
        text: displayWord(c.sourceWord.text, c.sourceWord.status),
        empathyCount: c.sourceWord.empathyCount,
      },
      empathyCount: c.empathyCount,
      userEmpathized: userConnectionEmpathies.has(c.id),
    })),
    userWordEmpathized: wordEmpathized,
    sampleSufficient: true,
  };
}

export { parseSegmentFilter };
