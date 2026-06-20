import type { Gender } from "@prisma/client";
import type { AgeGroup } from "./words";
import { ageGroupToBirthYearRange } from "./words";

export type SegmentFilter = {
  gender?: Gender;
  ageGroup?: AgeGroup;
};

export function userWhereFromSegment(filter: SegmentFilter) {
  const where: { gender?: Gender; birthYear?: { gte: number; lte: number } } = {};
  if (filter.gender) where.gender = filter.gender;
  if (filter.ageGroup) {
    const range = ageGroupToBirthYearRange(filter.ageGroup);
    where.birthYear = { gte: range.min, lte: range.max };
  }
  return where;
}

export function parseSegmentFilter(searchParams: URLSearchParams): SegmentFilter {
  const filter: SegmentFilter = {};
  const gender = searchParams.get("gender");
  const ageGroup = searchParams.get("ageGroup");

  if (gender === "MALE" || gender === "FEMALE" || gender === "OTHER") {
    filter.gender = gender;
  }
  if (
    ageGroup === "10s" ||
    ageGroup === "20s" ||
    ageGroup === "30s" ||
    ageGroup === "40s" ||
    ageGroup === "50s" ||
    ageGroup === "60s"
  ) {
    filter.ageGroup = ageGroup;
  }

  return filter;
}
