import { Button } from "@/components/ui/button";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Bolt, LucideIcon, Trash2 } from "lucide-react";

import { ActionPopover } from "../components/config/ActionPopover";
import { useSelectedActionContext } from "../context/SelectedActionContext";
import { useDeleteNode } from "./hooks";
import { useRef, useState } from "react";
import ConfirmNodeDeleteDialog from "../components/ConfirmNodeDelete";
import useSequenceConfig from "../queries/use-sequence-config";

import getIcon from "../components/icon-map";
import { campaignStore, useCampaignStore } from "@/api/store/campaignStore";
import { LeadsTableModal } from "../components/LeadsTable";
import { LeadsSummaryPopover } from "../components/LeadsSummaryPopover";
import { useQuery } from "@tanstack/react-query";
import { getSequenceStats } from "@/api/leads/leadsApi";

const hasConfig = ["SEND_CONNECTION_REQUEST", "SEND_MESSAGE", "SEND_INMAIL", "SEND_FREE_INMAIL"];

export default function LinkedInActionNode({
  data,
  id,
}: {
  id: string;
  data: {
    actionId?: string;
    campaignSequenceId?: string;
    type: "single" | "multiple" | "conditional";
    actionType: string;
  };
}) {
  const { data: conf } = useSequenceConfig();
  const Icon = getIcon[conf.sequence[data.actionType]?.icon] ?? Bolt;
  const [showLeads, setShowLeads] = useState(false);

  const mode = campaignStore.getState().mode as 'edit' | 'view';
  const { campaign } = useCampaignStore();
  const campaignId = campaign?.id;

  // Fetch stats for view mode to display processed + failed count
  const { data: statsData } = useQuery<{
    sequences?: Array<{
      sequenceId: string;
      action: string;
      waiting: number;
      processed: number;
      failed: number;
    }>;
  }>({
    queryKey: ["sequence-stats", campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error("Campaign ID is required");
      const response = await getSequenceStats(campaignId);
      return (response.data as any) || {};
    },
    enabled: mode === "view" && !!campaignId && !!data.campaignSequenceId,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Find stats for this specific sequence
  const stats = statsData?.sequences?.find(
    (seq) => seq.sequenceId === data.campaignSequenceId
  );
  
  const processedAndFailedCount = (stats?.processed ?? 0) + (stats?.failed ?? 0);

  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();
  const usesPopover =
    data.actionType === "LIKE_A_POST" || data.actionType === "ENDORSE_SKILLS";

  const deleteNode = useDeleteNode();

  const [showDeleteConfirmationDialog, setShowDeleteConfirmationDialog] =
    useState(false);
  const willBeDeleted = useRef([]);

  const { setSelectedActionNode, selectedActionNode } =
    useSelectedActionContext();

  const nodeContent = (
    <div className="relative transition-visibility duration-300">
      <Handle
        type="target"
        position={Position.Top}
        className="invisible w-0 h-0 bg-slate-400 border-1 border-white"
      />
      {mode === "view" && data.campaignSequenceId && (
        <LeadsSummaryPopover 
          campaignSequenceId={data.campaignSequenceId}
          onOpenLeadsTable={() => {
            setShowLeads(true);
          }}
        >
        <button
          className="absolute -top-3 -right-3 bg-white rounded-full px-2 py-1 shadow-md border border-gray-200 text-gray-700 hover:text-primary hover:bg-primary-foreground transition-all hover:shadow-lg min-w-[32px] flex items-center justify-center"
          title="View analytics for this stage"
        >
          <span className="text-sm font-semibold">{processedAndFailedCount}</span>
        </button>
        </LeadsSummaryPopover>
      )}
      <div
        // onClick={usesPopover || hasConfig ? undefined : data.onConfigure}
        className={
          "group bg-white rounded-lg border border-slate-300 hover:shadow-lg transition-all duration-300" +
          (usesPopover
            ? " cursor-pointer hover:shadow-lg transition-all duration-300"
            : "")
        }
      >
        <div className="px-4 py-3 flex items-center justify-between gap-3 min-w-[180px]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-primary">
              <Icon className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm text-slate-900">
              {conf.sequence[data.actionType]?.label}
            </span>
          </div>
          {mode === "edit" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                const { deletions } = deleteNode(id);
                willBeDeleted.current = deletions;
                setShowDeleteConfirmationDialog(true);
              }}
              className="group-hover:opacity-100 opacity-0 h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
      {/* <pre className="absolute top-100 text-xs">{JSON.stringify(data, null, 2)}</pre> */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="invisible w-1 h-1 bg-slate-400 border-1 border-white"
      />
    </div>
  );

  if (mode === "view") {
    return <>
      {data.campaignSequenceId && (
        <LeadsTableModal
          key={data.campaignSequenceId}
          campaignSequenceId={data.campaignSequenceId}
          title="Analytics"
          onClose={() => setShowLeads(false)}
          isOpen={showLeads}
        />
      )}
      <div
        onClick={() => {
          // Make nodes clickable in view mode to open drawer (but text will be disabled)
          if (hasConfig.includes(data.actionType)) {
            setSelectedActionNode(id);
          }
        }}
        className={hasConfig.includes(data.actionType) ? "cursor-pointer" : ""}
      >
        {usesPopover ? (
          <ActionPopover nodeId={id} actionType={data.actionType} viewMode={true}>
            {nodeContent}
          </ActionPopover>
        ) : (
          nodeContent
        )}
      </div>
    </>
  }

  if (usesPopover) {
    return (
      <>
        <ConfirmNodeDeleteDialog
          isOpen={showDeleteConfirmationDialog}
          onKeep={(e) => {
            e.stopPropagation();
            setShowDeleteConfirmationDialog(false);
          }}
          onDelete={(e) => {
            e.stopPropagation();

            const { nodes, edges } = deleteNode(id);
            setNodes(nodes);
            setEdges(edges);
          }}
          deletions={willBeDeleted.current}
        />
        <ActionPopover nodeId={id} actionType={data.actionType} viewMode={false}>
          {nodeContent}
        </ActionPopover>
      </>
    );
  }

  return (
    <>
      {data.campaignSequenceId && (
        <LeadsTableModal
          key={data.campaignSequenceId}
          campaignSequenceId={data.campaignSequenceId}
          title="Analytics"
          onClose={() => setShowLeads(false)}
          isOpen={showLeads}
        />
      )}
      <ConfirmNodeDeleteDialog
        isOpen={showDeleteConfirmationDialog}
        onKeep={() => {
          setShowDeleteConfirmationDialog(false);
        }}
        onDelete={() => {
          const { nodes, edges } = deleteNode(id);
          setNodes(nodes);
          setEdges(edges);
        }}
        deletions={willBeDeleted.current}
      />
      <div
        onClick={() => {
          if (hasConfig.includes(data.actionType)) {
            setSelectedActionNode(id);
          }
        }}
      >
        {nodeContent}
      </div>
    </>
  );
}
