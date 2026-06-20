import type { MindMapGraph, MindMapNode } from "./word-service";

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

const MIN_FONT = 11;
const CENTER_FONT = 18;
const SATELLITE_FONT = 13;

function ringCapacity(ringIndex: number) {
  return ringIndex === 0 ? 8 : ringIndex === 1 ? 14 : 18;
}

function satelliteFontSize(total: number, ring: number): number {
  return Math.max(MIN_FONT, SATELLITE_FONT - Math.floor(total / 8) - ring);
}

/** 고리별 반지름 — 바깥 고리가 maxR에 맞게 균등 분배 */
function ringRadii(ringCount: number, maxR: number): number[] {
  if (ringCount === 0) return [];
  if (ringCount === 1) return [maxR * 0.72];
  return Array.from({ length: ringCount }, (_, i) => {
    const t = (i + 1) / ringCount;
    return maxR * (0.45 + t * 0.55);
  });
}

export function computeRadialLayout(
  graph: MindMapGraph,
  viewportW: number,
  viewportH: number,
): MindMapLayout {
  const w = Math.max(280, viewportW);
  const h = Math.max(280, viewportH);
  const centerX = w / 2;
  const centerY = h / 2;
  const maxR = Math.min(w, h) * 0.4;

  const centerNode =
    graph.nodes.find((n) => n.group === "center") ??
    graph.nodes.find((n) => n.id === graph.centerId) ??
    graph.nodes[0];

  const satellites = graph.nodes
    .filter((n) => n.id !== centerNode?.id)
    .sort((a, b) => b.empathyCount - a.empathyCount);

  const rings: MindMapNode[][] = [];
  let idx = 0;
  let ringIndex = 0;
  while (idx < satellites.length) {
    rings.push(satellites.slice(idx, idx + ringCapacity(ringIndex)));
    idx += ringCapacity(ringIndex);
    ringIndex += 1;
  }

  const radii = ringRadii(rings.length, maxR);
  const layoutNodes: LayoutNode[] = [];
  const posById = new Map<string, { x: number; y: number }>();

  if (centerNode) {
    layoutNodes.push({
      node: centerNode,
      x: centerX,
      y: centerY,
      fontSize: CENTER_FONT,
      ring: -1,
      isCenter: true,
    });
    posById.set(centerNode.id, { x: centerX, y: centerY });
  }

  rings.forEach((ringNodes, ri) => {
    const r = radii[ri];
    const fontSize = satelliteFontSize(satellites.length, ri);
    ringNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / ringNodes.length - Math.PI / 2;
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
