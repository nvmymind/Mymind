"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { MindMap2D } from "@/components/MindMap2D";
import { EmpathyButton } from "@/components/EmpathyButton";
import {
  buildMindMapFromWordDetail,
  type MindMapGraph,
  type MindMapNode,
} from "@/lib/word-service";

async function fetcher(url: string) {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "불러오기에 실패했습니다.");
  return body;
}

type WordDetailResponse = {
  word: { id: string; text: string; empathyCount: number; canReport: boolean };
  direction: "out" | "in";
  connections: Array<{
    id: string;
    word: { id: string; text: string; empathyCount: number };
    empathyCount: number;
  }>;
  userWordEmpathized: boolean;
};

export default function WordDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const direction = searchParams.get("direction") === "in" ? "in" : "out";
  const [showPanel, setShowPanel] = useState(false);
  const [newConnection, setNewConnection] = useState("");
  const [showReport, setShowReport] = useState(false);

  const { data, mutate } = useSWR<WordDetailResponse>(
    id ? `/api/v1/words/${id}?direction=${direction}` : null,
    fetcher,
  );

  const { data: mindmap, mutate: mutateMap } = useSWR<MindMapGraph>(
    id ? `/api/v1/mindmap?wordId=${id}&direction=${direction}` : null,
    fetcher,
  );

  const graph = useMemo(() => {
    if (mindmap?.nodes?.length) return mindmap;
    if (data?.word && data.connections) {
      return buildMindMapFromWordDetail(data.word, data.connections, direction);
    }
    return null;
  }, [mindmap, data, direction]);

  async function toggleWordEmpathy() {
    if (!data?.word) return;
    const res = await fetch("/api/v1/empathy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "WORD", targetId: data.word.id }),
    });
    if (res.status === 401) {
      alert("공감하려면 본인인증이 필요합니다.");
      return;
    }
    if (res.ok) mutate();
  }

  async function submitReport(reason: string) {
    const res = await fetch("/api/v1/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: id, reason }),
    });
    if (res.status === 401) {
      alert("신고하려면 본인인증이 필요합니다.");
      return;
    }
    setShowReport(false);
    if (res.ok) {
      alert("신고가 접수되었습니다.");
      mutate();
      mutateMap();
    } else {
      alert("이미 신고했거나 처리에 실패했습니다.");
    }
  }

  async function addConnection() {
    const res = await fetch(`/api/v1/words/${id}/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetText: newConnection }),
    });
    if (res.status === 401) {
      alert("연결을 추가하려면 본인인증이 필요합니다.");
      return;
    }
    const body = await res.json();
    if (!res.ok) {
      alert(body.error ?? "등록에 실패했습니다.");
      return;
    }
    setNewConnection("");
    mutate();
    mutateMap();
  }

  function handleNodeClick(node: MindMapNode) {
    if (node.group === "center") return;
    router.push(`/words/${node.id}?direction=out`);
  }

  if (!data?.word || !graph) {
    return (
      <main className="flex h-dvh items-center justify-center text-[var(--muted)]">
        불러오는 중…
      </main>
    );
  }

  const linkedCount = graph.nodes.length - 1;

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <Link
          href="/home"
          className="shrink-0 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--accent)]"
        >
          🏠 홈
        </Link>
        <div className="flex min-w-0 flex-1 justify-center gap-2 text-xs">
          <Link
            href={`/words/${id}?direction=out`}
            className={`rounded-full px-2.5 py-1 ${direction === "out" ? "bg-[var(--accent)] text-white" : "border border-[var(--border)]"}`}
          >
            나가는
          </Link>
          <Link
            href={`/words/${id}?direction=in`}
            className={`rounded-full px-2.5 py-1 ${direction === "in" ? "bg-[var(--accent)] text-white" : "border border-[var(--border)]"}`}
          >
            들어오는
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setShowPanel((v) => !v)}
          className="shrink-0 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs"
        >
          {showPanel ? "닫기" : "⚙️"}
        </button>
      </header>

      <div className="relative min-h-0 flex-1 basis-0">
        <MindMap2D
          key={`${id}-${direction}`}
          graph={graph}
          onNodeClick={handleNodeClick}
          className="absolute inset-0"
        />
        {linkedCount === 0 && (
          <p className="pointer-events-none absolute bottom-12 left-0 right-0 text-center text-xs text-[var(--muted)]">
            연결 단어가 없습니다 · ⚙️에서 추가
          </p>
        )}
      </div>

      {showPanel && (
        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--background)] p-3 pb-20">
          <p className="mb-2 text-sm font-semibold">
            {data.word.text}{" "}
            <span className="font-normal text-[var(--muted)]">❤️ {data.word.empathyCount}</span>
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <EmpathyButton
              empathized={data.userWordEmpathized}
              onClick={toggleWordEmpathy}
              size="sm"
            />
            {data.word.canReport && (
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
              >
                🚩 신고
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={newConnection}
              onChange={(e) => setNewConnection(e.target.value)}
              placeholder="연결 단어"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addConnection}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm text-white"
            >
              추가
            </button>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-6">
            <h3 className="mb-4 font-semibold">신고</h3>
            <div className="space-y-2">
              {[
                ["PROFANITY", "욕설·비속어"],
                ["HATE", "혐오"],
                ["SPAM", "스팸"],
                ["OTHER", "기타"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => submitReport(value)}
                  className="block w-full rounded-lg border border-[var(--border)] px-4 py-2 text-left text-sm"
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setShowReport(false)} className="mt-4 w-full py-2 text-sm text-[var(--muted)]">
              취소
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
