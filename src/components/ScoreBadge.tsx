import { formatScore, scoreToNodeColors } from "@/lib/score-color";

type Props = {
  score: number;
  className?: string;
};

export function ScoreBadge({ score, className = "" }: Props) {
  const colors = scoreToNodeColors(score);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}
      style={{
        backgroundColor: colors.fill,
        color: colors.text,
        border: `1px solid ${colors.stroke}`,
      }}
    >
      {formatScore(score)}점
    </span>
  );
}
