import { NextRequest } from "next/server";
import { getTrendingWords, parseSegmentFilter } from "@/lib/word-service";
import { getTrendingSignalVersion } from "@/lib/redis";
import {
  formatSseMessage,
  subscribeTrendingUpdates,
  TRENDING_EVENT,
} from "@/lib/trending-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const filter = parseSegmentFilter(searchParams);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let lastRedisVersion = 0;

      const pushTrending = async (trigger?: string) => {
        if (closed) return;
        try {
          const result = await getTrendingWords(limit, filter);
          controller.enqueue(
            encoder.encode(
              formatSseMessage(TRENDING_EVENT, {
                ...result,
                updatedAt: new Date().toISOString(),
                trigger,
              }),
            ),
          );
        } catch {
          controller.enqueue(encoder.encode(formatSseMessage("error", { message: "fetch_failed" })));
        }
      };

      void pushTrending("connect");

      const unsubscribe = subscribeTrendingUpdates((payload) => {
        void pushTrending(payload.trigger);
      });

      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, 25000);

      const redisPoll = setInterval(async () => {
        if (closed) return;
        try {
          const version = await getTrendingSignalVersion();
          if (version > 0 && version !== lastRedisVersion) {
            lastRedisVersion = version;
            await pushTrending("redis");
          }
        } catch {
          // ignore redis poll errors
        }
      }, 2000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        clearInterval(redisPoll);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
