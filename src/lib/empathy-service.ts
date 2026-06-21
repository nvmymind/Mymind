import { prisma } from "./prisma";
import { REPORT_THRESHOLD } from "./moderation";
import { notifyTrendingUpdate } from "./trending-events";
import { userWhereFromSegment, type SegmentFilter } from "./word-service-utils";

const MIN_SCORE = -10;
const MAX_SCORE = 10;

export function clampUserScore(score: number) {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));
}

export async function setScore(
  userId: string,
  targetType: "WORD" | "CONNECTION",
  targetId: string,
  rawScore: number,
) {
  const score = clampUserScore(rawScore);

  const existing = await prisma.empathy.findUnique({
    where: {
      userId_targetType_targetId: { userId, targetType, targetId },
    },
  });

  const oldScore = existing?.score ?? 0;
  const delta = score - oldScore;

  if (delta === 0) {
    return { userScore: score, totalScore: await readTotalScore(targetType, targetId) };
  }

  await prisma.$transaction(async (tx) => {
    if (score === 0 && existing) {
      await tx.empathy.delete({ where: { id: existing.id } });
    } else if (existing) {
      await tx.empathy.update({ where: { id: existing.id }, data: { score } });
    } else if (score !== 0) {
      await tx.empathy.create({
        data: { userId, targetType, targetId, score },
      });
    }

    if (delta !== 0) {
      if (targetType === "WORD") {
        await tx.word.update({
          where: { id: targetId },
          data: { empathyCount: { increment: delta } },
        });
      } else {
        await tx.wordConnection.update({
          where: { id: targetId },
          data: { empathyCount: { increment: delta } },
        });
      }
    }
  });

  notifyTrendingUpdate("empathy");
  return { userScore: score, totalScore: await readTotalScore(targetType, targetId) };
}

async function readTotalScore(targetType: "WORD" | "CONNECTION", targetId: string) {
  if (targetType === "WORD") {
    const w = await prisma.word.findUnique({ where: { id: targetId } });
    return w?.empathyCount ?? 0;
  }
  const c = await prisma.wordConnection.findUnique({ where: { id: targetId } });
  return c?.empathyCount ?? 0;
}

export async function createReport(
  userId: string,
  wordId: string,
  reason: "PROFANITY" | "HATE" | "SPAM" | "OTHER",
) {
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) throw new Error("NOT_FOUND");

  await prisma.report.create({
    data: { userId, wordId, reason },
  });

  const updated = await prisma.word.update({
    where: { id: wordId },
    data: { reportCount: { increment: 1 } },
  });

  if (updated.reportCount >= REPORT_THRESHOLD && updated.status === "ACTIVE") {
    await prisma.word.update({
      where: { id: wordId },
      data: { status: "HIDDEN" },
    });
  }

  notifyTrendingUpdate("report");
  return { reportCount: updated.reportCount + 1 };
}

export async function sumSegmentScores(
  targetType: "WORD" | "CONNECTION",
  targetIds: string[],
  filter: SegmentFilter,
): Promise<Map<string, number>> {
  if (targetIds.length === 0) return new Map();

  const grouped = await prisma.empathy.groupBy({
    by: ["targetId"],
    where: {
      targetType,
      targetId: { in: targetIds },
      user: userWhereFromSegment(filter),
    },
    _sum: { score: true },
  });

  return new Map(grouped.map((g) => [g.targetId, g._sum.score ?? 0]));
}
