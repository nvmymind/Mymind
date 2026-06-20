import type { Gender } from "@prisma/client";
import { prisma } from "./prisma";
import { REPORT_THRESHOLD } from "./moderation";
import { notifyTrendingUpdate } from "./trending-events";
import { userWhereFromSegment, type SegmentFilter } from "./word-service-utils";

export async function toggleEmpathy(
  userId: string,
  targetType: "WORD" | "CONNECTION",
  targetId: string,
) {
  const existing = await prisma.empathy.findUnique({
    where: {
      userId_targetType_targetId: { userId, targetType, targetId },
    },
  });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.empathy.delete({ where: { id: existing.id } });

      if (targetType === "WORD") {
        await tx.word.update({
          where: { id: targetId },
          data: { empathyCount: { decrement: 1 } },
        });
      } else {
        await tx.wordConnection.update({
          where: { id: targetId },
          data: { empathyCount: { decrement: 1 } },
        });
      }
    });

    notifyTrendingUpdate("empathy");
    return { empathized: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.empathy.create({
      data: { userId, targetType, targetId },
    });

    if (targetType === "WORD") {
      await tx.word.update({
        where: { id: targetId },
        data: { empathyCount: { increment: 1 } },
      });
    } else {
      await tx.wordConnection.update({
        where: { id: targetId },
        data: { empathyCount: { increment: 1 } },
      });
    }
  });

  notifyTrendingUpdate("empathy");
  return { empathized: true };
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

export async function countSegmentEmpathy(
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
    _count: { _all: true },
  });

  return new Map(grouped.map((g) => [g.targetId, g._count._all]));
}

export type { Gender };
