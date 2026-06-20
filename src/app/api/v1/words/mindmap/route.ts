import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getTrendingMindMap, getWordMindMap } from "@/lib/word-service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wordId = searchParams.get("wordId");
  const trending = searchParams.get("trending");

  if (trending === "1") {
    const limit = Number(searchParams.get("limit") ?? 10);
    const graph = await getTrendingMindMap(limit);
    return NextResponse.json(graph);
  }

  if (!wordId) {
    return jsonError("wordId 또는 trending=1 이 필요합니다.");
  }

  const direction = searchParams.get("direction") === "in" ? "in" : "out";
  const graph = await getWordMindMap(wordId, direction);
  if (!graph) return jsonError("단어를 찾을 수 없습니다.", 404);

  return NextResponse.json(graph);
}
