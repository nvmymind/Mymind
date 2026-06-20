import { NextResponse } from "next/server";
import { getSessionUser } from "./auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function jsonUnauthorized() {
  return jsonError("로그인이 필요합니다.", 401);
}

export async function withAuth(
  handler: (user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>) => Promise<NextResponse>,
) {
  const user = await getSessionUser();
  if (!user) return jsonUnauthorized();
  return handler(user);
}
