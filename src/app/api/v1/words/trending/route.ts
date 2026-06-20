import { NextRequest, NextResponse } from "next/server";
import { getTrendingWords, parseSegmentFilter } from "@/lib/word-service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const filter = parseSegmentFilter(searchParams);

  const result = await getTrendingWords(limit, filter);

  return NextResponse.json({
    ...result,
    updatedAt: new Date().toISOString(),
  });
}
