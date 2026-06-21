"use client";

import { useEffect, useMemo, useState } from "react";
import { WordScoreControl } from "@/components/WordScoreControl";
import { WordSuggestInput, type SuggestItem } from "@/components/WordSuggestInput";

type Props = {
  wordId: string;
  sourceText: string;
  totalScore: number;
  recommendations: SuggestItem[];
  onClose: () => void;
  onConnect: (text: string) => Promise<boolean>;
  onSubmitScore: (score: number) => Promise<number | void>;
};

export function ConnectWordDialog({
  wordId,
  sourceText,
  totalScore,
  recommendations,
  onClose,
  onConnect,
  onSubmitScore,
}: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [liveTotal, setLiveTotal] = useState(totalScore);

  useEffect(() => {
    setLiveTotal(totalScore);
  }, [totalScore]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/v1/words/${wordId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setUserScore(data.userWordScore ?? 0);
        setLiveTotal(data.word?.score ?? totalScore);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wordId, totalScore]);

  const recs = useMemo(
    () => recommendations.map((r) => ({ ...r, badge: r.badge ?? "추천" })),
    [recommendations],
  );

  async function submit(value = text) {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const ok = await onConnect(trimmed);
    setSubmitting(false);
    if (ok) onClose();
  }

  async function handleScore(score: number) {
    const nextTotal = await onSubmitScore(score);
    setUserScore(score);
    if (typeof nextTotal === "number") setLiveTotal(nextTotal);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <form
        className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h3 className="mb-1 font-semibold">「{sourceText}」</h3>
        <p className="mb-4 text-sm text-[var(--muted)]">점수와 연결 단어를 입력하세요</p>

        <div className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--muted)]">이 단어 점수 (-10 ~ +10)</p>
          <WordScoreControl
            totalScore={liveTotal}
            userScore={userScore}
            onSubmit={handleScore}
            size="sm"
          />
        </div>

        <p className="mb-2 text-xs font-medium text-[var(--muted)]">연결할 단어</p>
        <WordSuggestInput
          value={text}
          onChange={setText}
          onSelect={(item) => submit(item.text)}
          placeholder="단어 입력 · Enter로 추가"
          recommendations={recs}
          autoFocus
        />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm"
          >
            닫기
          </button>
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? "추가 중…" : "연결 추가"}
          </button>
        </div>
      </form>
    </div>
  );
}
