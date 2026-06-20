"use client";

import Link from "next/link";
import { useState } from "react";
import { SegmentFilterBar } from "@/components/SegmentFilterBar";
import { EmpathyButton } from "@/components/EmpathyButton";
import { useTrendingStream } from "@/hooks/useTrendingStream";

export default function HomePage() {
  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [empathyState, setEmpathyState] = useState<Record<string, boolean>>({});
  const { data, connected, mode } = useTrendingStream(gender, ageGroup);

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

  return (
    <main className="pb-24">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)] px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">MyMind</h1>
          <span className={`text-xs ${connected ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
            {connected ? (mode === "sse" ? "● Live SSE" : "● Polling") : "○ 연결 중…"}
          </span>
        </div>
      </header>

      <SegmentFilterBar
        gender={gender}
        ageGroup={ageGroup}
        onGenderChange={setGender}
        onAgeGroupChange={setAgeGroup}
      />

      {data && !data.sampleSufficient && (
        <p className="mx-4 mb-2 rounded-lg bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted)]">
          선택한 조건의 데이터가 30건 미만이라 집계가 부정확할 수 있습니다.
        </p>
      )}

      <section className="px-4">
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
    </main>
  );
}
