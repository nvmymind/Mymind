import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminConfigured, setAdminCookie, clearAdminCookie } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api";

const loginSchema = z.object({
  secret: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return jsonError("ADMIN_SECRET 환경 변수가 설정되지 않았습니다.", 503);
  }

  try {
    const { secret } = loginSchema.parse(await request.json());
    if (secret !== process.env.ADMIN_SECRET) {
      return jsonError("관리자 비밀번호가 올바르지 않습니다.", 401);
    }
    await setAdminCookie();
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("로그인 요청이 올바르지 않습니다.");
  }
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
