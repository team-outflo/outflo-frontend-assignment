import { Handle, Position, useReactFlow, Node } from "@xyflow/react";
import { CircleMinus, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { arrange } from "../utils/arrange";
import { useCampaignStore } from "@/api/store/campaignStore";

export default function EndNode({ id, data: { allowDeletion = false } }) {
  const instance = useReactFlow();
  const {mode } = useCampaignStore()

  return (
    <div className="relative group">
      <Handle
        type="target"
        position={Position.Top}
        className="invisible w-2 !h-2 !bg-slate-400 !border-0"
      />
      <div className="bg-white px-4 py-2.5 rounded-lg border border-slate-300">
        <div className="flex items-center justify-between gap-3 min-w-[100px]">
          <div className="flex items-center gap-2">
            <CircleMinus className="w-4 h-4 text-slate-600" />
            <span className="font-medium text-sm text-slate-700">End of sequence</span>
          </div>
          {allowDeletion && mode === "edit" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                instance.updateNode(id, () => ({
                  type: "add-end",
                }));
                setTimeout(() => {
                  const nodes = arrange(instance.getNodes(), instance.getEdges(), "root")
                  instance.setNodes(nodes)
                }, 0)
              }}
              className="h-5 w-5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded group-hover:opacity-100 opacity-0 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
