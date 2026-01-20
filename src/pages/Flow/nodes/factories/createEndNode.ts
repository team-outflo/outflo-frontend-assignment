import { Node, XYPosition } from "@xyflow/react";

export const createEndNode = (position: XYPosition): Node => {
  const id = `end-${Date.now()}`;
  return {
    id,
    type: "end",
    position,
    data: {},
    draggable: false,
  };
};
