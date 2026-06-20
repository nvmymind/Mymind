"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TrendingItem = {
  id: string;
  text: string;
  empathyCount: number;
  rank: number;
};

type TrendingPayload = {
  items: TrendingItem[];
  sampleSufficient: boolean;
  updatedAt: string;
};

const POLL_INTERVAL_MS = 30000;

export function useTrendingStream(gender: string, ageGroup: string) {
  const [data, setData] = useState<TrendingPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<"sse" | "poll">("sse");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (gender) params.set("gender", gender);
    if (ageGroup) params.set("ageGroup", ageGroup);
    return params.toString();
  }, [gender, ageGroup]);

  const fetchTrending = useCallback(async () => {
    const res = await fetch(`/api/v1/words/trending?${buildQuery()}`);
    if (!res.ok) return;
    const payload = (await res.json()) as TrendingPayload;
    setData(payload);
    setConnected(true);
  }, [buildQuery]);

  useEffect(() => {
    setConnected(false);
    setMode("sse");

    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    const query = buildQuery();
    const source = new EventSource(`/api/v1/stream/trending?${query}`);
    let sseFailed = false;

    source.addEventListener("trending:update", (event) => {
      const payload = JSON.parse(event.data) as TrendingPayload;
      setData(payload);
      setConnected(true);
      setMode("sse");
    });

    source.onopen = () => {
      setConnected(true);
      setMode("sse");
    };

    source.onerror = () => {
      setConnected(false);
      if (sseFailed) return;
      sseFailed = true;
      source.close();
      setMode("poll");
      void fetchTrending();
      pollTimer.current = setInterval(() => void fetchTrending(), POLL_INTERVAL_MS);
    };

    return () => {
      source.close();
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [buildQuery, fetchTrending]);

  return { data, connected, mode };
}
