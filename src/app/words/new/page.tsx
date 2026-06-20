"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewWordPage() {
  const router = useRouter();
  const [center, setCenter] = useState("");
  const [connections, setConnections] = useState(["", ""]);
  const [loading, setLoading] = useState(false);

  function updateConnection(index: number, value: string) {
    setConnections((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  function addConnectionField() {
    if (connections.length >= 5) return;
    setConnections((prev) => [...prev, ""]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: center,
          connections: connections.filter((c) => c.trim()),
        }),
      });
      const body = await res.json();
      if (res.status === 401) {
        alert("등록하려면 본인인증이 필요합니다.");
        router.push("/");
        return;
      }
      if (!res.ok) {
        alert(body.error ?? "등록에 실패했습니다.");
        return;
      }
      router.push(`/words/${body.word.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pb-24">
      <header className="border-b border-[var(--border)] px-4 py-4">
        <h1 className="font-bold">새 단어 등록</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 px-4 py-6">
        <div>
          <label className="mb-2 block text-sm text-[var(--muted)]">중심 단어 *</label>
          <input
            required
            value={center}
            onChange={(e) => setCenter(e.target.value)}
            placeholder="예: 트럼프"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">2~20자, 단어·부사만 (문장 불가)</p>
        </div>

        <div>
          <label className="mb-2 block text-sm text-[var(--muted)]">연결 단어 (최대 5개)</label>
          <div className="space-y-2">
            {connections.map((value, index) => (
              <input
                key={index}
                value={value}
                onChange={(e) => updateConnection(index, e.target.value)}
                placeholder={index === 0 ? "예: 미국" : "연결 단어"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
              />
            ))}
          </div>
          {connections.length < 5 && (
            <button
              type="button"
              onClick={addConnectionField}
              className="mt-2 text-sm text-[var(--accent)]"
            >
              + 연결 단어 추가
            </button>
          )}
        </div>

        <p className="text-xs text-[var(--muted)]">⚠️ 욕설·비속어는 등록되지 않습니다.</p>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--accent)] py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "등록 중…" : "등록하기"}
        </button>
      </form>
    </main>
  );
}
