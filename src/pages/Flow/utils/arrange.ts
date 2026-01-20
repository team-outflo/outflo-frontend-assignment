import type { Node, Edge } from "@xyflow/react";

type Options = {
  levelGap?: number;
  siblingGap?: number;
};

export function arrange(
  nodes: Node[],
  edges: Edge[],
  rootId: string,
  options: Options = {}
) {
  if (nodes.length < 2) return nodes;

  const LEVEL_GAP = options.levelGap ?? 50;
  const SIBLING_GAP = options.siblingGap ?? 60;

  const childrenMap = new Map();
  edges.forEach((e) => {
    if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
    childrenMap.get(e.source).push(e.target);
  });

  const sizeMap = new Map();
  const nodeMap = new Map();
  nodes.forEach((n) => {
    sizeMap.set(n.id, {
      w: n.measured?.width ?? 180,
      h: n.measured?.height ?? 50,
    });
    nodeMap.set(n.id, n);
  });

  const boxCache = new Map();

  function computeBox(nodeId) {
    if (boxCache.has(nodeId)) return boxCache.get(nodeId);

    const nodeSize = sizeMap.get(nodeId) ?? { w: 180, h: 50 };
    const children = childrenMap.get(nodeId) || [];

    if (children.length === 0) {
      const box = { width: nodeSize.w, height: nodeSize.h };
      boxCache.set(nodeId, box);
      return box;
    }

    if (children.length === 1) {
      const childBox = computeBox(children[0]);
      const width = Math.max(nodeSize.w, childBox.width);
      const height = nodeSize.h + LEVEL_GAP + childBox.height;

      const box = { width, height };
      boxCache.set(nodeId, box);
      return box;
    }

    const childBoxes = children.map((c) => computeBox(c));

    const totalWidth =
      childBoxes.reduce((sum, b) => sum + b.width, 0) +
      SIBLING_GAP * (childBoxes.length - 1);

    const width = Math.max(nodeSize.w, totalWidth);
    const height =
      nodeSize.h +
      LEVEL_GAP +
      40 +
      Math.max(...childBoxes.map((b) => b.height));

    const box = { width, height };
    boxCache.set(nodeId, box);
    return box;
  }

  const posMap = new Map();

  function place(nodeId, xCenter, y) {
    const nodeSize = sizeMap.get(nodeId) ?? { w: 180, h: 50 };
    const box = boxCache.get(nodeId);
    const children = childrenMap.get(nodeId) || [];
  
    // Position node (same as before)
    posMap.set(nodeId, {
      x: xCenter - nodeSize.w / 2,
      y,
    });
  
    if (children.length === 0) return;
  
    // --------------------------
    // YOUR ORIGINAL Y LOGIC
    // --------------------------
    const neg = edges.find((edge) => edge.source === nodeId)?.data?.outcome === "negative";
    const pos = edges.find((edge) => edge.source === nodeId)?.data?.outcome === "positive";
  
    const childY =
      y +
      nodeSize.h +
      LEVEL_GAP * 3 +
      (neg ? LEVEL_GAP : 0);
  
    // single child → your original behavior
    if (children.length === 1) {
      place(children[0], xCenter, childY - LEVEL_GAP * 2);
      return;
    }
  
    // --------------------------
    // NEW: SYMMETRIC X POSITIONING
    // --------------------------
    const childBoxes = children.map((c) => boxCache.get(c));
  
    // slotWidth = max child width
    const slotWidth = Math.max(...childBoxes.map((b) => b.width));
  
    const totalSlotsWidth =
      slotWidth * children.length +
      SIBLING_GAP * (children.length - 1);
  
    // center siblings around xCenter
    let cursor = xCenter - totalSlotsWidth / 2;
  
    const parentNode = nodeMap.get(nodeId);
    const isMultipleType = parentNode?.data?.type === "multiple";
  
    children.forEach((childId, i) => {
      const cb = childBoxes[i];
      const slotCenter = cursor + slotWidth / 2;
  
      // Keep your original Y logic (including step offset)
      let finalChildY = childY;
      if (isMultipleType && children.length > 1) {
        finalChildY = childY - (LEVEL_GAP * i) * 1.3;
      }
  
      // Place child
      place(childId, slotCenter, finalChildY);
  
      cursor += slotWidth + SIBLING_GAP;
    });
  }
  

  computeBox(rootId);
  place(rootId, 0, 0);

  return nodes.map((n) => {
    const p = posMap.get(n.id);
    if (!p) return n;

    return {
      ...n,
      position: { x: p.x, y: p.y },
      draggable: false,
      dragging: false,
    };
  });
}
