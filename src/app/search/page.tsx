"use client";

import Link from "next/link";
import { useState } from "react";

type SearchItem = { id: string; text: string; empathyCount: number };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/v1/words/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setSearched(true);
  }

  return (
    <main className="pb-24">
      <header className="border-b border-[var(--border)] px-4 py-4">
        <h1 className="font-bold">단어 검색</h1>
      </header>

      <form onSubmit={handleSearch} className="px-4 py-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="단어 검색"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
        />
      </form>

      <section className="px-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/words/${item.id}`}
            className="mb-2 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <span className="font-medium">{item.text}</span>
            <span className="text-sm text-[var(--muted)]">❤️ {item.empathyCount} →</span>
          </Link>
        ))}

        {searched && items.length === 0 && (
          <div className="py-8 text-center text-[var(--muted)]">
            <p>&quot;{query}&quot;과 일치하는 단어가 없습니다.</p>
            <Link href="/words/new" className="mt-2 inline-block text-[var(--accent)]">
              새 단어로 등록하기
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
