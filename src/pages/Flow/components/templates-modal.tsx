import { useState, useMemo, useEffect, useRef } from "react";
import { X, Search, AlertCircle, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ReactFlow,
  Background,
  Node,
  Edge,
  MarkerType,
  useReactFlow,
  Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import StartNode from "../nodes/StartNode";
import AddNode from "../nodes/AddNode";
import AddAndEndNode from "../nodes/AddAndEndNode";
import LinkedInActionNode from "../nodes/LinkedInActionNode";
import EndNode from "../nodes/EndNode";
import DelayNode from "../nodes/DelayNode";
import { arrange } from "../utils/arrange";
import { DialogHeader, DialogFooter, Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { jsonToNodesAndEdges } from "../utils/json-to-nodes-edges";
import templates from "./templates.json";
import useSequenceConfig from "../queries/use-sequence-config";

const CAMPAIGNS: any[] = [];

export interface Campaign {
  id: string;
  name: string;
  description: string;
  createdDate: string;
  nodes: Node[];
  edges: Edge[];
}

type TabType = "templates" | "campaigns";

export interface Template {
  id: string;
  name: string;
  description: string;
  category: "cold-outreach" | "follow-up" | "nurture" | "engagement";
  actions?: string[];
  sequence: Record<string, any>;
  icon: "connection" | "message" | "inmail";
}

const TEMPLATES: Template[] = templates;

const CATEGORIES = {
  "cold-outreach": "Cold Outreach",
  "follow-up": "Follow-up",
  nurture: "Nurture",
  engagement: "Engagement",
};

interface TemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (nodes: Node[], edges: Edge[]) => void;
}

function generatePreviewFlow(template: Template, conf) {
  console.log("template", template);
  return template.sequence
}

function getActionTitle(actionType: string): string {
  const titles: { [key: string]: string } = {
    connection: "Send Connection Request",
    message: "Send Message",
    inmail: "Send InMail",
  };
  return titles[actionType] || "Action";
}

const nodeTypes = {
  start: StartNode,
  add: AddNode,
  "add-end": AddAndEndNode,
  action: LinkedInActionNode,
  delay: DelayNode,
  end: EndNode,
};

export function TemplatesModal({
  open,
  onClose,
  onSelectTemplate,
}: TemplatesModalProps) {
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );

  const instance = useReactFlow();
  const [zoom, setZoom] = useState(1);

  const [activeTab, setActiveTab] = useState<TabType>("templates");
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    const savedCampaigns = localStorage.getItem("saved_campaigns");
    if (savedCampaigns) {
      try {
        setCampaigns(JSON.parse(savedCampaigns));
      } catch (e) {
        console.error("Failed to load campaigns:", e);
      }
    }
  }, []);

  const filteredTemplates = useMemo(() => {
    if (!search) return TEMPLATES;

    const searchLower = search.toLowerCase();
    return TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        CATEGORIES[t.category].toLowerCase().includes(searchLower)
    );
  }, [search]);

  const filteredCampaigns = useMemo(() => {
    if (!search) return campaigns;

    const searchLower = search.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower)
    );
  }, [search, campaigns]);

  const groupedTemplates = useMemo(() => {
    const grouped = filteredTemplates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    }, {} as Record<string, any[]>);
    return grouped;
  }, [filteredTemplates]);

  const getIconComponent = (icon: string) => {
    switch (icon) {
      case "connection":
        return <AlertCircle className="w-5 h-5" />;
      case "message":
        return <MessageSquare className="w-5 h-5" />;
      case "inmail":
        return <Mail className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const [previewFlow, setPreviewFlow] = useState<{
    nodes: Node[];
    edges: Edge[];
  }>();
  const wrapperRef = useRef(null);
  const { getNode, fitView, getViewport, setViewport } = useReactFlow();

  const centerRootTop = (rootId) => {
    requestAnimationFrame(() => {
      const root = getNode(rootId);
      if (!root || !root.measured) return;

      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const viewportWidth = wrapper.clientWidth;
      const zoom = getViewport().zoom;

      // compute new viewport that puts root at top-center
      const nodeCenterX = root.position.x + root.measured.width / 2;
      const x = viewportWidth / 2 - nodeCenterX * zoom;
      const y = 40; // top padding

      setViewport({ x, y, zoom }, { duration: 0 });
    });
  };

  const {data:conf} = useSequenceConfig();

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);

    const previewFlow = template
      ? generatePreviewFlow(template, conf)
      : null;

    setPreviewFlow(previewFlow);

    const i = setTimeout(() => {
      const nodesWithBounds = instance.getNodes().map((node) => {
        const bounds = instance.getNodesBounds([node.id]);
        return {
          ...node,
          measured: {
            height: bounds.height,
            width: bounds.width,
          },
        };
      });
      console.log({nodesWithBounds})
      const n = arrange(nodesWithBounds, instance.getEdges(), "root");
      console.log(n, "woweigie");
      // previewFlow.nodes = n;
      setPreviewFlow((pf) => ({ ...pf, nodes: n }));
      centerRootTop("root")
    }, 0);

    setTimeout(() => {
      // const node = instance.getNodes().find(({id}) => id === "root");

      // // const viewWidth =

      // instance.setCenter(node.position.x, node.position.y, { zoom: .5, duration: 300 })
    })


  };

  const handleSelectCampaign = (campaign: any) => {
    setSelectedTemplate({
      ...campaign,
      category: "cold-outreach" as const,
      actions: [],
      icon: "connection" as const,
    });
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(previewFlow.nodes, previewFlow.edges);
      onClose();
      setSelectedTemplate(null);
      setSearch("");
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[85vh] p-0 flex flex-col gap-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-5 bg-gradient-to-b from-background via-background to-background/95 shadow-sm border-b border-border/5 rounded-none">
          <DialogTitle className="text-lg font-semibold">Workflow Templates</DialogTitle>
          <DialogDescription>Choose a template to get started quickly</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-border/5">
          <button
            onClick={() => {
              setActiveTab("templates");
              setSelectedTemplate(null);
            }}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              activeTab === "templates"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Templates
            {activeTab === "templates" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("campaigns");
              setSelectedTemplate(null);
            }}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              activeTab === "campaigns"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Previous Campaigns
            {campaigns.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs">
                {campaigns.length}
              </span>
            )}
            {activeTab === "campaigns" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Templates List */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border/5">
            {/* Search Bar */}
            <div className="px-6 py-4 bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={
                    activeTab === "templates"
                      ? "Search templates..."
                      : "Search campaigns..."
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-background border-0 shadow-sm focus:shadow-md transition-shadow"
                  autoFocus
                />
              </div>
            </div>

            {/* Templates List */}
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-background">
              {activeTab === "templates" ? (
                // Templates List
                Object.entries(groupedTemplates).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      No templates found matching your search
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(groupedTemplates).map(
                      ([category, templates]) => (
                        <div key={category}>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pl-1">
                            {CATEGORIES[category as keyof typeof CATEGORIES]}
                          </h3>
                          <div className="space-y-3">
                            {templates.map((template) => (
                              <button
                                key={template.id}
                                onClick={() => handleSelectTemplate(template)}
                                className={cn(
                                  "w-full text-left px-4 py-4 rounded-lg transition-all duration-200",
                                  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
                                  selectedTemplate?.id === template.id
                                    ? "bg-primary/10 shadow-md border border-primary/20"
                                    : "bg-muted/40 hover:bg-muted/70 shadow-sm hover:shadow-md"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0">
                                    {getIconComponent(template.icon)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground text-sm">
                                      {template.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                      {template.description}
                                    </p>
                                    {/* <div className="flex gap-1.5 mt-3 flex-wrap">
                                      {template.actions
                                        .slice(0, 3)
                                        .map((action, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-background/80 text-muted-foreground shadow-sm"
                                          >
                                            {action.replace("-", " ")}
                                          </span>
                                        ))}
                                      {template.actions.length > 3 && (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-background/80 text-muted-foreground shadow-sm">
                                          +{template.actions.length - 3} more
                                        </span>
                                      )}
                                    </div> */}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )
              ) : // Campaigns List
                filteredCampaigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      {campaigns.length === 0
                        ? "No saved campaigns yet"
                        : "No campaigns found matching your search"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCampaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        onClick={() => handleSelectCampaign(campaign)}
                        className={cn(
                          "w-full text-left px-4 py-4 rounded-lg transition-all duration-200",
                          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
                          selectedTemplate?.id === campaign.id
                            ? "bg-primary/10 shadow-md border border-primary/20"
                            : "bg-muted/40 hover:bg-muted/70 shadow-sm hover:shadow-md"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">
                              {campaign.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                              {campaign.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Created:{" "}
                              {new Date(
                                campaign.createdDate
                              ).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Steps: {campaign.nodes.length}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
          {/* </div> */}

          {/* Right Side - Preview */}
          {selectedTemplate && previewFlow ? (
            <div className="flex-1 flex flex-col bg-muted/10 min-w-0">
              <div className="px-6 py-4 border-b border-border/5">
                <h3 className="font-semibold text-sm">
                  {selectedTemplate.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedTemplate.description}
                </p>
              </div>

              <div ref={wrapperRef} className="flex-1 min-h-0 pr-4">
                <ReactFlow
                  nodes={previewFlow.nodes}
                  edges={previewFlow.edges}
                  nodeTypes={nodeTypes}
                  draggable={false}
                  nodesDraggable={false}
                  elementsSelectable={false}
                  defaultEdgeOptions={{
                    animated: false,
                    type: "smoothstep",
                    labelStyle: {
                      fill: "#64748b",
                      fontSize: 11,
                      fontWeight: 500,
                    },
                    labelBgStyle: { fill: "#ffffff", fillOpacity: 1 },
                    labelBgPadding: [6, 8],
                    labelBgBorderRadius: 4,
                    style: {
                      stroke: "#cbd5e1",
                      strokeWidth: 1.5,
                      strokeLinecap: "butt",
                    },
                  }}
                >
                  <Background bgColor="#eee" color="gray" />
                </ReactFlow>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/10 text-center">
              <div>
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {activeTab === "templates"
                    ? "Select a template to preview"
                    : "Select a campaign to preview"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 bg-muted/30 shadow-sm border-t border-border/5 rounded-none">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyTemplate}
            disabled={!selectedTemplate}
            className="bg-primary hover:bg-primary/90"
          >
            {activeTab === "templates" ? "Apply Template" : "Load Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
