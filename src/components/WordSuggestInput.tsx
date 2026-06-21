"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ScoreBadge } from "@/components/ScoreBadge";

export type SuggestItem = {
  id: string;
  text: string;
  empathyCount: number;
  badge?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: SuggestItem) => void;
  placeholder?: string;
  recommendations?: SuggestItem[];
  autoFocus?: boolean;
  className?: string;
};

export function WordSuggestInput({
  value,
  onChange,
  onSelect,
  placeholder = "단어 입력",
  recommendations = [],
  autoFocus,
  className = "",
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SuggestItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const q = value.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/words/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [value, open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showRecommendations = open && value.trim().length < 1 && recommendations.length > 0;
  const showResults = open && value.trim().length >= 1;
  const showDropdown = showRecommendations || showResults;

  function pick(item: SuggestItem) {
    onSelect(item);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-52 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg"
        >
          {showRecommendations && (
            <>
              {recommendations.map((item, index) => {
                const prevBadge = index > 0 ? recommendations[index - 1].badge : null;
                const showLabel = item.badge && item.badge !== prevBadge;
                return (
                  <li key={`rec-${item.id}`}>
                    {showLabel && (
                      <p className="px-3 pb-1 pt-2 text-[10px] font-medium text-[var(--muted)]">
                        {item.badge}
                      </p>
                    )}
                    <button
                      type="button"
                      role="option"
                      onClick={() => pick(item)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--background)]"
                    >
                      <span>{item.text}</span>
                      <ScoreBadge score={item.empathyCount} />
                    </button>
                  </li>
                );
              })}
            </>
          )}

          {showResults && loading && (
            <li className="px-3 py-2 text-xs text-[var(--muted)]">검색 중…</li>
          )}

          {showResults &&
            !loading &&
            results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  onClick={() => pick(item)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--background)]"
                >
                  <span>
                    {item.text}
                    <span className="ml-2 text-[10px] text-[var(--accent)]">기존 단어</span>
                  </span>
                  <ScoreBadge score={item.empathyCount} />
                </button>
              </li>
            ))}

          {showResults && !loading && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-[var(--muted)]">
              일치하는 단어 없음 · Enter로 새 단어 등록
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
