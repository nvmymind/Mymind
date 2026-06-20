import { NextRequest, NextResponse } from "next/server";
import type { WordStatus } from "@prisma/client";
import { adminForbidden, isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { displayWord } from "@/lib/moderation";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return adminForbidden();

  const status = request.nextUrl.searchParams.get("status") as WordStatus | null;

  const words = await prisma.word.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ reportCount: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      _count: { select: { reports: true } },
    },
  });

  return NextResponse.json({
    items: words.map((w) => ({
      id: w.id,
      text: w.text,
      displayText: displayWord(w.text, w.status),
      status: w.status,
      reportCount: w.reportCount,
      empathyCount: w.empathyCount,
      reportsTotal: w._count.reports,
      createdAt: w.createdAt,
    })),
  });
}
