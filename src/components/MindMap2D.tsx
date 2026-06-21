"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MindMapGraph, MindMapNode } from "@/lib/word-service";
import {
  computeContentBounds,
  computeFitView,
  computeNodeBox,
  computeRadialLayout,
  type LayoutNode,
} from "@/lib/mindmap-layout";
import { scoreToNodeColors } from "@/lib/score-color";

type Props = {
  graph: MindMapGraph;
  centerId?: string;
  onNodeClick?: (node: MindMapNode) => void;
  onNodeDoubleClick?: (node: MindMapNode) => void;
  className?: string;
};

type ViewState = { pan: { x: number; y: number }; zoom: number };

const FONT =
  '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
const DOUBLE_CLICK_MS = 320;
const DRAG_THRESHOLD = 6;
const PAN_TO_NODE_MS = 480;
const EXPAND_MS = 700;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function animateView(
  from: ViewState,
  to: ViewState,
  duration: number,
  onFrame: (view: ViewState) => void,
): Promise<ViewState> {
  return new Promise((resolve) => {
    const start = performance.now();

    function frame(now: number) {
      const t = easeOutCubic(Math.min(1, (now - start) / duration));
      const latest: ViewState = {
        pan: { x: lerp(from.pan.x, to.pan.x, t), y: lerp(from.pan.y, to.pan.y, t) },
        zoom: lerp(from.zoom, to.zoom, t),
      };
      onFrame(latest);
      if (t < 1) requestAnimationFrame(frame);
      else resolve(latest);
    }

    requestAnimationFrame(frame);
  });
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
        strokeWidth={isCenter ? 3 : 1.5}
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
  const animatingRef = useRef(false);
  const viewRef = useRef<ViewState>({ pan: { x: 0, y: 0 }, zoom: 1 });
  const graphCenterRef = useRef<string | undefined>(graph.centerId);
  const initialFitDone = useRef(false);
  const animTokenRef = useRef(0);

  const [size, setSize] = useState({ w: 360, h: 640 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  viewRef.current = { pan, zoom };

  const applyView = useCallback((view: ViewState) => {
    viewRef.current = view;
    setPan(view.pan);
    setZoom(view.zoom);
  }, []);

  const runAnimation = useCallback(
    async (to: ViewState, duration: number) => {
      const token = ++animTokenRef.current;
      animatingRef.current = true;
      const from = viewRef.current;
      const result = await animateView(from, to, duration, (view) => {
        if (token !== animTokenRef.current) return;
        applyView(view);
      });
      if (token === animTokenRef.current) animatingRef.current = false;
      return result;
    },
    [applyView],
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

  const bounds = useMemo(() => computeContentBounds(layout.nodes), [layout.nodes]);

  const fitToContent = useCallback(
    (animated = false) => {
      const fit = computeFitView(bounds, size.w, size.h);
      if (animated) void runAnimation(fit, EXPAND_MS);
      else applyView(fit);
    },
    [applyView, bounds, runAnimation, size.h, size.w],
  );

  useEffect(() => {
    if (!initialFitDone.current) {
      initialFitDone.current = true;
      graphCenterRef.current = graph.centerId;
      fitToContent(false);
      return;
    }

    if (graph.centerId !== graphCenterRef.current) {
      graphCenterRef.current = graph.centerId;
      const currentZoom = viewRef.current.zoom;
      applyView({
        pan: {
          x: size.w / 2 - layout.centerX * currentZoom,
          y: size.h / 2 - layout.centerY * currentZoom,
        },
        zoom: currentZoom,
      });
      void runAnimation(computeFitView(bounds, size.w, size.h), EXPAND_MS);
    }
  }, [graph.centerId, layout.centerX, layout.centerY, bounds, size.w, size.h, applyView, fitToContent, runAnimation]);

  const pickNodeAt = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      return hitTestNode(svg, clientX, clientY, layout.nodes);
    },
    [layout.nodes],
  );

  const navigateToNode = useCallback(
    async (node: MindMapNode) => {
      if (animatingRef.current || node.id === centerId) return;

      const ln = layout.nodes.find((n) => n.node.id === node.id);
      if (!ln) {
        onNodeClick?.(node);
        return;
      }

      const { zoom: z } = viewRef.current;
      const target: ViewState = {
        pan: { x: size.w / 2 - ln.x * z, y: size.h / 2 - ln.y * z },
        zoom: z,
      };

      await runAnimation(target, PAN_TO_NODE_MS);
      onNodeClick?.(node);
    },
    [centerId, layout.nodes, onNodeClick, runAnimation, size.h, size.w],
  );

  const handleNodeTap = useCallback(
    (node: MindMapNode) => {
      if (animatingRef.current) return;

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
          if (node.id === centerId) return;
          void navigateToNode(node);
        }, DOUBLE_CLICK_MS),
      };
    },
    [centerId, navigateToNode, onNodeDoubleClick],
  );

  useEffect(
    () => () => {
      if (clickRef.current) clearTimeout(clickRef.current.timer);
    },
    [],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || animatingRef.current) return;
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
    if (!drag || drag.pointerId !== e.pointerId || animatingRef.current) return;

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
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      if (!drag.active && !animatingRef.current) {
        const node = pickNodeAt(e.clientX, e.clientY);
        if (node) handleNodeTap(node);
      }

      dragRef.current = null;
    },
    [handleNodeTap, pickNodeAt],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (animatingRef.current) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const cx = size.w / 2;
      const cy = size.h / 2;
      setZoom((prev) => {
        const next = Math.max(0.2, Math.min(2.5, prev * factor));
        setPan((p) => ({
          x: cx - (cx - p.x) * (next / prev),
          y: cy - (cy - p.y) * (next / prev),
        }));
        return next;
      });
    },
    [size.w, size.h],
  );

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
      <div
        className={`absolute left-0 top-0 ${animatingRef.current ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        <svg
          ref={svgRef}
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{ fontFamily: FONT, display: "block" }}
        >
          {layout.links.map((link, i) => (
            <line
              key={i}
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke="rgba(29, 155, 240, 0.45)"
              strokeWidth={Math.max(1.5, Math.min(4, Math.log2(Math.abs(link.empathyCount) + 2)))}
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
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          fitToContent(true);
        }}
        className="absolute right-3 top-3 z-10 rounded-full border border-[var(--border)] bg-[var(--card)]/95 px-3 py-1.5 text-xs backdrop-blur"
      >
        ⊙ 초기화
      </button>

      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] text-[var(--muted)]">
        드래그 → 이동 · 클릭 → 중심으로 이동 · 더블클릭 → 점수·연결 · 휠 → 확대/축소
      </p>
    </div>
  );
}
