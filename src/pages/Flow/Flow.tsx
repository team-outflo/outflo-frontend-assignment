import { ReactFlowProvider } from "@xyflow/react";
import CampaignSequenceFlow from "./CampaignSequenceFlow";
import SelectedActionContextProvider from "./context/SelectedActionContext";
import { TemplatesModal } from "./components/templates-modal";
import { useState } from "react";
import { campaignStore } from "@/api/store/campaignStore";

export default function Flow(props: any) {
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const { campaign, setNodes, setEdges } = campaignStore.getState();
  const nodes = campaign.sequenceDraft?.nodes || [];
  const edges = campaign.sequenceDraft?.edges || [];

  return (
    <>
      <ReactFlowProvider>
        <SelectedActionContextProvider>
          <CampaignSequenceFlow {...props} setShowTemplatesModal={setShowTemplatesModal} />
        </SelectedActionContextProvider>
      </ReactFlowProvider>

      <ReactFlowProvider>
        <TemplatesModal
          open={showTemplatesModal}
          onClose={() => {
            setShowTemplatesModal(false);
          }}
          onSelectTemplate={(nodes, edges) => {
            setEdges(edges);
            setNodes(nodes);
          }}
        />
      </ReactFlowProvider>
    </>
  );
}
