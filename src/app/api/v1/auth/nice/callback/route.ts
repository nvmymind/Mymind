import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth";
import { completeNiceAuthCallback, upsertVerifiedUser } from "@/lib/nice-auth";
import { jsonError } from "@/lib/api";

const callbackSchema = z.object({
  token_version_id: z.string(),
  enc_data: z.string(),
  integrity_value: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = callbackSchema.parse(await request.json());
    const identity = await completeNiceAuthCallback({
      tokenVersionId: body.token_version_id,
      encData: body.enc_data,
      integrityValue: body.integrity_value,
    });
    const user = await upsertVerifiedUser(identity);
    await setSessionCookie(user.id);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (error instanceof Error && error.message === "NICE_SESSION_EXPIRED") {
      return jsonError("본인인증 세션이 만료되었습니다. 다시 시도해 주세요.", 410);
    }
    return jsonError("본인인증 처리에 실패했습니다.");
  }
}
