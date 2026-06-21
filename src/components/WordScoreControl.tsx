"use client";

import { useEffect, useState } from "react";
import { formatScore, scoreToNodeColors } from "@/lib/score-color";

type Props = {
  totalScore: number;
  userScore: number;
  onSubmit: (score: number) => Promise<void>;
  disabled?: boolean;
  size?: "sm" | "md";
};

export function WordScoreControl({
  totalScore,
  userScore,
  onSubmit,
  disabled,
  size = "md",
}: Props) {
  const [value, setValue] = useState(userScore);
  const [saving, setSaving] = useState(false);
  const colors = scoreToNodeColors(totalScore);

  useEffect(() => {
    setValue(userScore);
  }, [userScore]);

  async function commit(next: number) {
    setValue(next);
    setSaving(true);
    try {
      await onSubmit(next);
    } finally {
      setSaving(false);
    }
  }

  const badgeCls = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <div className={`flex flex-col gap-2 ${size === "sm" ? "text-xs" : "text-sm"}`}>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full font-semibold ${badgeCls}`}
          style={{ backgroundColor: colors.fill, color: colors.text, border: `1px solid ${colors.stroke}` }}
        >
          {formatScore(totalScore)}점
        </span>
        <span className="text-[var(--muted)]">
          내 점수 {userScore === 0 ? "없음" : formatScore(userScore)}
          {saving ? " · 저장 중…" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-6 text-right text-[10px] text-red-400">-10</span>
        <input
          type="range"
          min={-10}
          max={10}
          step={1}
          value={value}
          disabled={disabled || saving}
          onChange={(e) => setValue(Number(e.target.value))}
          onMouseUp={() => value !== userScore && commit(value)}
          onTouchEnd={() => value !== userScore && commit(value)}
          className="h-2 flex-1 cursor-pointer accent-[var(--accent)]"
        />
        <span className="w-6 text-[10px] text-blue-400">+10</span>
        <span className="w-8 text-center font-medium">{formatScore(value)}</span>
      </div>
    </div>
  );
}
