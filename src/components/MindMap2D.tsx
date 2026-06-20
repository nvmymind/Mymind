"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MindMapGraph, MindMapNode } from "@/lib/word-service";
import { computeRadialLayout, type LayoutNode } from "@/lib/mindmap-layout";

type Props = {
  graph: MindMapGraph;
  onNodeClick: (node: MindMapNode) => void;
  onNodeContextMenu?: (node: MindMapNode, e: React.MouseEvent) => void;
  className?: string;
};

const FONT =
  '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

function nodeMetrics(node: MindMapNode, fontSize: number) {
  const padX = Math.max(8, fontSize * 0.5);
  const padY = Math.max(5, fontSize * 0.35);
  const textW = Math.max(fontSize * 2, node.text.length * fontSize * 0.58 + padX * 2);
  const textH = fontSize + padY * 2;
  return { padX, padY, textW, textH };
}

function hitTestNode(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  layoutNodes: LayoutNode[],
): MindMapNode | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const local = pt.matrixTransform(ctm.inverse());

  for (let i = layoutNodes.length - 1; i >= 0; i -= 1) {
    const { node, x, y, fontSize } = layoutNodes[i];
    const { textW, textH } = nodeMetrics(node, fontSize);
    const left = x - textW / 2;
    const top = y - textH / 2;
    if (local.x >= left && local.x <= left + textW && local.y >= top && local.y <= top + textH) {
      return node;
    }
  }
  return null;
}

function MapNode({
  node,
  x,
  y,
  fontSize,
  isCenter,
  onNodeClick,
}: {
  node: MindMapNode;
  x: number;
  y: number;
  fontSize: number;
  isCenter: boolean;
  onNodeClick: (node: MindMapNode) => void;
}) {
  const { textW, textH } = nodeMetrics(node, fontSize);

  return (
    <g
      data-node-id={node.id}
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
        fontFamily={FONT}
        style={{ pointerEvents: "none" }}
      >
        {node.text}
      </text>
    </g>
  );
}

export function MindMap2D({ graph, onNodeClick, onNodeContextMenu, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const longPressRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; suppressClick: boolean }>({
    timer: null,
    suppressClick: false,
  });
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

  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [graph, size.w, size.h]);

  const openMenuAt = useCallback(
    (node: MindMapNode, clientX: number, clientY: number) => {
      if (!onNodeContextMenu) return;
      onNodeContextMenu(node, {
        clientX,
        clientY,
        preventDefault: () => undefined,
        stopPropagation: () => undefined,
      } as React.MouseEvent);
    },
    [onNodeContextMenu],
  );

  const pickNodeAt = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      return hitTestNode(svg, clientX, clientY, layout.nodes);
    },
    [layout.nodes],
  );

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !onNodeContextMenu) return;

    const handleContextMenu = (e: MouseEvent) => {
      const node = pickNodeAt(e.clientX, e.clientY);
      if (!node) return;
      e.preventDefault();
      e.stopPropagation();
      openMenuAt(node, e.clientX, e.clientY);
    };

    root.addEventListener("contextmenu", handleContextMenu, true);
    return () => root.removeEventListener("contextmenu", handleContextMenu, true);
  }, [onNodeContextMenu, openMenuAt, pickNodeAt]);

  const clearLongPress = () => {
    if (longPressRef.current.timer) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current.timer = null;
    }
  };

  const resetPan = useCallback(() => setPan({ x: 0, y: 0 }), []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const node = pickNodeAt(e.clientX, e.clientY);

      if (node && onNodeContextMenu && e.button === 0) {
        longPressRef.current.suppressClick = false;
        clearLongPress();
        longPressRef.current.timer = setTimeout(() => {
          longPressRef.current.suppressClick = true;
          openMenuAt(node, e.clientX, e.clientY);
        }, 500);
        return;
      }

      if (node) return;

      dragRef.current = { startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onNodeContextMenu, openMenuAt, pan.x, pan.y, pickNodeAt],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (longPressRef.current.timer) clearLongPress();
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.px + (e.clientX - dragRef.current.startX),
      y: dragRef.current.py + (e.clientY - dragRef.current.startY),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    clearLongPress();
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
          ref={svgRef}
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
              onNodeClick={(n) => {
                if (longPressRef.current.suppressClick) {
                  longPressRef.current.suppressClick = false;
                  return;
                }
                onNodeClick(n);
              }}
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
