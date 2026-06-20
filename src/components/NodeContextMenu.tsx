"use client";

import type { MindMapNode } from "@/lib/word-service";

type Props = {
  node: MindMapNode;
  x: number;
  y: number;
  onClose: () => void;
  onFocus: (node: MindMapNode) => void;
  onConnect: (node: MindMapNode) => void;
};

export function NodeContextMenu({ node, x, y, onClose, onFocus, onConnect }: Props) {
  return (
    <>
      <button
        type="button"
        aria-label="닫기"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 min-w-[180px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-xl"
        style={{
          left: Math.min(x, typeof window !== "undefined" ? window.innerWidth - 200 : x),
          top: Math.min(y, typeof window !== "undefined" ? window.innerHeight - 120 : y),
        }}
      >
        <button
          type="button"
          onClick={() => {
            onFocus(node);
            onClose();
          }}
          className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--background)]"
        >
          「{node.text}」 중심으로
        </button>
        <button
          type="button"
          onClick={() => {
            onConnect(node);
            onClose();
          }}
          className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--background)]"
        >
          연결 단어 추가
        </button>
      </div>
    </>
  );
}
