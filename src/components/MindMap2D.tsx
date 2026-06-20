"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MindMapGraph, MindMapNode } from "@/lib/word-service";
import { computeRadialLayout } from "@/lib/mindmap-layout";

type Props = {
  graph: MindMapGraph;
  onNodeClick: (node: MindMapNode) => void;
  className?: string;
};

export function MindMap2D({ graph, onNodeClick, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 500 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () => computeRadialLayout(graph, size.w, size.h),
    [graph, size.w, size.h],
  );

  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [graph, size.w, size.h]);

  const resetPan = useCallback(() => setPan({ x: 0, y: 0 }), []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-node]")) return;
      dragRef.current = { startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan.x, pan.y],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.px + (e.clientX - dragRef.current.startX),
      y: dragRef.current.py + (e.clientY - dragRef.current.startY),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative touch-none select-none overflow-hidden bg-[#060a10] ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="absolute inset-0"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
      >
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
        >
          {layout.links.map((link, i) => (
            <line
              key={i}
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke="rgba(29, 155, 240, 0.4)"
              strokeWidth={Math.max(1, Math.min(3, Math.log2(link.empathyCount + 1)))}
            />
          ))}

          {layout.nodes.map(({ node, x, y, fontSize, isCenter }) => {
            const padX = Math.max(8, fontSize * 0.5);
            const padY = Math.max(5, fontSize * 0.35);
            const textW = Math.max(fontSize * 2, node.text.length * fontSize * 0.58 + padX * 2);
            const textH = fontSize + padY * 2;

            return (
              <g
                key={node.id}
                data-node
                transform={`translate(${x - textW / 2}, ${y - textH / 2})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeClick(node);
                }}
              >
                <rect
                  width={textW}
                  height={textH}
                  rx={textH / 2}
                  fill={isCenter ? "#1d9bf0" : node.group === "trending" ? "#92400e" : "#152535"}
                  stroke={isCenter ? "#7dd3fc" : "rgba(107,203,255,0.45)"}
                  strokeWidth={isCenter ? 2.5 : 1}
                />
                <text
                  x={textW / 2}
                  y={textH / 2 + fontSize * 0.32}
                  textAnchor="middle"
                  fill="#f0f3f5"
                  fontSize={fontSize}
                  fontWeight={isCenter ? 700 : 500}
                >
                  {node.text}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <button
        type="button"
        onClick={resetPan}
        className="absolute right-3 top-3 z-10 rounded-full border border-[var(--border)] bg-[var(--card)]/95 px-3 py-1.5 text-xs backdrop-blur"
      >
        ⊙ 중심
      </button>

      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] text-[var(--muted)]">
        연결 단어 탭 → 중심 이동 · 드래그 → 화면 이동
      </p>
    </div>
  );
}
