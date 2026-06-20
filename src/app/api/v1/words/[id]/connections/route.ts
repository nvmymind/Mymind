import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, jsonError } from "@/lib/api";
import { findOrCreateWord, WordValidationError } from "@/lib/word-service";
import { prisma } from "@/lib/prisma";

const connectionSchema = z.object({
  targetText: z.string(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id: sourceWordId } = await params;

  return withAuth(async (user) => {
    try {
      const body = connectionSchema.parse(await request.json());
      const target = await findOrCreateWord(body.targetText, user.id);

      if (target.id === sourceWordId) {
        return jsonError("같은 단어는 연결할 수 없습니다.");
      }

      const connection = await prisma.wordConnection.upsert({
        where: {
          sourceWordId_targetWordId_userId: {
            sourceWordId,
            targetWordId: target.id,
            userId: user.id,
          },
        },
        create: {
          sourceWordId,
          targetWordId: target.id,
          userId: user.id,
        },
        update: {},
        include: { targetWord: true },
      });

      return NextResponse.json({ connection }, { status: 201 });
    } catch (error) {
      if (error instanceof WordValidationError) {
        return jsonError(error.message);
      }
      throw error;
    }
  });
}
