import { Node, XYPosition } from "@xyflow/react";

export const createDelayNode = (position: XYPosition): Node => {
  const id = `delay-${Date.now()}`;
  return {
    id,
    type: "delay",
    position,
    data: {
      wait: 180,
    },
    draggable: false,
  };
};
