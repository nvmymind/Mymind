"use client";

import useSWR from "swr";
import { useMemo } from "react";
import type { SuggestItem } from "@/components/WordSuggestInput";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TrendingResponse = {
  items: Array<{ id: string; text: string; empathyCount: number }>;
};

export function useTrendingSuggestions(limit = 8, enabled = true) {
  const { data } = useSWR<TrendingResponse>(
    enabled ? `/api/v1/words/trending?limit=${limit}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  return useMemo<SuggestItem[]>(
    () =>
      (data?.items ?? []).map((item) => ({
        id: item.id,
        text: item.text,
        empathyCount: item.empathyCount,
        badge: "🔥 트렌드",
      })),
    [data],
  );
}
