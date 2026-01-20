import { Handle, Position } from "@xyflow/react";
import { Send } from "lucide-react";

export default function LinkedInActionNode({
  data,
}: {
  data: {
    icon?: any;
    label: string;
    onDelete?: () => void;
  };
}) {
  return (
    <div className="bg-white rounded-lg px-4 py-3 min-w-[180px]">
      <div className="flex items-center gap-3">
        <Send className="w-5 h-5 text-gray-700" />
        <div className="text-gray-900 font-medium text-base">Campaign Start</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="invisible !bg-gray-400 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
}
