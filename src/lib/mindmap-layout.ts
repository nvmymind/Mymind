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
const CENTER_FONT = 20;
const SATELLITE_FONT = 14;

function ringCapacity(ringIndex: number) {
  return ringIndex === 0 ? 8 : ringIndex === 1 ? 12 : 16;
}

function ringRadius(ringIndex: number, baseRadius: number) {
  return baseRadius * (0.55 + ringIndex * 0.38);
}

function satelliteFontSize(total: number, ring: number): number {
  const shrink = Math.floor(total / 6) + ring;
  return Math.max(MIN_FONT, SATELLITE_FONT - shrink);
}

export function computeRadialLayout(
  graph: MindMapGraph,
  viewportW: number,
  viewportH: number,
): MindMapLayout {
  const centerNode =
    graph.nodes.find((n) => n.group === "center") ??
    graph.nodes.find((n) => n.id === graph.centerId) ??
    graph.nodes[0];

  const satellites = graph.nodes
    .filter((n) => n.id !== centerNode?.id)
    .sort((a, b) => b.empathyCount - a.empathyCount);

  const baseRadius = Math.min(viewportW, viewportH) * 0.28;
  const padding = 48;

  const rings: MindMapNode[][] = [];
  let idx = 0;
  let ringIndex = 0;
  while (idx < satellites.length) {
    const cap = ringCapacity(ringIndex);
    rings.push(satellites.slice(idx, idx + cap));
    idx += cap;
    ringIndex += 1;
  }

  const maxR = rings.length > 0 ? ringRadius(rings.length - 1, baseRadius) : baseRadius;
  const neededW = Math.max(viewportW, maxR * 2 + padding * 2 + 80);
  const neededH = Math.max(viewportH, maxR * 2 + padding * 2 + 80);

  const centerX = neededW / 2;
  const centerY = neededH / 2;

  const layoutNodes: LayoutNode[] = [];

  if (centerNode) {
    layoutNodes.push({
      node: centerNode,
      x: centerX,
      y: centerY,
      fontSize: CENTER_FONT,
      ring: -1,
      isCenter: true,
    });
  }

  const posById = new Map<string, { x: number; y: number }>();
  if (centerNode) posById.set(centerNode.id, { x: centerX, y: centerY });

  rings.forEach((ringNodes, ri) => {
    const r = ringRadius(ri, baseRadius);
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
    if (s && t) {
      links.push({ source: s, target: t, empathyCount: link.empathyCount });
    }
  }

  return {
    nodes: layoutNodes,
    links,
    width: neededW,
    height: neededH,
    centerX,
    centerY,
  };
}
