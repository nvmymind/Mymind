const PROFANITY = [
  "시발",
  "씨발",
  "개새",
  "병신",
  "지랄",
  "좆",
  "씹",
  "니미",
  "엠창",
  "섹스",
  "fuck",
  "shit",
  "bitch",
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PROFANITY.some((word) => lower.includes(word));
}

export function maskHiddenWord(): string {
  return "***";
}

export function displayWord(text: string, status: string): string {
  if (status === "HIDDEN") return maskHiddenWord();
  return text;
}

export const REPORT_THRESHOLD = Number(process.env.REPORT_THRESHOLD ?? 5);
