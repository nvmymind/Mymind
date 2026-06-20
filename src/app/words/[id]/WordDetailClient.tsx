"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { ConnectWordDialog } from "@/components/ConnectWordDialog";
import { EmpathyButton } from "@/components/EmpathyButton";
import { MindMap2D } from "@/components/MindMap2D";
import { NodeContextMenu } from "@/components/NodeContextMenu";
import { WordSearchBar } from "@/components/WordSearchBar";
import type { SuggestItem } from "@/components/WordSuggestInput";
import { useTrendingSuggestions } from "@/hooks/useTrendingSuggestions";
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

type ContextMenuState = { node: MindMapNode; x: number; y: number };
type ConnectTarget = { id: string; text: string };

export default function WordDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showPanel, setShowPanel] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [connectTarget, setConnectTarget] = useState<ConnectTarget | null>(null);
  const trendingSuggestions = useTrendingSuggestions(10, !!connectTarget);

  const { data, mutate } = useSWR<WordDetailResponse>(
    id ? `/api/v1/words/${id}?direction=out` : null,
    fetcher,
  );

  const { data: mindmap, mutate: mutateMap } = useSWR<MindMapGraph>(
    id ? `/api/v1/mindmap?wordId=${id}&direction=out` : null,
    fetcher,
  );

  const graph = useMemo(() => {
    if (mindmap?.nodes?.length) return mindmap;
    if (data?.word && data.connections) {
      return buildMindMapFromWordDetail(data.word, data.connections, "out");
    }
    return null;
  }, [mindmap, data]);

  const connectRecommendations = useMemo(() => {
    if (!graph || !connectTarget) return [] as SuggestItem[];

    const linkedIds = new Set<string>();
    if (connectTarget.id === data?.word.id) {
      data?.connections.forEach((c) => linkedIds.add(c.word.id));
    } else {
      graph.links.forEach((link) => {
        if (link.source === connectTarget.id) linkedIds.add(link.target);
        if (link.target === connectTarget.id) linkedIds.add(link.source);
      });
    }

    const seen = new Set<string>([connectTarget.id, ...linkedIds]);
    const items: SuggestItem[] = [];

    for (const n of graph.nodes) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      items.push({
        id: n.id,
        text: n.text,
        empathyCount: n.empathyCount,
        badge: "주변",
      });
      if (items.length >= 5) break;
    }

    for (const t of trendingSuggestions) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      items.push(t);
      if (items.length >= 10) break;
    }

    return items;
  }, [graph, connectTarget, data, trendingSuggestions]);

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

  async function addConnection(sourceWordId: string, targetText: string) {
    const res = await fetch(`/api/v1/words/${sourceWordId}/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetText }),
    });
    if (res.status === 401) {
      alert("연결을 추가하려면 본인인증이 필요합니다.");
      return false;
    }
    const body = await res.json();
    if (!res.ok) {
      alert(body.error ?? "등록에 실패했습니다.");
      return false;
    }
    mutate();
    mutateMap();
    return true;
  }

  function handleNodeClick(node: MindMapNode) {
    if (node.group === "center") return;
    router.push(`/words/${node.id}`);
  }

  function handleNodeContextMenu(node: MindMapNode, e: React.MouseEvent) {
    setContextMenu({ node, x: e.clientX, y: e.clientY });
  }

  function focusNode(node: MindMapNode) {
    if (node.id === id) return;
    router.push(`/words/${node.id}`);
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
        <WordSearchBar className="min-w-0 flex-1" />
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
          key={id}
          graph={graph}
          onNodeClick={handleNodeClick}
          onNodeContextMenu={handleNodeContextMenu}
          className="absolute inset-0"
        />
        {linkedCount === 0 && (
          <p className="pointer-events-none absolute bottom-12 left-0 right-0 text-center text-xs text-[var(--muted)]">
            우클릭으로 연결 단어 추가
          </p>
        )}
      </div>

      {contextMenu && (
        <NodeContextMenu
          node={contextMenu.node}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onFocus={focusNode}
          onConnect={(node) => setConnectTarget({ id: node.id, text: node.text })}
        />
      )}

      {connectTarget && (
        <ConnectWordDialog
          sourceText={connectTarget.text}
          recommendations={connectRecommendations}
          onClose={() => setConnectTarget(null)}
          onConnect={(text) => addConnection(connectTarget.id, text)}
        />
      )}

      {showPanel && (
        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--background)] p-3 pb-20">
          <p className="mb-2 text-sm font-semibold">
            {data.word.text}{" "}
            <span className="font-normal text-[var(--muted)]">❤️ {data.word.empathyCount}</span>
          </p>
          <div className="flex flex-wrap gap-2">
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
            <button
              type="button"
              onClick={() => setShowReport(false)}
              className="mt-4 w-full py-2 text-sm text-[var(--muted)]"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
