import { Node, XYPosition } from "@xyflow/react";

export const createAddEndNode = (position: XYPosition): Node => {
  const id = `add-end-${Date.now()}`;
  return {
    id,
    type: "add-end",
    data: {},
    position,
    draggable: false,
  };
};
