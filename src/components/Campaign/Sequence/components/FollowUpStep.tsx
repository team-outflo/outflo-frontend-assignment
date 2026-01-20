import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Trash2, Eye, Paperclip, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SequenceStep, ValidatedVariable } from '../types';
import { STYLE_CLASSES } from '../constants';
import { UnifiedVariableConfigurationModal, VariableType } from './UnifiedVariableConfigurationModal';
import { VariableSelector } from './VariableSelector';
import { AttachmentUploader, AttachmentUploaderRef } from './AttachmentUploader';
import { createLinkedInFallbackFix, convertToColumnFix } from '@/utils/columnFixesUtils';
import { useCampaignStore } from '@/api/store/campaignStore';
import { useToast } from '@/hooks/use-toast';
import { LinkedInMessageEditorAdapter, LinkedInMessageEditorAdapterRef } from './LinkedInEditor/LinkedInMessageEditorAdapter';

interface FollowUpStepProps {
  step: SequenceStep;
  followUpNumber: number;
  viewMode: boolean;
  variables: ValidatedVariable[];
  variablesLoading: boolean;
  onUpdateContent: (stepId: string, content: string) => void;
  onUpdateAttachments: (stepId: string, attachments: string[]) => void;
  onDeleteGroup: (groupId: string) => void;
  onPreview: (stepId: string) => void;
  csvData?: any[];
  csvConfigForViewMode?: any;
  onVariablesRefresh?: () => void;
}

export const FollowUpStep: React.FC<FollowUpStepProps> = ({
  step,
  followUpNumber,
  viewMode,
  variables,
  variablesLoading,
  onUpdateContent,
  onUpdateAttachments,
  onDeleteGroup,
  onPreview,
  csvData,
  csvConfigForViewMode,
  onVariablesRefresh
}) => {

  // State for unified variable configuration modal
  const [isVariableConfigOpen, setIsVariableConfigOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<{ id: string, name: string, type: VariableType } | null>(null);

  // Refs
  const textEditorRef = useRef<LinkedInMessageEditorAdapterRef>(null);
  const attachmentUploaderRef = useRef<AttachmentUploaderRef>(null);

  const containerClass = viewMode
    ? `${STYLE_CLASSES.FOLLOWUP_STEP.CONTAINER} ${STYLE_CLASSES.FOLLOWUP_STEP.CONTAINER_VIEW_MODE}`
    : STYLE_CLASSES.FOLLOWUP_STEP.CONTAINER;

  const { addCsvColumnFix, getCsvColumnFix, campaign } = useCampaignStore();
  const { toast } = useToast();

  // Handle variable selection from dropdown - always insert variables directly
  const handleVariableSelect = (variable: ValidatedVariable) => {
    // Use the same method as handleVariableInserted for consistency
    if (textEditorRef.current) {
      textEditorRef.current.insertVariable(variable.id);
    }
  };


  // Handle LinkedIn variable clicks
  const handleLinkedInVariableClick = (variableId: string, variableName: string, position: { x: number, y: number }) => {
    setSelectedVariable({ id: variableId, name: variableName, type: 'linkedin' });
    setIsVariableConfigOpen(true);
  };

  // Handle CSV variable clicks
  const handleCsvVariableClick = (variableId: string, variableName: string) => {
    const hasMissingData = csvVariablesWithMissingData.includes(variableId);
    const hasConfiguration = getCsvColumnFix ? getCsvColumnFix(variableId) : null;

    // Always open configuration modal - even for allLeadsPresent to allow fallback configuration
    if (hasMissingData || hasConfiguration) {
      // Has missing data OR has configuration - open configuration modal
      setSelectedVariable({ id: variableId, name: variableName, type: 'csv' });
      setIsVariableConfigOpen(true);
    } else {
      // No missing data and no configuration - open modal to allow configuration
      setSelectedVariable({ id: variableId, name: variableName, type: 'csv' });
      setIsVariableConfigOpen(true);
    }
  };

  // Handle API variable clicks
  const handleApiVariableClick = (variableId: string, variableName: string) => {
    // Always open configuration modal for API variables
    setSelectedVariable({ id: variableId, name: variableName, type: 'api' });
    setIsVariableConfigOpen(true);
  };

  // Get list of CSV variables with missing data
  const csvVariablesWithMissingData = variables
    .filter(v => v.type === 'fetch' && v.missingRows && v.missingRows.length > 0)
    .map(v => `${v.id}`);

  // Handle attachment updates
  const handleAttachmentsChange = (attachments: string[]) => {
    onUpdateAttachments(step.id, attachments);
  };

  // Handle copy message content
  const handleCopyContent = async () => {
    const contentToCopy = step.content || '';
    try {
      await navigator.clipboard.writeText(contentToCopy);
      toast({
        title: 'Copied!',
        description: 'Message content copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy content to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={STYLE_CLASSES.FOLLOWUP_STEP.ICON_CONTAINER}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center">
              <h3 className="text-base font-semibold text-gray-900">Message {followUpNumber}</h3>
            </div>
            <p className="text-xs text-gray-500">Send personalized message</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPreview(step.id)}
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0 rounded-lg"
            title="Preview message"
          >
            <Eye className="w-4 h-4" />
          </Button>

          {!viewMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteGroup(step.groupId!)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <LinkedInMessageEditorAdapter
            ref={textEditorRef}
            value={step.content || ''}
            onChange={(value) => onUpdateContent(step.id, value)}
            placeholder="Hi,&#10;Thanks for connecting!"
            className="min-h-[150px] rounded-lg text-sm ring-[0.5px] focus:ring-2 ring-gray-300 shadow-sm"
            disabled={viewMode}
            variables={variables}
            showDebugBar={true}
            onLinkedInVariableClick={handleLinkedInVariableClick}
            onCsvVariableClick={handleCsvVariableClick}
            onApiVariableClick={handleApiVariableClick}
            getCsvColumnFix={getCsvColumnFix}
            addCsvColumnFix={addCsvColumnFix}
            csvConfigForViewMode={csvConfigForViewMode}
            csvData={csvData}
            csvVariablesWithMissingData={csvVariablesWithMissingData}
            campaignId={campaign?.id}
            onVariableCreated={onVariablesRefresh}
          />
            <div className="absolute -right-1 bottom-0 flex items-center gap-1">
              <Button
                variant="link"
                size="icon"
                onClick={handleCopyContent}
                className="border-purple-200 bg-none text-gray-700 hover:text-purple-800"
                title="Copy message content"
              >
                <Copy className="w-2 h-2" />
              </Button>
              {!viewMode && (   <Button
                variant="link"
                size="icon"
                onClick={() => attachmentUploaderRef.current?.triggerFileInput()}
                className="border-purple-200 bg-none text-gray-700 hover:text-purple-800"
                title="Add attachment"
              >
                <Paperclip className="w-2 h-2" />
              </Button>
                )}
            </div>
        
        </div>
        <div className="pt-2 flex items-center gap-2">
          <VariableSelector
            campaignId={campaign?.id}
            variables={variables}
            variablesLoading={variablesLoading}
            onVariableSelect={handleVariableSelect}
            disabled={viewMode}
            layout="horizontal"
            buttonText="Variables"
            dropdownMenuTriggerClass="border-purple-200 text-purple-800"
            onVariableCreated={onVariablesRefresh}
          />

        </div>


      
        {/* Always show attachments section - attachments are always visible if they exist */}
        <div className="pt-2">
          <AttachmentUploader
            ref={attachmentUploaderRef}
            key={`attachments-${step.id}-${step.attachments?.length || 0}`}
            attachments={step.attachments || []}
            onAttachmentsChange={handleAttachmentsChange}
            disabled={viewMode}
          />
        </div>

      </div>

      {/* Unified Variable Configuration Modal */}
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
          onApply={(fixType, defaultValue, linkedInField, fallbackFixType, nestedFallbackFixType, nestedFallbackDefaultValue) => {
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
            } else if (selectedVariable.type === 'api') {
              // Create and apply the API variable fix
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
              } else if (fixType === 'allLeadsPresent') {
                // For allLeadsPresent, include fallback configuration if provided
                const columnFixInput: any = {
                  columnName: selectedVariable.id,
                  fixType: 'allLeadsPresent',
                  fallbackFixType: fallbackFixType || 'skipLeads',
                  fallbackDefaultValue: defaultValue,
                };
                // Pass linkedInField when fallbackFixType is 'fetchFromLinkedIn'
                if (fallbackFixType === 'fetchFromLinkedIn' && linkedInField) {
                  columnFixInput.linkedInField = linkedInField;
                }
                // Pass nested fallback information when fallbackFixType is 'fetchFromLinkedIn'
                if (fallbackFixType === 'fetchFromLinkedIn' && nestedFallbackFixType) {
                  columnFixInput.nestedFallbackFixType = nestedFallbackFixType;
                  if (nestedFallbackDefaultValue) {
                    columnFixInput.nestedFallbackDefaultValue = nestedFallbackDefaultValue;
                  }
                }
                const columnFix = convertToColumnFix(columnFixInput);
                addCsvColumnFix(columnFix);
              } else {
                // For other API fixes (sendBlank, insertDefaultValue, skipLeads)
                const columnFix = convertToColumnFix({
                  columnName: selectedVariable.id,
                  fixType,
                  defaultValue,
                });
                addCsvColumnFix(columnFix);
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
              } else if (fixType === 'allLeadsPresent') {
                // For allLeadsPresent, include fallback configuration if provided
                const columnFixInput: any = {
                  columnName: selectedVariable.id,
                  fixType: 'allLeadsPresent',
                  fallbackFixType: fallbackFixType || 'skipLeads',
                  fallbackDefaultValue: defaultValue,
                };
                // Pass linkedInField when fallbackFixType is 'fetchFromLinkedIn'
                if (fallbackFixType === 'fetchFromLinkedIn' && linkedInField) {
                  columnFixInput.linkedInField = linkedInField;
                }
                // Pass nested fallback information when fallbackFixType is 'fetchFromLinkedIn'
                if (fallbackFixType === 'fetchFromLinkedIn' && nestedFallbackFixType) {
                  columnFixInput.nestedFallbackFixType = nestedFallbackFixType;
                  if (nestedFallbackDefaultValue) {
                    columnFixInput.nestedFallbackDefaultValue = nestedFallbackDefaultValue;
                  }
                }
                const columnFix = convertToColumnFix(columnFixInput);
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
    </div>
  );
};
