import { useCampaignStore } from "@/api/store/campaignStore";
import { MessagePreviewDialog } from "@/components/Campaign/Sequence/components/MessagePreviewDialog";
import {
    LinkedInMessageEditorAdapter,
    LinkedInMessageEditorAdapterRef,
} from "@/components/Campaign/Sequence/components/LinkedInEditor/LinkedInMessageEditorAdapter";
import {
    UnifiedVariableConfigurationModal,
    VariableType,
} from "@/components/Campaign/Sequence/components/UnifiedVariableConfigurationModal";
import VariableSelector from "@/components/Campaign/Sequence/components/VariableSelector";
// import { useSequenceActions } from "@/components/Campaign/Sequence/hooks/useSequenceActions";
// import { useSequenceState } from "@/components/Campaign/Sequence/hooks/useSequenceState";
import { ValidatedVariable } from "@/components/Campaign/Sequence/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
    convertToColumnFix,
    createLinkedInFallbackFix,
} from "@/utils/columnFixesUtils";
import { useReactFlow } from "@xyflow/react";
import { Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function MessageConfig({
    workflowData,
    viewMode = false,
    csvConfigForViewMode,
    viewModeCampaignData,
    nodeId,
    formData,
    setFormData
}) {
    const { updateNodeData, getNode } = useReactFlow()
    const textEditorRef = useRef<LinkedInMessageEditorAdapterRef>(null);

    const campaignStore = useCampaignStore();
    const campaign = campaignStore.campaign;
    const { variables, variablesLoading, generateVariables } = campaignStore;

    // Generate variables when campaign data changes (same pattern as flat tree structure)
    useEffect(() => {
        generateVariables();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, campaign?.id, campaign?.leads?.data, campaign?.csvConfig, campaign?.senderAccounts]);

    // const { variables, variablesLoading, previewState, setPreviewState, ...items } = useSequenceState(
    //     workflowData,
    //     viewMode
    // );

    // const { handlePreview } = useSequenceActions({
    //     viewMode,
    //     previewState,
    //     setPreviewState,
    //     variables,
    //    ...items,
    // });

    const [isVariableConfigOpen, setIsVariableConfigOpen] = useState(false);
    const [selectedVariable, setSelectedVariable] = useState<{
        id: string;
        name: string;
        type: VariableType;
    } | null>(null);

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

    const { toast } = useToast();

    const { addCsvColumnFix, getCsvColumnFix } = useCampaignStore();

    // Handle CSV variable clicks
    const handleCsvVariableClick = (variableId: string, variableName: string) => {
        const hasMissingData = csvVariablesWithMissingData.includes(variableId);
        const hasConfiguration = getCsvColumnFix
            ? getCsvColumnFix(variableId)
            : null;

        if (hasMissingData || hasConfiguration) {
            // Has missing data OR has configuration - open configuration modal
            setSelectedVariable({ id: variableId, name: variableName, type: "csv" });
            setIsVariableConfigOpen(true);
        } else {
            // No missing data and no configuration - show toast notification
            toast({
                title: "All Data Present",
                description: `All data for ${variableName} is present and no configuration is required.`,
                variant: "default",
            });
        }
    };

    const csvVariablesWithMissingData = variables
        .filter(
            (v) => v.type === "fetch" && v.missingRows && v.missingRows.length > 0
        )
        .map((v) => `${v.id}`);

    const handleVariableSelect = (variable: ValidatedVariable) => {
        // Use the same method as handleVariableInserted for consistency
        if (textEditorRef.current) {
            textEditorRef.current.insertVariable(variable.id);
        }
    };

    // Variables come from the store (same pattern as flat tree structure)

    return (
        <>
            {/* <MessagePreviewDialog
                isOpen={previewState.isOpen}
                message={previewState.message}
                onClose={handleClosePreview}
                viewModeCampaignData={viewMode ? viewModeCampaignData : undefined}
                fromConnectionSheet={previewState.fromConnectionSheet}
                accountType={previewState.accountType}
            /> */}
            <div className="space-y-3">
                {/* <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(0)}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0 rounded-lg"
                    title="Preview message"
                >
                    <Eye className="w-4 h-4" />
                </Button> */}
                <LinkedInMessageEditorAdapter
                    ref={textEditorRef}
                    value={formData?.message ?? ""}
                    onChange={(value) => setFormData(d => ({
                        ...d,
                        message: value
                    }))}
                    placeholder="Hi,&#10;Thanks for connecting!"
                    className="min-h-[250px] rounded-lg text-sm ring-[0.5px] focus:ring-2 ring-gray-300 shadow-sm"
                    disabled={viewMode}
                    variables={variables}
                    onLinkedInVariableClick={handleLinkedInVariableClick}
                    onCsvVariableClick={handleCsvVariableClick}
                    csvVariablesWithMissingData={csvVariablesWithMissingData}
                    getCsvColumnFix={getCsvColumnFix}
                    addCsvColumnFix={addCsvColumnFix}
                    csvConfigForViewMode={csvConfigForViewMode}
                />

                <div className="pt-2">
                    <VariableSelector
                        variables={variables}
                        variablesLoading={variablesLoading}
                        onVariableSelect={handleVariableSelect}
                        disabled={viewMode}
                        layout="horizontal"
                        buttonText="Variables"
                        dropdownMenuTriggerClass="border-purple-200 text-purple-800"
                    />
                </div>
            </div>

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
                            // Create and apply the LinkedIn fallback fix
                            if (fixType === 'fetchFromLinkedIn') {
                                // For LinkedIn fetch, we need to handle it differently
                                const columnFix = convertToColumnFix({
                                    columnName: selectedVariable.id,
                                    fixType: 'fetchFromLinkedIn',
                                    linkedInField: linkedInField || 'firstName',
                                    fallbackFixType: 'sendBlank',
                                    fallbackDefaultValue: defaultValue
                                });
                                addCsvColumnFix(columnFix);
                            } else {
                                // For other LinkedIn fixes, use the standard function
                                const fallbackFix = createLinkedInFallbackFix(
                                    selectedVariable.id,
                                    fixType as 'sendBlank' | 'insertDefaultValue' | 'skipLeads',
                                    defaultValue
                                );
                                addCsvColumnFix(fallbackFix);
                            }
                        } else {
                            // Create and apply the CSV column fix
                            if (fixType === 'fetchFromLinkedIn') {
                                // For LinkedIn fetch, use the fallback fix type passed from the modal
                                const columnFix = convertToColumnFix({
                                    columnName: selectedVariable.id,
                                    fixType: 'fetchFromLinkedIn',
                                    linkedInField: linkedInField || 'firstName',
                                    fallbackFixType: fallbackFixType || 'skipLeads',
                                    fallbackDefaultValue: defaultValue
                                });
                                addCsvColumnFix(columnFix);
                            } else {
                                // For other CSV fixes
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
        </>
    );
}
