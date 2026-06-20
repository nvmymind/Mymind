"use client";

type Props = {
  gender?: string;
  ageGroup?: string;
  onGenderChange: (value: string) => void;
  onAgeGroupChange: (value: string) => void;
};

export function SegmentFilterBar({
  gender = "",
  ageGroup = "",
  onGenderChange,
  onAgeGroupChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      <select
        value={gender}
        onChange={(e) => onGenderChange(e.target.value)}
        className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm"
      >
        <option value="">성별 전체</option>
        <option value="MALE">남성</option>
        <option value="FEMALE">여성</option>
        <option value="OTHER">기타</option>
      </select>
      <select
        value={ageGroup}
        onChange={(e) => onAgeGroupChange(e.target.value)}
        className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm"
      >
        <option value="">연령대 전체</option>
        <option value="10s">10대</option>
        <option value="20s">20대</option>
        <option value="30s">30대</option>
        <option value="40s">40대</option>
        <option value="50s">50대</option>
        <option value="60s">60대+</option>
      </select>
    </div>
  );
}
