import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminForbidden, isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notifyTrendingUpdate } from "@/lib/trending-events";
import { jsonError } from "@/lib/api";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "HIDDEN", "PENDING_REVIEW"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await isAdminAuthenticated())) return adminForbidden();

  const { id } = await params;

  try {
    const body = patchSchema.parse(await request.json());
    const word = await prisma.word.update({
      where: { id },
      data: { status: body.status },
    });
    notifyTrendingUpdate("admin");
    return NextResponse.json({ word: { id: word.id, status: word.status } });
  } catch {
    return jsonError("단어 상태 변경에 실패했습니다.");
  }
}
