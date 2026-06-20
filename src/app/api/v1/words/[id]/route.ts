import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { getWordDetail, parseSegmentFilter } from "@/lib/word-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const direction = searchParams.get("direction") === "in" ? "in" : "out";
  const filter = parseSegmentFilter(searchParams);
  const user = await getSessionUser();

  const detail = await getWordDetail(id, direction, user?.id, filter);
  if (!detail) return jsonError("단어를 찾을 수 없습니다.", 404);

  return NextResponse.json(detail);
}
