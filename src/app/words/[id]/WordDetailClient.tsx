"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import { EmpathyButton } from "@/components/EmpathyButton";
import { SegmentFilterBar } from "@/components/SegmentFilterBar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WordDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const direction = searchParams.get("direction") === "in" ? "in" : "out";
  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [newConnection, setNewConnection] = useState("");
  const [showReport, setShowReport] = useState(false);

  const query = new URLSearchParams({ direction });
  if (gender) query.set("gender", gender);
  if (ageGroup) query.set("ageGroup", ageGroup);

  const { data, mutate } = useSWR(
    id ? `/api/v1/words/${id}?${query.toString()}` : null,
    fetcher,
  );

  async function toggleEmpathy(targetType: "WORD" | "CONNECTION", targetId: string) {
    const res = await fetch("/api/v1/empathy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId }),
    });
    if (res.status === 401) {
      alert("공감하려면 본인인증이 필요합니다.");
      return;
    }
    if (res.ok) mutate();
  }

  async function submitReport(reason: string) {
    const res = await fetch("/api/v1/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: id, reason }),
    });
    if (res.status === 401) {
      alert("신고하려면 본인인증이 필요합니다.");
      return;
    }
    setShowReport(false);
    if (res.ok) {
      alert("신고가 접수되었습니다.");
      mutate();
    } else {
      alert("이미 신고했거나 처리에 실패했습니다.");
    }
  }

  async function addConnection() {
    const res = await fetch(`/api/v1/words/${id}/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetText: newConnection }),
    });
    if (res.status === 401) {
      alert("연결을 추가하려면 본인인증이 필요합니다.");
      return;
    }
    const body = await res.json();
    if (!res.ok) {
      alert(body.error ?? "등록에 실패했습니다.");
      return;
    }
    setNewConnection("");
    mutate();
  }

  if (!data?.word) {
    return (
      <main className="flex min-h-dvh items-center justify-center pb-24 text-[var(--muted)]">
        불러오는 중…
      </main>
    );
  }

  return (
    <main className="pb-24">
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
        <button type="button" onClick={() => router.back()} className="text-[var(--accent)]">
          ← 뒤로
        </button>
        <h1 className="font-bold">단어 상세</h1>
      </header>

      <section className="px-4 py-8 text-center">
        <div className="inline-block rounded-2xl border border-[var(--border)] bg-[var(--card)] px-8 py-4 text-2xl font-bold">
          {data.word.text}
        </div>
        <p className="mt-2 text-[var(--muted)]">❤️ {data.word.empathyCount.toLocaleString()}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <EmpathyButton
            empathized={data.userWordEmpathized}
            onClick={() => toggleEmpathy("WORD", data.word.id)}
          />
          {data.word.canReport && (
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)]"
            >
              🚩 신고
            </button>
          )}
        </div>
      </section>

      <div className="mx-4 mb-4 flex rounded-full border border-[var(--border)] p-1">
        <Link
          href={`/words/${id}?direction=out`}
          className={`flex-1 rounded-full py-2 text-center text-sm ${
            direction === "out" ? "bg-[var(--accent)] text-white" : ""
          }`}
        >
          나가는 연결
        </Link>
        <Link
          href={`/words/${id}?direction=in`}
          className={`flex-1 rounded-full py-2 text-center text-sm ${
            direction === "in" ? "bg-[var(--accent)] text-white" : ""
          }`}
        >
          들어오는 연결
        </Link>
      </div>

      <SegmentFilterBar
        gender={gender}
        ageGroup={ageGroup}
        onGenderChange={setGender}
        onAgeGroupChange={setAgeGroup}
      />

      <section className="px-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--muted)]">
          연결된 단어 (공감 많은 순)
        </h2>
        <ol className="space-y-3">
          {data.connections.map(
            (
              conn: {
                id: string;
                word: { id: string; text: string };
                empathyCount: number;
                userEmpathized: boolean;
              },
              index: number,
            ) => (
              <li
                key={conn.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"
              >
                <span className="w-6 text-sm text-[var(--muted)]">{index + 1}</span>
                <Link href={`/words/${conn.word.id}`} className="flex-1 font-medium hover:underline">
                  {conn.word.text}
                </Link>
                <span className="text-sm text-[var(--muted)]">{conn.empathyCount}</span>
                <EmpathyButton
                  empathized={conn.userEmpathized}
                  onClick={() => toggleEmpathy("CONNECTION", conn.id)}
                  size="sm"
                />
              </li>
            ),
          )}
        </ol>
      </section>

      <section className="mt-8 px-4">
        <h3 className="mb-2 text-sm text-[var(--muted)]">연결 단어 추가</h3>
        <div className="flex gap-2">
          <input
            value={newConnection}
            onChange={(e) => setNewConnection(e.target.value)}
            placeholder="연결할 단어"
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2"
          />
          <button
            type="button"
            onClick={addConnection}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm text-white"
          >
            추가
          </button>
        </div>
      </section>

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-6">
            <h3 className="mb-4 font-semibold">이 단어를 신고하시겠습니까?</h3>
            <div className="space-y-2">
              {[
                ["PROFANITY", "욕설·비속어"],
                ["HATE", "혐오 표현"],
                ["SPAM", "스팸"],
                ["OTHER", "기타"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => submitReport(value)}
                  className="block w-full rounded-lg border border-[var(--border)] px-4 py-2 text-left text-sm hover:border-[var(--accent)]"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowReport(false)}
              className="mt-4 w-full py-2 text-sm text-[var(--muted)]"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
