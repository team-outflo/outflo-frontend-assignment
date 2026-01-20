import { Node, XYPosition } from "@xyflow/react";

export const createAddNode = (position: XYPosition): Node => {
  const id = `add-${Date.now()}`;
  return {
    id,
    type: "add",
    position,
    data: {},
    draggable: false,
  };
};
