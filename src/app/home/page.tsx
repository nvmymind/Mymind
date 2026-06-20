"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { SegmentFilterBar } from "@/components/SegmentFilterBar";
import { EmpathyButton } from "@/components/EmpathyButton";
import { MindMap3D } from "@/components/MindMap3D";
import { useTrendingStream } from "@/hooks/useTrendingStream";
import type { MindMapGraph, MindMapNode } from "@/lib/word-service";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HomePage() {
  const router = useRouter();
  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [empathyState, setEmpathyState] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<"map" | "list">("map");
  const { data, connected, mode } = useTrendingStream(gender, ageGroup);

  const { data: mindmap } = useSWR<MindMapGraph>(
    view === "map" ? "/api/v1/words/mindmap?trending=1&limit=10" : null,
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

  return (
    <main className="pb-24">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)] px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">MyMind</h1>
          <span className={`text-xs ${connected ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
            {connected ? (mode === "sse" ? "● Live" : "● Sync") : "○ …"}
          </span>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setView("map")}
            className={`rounded-full px-3 py-1 text-xs ${
              view === "map" ? "bg-[var(--accent)] text-white" : "border border-[var(--border)]"
            }`}
          >
            🧠 마인드맵
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`rounded-full px-3 py-1 text-xs ${
              view === "list" ? "bg-[var(--accent)] text-white" : "border border-[var(--border)]"
            }`}
          >
            📋 목록
          </button>
        </div>
      </header>

      <SegmentFilterBar
        gender={gender}
        ageGroup={ageGroup}
        onGenderChange={setGender}
        onAgeGroupChange={setAgeGroup}
      />

      {view === "map" && mindmap && mindmap.nodes.length > 0 && (
        <section className="px-4 pb-2">
          <MindMap3D graph={mindmap} height={480} onNodeClick={handleNodeClick} />
          <p className="mt-2 text-center text-xs text-[var(--muted)]">
            🔥 트렌드 단어(주황)와 연결 관계 · 노드 클릭으로 탐색
          </p>
        </section>
      )}

      {view === "list" && (
        <section className="px-4">
          {data && !data.sampleSufficient && (
            <p className="mb-2 rounded-lg bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted)]">
              선택한 조건의 데이터가 30건 미만이라 집계가 부정확할 수 있습니다.
            </p>
          )}
          <h2 className="mb-3 text-sm font-semibold text-[var(--muted)]">🔥 지금 오르는 단어</h2>
          <div className="space-y-3">
            {(data?.items ?? []).map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="mr-2 text-sm text-[var(--muted)]">{item.rank}</span>
                    <Link href={`/words/${item.id}`} className="text-lg font-semibold hover:underline">
                      {item.text}
                    </Link>
                    <p className="mt-1 text-sm text-[var(--muted)]">❤️ {item.empathyCount.toLocaleString()}</p>
                  </div>
                  <Link href={`/words/${item.id}`} className="text-sm text-[var(--accent)]">
                    상세 →
                  </Link>
                </div>
                <div className="mt-3">
                  <EmpathyButton
                    empathized={!!empathyState[item.id]}
                    onClick={() => toggleWordEmpathy(item.id)}
                    size="sm"
                  />
                </div>
              </article>
            ))}
            {!data?.items?.length && (
              <p className="py-8 text-center text-[var(--muted)]">
                아직 등록된 단어가 없습니다.{" "}
                <Link href="/words/new" className="text-[var(--accent)]">
                  첫 단어 등록하기
                </Link>
              </p>
            )}
          </div>
        </section>
      )}

      {view === "map" && (!mindmap || mindmap.nodes.length === 0) && (
        <p className="px-4 py-8 text-center text-[var(--muted)]">
          아직 표시할 마인드맵이 없습니다.{" "}
          <Link href="/words/new" className="text-[var(--accent)]">
            단어 등록하기
          </Link>
        </p>
      )}
    </main>
  );
}
