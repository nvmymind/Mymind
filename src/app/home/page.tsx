"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { MindMap2D } from "@/components/MindMap2D";
import { EmpathyButton } from "@/components/EmpathyButton";
import { useTrendingStream } from "@/hooks/useTrendingStream";
import type { MindMapGraph, MindMapNode } from "@/lib/word-service";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HomePage() {
  const router = useRouter();
  const [view, setView] = useState<"map" | "list">("map");
  const [empathyState, setEmpathyState] = useState<Record<string, boolean>>({});
  const { data, connected } = useTrendingStream("", "");

  const { data: mindmap } = useSWR<MindMapGraph>(
    view === "map" ? "/api/v1/words/mindmap?trending=1&limit=8" : null,
    fetcher,
    { refreshInterval: 30000 },
  );

  async function toggleWordEmpathy(wordId: string) {
    const res = await fetch("/api/v1/empathy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "WORD", targetId: wordId }),
    });
    if (res.status === 401) {
      alert("공감하려면 본인인증이 필요합니다.");
      return;
    }
    if (!res.ok) return;
    const { empathized } = await res.json();
    setEmpathyState((s) => ({ ...s, [wordId]: empathized }));
  }

  function handleNodeClick(node: MindMapNode) {
    router.push(`/words/${node.id}`);
  }

  if (view === "map") {
    return (
      <main className="flex h-dvh flex-col overflow-hidden pb-16">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-3 py-2">
          <h1 className="text-lg font-bold">MyMind</h1>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${connected ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
              {connected ? "● Live" : "○ …"}
            </span>
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs"
            >
              📋 목록
            </button>
          </div>
        </header>
        <div className="relative min-h-0 flex-1">
          {mindmap && mindmap.nodes.length > 0 ? (
            <MindMap2D graph={mindmap} onNodeClick={handleNodeClick} className="absolute inset-0" />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--muted)]">
              <Link href="/words/new" className="text-[var(--accent)]">
                첫 단어 등록하기
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="pb-24">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">MyMind</h1>
          <button
            type="button"
            onClick={() => setView("map")}
            className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs text-white"
          >
            🧠 맵
          </button>
        </div>
      </header>
      <section className="px-4 pt-4">
        <div className="space-y-3">
          {(data?.items ?? []).map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <Link href={`/words/${item.id}`} className="text-lg font-semibold">
                {item.text}
              </Link>
              <p className="text-sm text-[var(--muted)]">❤️ {item.empathyCount}</p>
              <div className="mt-2">
                <EmpathyButton
                  empathized={!!empathyState[item.id]}
                  onClick={() => toggleWordEmpathy(item.id)}
                  size="sm"
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
