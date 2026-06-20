import { NextResponse } from "next/server";
import { adminForbidden, isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { displayWord } from "@/lib/moderation";

export async function GET() {
  if (!(await isAdminAuthenticated())) return adminForbidden();

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      word: true,
      user: { select: { id: true, birthYear: true, gender: true } },
    },
  });

  return NextResponse.json({
    items: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.createdAt,
      word: {
        id: r.word.id,
        text: displayWord(r.word.text, r.word.status),
        status: r.word.status,
        reportCount: r.word.reportCount,
      },
    })),
  });
}
