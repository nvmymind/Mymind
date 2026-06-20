"use client";

import { useMemo, useState } from "react";
import { WordSuggestInput, type SuggestItem } from "@/components/WordSuggestInput";

type Props = {
  sourceText: string;
  recommendations: SuggestItem[];
  onClose: () => void;
  onConnect: (text: string) => Promise<boolean>;
};

export function ConnectWordDialog({ sourceText, recommendations, onClose, onConnect }: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <form
        className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h3 className="mb-1 font-semibold">연결 단어 추가</h3>
        <p className="mb-4 text-sm text-[var(--muted)]">
          「{sourceText}」에 연결할 단어
        </p>

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
            취소
          </button>
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? "추가 중…" : "추가"}
          </button>
        </div>
      </form>
    </div>
  );
}
