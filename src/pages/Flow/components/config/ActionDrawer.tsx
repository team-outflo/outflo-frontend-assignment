"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import MessageConfig from "./MessageConfig";
import { useReactFlow } from "@xyflow/react";
import { useCampaignStore } from "@/api/store/campaignStore";
import {
    LinkedInMessageEditorAdapter,
    LinkedInMessageEditorAdapterRef,
} from "@/components/Campaign/Sequence/components/LinkedInEditor/LinkedInMessageEditorAdapter";
import {
    UnifiedVariableConfigurationModal,
    VariableType,
} from "@/components/Campaign/Sequence/components/UnifiedVariableConfigurationModal";
import { MessagePreviewDialog } from "@/components/Campaign/Sequence/components/MessagePreviewDialog";
import VariableSelector from "@/components/Campaign/Sequence/components/VariableSelector";
import { ValidatedVariable } from "@/components/Campaign/Sequence/types";
import { useToast } from "@/hooks/use-toast";
import {
    convertToColumnFix,
    createLinkedInFallbackFix,
} from "@/utils/columnFixesUtils";
import { Eye } from "lucide-react";

interface ActionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    nodeId: string | null;
    nodes: any[];
    setNodes: (nodes: any) => void;
    workflowData: any;
    updateWorkflow: any;
    csvConfigForViewMode: any;
    viewModeCampaignData: any;
    viewMode: boolean;
}

export default function ActionDrawer({
    isOpen,
    onClose,
    nodeId,
    nodes,
    setNodes,
    workflowData,
    updateWorkflow,
    csvConfigForViewMode,
    viewModeCampaignData,
    viewMode,
}: ActionDrawerProps) {
    const node = nodes.find((n) => n.id === nodeId);
    const [formData, setFormData] = useState<{
        text?: string;
        premiumMessage?: string;
        standardMessage?: string;
        message?: string;
        subject?: string;
        [key: string]: any;
    }>({});

    const { updateNodeData } = useReactFlow();
    
    // Refs for LinkedIn editors
    const textEditorRef = useRef<LinkedInMessageEditorAdapterRef>(null);
    const premiumEditorRef = useRef<LinkedInMessageEditorAdapterRef>(null);
    const standardEditorRef = useRef<LinkedInMessageEditorAdapterRef>(null);
    const subjectEditorRef = useRef<LinkedInMessageEditorAdapterRef>(null);

    const campaignStore = useCampaignStore();
    const campaign = campaignStore.campaign;
    const { addCsvColumnFix, getCsvColumnFix, variables, variablesLoading, generateVariables } = campaignStore;

    // Generate variables when campaign data changes (same pattern as flat tree structure)
    useEffect(() => {
        generateVariables();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, campaign?.id, campaign?.leads?.data, campaign?.csvConfig, campaign?.senderAccounts]);
    const { toast } = useToast();

    // Variable configuration modal state
    const [isVariableConfigOpen, setIsVariableConfigOpen] = useState(false);
    const [selectedVariable, setSelectedVariable] = useState<{
        id: string;
        name: string;
        type: VariableType;
    } | null>(null);

    // Preview state
    const [previewState, setPreviewState] = useState<{
        isOpen: boolean;
        message: string;
        fromConnectionSheet?: boolean;
        accountType?: 'premium' | 'non-premium';
    }>({
        isOpen: false,
        message: '',
    });

    useEffect(() => {
        if (node?.data) {
            setFormData(node.data);
        } else {
            setFormData({});
        }
    }, [node]);

    // Variables come from the store (same pattern as flat tree structure)

    const csvVariablesWithMissingData = variables
        .filter((v) => v.type === "fetch" && v.missingRows && v.missingRows.length > 0)
        .map((v) => `${v.id}`);

    const handleLinkedInVariableClick = (
        variableId: string,
        variableName: string,
        position: { x: number; y: number }
    ) => {
        setSelectedVariable({
            id: variableId,
            name: variableName,
            type: "linkedin",
        });
        setIsVariableConfigOpen(true);
    };

    const handleCsvVariableClick = (variableId: string, variableName: string) => {
        const hasMissingData = csvVariablesWithMissingData.includes(variableId);
        const hasConfiguration = getCsvColumnFix ? getCsvColumnFix(variableId) : null;

        if (hasMissingData || hasConfiguration) {
            setSelectedVariable({ id: variableId, name: variableName, type: "csv" });
            setIsVariableConfigOpen(true);
        } else {
            toast({
                title: "All Data Present",
                description: `All data for ${variableName} is present and no configuration is required.`,
                variant: "default",
            });
        }
    };

    const handleVariableSelect = (variable: ValidatedVariable, editorRef?: React.RefObject<LinkedInMessageEditorAdapterRef>) => {
        if (editorRef?.current) {
            editorRef.current.insertVariable(variable.id);
        }
    };

    // Preview handlers
    const handlePreview = useCallback((message: string, fromConnectionSheet: boolean = false, accountType: 'premium' | 'non-premium' = 'non-premium') => {
        setPreviewState({
            isOpen: true,
            message,
            fromConnectionSheet,
            accountType
        });
    }, []);

    const handleClosePreview = useCallback(() => {
        setPreviewState(prev => ({
            ...prev,
            isOpen: false,
            fromConnectionSheet: false,
            accountType: undefined
        }));
    }, []);

    //   if (!isOpen || !node) return null

    const actionType = node?.data.actionType;

    const handleSave = () => {
        updateNodeData(nodeId, ({ data }) => ({
            ...data,
            ...formData
        }))
        onClose();
    };

    const renderConfigFields = () => {
        switch (actionType) {
            case "SEND_CONNECTION_REQUEST":
                return (
                    <>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Message Text</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreview(formData.text || "", true, 'non-premium')}
                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0 rounded-lg"
                                    title="Preview message"
                                    disabled={!formData.text}
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                            </div>
                            <LinkedInMessageEditorAdapter
                                ref={textEditorRef}
                                value={formData.text || ""}
                                onChange={(value) => setFormData({ ...formData, text: value })}
                                placeholder="Enter invitation message..."
                                className="min-h-[100px] rounded-lg text-sm ring-[0.5px] focus:ring-2 ring-gray-300 shadow-sm"
                                disabled={viewMode}
                                variables={variables}
                                onLinkedInVariableClick={handleLinkedInVariableClick}
                                onCsvVariableClick={handleCsvVariableClick}
                                csvVariablesWithMissingData={csvVariablesWithMissingData}
                                getCsvColumnFix={getCsvColumnFix}
                                addCsvColumnFix={addCsvColumnFix}
                                csvConfigForViewMode={csvConfigForViewMode}
                            />
                            <VariableSelector
                                variables={variables}
                                variablesLoading={variablesLoading}
                                onVariableSelect={(v) => handleVariableSelect(v, textEditorRef)}
                                disabled={viewMode}
                                layout="horizontal"
                                buttonText="Variables"
                                dropdownMenuTriggerClass="border-purple-200 text-purple-800"
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Premium Message</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreview(formData.premiumMessage || "", true, 'premium')}
                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0 rounded-lg"
                                    title="Preview premium message"
                                    disabled={!formData.premiumMessage}
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                            </div>
                            <LinkedInMessageEditorAdapter
                                ref={premiumEditorRef}
                                value={formData.premiumMessage || ""}
                                onChange={(value) => setFormData({ ...formData, premiumMessage: value })}
                                placeholder="Message for premium members..."
                                className="min-h-[100px] rounded-lg text-sm ring-[0.5px] focus:ring-2 ring-gray-300 shadow-sm"
                                disabled={viewMode}
                                variables={variables}
                                onLinkedInVariableClick={handleLinkedInVariableClick}
                                onCsvVariableClick={handleCsvVariableClick}
                                csvVariablesWithMissingData={csvVariablesWithMissingData}
                                getCsvColumnFix={getCsvColumnFix}
                                addCsvColumnFix={addCsvColumnFix}
                                csvConfigForViewMode={csvConfigForViewMode}
                            />
                            <VariableSelector
                                variables={variables}
                                variablesLoading={variablesLoading}
                                onVariableSelect={(v) => handleVariableSelect(v, premiumEditorRef)}
                                disabled={viewMode}
                                layout="horizontal"
                                buttonText="Variables"
                                dropdownMenuTriggerClass="border-purple-200 text-purple-800"
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Standard Message</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreview(formData.standardMessage || "", true, 'non-premium')}
                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0 rounded-lg"
                                    title="Preview standard message"
                                    disabled={!formData.standardMessage}
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                            </div>
                            <LinkedInMessageEditorAdapter
                                ref={standardEditorRef}
                                value={formData.standardMessage || ""}
                                onChange={(value) => setFormData({ ...formData, standardMessage: value })}
                                placeholder="Message for standard members..."
                                className="min-h-[100px] rounded-lg text-sm ring-[0.5px] focus:ring-2 ring-gray-300 shadow-sm"
                                disabled={viewMode}
                                variables={variables}
                                onLinkedInVariableClick={handleLinkedInVariableClick}
                                onCsvVariableClick={handleCsvVariableClick}
                                csvVariablesWithMissingData={csvVariablesWithMissingData}
                                getCsvColumnFix={getCsvColumnFix}
                                addCsvColumnFix={addCsvColumnFix}
                                csvConfigForViewMode={csvConfigForViewMode}
                            />
                            <VariableSelector
                                variables={variables}
                                variablesLoading={variablesLoading}
                                onVariableSelect={(v) => handleVariableSelect(v, standardEditorRef)}
                                disabled={viewMode}
                                layout="horizontal"
                                buttonText="Variables"
                                dropdownMenuTriggerClass="border-purple-200 text-purple-800"
                            />
                        </div>
                    </>
                );

            case "SEND_MESSAGE":
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Message</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(formData.message || "")}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0 rounded-lg"
                                title="Preview message"
                                disabled={!formData.message}
                            >
                                <Eye className="w-4 h-4" />
                            </Button>
                        </div>
                        <MessageConfig
                            workflowData={workflowData}
                            csvConfigForViewMode={csvConfigForViewMode}
                            nodeId={nodeId}
                            viewMode={viewMode}
                            formData={formData}
                            setFormData={setFormData}
                            viewModeCampaignData={viewModeCampaignData}
                        />
                    </div>
                );

            case "SEND_INMAIL":
            case "SEND_FREE_INMAIL":
                return (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Subject</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreview(formData.subject || "")}
                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0 rounded-lg"
                                    title="Preview subject"
                                    disabled={!formData.subject}
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                            </div>
                            <LinkedInMessageEditorAdapter
                                ref={subjectEditorRef}
                                value={formData.subject || ""}
                                onChange={(value) => setFormData({ ...formData, subject: value })}
                                placeholder="Enter email subject..."
                                className="min-h-[100px] rounded-lg text-sm ring-[0.5px] focus:ring-2 ring-gray-300 shadow-sm"
                                disabled={viewMode}
                                variables={variables}
                                onLinkedInVariableClick={handleLinkedInVariableClick}
                                onCsvVariableClick={handleCsvVariableClick}
                                csvVariablesWithMissingData={csvVariablesWithMissingData}
                                getCsvColumnFix={getCsvColumnFix}
                                addCsvColumnFix={addCsvColumnFix}
                                csvConfigForViewMode={csvConfigForViewMode}
                            />
                            <VariableSelector
                                variables={variables}
                                variablesLoading={variablesLoading}
                                onVariableSelect={(v) => handleVariableSelect(v, subjectEditorRef)}
                                disabled={viewMode}
                                layout="horizontal"
                                buttonText="Variables"
                                dropdownMenuTriggerClass="border-purple-200 text-purple-800"
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Message</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreview(formData.message || "")}
                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0 rounded-lg"
                                    title="Preview message"
                                    disabled={!formData.message}
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                            </div>
                            <MessageConfig
                                workflowData={workflowData}
                                csvConfigForViewMode={csvConfigForViewMode}
                                nodeId={nodeId}
                                viewMode={viewMode}
                                formData={formData}
                                setFormData={setFormData}
                                viewModeCampaignData={viewModeCampaignData}
                            />
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="text-sm text-muted-foreground">
                        No configuration required for this action.
                    </div>
                );
        }
    };

    //   return (
    //     <>
    //       {/* Overlay */}
    //       <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={onClose} />

    //       {/* Drawer */}
    //       <div className="fixed right-0 top-0 bottom-0 w-96 bg-background border-l border-border shadow-lg z-50 overflow-y-auto">
    //         <div className="p-4 border-b border-border flex items-center justify-between">
    //           <h2 className="text-lg font-semibold text-foreground capitalize">
    //             {actionType?.replace(/_/g, " ")} Configuration
    //           </h2>
    //           <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
    //             <X className="h-4 w-4" />
    //           </Button>
    //         </div>

    //         <div className="p-4 space-y-4">{renderConfigFields()}</div>

    //         <div className="p-4 border-t border-border">
    //           <Button onClick={handleSave} className="w-full">
    //             Save Configuration
    //           </Button>
    //         </div>
    //       </div>
    //     </>
    //   )

    const getTitle = () => {
        if (!actionType) return "Configure Action";
        const actionLabels: Record<string, string> = {
            SEND_CONNECTION_REQUEST: "Configure Connection Request",
            SEND_MESSAGE: "Configure Message",
            SEND_INMAIL: "Configure InMail",
            SEND_FREE_INMAIL: "Configure Free InMail",
        };
        return actionLabels[actionType] || `${actionType.replace(/_/g, " ")} Configuration`;
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{getTitle()}</SheetTitle>
                    <SheetDescription>
                        {actionType === "SEND_MESSAGE" && "Configure your message content with variables."}
                        {(actionType === "SEND_INMAIL" || actionType === "SEND_FREE_INMAIL") && "Configure your InMail subject and message content with variables."}
                        {actionType === "SEND_CONNECTION_REQUEST" && "Configure your connection request messages."}
                    </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                    {renderConfigFields()}
                </div>

                <SheetFooter className="mt-6">
                    {!viewMode && (
                        <Button onClick={handleSave}>
                            Save Configuration
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </SheetFooter>
            </SheetContent>

            {selectedVariable && (
                <UnifiedVariableConfigurationModal
                    isOpen={isVariableConfigOpen}
                    onClose={() => {
                        setIsVariableConfigOpen(false);
                        setSelectedVariable(null);
                    }}
                    variableType={selectedVariable.type}
                    variableId={selectedVariable.id}
                    variableName={selectedVariable.name}
                    onApply={(fixType, defaultValue, linkedInField, fallbackFixType) => {
                        if (selectedVariable.type === 'linkedin') {
                            if (fixType === 'fetchFromLinkedIn') {
                                const columnFix = convertToColumnFix({
                                    columnName: selectedVariable.id,
                                    fixType: 'fetchFromLinkedIn',
                                    linkedInField: linkedInField || 'firstName',
                                    fallbackFixType: 'sendBlank',
                                    fallbackDefaultValue: defaultValue
                                });
                                addCsvColumnFix(columnFix);
                            } else {
                                const fallbackFix = createLinkedInFallbackFix(
                                    selectedVariable.id,
                                    fixType as 'sendBlank' | 'insertDefaultValue' | 'skipLeads',
                                    defaultValue
                                );
                                addCsvColumnFix(fallbackFix);
                            }
                        } else {
                            if (fixType === 'fetchFromLinkedIn') {
                                const columnFix = convertToColumnFix({
                                    columnName: selectedVariable.id,
                                    fixType: 'fetchFromLinkedIn',
                                    linkedInField: linkedInField || 'firstName',
                                    fallbackFixType: fallbackFixType || 'skipLeads',
                                    fallbackDefaultValue: defaultValue
                                });
                                addCsvColumnFix(columnFix);
                            } else {
                                const columnFix = convertToColumnFix({
                                    columnName: selectedVariable.id,
                                    fixType,
                                    defaultValue,
                                    linkedInField
                                });
                                addCsvColumnFix(columnFix);
                            }
                        }
                        setIsVariableConfigOpen(false);
                        setSelectedVariable(null);
                    }}
                />
            )}

            {/* Message Preview Dialog */}
            <MessagePreviewDialog
                isOpen={previewState.isOpen}
                message={previewState.message}
                onClose={handleClosePreview}
                viewMode={viewMode}
                fromConnectionSheet={previewState.fromConnectionSheet}
                accountType={previewState.accountType}
            />
        </Sheet>
    );
}
