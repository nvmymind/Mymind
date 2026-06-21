"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MindMapGraph, MindMapNode } from "@/lib/word-service";
import { computeNodeBox, computeRadialLayout, type LayoutNode } from "@/lib/mindmap-layout";
import { scoreToNodeColors } from "@/lib/score-color";

type Props = {
  graph: MindMapGraph;
  centerId?: string;
  onNodeClick?: (node: MindMapNode) => void;
  onNodeDoubleClick?: (node: MindMapNode) => void;
  className?: string;
};

const FONT =
  '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
const DOUBLE_CLICK_MS = 320;
const DRAG_THRESHOLD = 6;

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
    const { textW, textH } = computeNodeBox(node, fontSize);
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
}: {
  node: MindMapNode;
  x: number;
  y: number;
  fontSize: number;
  isCenter: boolean;
}) {
  const { textW, textH, label } = computeNodeBox(node, fontSize);
  const colors = scoreToNodeColors(node.empathyCount, isCenter);

  return (
    <g data-node-id={node.id} transform={`translate(${x - textW / 2}, ${y - textH / 2})`}>
      <rect
        width={textW}
        height={textH}
        rx={textH / 2}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={isCenter ? 2.5 : 1}
      />
      <text
        x={textW / 2}
        y={textH / 2 + fontSize * 0.32}
        textAnchor="middle"
        fill={colors.text}
        fontSize={fontSize}
        fontWeight={isCenter ? 700 : 500}
        fontFamily={FONT}
        style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

export function MindMap2D({
  graph,
  centerId,
  onNodeClick,
  onNodeDoubleClick,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const clickRef = useRef<{ nodeId: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    active: boolean;
    pointerId: number;
  } | null>(null);

  const [size, setSize] = useState({ w: 360, h: 640 });
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

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
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [graph, size.w, size.h]);

  const resetView = useCallback(() => {
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const pickNodeAt = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      return hitTestNode(svg, clientX, clientY, layout.nodes);
    },
    [layout.nodes],
  );

  const handleNodeTap = useCallback(
    (node: MindMapNode) => {
      const pending = clickRef.current;
      if (pending?.nodeId === node.id) {
        clearTimeout(pending.timer);
        clickRef.current = null;
        onNodeDoubleClick?.(node);
        return;
      }

      clickRef.current = {
        nodeId: node.id,
        timer: setTimeout(() => {
          clickRef.current = null;
          if (node.id === centerId) {
            resetView();
            return;
          }
          onNodeClick?.(node);
        }, DOUBLE_CLICK_MS),
      };
    },
    [centerId, onNodeClick, onNodeDoubleClick, resetView],
  );

  useEffect(
    () => () => {
      if (clickRef.current) clearTimeout(clickRef.current.timer);
    },
    [],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      active: false,
      pointerId: e.pointerId,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;

    if (!drag.active) {
      const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (dist >= DRAG_THRESHOLD) {
        drag.active = true;
        if (clickRef.current) {
          clearTimeout(clickRef.current.timer);
          clickRef.current = null;
        }
      }
    }

    if (drag.active) {
      setRotation((r) => r + dx * 0.45);
      setPan((p) => ({
        x: p.x + dx * 0.35,
        y: p.y + dy * 0.35,
      }));
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      if (!drag.active) {
        const node = pickNodeAt(e.clientX, e.clientY);
        if (node) handleNodeTap(node);
      }

      dragRef.current = null;
    },
    [handleNodeTap, pickNodeAt],
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.max(0.65, Math.min(1.6, z + delta)));
  }, []);

  const viewTransform = useMemo(() => {
    const { centerX, centerY } = layout;
    return `translate(${pan.x}px, ${pan.y}px) translate(${size.w / 2}px, ${size.h / 2}px) rotate(${rotation}deg) scale(${zoom}) translate(${-centerX}px, ${-centerY}px)`;
  }, [layout, pan.x, pan.y, rotation, zoom, size.w, size.h]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full min-h-0 touch-none select-none overflow-hidden bg-[#060a10] ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div className="absolute inset-0 cursor-grab active:cursor-grabbing" style={{ transform: viewTransform }}>
        <svg
          ref={svgRef}
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
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
              stroke="rgba(29, 155, 240, 0.45)"
              strokeWidth={Math.max(1.2, Math.min(3.5, Math.log2(Math.abs(link.empathyCount) + 2)))}
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
            />
          ))}
        </svg>
      </div>

      <button
        type="button"
        onClick={resetView}
        className="absolute right-3 top-3 z-10 rounded-full border border-[var(--border)] bg-[var(--card)]/95 px-3 py-1.5 text-xs backdrop-blur"
      >
        ⊙ 초기화
      </button>

      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] text-[var(--muted)]">
        드래그 → 지구본처럼 회전 · 클릭 → 중심 이동 · 더블클릭 → 연결 · 휠 → 확대/축소
      </p>
    </div>
  );
}
