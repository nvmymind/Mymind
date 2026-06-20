"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { WordSuggestInput, type SuggestItem } from "@/components/WordSuggestInput";

export function WordSearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const recommendations = useMemo<SuggestItem[]>(() => [], []);

  function goToWord(item: SuggestItem) {
    setQuery("");
    router.push(`/words/${item.id}`);
  }

  async function submitNew() {
    const text = query.trim();
    if (!text) return;
    const res = await fetch(`/api/v1/words/search?q=${encodeURIComponent(text)}`);
    const data = await res.json();
    const items: SuggestItem[] = data.items ?? [];
    const exact = items.find((i) => i.text === text);
    if (exact) {
      goToWord(exact);
      return;
    }
    if (items[0]) {
      goToWord(items[0]);
      return;
    }
    router.push(`/words/new?text=${encodeURIComponent(text)}`);
  }

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        submitNew();
      }}
    >
      <WordSuggestInput
        value={query}
        onChange={setQuery}
        onSelect={goToWord}
        placeholder="단어 검색"
        recommendations={recommendations}
      />
    </form>
  );
}
