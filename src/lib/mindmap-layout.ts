import type { MindMapGraph, MindMapNode } from "./word-service";
import { formatScore } from "./score-color";

export type LayoutNode = {
  node: MindMapNode;
  x: number;
  y: number;
  fontSize: number;
  ring: number;
  isCenter: boolean;
};

export type LayoutLink = {
  source: { x: number; y: number };
  target: { x: number; y: number };
  empathyCount: number;
};

export type MindMapLayout = {
  nodes: LayoutNode[];
  links: LayoutLink[];
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export type ContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
};

const MIN_FONT = 10;
const CENTER_FONT = 18;
const SATELLITE_FONT = 13;
const MAX_PER_RING = 36;

/** 노드 pill 크기 — 렌더·히트테스트 공통 */
export function computeNodeBox(node: MindMapNode, fontSize: number) {
  const padX = Math.max(10, fontSize * 0.65);
  const padY = Math.max(6, fontSize * 0.45);
  const label = `${node.text} (${formatScore(node.empathyCount)})`;
  const textW = Math.max(fontSize * 2.2, label.length * fontSize * 0.74 + padX * 2);
  const textH = fontSize + padY * 2;
  return { padX, padY, textW, textH, label };
}

export function computeContentBounds(layoutNodes: LayoutNode[]): ContentBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const ln of layoutNodes) {
    const { textW, textH } = computeNodeBox(ln.node, ln.fontSize);
    minX = Math.min(minX, ln.x - textW / 2);
    minY = Math.min(minY, ln.y - textH / 2);
    maxX = Math.max(maxX, ln.x + textW / 2);
    maxY = Math.max(maxY, ln.y + textH / 2);
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, cx: 0.5, cy: 0.5, w: 1, h: 1 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    w: Math.max(maxX - minX, 1),
    h: Math.max(maxY - minY, 1),
  };
}

export function computeFitView(
  bounds: ContentBounds,
  viewportW: number,
  viewportH: number,
  padding = 28,
) {
  const zoom = Math.min(
    (viewportW - padding * 2) / bounds.w,
    (viewportH - padding * 2) / bounds.h,
    2.2,
  );
  return {
    pan: {
      x: viewportW / 2 - bounds.cx * zoom,
      y: viewportH / 2 - bounds.cy * zoom,
    },
    zoom: Math.max(0.25, zoom),
  };
}

function satelliteFontSize(total: number, ring: number): number {
  return Math.max(MIN_FONT, SATELLITE_FONT - Math.floor(total / 16) - ring * 0.4);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function nodeDepth(node: MindMapNode, centerId?: string): number {
  if (node.id === centerId || node.group === "center") return 0;
  return node.depth ?? 1;
}

export function computeRadialLayout(
  graph: MindMapGraph,
  viewportW: number,
  viewportH: number,
): MindMapLayout {
  const nodeCount = graph.nodes.length;
  const scale = Math.min(2.8, 1 + nodeCount / 45);
  const w = Math.max(320, Math.round(viewportW * scale));
  const h = Math.max(320, Math.round(viewportH * scale));
  const centerX = w / 2;
  const centerY = h / 2;
  const maxR = Math.min(w, h) * 0.47;

  const centerNode =
    graph.nodes.find((n) => n.group === "center") ??
    graph.nodes.find((n) => n.id === graph.centerId) ??
    graph.nodes[0];

  const byDepth = new Map<number, MindMapNode[]>();
  for (const node of graph.nodes) {
    if (node.id === centerNode?.id) continue;
    const depth = nodeDepth(node, graph.centerId);
    const list = byDepth.get(depth) ?? [];
    list.push(node);
    byDepth.set(depth, list);
  }

  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  const ringGroups: MindMapNode[][] = [];
  for (const depth of depths) {
    const sorted = (byDepth.get(depth) ?? []).sort((a, b) => b.empathyCount - a.empathyCount);
    ringGroups.push(...chunk(sorted, MAX_PER_RING));
  }

  const ringCount = Math.max(ringGroups.length, 1);
  const radii = Array.from({ length: ringCount }, (_, i) => {
    const t = (i + 1) / ringCount;
    return maxR * (0.38 + t * 0.62);
  });

  const layoutNodes: LayoutNode[] = [];
  const posById = new Map<string, { x: number; y: number }>();
  const satelliteTotal = graph.nodes.length - (centerNode ? 1 : 0);

  if (centerNode) {
    layoutNodes.push({
      node: centerNode,
      x: centerX,
      y: centerY,
      fontSize: nodeCount > 80 ? CENTER_FONT - 2 : CENTER_FONT,
      ring: -1,
      isCenter: true,
    });
    posById.set(centerNode.id, { x: centerX, y: centerY });
  }

  ringGroups.forEach((ringNodes, ri) => {
    const r = radii[ri] ?? maxR * 0.9;
    const fontSize = satelliteFontSize(satelliteTotal, ri);
    ringNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / ringNodes.length - Math.PI / 2 + ri * 0.06;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      layoutNodes.push({ node, x, y, fontSize, ring: ri, isCenter: false });
      posById.set(node.id, { x, y });
    });
  });

  const links: LayoutLink[] = [];
  for (const link of graph.links) {
    const s = posById.get(link.source);
    const t = posById.get(link.target);
    if (s && t) links.push({ source: s, target: t, empathyCount: link.empathyCount });
  }

  return { nodes: layoutNodes, links, width: w, height: h, centerX, centerY };
}
