"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MindMapGraph, MindMapNode } from "@/lib/word-service";
import { computeRadialLayout } from "@/lib/mindmap-layout";

type Props = {
  graph: MindMapGraph;
  onNodeClick: (node: MindMapNode) => void;
  onNodeContextMenu?: (node: MindMapNode, e: React.MouseEvent) => void;
  className?: string;
};

const FONT =
  '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

function MapNode({
  node,
  x,
  y,
  fontSize,
  isCenter,
  onNodeClick,
  onNodeContextMenu,
}: {
  node: MindMapNode;
  x: number;
  y: number;
  fontSize: number;
  isCenter: boolean;
  onNodeClick: (node: MindMapNode) => void;
  onNodeContextMenu?: (node: MindMapNode, e: React.MouseEvent) => void;
}) {
  const longPressRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const padX = Math.max(8, fontSize * 0.5);
  const padY = Math.max(5, fontSize * 0.35);
  const textW = Math.max(fontSize * 2, node.text.length * fontSize * 0.58 + padX * 2);
  const textH = fontSize + padY * 2;

  const openMenu = (clientX: number, clientY: number) => {
    if (!onNodeContextMenu) return;
    onNodeContextMenu(node, {
      clientX,
      clientY,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    } as React.MouseEvent);
  };

  const clearLongPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <foreignObject
      x={x - textW / 2}
      y={y - textH / 2}
      width={textW}
      height={textH}
      data-node-id={node.id}
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        data-node-id={node.id}
        className={`flex h-full w-full cursor-pointer items-center justify-center rounded-full px-2 text-center leading-none text-[#f0f3f5] select-none ${
          isCenter
            ? "border-2 border-[#7dd3fc] bg-[#1d9bf0] font-bold"
            : node.group === "trending"
              ? "border border-amber-700 bg-amber-900 font-medium"
              : "border border-sky-400/45 bg-[#152535] font-medium"
        }`}
        style={{ fontSize, fontFamily: FONT }}
        onClick={(e) => {
          e.stopPropagation();
          if (longPressRef.current) {
            longPressRef.current = false;
            return;
          }
          onNodeClick(node);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openMenu(e.clientX, e.clientY);
        }}
        onPointerDown={(e) => {
          if (!onNodeContextMenu || e.button !== 0) return;
          clearLongPress();
          timerRef.current = setTimeout(() => {
            longPressRef.current = true;
            openMenu(e.clientX, e.clientY);
          }, 480);
        }}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
      >
        {node.text}
      </div>
    </foreignObject>
  );
}

export function MindMap2D({ graph, onNodeClick, onNodeContextMenu, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 640 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; px: number; py: number } | null>(
    null,
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const layout = useMemo(
    () => computeRadialLayout(graph, size.w, size.h),
    [graph, size.w, size.h],
  );

  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [graph, size.w, size.h]);

  // Chrome: SVG g/rect 우클릭은 기본 메뉴가 뜨므로 capture 단계에서 가로챔
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !onNodeContextMenu) return;

    const handleContextMenu = (e: MouseEvent) => {
      for (const el of e.composedPath()) {
        if (!(el instanceof Element)) continue;
        const nodeId = el.getAttribute("data-node-id");
        if (!nodeId) continue;
        const node = nodeById.get(nodeId);
        if (!node) continue;
        e.preventDefault();
        e.stopPropagation();
        onNodeContextMenu(node, e as unknown as React.MouseEvent);
        return;
      }
    };

    root.addEventListener("contextmenu", handleContextMenu, true);
    return () => root.removeEventListener("contextmenu", handleContextMenu, true);
  }, [nodeById, onNodeContextMenu]);

  const resetPan = useCallback(() => setPan({ x: 0, y: 0 }), []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as Element).closest("[data-node-id]")) return;
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
      className={`relative h-full w-full min-h-0 touch-none select-none overflow-hidden bg-[#060a10] ${className}`}
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
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          style={{ fontFamily: FONT }}
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

          {layout.nodes.map(({ node, x, y, fontSize, isCenter }) => (
            <MapNode
              key={node.id}
              node={node}
              x={x}
              y={y}
              fontSize={fontSize}
              isCenter={isCenter}
              onNodeClick={onNodeClick}
              onNodeContextMenu={onNodeContextMenu}
            />
          ))}
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
        클릭 → 중심 이동 · 우클릭/길게누르기 → 메뉴 · 드래그 → 화면 이동
      </p>
    </div>
  );
}
