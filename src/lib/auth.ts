import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { Gender } from "@prisma/client";

export const SESSION_COOKIE = "mymind_session";

export type SessionUser = {
  id: string;
  di: string;
  birthYear: number;
  gender: Gender;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, di: true, birthYear: true, gender: true },
  });

  return user;
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function upsertUserFromVerification(input: {
  di: string;
  birthYear: number;
  gender: Gender;
}): Promise<SessionUser> {
  return prisma.user.upsert({
    where: { di: input.di },
    create: {
      di: input.di,
      birthYear: input.birthYear,
      gender: input.gender,
    },
    update: {
      birthYear: input.birthYear,
      gender: input.gender,
      verifiedAt: new Date(),
    },
    select: { id: true, di: true, birthYear: true, gender: true },
  });
}

export async function createMockSession(input: {
  birthYear: number;
  gender: Gender;
}): Promise<SessionUser> {
  const di = `mock-${crypto.randomUUID()}`;

  return upsertUserFromVerification({
    di,
    birthYear: input.birthYear,
    gender: input.gender,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
