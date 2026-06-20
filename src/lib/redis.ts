import { Redis } from "@upstash/redis";

const TRENDING_VERSION_KEY = "mymind:trending:version";
const TRENDING_LAST_KEY = "mymind:trending:last";

type TrendingSignalPayload = {
  updatedAt: string;
  trigger?: string;
};

let redis: Redis | null = null;

export function isRedisEnabled(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRedis(): Redis | null {
  if (!isRedisEnabled()) return null;
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

export async function publishTrendingSignal(trigger?: string): Promise<TrendingSignalPayload | null> {
  const client = getRedis();
  if (!client) return null;

  const payload: TrendingSignalPayload = {
    updatedAt: new Date().toISOString(),
    trigger,
  };

  await Promise.all([
    client.incr(TRENDING_VERSION_KEY),
    client.set(TRENDING_LAST_KEY, payload),
  ]);

  return payload;
}

export async function getTrendingSignalVersion(): Promise<number> {
  const client = getRedis();
  if (!client) return 0;
  const version = await client.get<number>(TRENDING_VERSION_KEY);
  return version ?? 0;
}
