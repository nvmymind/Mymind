import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, jsonError } from "@/lib/api";
import { createReport } from "@/lib/empathy-service";

const reportSchema = z.object({
  wordId: z.string(),
  reason: z.enum(["PROFANITY", "HATE", "SPAM", "OTHER"]),
});

export async function POST(request: NextRequest) {
  return withAuth(async (user) => {
    try {
      const body = reportSchema.parse(await request.json());
      const result = await createReport(user.id, body.wordId, body.reason);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") {
        return jsonError("단어를 찾을 수 없습니다.", 404);
      }
      return jsonError("이미 신고한 단어이거나 신고에 실패했습니다.");
    }
  });
}
