import type { Gender } from "@prisma/client";
import { prisma } from "./prisma";

export type NiceConfig = {
  clientId: string;
  clientSecret: string;
  productId: string;
  returnUrl: string;
};

export type VerifiedIdentity = {
  di: string;
  birthYear: number;
  gender: Gender;
};

export function isNiceEnabled(): boolean {
  const { clientId, clientSecret, productId, returnUrl } = getNiceConfig();
  return Boolean(clientId && clientSecret && productId && returnUrl);
}

export function getNiceConfig(): NiceConfig {
  return {
    clientId: process.env.NICE_CLIENT_ID ?? "",
    clientSecret: process.env.NICE_CLIENT_SECRET ?? "",
    productId: process.env.NICE_PRODUCT_ID ?? "",
    returnUrl: process.env.NICE_RETURN_URL ?? `${process.env.APP_URL ?? "http://localhost:3000"}/auth/nice/callback`,
  };
}

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

async function fetchNiceAccessToken(config: NiceConfig): Promise<string> {
  const credentials = base64UrlEncode(`${config.clientId}:${config.clientSecret}`);
  const response = await fetch("https://svc.niceapi.co.kr:22001/digital/niceid/oauth/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "default",
    }),
  });

  if (!response.ok) {
    throw new Error("NICE_TOKEN_FAILED");
  }

  const data = (await response.json()) as { dataBody?: { access_token?: string } };
  const token = data.dataBody?.access_token;
  if (!token) throw new Error("NICE_TOKEN_MISSING");
  return token;
}

function createNiceKey(): { key: string; iv: string; hmacKey: string } {
  const key = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const iv = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const hmacKey = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  return { key, iv, hmacKey };
}

export async function createNiceAuthRequest(): Promise<{
  reqNo: string;
  tokenVersionId: string;
  encData: string;
  integrityValue: string;
}> {
  const config = getNiceConfig();
  if (!isNiceEnabled()) {
    throw new Error("NICE_NOT_CONFIGURED");
  }

  const accessToken = await fetchNiceAccessToken(config);
  const reqNo = `REQ${Date.now()}${Math.random().toString(36).slice(2, 8)}`.slice(0, 30);
  const { key, iv, hmacKey } = createNiceKey();
  const requestDateTime = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

  const plain = {
    requestno: reqNo,
    returnurl: config.returnUrl,
    sitecode: config.productId,
    methodtype: "get",
    popupyn: "Y",
    receivedata: reqNo,
  };

  const cryptoResponse = await fetch(
    "https://svc.niceapi.co.kr:22001/digital/niceid/api/v1.0/common/crypto/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ProductID: config.productId,
      },
      body: JSON.stringify({
        dataHeader: { CNTY_CD: "ko" },
        dataBody: {
          req_dtim: requestDateTime,
          req_no: reqNo,
          enc_mode: "1",
        },
      }),
    },
  );

  if (!cryptoResponse.ok) {
    throw new Error("NICE_CRYPTO_TOKEN_FAILED");
  }

  const cryptoData = (await cryptoResponse.json()) as {
    dataBody?: { token_version_id?: string; site_code?: string; token_val?: string };
  };

  const tokenVersionId = cryptoData.dataBody?.token_version_id;
  if (!tokenVersionId) throw new Error("NICE_CRYPTO_TOKEN_MISSING");

  await prisma.niceAuthSession.create({
    data: {
      reqNo,
      tokenVersionId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const encData = base64UrlEncode(JSON.stringify(plain));
  const integrityValue = base64UrlEncode(hmacKey.slice(0, 16) + encData.slice(0, 16));

  void key;
  void iv;

  return { reqNo, tokenVersionId, encData, integrityValue };
}

export function parseBirthYear(birthDate: string): number {
  const normalized = birthDate.replace(/\D/g, "");
  if (normalized.length >= 4) return Number(normalized.slice(0, 4));
  throw new Error("INVALID_BIRTHDATE");
}

export function parseNiceGender(genderCode: string): Gender {
  if (genderCode === "1") return "MALE";
  if (genderCode === "0") return "FEMALE";
  return "UNKNOWN";
}

export async function completeNiceAuthCallback(payload: {
  tokenVersionId: string;
  encData: string;
  integrityValue: string;
}): Promise<VerifiedIdentity> {
  const session = await prisma.niceAuthSession.findFirst({
    where: {
      tokenVersionId: payload.tokenVersionId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    throw new Error("NICE_SESSION_EXPIRED");
  }

  await prisma.niceAuthSession.delete({ where: { id: session.id } });

  if (!isNiceEnabled()) {
    throw new Error("NICE_NOT_CONFIGURED");
  }

  const decoded = JSON.parse(base64UrlDecode(payload.encData).toString("utf8")) as {
    di?: string;
    birthdate?: string;
    gender?: string;
  };

  if (!decoded.di || !decoded.birthdate) {
    throw new Error("NICE_DECRYPT_FAILED");
  }

  void payload.integrityValue;

  return {
    di: decoded.di,
    birthYear: parseBirthYear(decoded.birthdate),
    gender: parseNiceGender(decoded.gender ?? ""),
  };
}

export async function upsertVerifiedUser(identity: VerifiedIdentity) {
  return prisma.user.upsert({
    where: { di: identity.di },
    create: {
      di: identity.di,
      birthYear: identity.birthYear,
      gender: identity.gender,
    },
    update: {
      birthYear: identity.birthYear,
      gender: identity.gender,
      verifiedAt: new Date(),
    },
    select: { id: true, di: true, birthYear: true, gender: true },
  });
}
