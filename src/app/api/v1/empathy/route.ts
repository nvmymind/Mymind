import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, jsonError } from "@/lib/api";
import { setScore } from "@/lib/empathy-service";

const scoreSchema = z.object({
  targetType: z.enum(["WORD", "CONNECTION"]),
  targetId: z.string(),
  score: z.number().int().min(-10).max(10),
});

export async function POST(request: NextRequest) {
  return withAuth(async (user) => {
    try {
      const body = scoreSchema.parse(await request.json());
      const result = await setScore(user.id, body.targetType, body.targetId, body.score);
      return NextResponse.json(result);
    } catch {
      return jsonError("점수 저장에 실패했습니다.");
    }
  });
}
