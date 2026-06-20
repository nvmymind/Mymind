import { EventEmitter } from "events";
import { publishTrendingSignal } from "./redis";

export type TrendingStreamPayload = {
  updatedAt: string;
  trigger?: string;
};

const globalKey = "__mymindTrendingEmitter";

type GlobalTrending = {
  emitter: EventEmitter;
};

function getEmitter(): EventEmitter {
  const g = globalThis as unknown as Record<string, GlobalTrending | undefined>;
  if (!g[globalKey]) {
    g[globalKey] = { emitter: new EventEmitter() };
    g[globalKey]!.emitter.setMaxListeners(100);
  }
  return g[globalKey]!.emitter;
}

export const TRENDING_EVENT = "trending:update";

export async function notifyTrendingUpdate(trigger?: string): Promise<void> {
  const payload: TrendingStreamPayload = {
    updatedAt: new Date().toISOString(),
    trigger,
  };

  getEmitter().emit(TRENDING_EVENT, payload);

  try {
    await publishTrendingSignal(trigger);
  } catch {
    // Redis unavailable — local emitter still works on single instance
  }
}

export function subscribeTrendingUpdates(
  listener: (payload: TrendingStreamPayload) => void,
): () => void {
  const emitter = getEmitter();
  emitter.on(TRENDING_EVENT, listener);
  return () => emitter.off(TRENDING_EVENT, listener);
}

export function formatSseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
