import { NextRequest, NextResponse } from "next/server";
import { searchWords } from "@/lib/word-service";
import { jsonError } from "@/lib/api";

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 1) return jsonError("검색어를 입력해 주세요.");

  const items = await searchWords(q);
  return NextResponse.json({ items });
}
