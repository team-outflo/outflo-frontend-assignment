import {
  Background,
  Controls,
  ReactFlow,
  useNodesState,
  useEdgesState,
  MiniMap,
  Node,
  Edge,
  useReactFlow,
  getIncomers,
  getOutgoers,
  getConnectedEdges,
  useUpdateNodeInternals,
  isNode,
  SmoothStepEdge,
} from "@xyflow/react";
import CustomSmoothStepEdge from "./edges/CustomSmoothStepEdge";
import "@xyflow/react/dist/style.css";

import AddAndEndNode from "./nodes/AddAndEndNode";
import AddNode from "./nodes/AddNode";
import LinkedInActionNode from "./nodes/LinkedInActionNode";
import {
  AlertTriangle,
  LucideFullscreen,
  Maximize2,
  Minimize2,
  Play,
  Rocket,
  Trash2,
  Wand2,
} from "lucide-react";
import DelayNode from "./nodes/DelayNode";
import StartNode from "./nodes/StartNode";
import EndNode from "./nodes/EndNode";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import ActionDrawer from "./components/config/ActionDrawer";
import { useSelectedActionContext } from "./context/SelectedActionContext";
import { arrange } from "./utils/arrange";
import { EmptyState } from "./components/EmptyState";
import ConnectionNote from "./components/config/ConnectionNote";
import { Button } from "@/components/ui/button";
import { campaignStore } from "@/api/store/campaignStore";
import { deleteSubtree } from "./nodes/hooks/useDeleteNode";
import { ClearCanvasDialog } from "./components/clear-canvas-dialog";
import { buildJson } from "./utils/build-json";
import useSequenceConfig from "./queries/use-sequence-config";
import { jsonToNodesAndEdges } from "./utils/json-to-nodes-edges";
import { useFullscreen } from "@/hooks/use-fullscreen";

const inodes: Node[] = [
  {
    type: "start",
    id: "root",
    data: {
      icon: Rocket,
      label: "Start Campaign",
    },
    measured: { width: 175, height: 54 },
    position: {
      x: 0,
      y: 0,
    },
    draggable: false,
  },
  {
    type: "add",
    id: "rootc",

    measured: { width: 128, height: 40 },
    data: {},
    position: {
      x: 0,
      y: 0,
    },
    draggable: false,
  },
];

const iedges: Edge[] = [
  {
    id: "edge-1",
    source: "root",
    target: "rootc",
  },
];

const nodeTypes = {
  start: StartNode,
  add: AddNode,
  "add-end": AddAndEndNode,
  action: LinkedInActionNode,
  delay: DelayNode,
  end: EndNode,
};

export default function CampaignSequenceFlow({
  workflowData,
  updateWorkflow,
  csvConfigForViewMode,
  viewModeCampaignData,
  viewMode,
  setShowTemplatesModal
}) {
  const { campaign, onNodesChange, onEdgesChange, setNodes, setEdges } =
    campaignStore.getState();
  const nodes = campaign.sequenceDraft?.nodes || [];
  const edges = campaign.sequenceDraft?.edges || [];

  const { data: config, isLoading, isError } = useSequenceConfig();

  const { mode } = campaignStore.getState();

  // console.log("Before", {nodes:nodes.map(({id, data, type, position, }) => ({id,type,data,position})),edges})
  // const tree = buildJson("root", nodes, edges, config);
  // const ne = jsonToNodesAndEdges(tree, config, true);

  // console.log("After", {nodes:ne.nodes,edges:ne.edges})

  const instance = useReactFlow();
  const { selectedActionNode, setSelectedActionNode } =
    useSelectedActionContext();
  const updateNodeInternals = useUpdateNodeInternals();

  const wrapperRef = useRef(null);

  // Override fitView to always use maxZoom: 0.5
  useEffect(() => {
    if (instance && instance.fitView) {
      const originalFitView = instance.fitView.bind(instance);
      
      // Override fitView method
      instance.fitView = (options = {}) => {
        return originalFitView({
          ...options,
          maxZoom: 1, // Always use 0.5 zoom when fitView is called
          padding: options.padding ?? 1, // Default padding if not specified
        });
      };
    }
  }, [instance]);

  const [translateExtent, setTranslateExtent] = useState<
    [[number, number], [number, number]]
  >([
    [0, 0],
    [Infinity, Infinity],
  ]);

  const centerRootTop = (rootId) => {
    requestAnimationFrame(() => {
      const root = instance.getNode(rootId);
      if (!root || !root.measured) return;

      const wrapper = wrapperRef.current;
      console.log({ viewportWidth: wrapper });
      if (!wrapper) return;

      const viewportWidth = wrapper.clientWidth;
      console.log({ viewportWidth });
      const zoom = instance.getViewport().zoom;

      // compute new viewport that puts root at top-center
      const nodeCenterX = root.position.x + root.measured.width / 2;
      const x = viewportWidth / 2 - nodeCenterX * zoom;
      const y = 0; // top padding

      instance.setViewport({ x, y, zoom }, { duration: 0 });
    });
  };

  const node = selectedActionNode ? instance.getNode(selectedActionNode) : null;

  const [centeredOnce, setCenteredOnce] = useState(false);

  console.log("nodes", nodes);
  console.log("edges", edges);

  const hasFittedViewRef = useRef(false);

  useEffect(() => {
    const i = setTimeout(() => {
      const nodesWithBounds = nodes.map((node) => {
        const bounds = instance.getNodesBounds([node.id]);
        return {
          ...node,
          measured: {
            height: bounds.height,
            width: bounds.width,
          },
        };
      });
      const n = arrange(nodesWithBounds, edges, "root");
      setNodes(n);
    }, 10);

    return () => clearTimeout(i);
  }, [centeredOnce, instance, setNodes, nodes.length, edges.length]);

  // Calculate translate extent based on node bounds
  useEffect(() => {
    if (nodes.length > 0 && !isLoading) {
      // Wait for nodes to be arranged and measured
      const timeout = setTimeout(() => {
        const allNodes = instance.getNodes();

        if (allNodes.length > 0) {
          // Calculate bounds manually
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;

          allNodes.forEach((node) => {
            const bounds = instance.getNodesBounds([node.id]);
            const nodeLeft = node.position.x;
            const nodeTop = node.position.y;
            const nodeRight = nodeLeft + bounds.width;
            const nodeBottom = nodeTop + bounds.height;

            minX = Math.min(minX, nodeLeft);
            minY = Math.min(minY, nodeTop);
            maxX = Math.max(maxX, nodeRight);
            maxY = Math.max(maxY, nodeBottom);
          });

          // Increase padding based on number of nodes and edges
          // More nodes/edges = more padding to allow for connections
          const basePadding = 10;
          const nodeCountPadding = allNodes.length * 0;
          const edgeCountPadding = edges.length * 0;
          const padding = basePadding + nodeCountPadding + edgeCountPadding;

          setTranslateExtent([
            [minX - padding, minY - padding],
            [maxX + padding, maxY + padding],
          ]);
        }
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [nodes, edges, instance, isLoading]);

  // Fit view after nodes are loaded and arranged (only once on initial load)
  // Position root node at the top instead of centering
  useEffect(() => {
    if (!isLoading && nodes.length > 0 && !hasFittedViewRef.current) {
      const fitViewTimeout = setTimeout(() => {
        // First fit the view to show all nodes with less zoom
        // Note: fitView is overridden to use maxZoom: 0.5, so this will use 0.5
        instance.fitView({
          padding: 0, // Add padding around the view
          duration: 0, // No animation for initial fit
          minZoom: 1, // Minimum zoom level
          maxZoom: 1, // Maximum zoom level
        });

        // Then position root node at the top
        setTimeout(() => {
          const rootNode = instance.getNode("root");
          if (rootNode && rootNode.measured && wrapperRef.current) {
            const wrapper = wrapperRef.current;
            const viewportWidth = wrapper.clientWidth;
            const viewport = instance.getViewport();
            const zoom = viewport.zoom;

            // Calculate position to put root node at top-center
            const nodeCenterX = rootNode.position.x + (rootNode.measured.width || 175) / 2;
            
            // Center horizontally, position at top with padding
            const x = viewportWidth / 2 - nodeCenterX * zoom;
            const y = 0; // Top padding

            instance.setViewport({ x, y, zoom }, { duration: 300 });
          }
          hasFittedViewRef.current = true;
        }, 50);
      }, 200); // Wait a bit longer for nodes to be fully arranged

      return () => clearTimeout(fitViewTimeout);
    }
  }, [isLoading, nodes.length, instance]);

  // Auto-scroll down when page loads - scroll the parent container
  useEffect(() => {
    if (!isLoading && nodes.length > 0 && wrapperRef.current) {
      const scrollTimeout = setTimeout(() => {
        if (wrapperRef.current) {
          // Find the closest scrollable parent or use window
          let scrollableParent: HTMLElement | null = null;
          let current: HTMLElement | null = wrapperRef.current.parentElement;
          
          // Traverse up the DOM to find a scrollable parent
          while (current) {
            const style = window.getComputedStyle(current);
            const hasOverflow = style.overflow === 'auto' || 
                               style.overflow === 'scroll' || 
                               style.overflowY === 'auto' || 
                               style.overflowY === 'scroll';
            
            if (hasOverflow && current.scrollHeight > current.clientHeight) {
              scrollableParent = current;
              break;
            }
            current = current.parentElement;
          }
          
          // If no scrollable parent found, scroll the window
          if (scrollableParent) {
            scrollableParent.scrollTo({
              top: scrollableParent.scrollHeight,
              behavior: "smooth",
            });
          } else {
            // Scroll the window/document
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: "smooth",
            });
          }
        }
      }, 500); // Wait longer for layout to settle

      return () => clearTimeout(scrollTimeout);
    }
  }, [isLoading, nodes.length]);

  const [showClearCanvasDialog, setShowClearCanvasDialog] = useState(false);

  const { ref, isFullscreen, toggleFullscreen } =
    useFullscreen<HTMLDivElement>();

  if (isError) {
    return (
      <div
        className="relative h-screen"
        style={{
          height: "calc(100vh - 240px)",
          // height: "100vh",
          backgroundColor: "white",
          width: "100%",
          padding: isFullscreen ? "24px" : undefined,
        }}
        ref={wrapperRef}
      >
        <div className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-red-500" />
          <p className="mt-2 text-gray-700">
            Error loading sequence builder. Please try again.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{
        height: "calc(100vh - 160px)",
        backgroundColor: "white",
        width: "100%",
        padding: isFullscreen ? "24px" : undefined,
        overflow: "auto", // Enable both vertical and horizontal scrolling
      }}
      ref={wrapperRef}
    >
      {!isLoading &&
        <ReactFlow
          zoomOnScroll={false}   // Enable zoom on scroll (Ctrl/Cmd + scroll)
          zoomOnPinch={false}
          panOnScroll={true}   // Disable pan on scroll to allow native scrolling
          panOnDrag={true}      // Enable pan on drag
          translateExtent={translateExtent}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodes={nodes}
          edges={edges}
          edgeTypes={{
            smoothstep: SmoothStepEdge,
            customSmoothStep: CustomSmoothStepEdge,
          }}
          defaultEdgeOptions={{
            animated: false,
            type: "customSmoothStep",
            labelStyle: { fill: "#64748b", fontSize: 11, fontWeight: 500 },
            labelBgStyle: { fill: "#ffffff", fillOpacity: 1 },
            labelBgPadding: [6, 8],
            labelBgBorderRadius: 4,
            style: { stroke: "#cbd5e1", strokeWidth: 1.5, strokeLinecap: "butt" },
          }}
          nodesConnectable={false}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          style={{
            width: "100%",
            height: "100%", // 100% of parent wrapper (which is calc(100vh - 240px))
            overflow: "auto",
          }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Background bgColor="white" color="white" />
          <Controls orientation="horizontal" />
          {/* <MiniMap nodeStrokeWidth={3} /> */}
          {mode === "edit" && (
            <div className="relative ">

              <div
                className="absolute top-0 right-4 gap-2 flex z-50"

              >
                {/* <button
           className="p-2 rounded-lg bg-background border border-border  hover:border-primary/10 hover:bg-accent transition-colors shadow-sm"
            title="Open templates"
            onClick={() => {
              toggleFullscreen();
            }}
          >
            {isFullscreen &&
              <Minimize2 className="w-4 h-4 text-primary" />}
            {!isFullscreen &&
              <Maximize2 className="w-4 h-4 text-primary" />}
          </button> */}
                <button
                  className="p-2 rounded-lg bg-background border border-border  hover:border-primary/10 hover:bg-accent transition-colors shadow-sm"
                  title="Open templates"
                  onClick={() => {
                    setShowTemplatesModal(true);
                  }}
                >
                  <Wand2 className="w-4 h-4 text-primary" />
                </button>
                {nodes.length > 0 && (
                  <button
                    className="p-2 rounded-lg bg-background hover:bg-destructive/10 border border-border hover:border-destructive/10  transition-colors shadow-sm"
                    title="Clear the workflow"
                    onClick={() => {
                      setShowClearCanvasDialog(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                )}
                {/* <button onClick={() => {
              console.log("config generated json",buildJson("root", nodes, edges, config))
            }}>
              Generate json
            </button> */}
              </div>
            </div>
          )}
        </ReactFlow>
      }





      {nodes.length === 0 && mode === "edit" && (
        <EmptyState
          isLoading={isLoading}
          onAddNode={() => {
            setNodes(inodes);
            setEdges(iedges);
          }}
        />
      )}

      <ActionDrawer
        isOpen={selectedActionNode && node.data?.actionType !== "SEND_CONNECTION_REQUEST"}
        onClose={() => setSelectedActionNode("")}
        nodeId={selectedActionNode}
        nodes={nodes}
        setNodes={setNodes}
        workflowData={workflowData}
        updateWorkflow={updateWorkflow}
        csvConfigForViewMode={csvConfigForViewMode}
        viewModeCampaignData={viewModeCampaignData}
        viewMode={viewMode}
      />


      {node && node.data?.actionType === "SEND_CONNECTION_REQUEST" && (
        <ConnectionNote
          isOpen={node && node.data?.actionType === "SEND_CONNECTION_REQUEST"}
          onClose={() => {
            console.log("wefioes");
            setSelectedActionNode("");
          }}
          workflowData={workflowData}
          updateWorkflow={updateWorkflow}
          csvConfigForViewMode={csvConfigForViewMode}
          viewModeCampaignData={viewModeCampaignData}
          nodeId={node.id}
        />
      )}

      <ClearCanvasDialog
        isOpen={showClearCanvasDialog}
        onConfirm={() => {
          setEdges([]);
          setNodes([]);
          instance.fitView({
            maxZoom: 1, // Maximum zoom level
            padding: 1, // Default padding if not specified
          });
          // centeredOnce.current = false;

          setShowClearCanvasDialog(false);
        }}
        onCancel={() => setShowClearCanvasDialog(false)}
      />
    </div>
  );
}
