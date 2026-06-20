"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import type React from "react";
import dynamic from "next/dynamic";
import SpriteText from "three-spritetext";
import type { MindMapGraph, MindMapLink, MindMapNode } from "@/lib/word-service";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });
const ForceGraph3DAny = ForceGraph3D as React.ComponentType<Record<string, unknown>>;

type GraphNode = MindMapNode & {
  val: number;
  fx?: number;
  fy?: number;
  fz?: number;
};

type GraphLink = MindMapLink & { width: number };

type Props = {
  graph: MindMapGraph;
  height?: number;
  onNodeClick?: (node: MindMapNode) => void;
  onBackgroundClick?: () => void;
};

const GROUP_COLOR: Record<MindMapNode["group"], string> = {
  center: "#1d9bf0",
  linked: "#6bcbff",
  trending: "#f59e0b",
};

function scaleVal(count: number) {
  return Math.max(4, Math.min(16, 4 + Math.log2(count + 1) * 2));
}

export function MindMap3D({ graph, height = 420, onNodeClick, onBackgroundClick }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = graph.nodes.map((n) => {
      const base: GraphNode = {
        ...n,
        val: scaleVal(n.empathyCount),
      };
      if (n.group === "center") {
        base.fx = 0;
        base.fy = 0;
        base.fz = 0;
        base.val = scaleVal(n.empathyCount) + 4;
      }
      return base;
    });

    const links: GraphLink[] = graph.links.map((l) => ({
      ...l,
      width: Math.max(0.5, Math.log2(l.empathyCount + 1)),
    }));

    return { nodes, links };
  }, [graph]);

  useEffect(() => {
    const t = setTimeout(() => {
      fgRef.current?.zoomToFit?.(500, 80);
    }, 800);
    return () => clearTimeout(t);
  }, [graphData]);

  const nodeThreeObject = useCallback((node: GraphNode) => {
    const sprite = new SpriteText(node.text);
    sprite.color = "#e7e9ea";
    sprite.backgroundColor = GROUP_COLOR[node.group];
    sprite.padding = 2;
    sprite.borderRadius = 4;
    sprite.textHeight = node.group === "center" ? 5.5 : 4.2;
    return sprite;
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[#05080c]"
      style={{ height }}
    >
      <ForceGraph3DAny
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#05080c"
        showNavInfo={false}
        nodeRelSize={1}
        nodeOpacity={0.92}
        linkOpacity={0.55}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={(link: { empathyCount?: number }) =>
          Math.min(2, (link.empathyCount ?? 0) / 80 + 0.5)
        }
        linkDirectionalParticleSpeed={0.006}
        linkWidth="width"
        linkColor={() => "rgba(29, 155, 240, 0.45)"}
        nodeColor={(node: { group?: MindMapNode["group"] }) =>
          GROUP_COLOR[node.group ?? "linked"]
        }
        nodeThreeObject={(node: GraphNode) => nodeThreeObject(node)}
        nodeThreeObjectExtend={true}
        onNodeClick={(node: GraphNode) => onNodeClick?.(node)}
        onBackgroundClick={onBackgroundClick}
        enableNodeDrag={true}
        warmupTicks={80}
        cooldownTicks={120}
      />
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] text-[var(--muted)]">
        드래그로 회전 · 노드 클릭 · 스크롤로 확대
      </p>
    </div>
  );
}
