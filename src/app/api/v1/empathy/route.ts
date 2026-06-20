import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, jsonError } from "@/lib/api";
import { toggleEmpathy } from "@/lib/empathy-service";

const empathySchema = z.object({
  targetType: z.enum(["WORD", "CONNECTION"]),
  targetId: z.string(),
});

export async function POST(request: NextRequest) {
  return withAuth(async (user) => {
    try {
      const body = empathySchema.parse(await request.json());
      const result = await toggleEmpathy(user.id, body.targetType, body.targetId);
      return NextResponse.json(result);
    } catch {
      return jsonError("공감 처리에 실패했습니다.");
    }
  });
}
