import { containsProfanity } from "./moderation";

const WORD_PATTERN = /^[\p{L}\p{N}]+$/u;

export class WordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WordValidationError";
  }
}

export function normalizeWord(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "");
}

export function validateWordInput(text: string): string {
  const trimmed = text.trim();

  if (trimmed.length < 2 || trimmed.length > 20) {
    throw new WordValidationError("단어는 2~20자여야 합니다.");
  }

  if (/\s/.test(trimmed)) {
    throw new WordValidationError("공백 없이 한 단어·부사만 입력할 수 있습니다.");
  }

  if (!WORD_PATTERN.test(trimmed)) {
    throw new WordValidationError("문장부호 없이 글자와 숫자만 입력할 수 있습니다.");
  }

  if (containsProfanity(trimmed)) {
    throw new WordValidationError("욕설·비속어는 등록할 수 없습니다.");
  }

  return trimmed;
}

export type AgeGroup = "10s" | "20s" | "30s" | "40s" | "50s" | "60s";

export function birthYearToAgeGroup(birthYear: number): AgeGroup {
  const age = new Date().getFullYear() - birthYear;
  if (age < 20) return "10s";
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  if (age < 60) return "50s";
  return "60s";
}

export function ageGroupToBirthYearRange(ageGroup: AgeGroup): { min: number; max: number } {
  const year = new Date().getFullYear();
  const map: Record<AgeGroup, { min: number; max: number }> = {
    "10s": { min: year - 19, max: year - 10 },
    "20s": { min: year - 29, max: year - 20 },
    "30s": { min: year - 39, max: year - 30 },
    "40s": { min: year - 49, max: year - 40 },
    "50s": { min: year - 59, max: year - 50 },
    "60s": { min: year - 100, max: year - 60 },
  };
  return map[ageGroup];
}

export const MIN_SEGMENT_SAMPLE = 30;
