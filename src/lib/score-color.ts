/** 단어 총점 → 노드 pill 색상 (마이너스=빨→주→노, 0=흰, 플러스=연두→녹→하늘→파) */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function rgb(r: number, g: number, b: number) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function lerpRgb(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function sampleStops(
  score: number,
  stops: Array<[number, [number, number, number]]>,
): [number, number, number] {
  if (score <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i += 1) {
    const [s1, c1] = stops[i - 1];
    const [s2, c2] = stops[i];
    if (score <= s2) {
      const t = s2 === s1 ? 0 : (score - s1) / (s2 - s1);
      return lerpRgb(c1, c2, t);
    }
  }
  return stops[stops.length - 1][1];
}

function luminance([r, g, b]: [number, number, number]) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const SCORE_STOPS: Array<[number, [number, number, number]]> = [
  [-80, [185, 28, 28]],
  [-55, [234, 88, 12]],
  [-28, [234, 179, 8]],
  [0, [255, 255, 255]],
  [20, [187, 247, 208]],
  [40, [34, 197, 94]],
  [60, [56, 189, 248]],
  [80, [37, 99, 235]],
];

export type ScoreColors = {
  fill: string;
  stroke: string;
  text: string;
};

/** 색상 매핑용 클램프 (총점은 무제한, 색은 ±80에서 포화) */
const COLOR_SATURATE = 80;

export function scoreToNodeColors(totalScore: number, isCenter = false): ScoreColors {
  const s = Math.max(-COLOR_SATURATE, Math.min(COLOR_SATURATE, totalScore));
  const rgbFill = sampleStops(s, SCORE_STOPS);
  const fill = rgb(...rgbFill);
  const lum = luminance(rgbFill);

  let stroke: string;
  if (s < -20) stroke = rgb(...lerpRgb(rgbFill, [127, 29, 29], 0.35));
  else if (s > 20) stroke = rgb(...lerpRgb(rgbFill, [30, 64, 175], 0.35));
  else stroke = lum > 0.65 ? "rgba(100,116,139,0.55)" : "rgba(255,255,255,0.35)";

  if (isCenter) {
    stroke = s < -10 ? "#fca5a5" : s > 10 ? "#93c5fd" : "#94a3b8";
  }

  const text = lum > 0.62 ? "#0f172a" : "#f8fafc";

  return { fill, stroke, text };
}

export function formatScore(score: number): string {
  if (score > 0) return `+${score}`;
  return String(score);
}
