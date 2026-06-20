import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createMockSession, getSessionUser, setSessionCookie, clearSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";

const verifySchema = z.object({
  birthYear: z.number().int().min(1940).max(new Date().getFullYear() - 14),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = verifySchema.parse(await request.json());
    const user = await createMockSession(body);
    await setSessionCookie(user.id);
    return NextResponse.json({ user });
  } catch {
    return jsonError("본인인증 정보가 올바르지 않습니다.");
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("로그인이 필요합니다.", 401);
  return NextResponse.json({ user });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
