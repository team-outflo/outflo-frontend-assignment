import { Node, XYPosition } from "@xyflow/react";

type CreateActionNodeParams = {
  position: XYPosition;
  actionType: string;
  type: "single" | "multiple" | "conditional";
  icon: string;
  label: string;
};

export const createActionNode = ({
  position,
  actionType,
  type,
}: CreateActionNodeParams): Node => {
  const id = `action-${Date.now()}`;
  return {
    id,
    type: "action",
    position,
    data: {
      actionType,
      type,
    },
    draggable: false,
  };
};
