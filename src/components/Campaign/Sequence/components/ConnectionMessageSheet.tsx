import React, { useState, useRef } from 'react';
import { Save, X, AlertCircle, Eye, EyeIcon, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SequenceStep, ConnectionMessageState, ValidatedVariable } from '../types';
import { CHARACTER_LIMITS, MESSAGE_TYPES } from '../constants';
import { getCharacterLimitColor } from '../utils';
import { LinkedInMessageEditorAdapter, LinkedInMessageEditorAdapterRef } from './LinkedInEditor/LinkedInMessageEditorAdapter';
import { EnhancedVariableValidationDrawer } from './EnhancedVariableValidationDrawer';
import { UnifiedVariableConfigurationModal, VariableType } from './UnifiedVariableConfigurationModal';
import { VariableSelector } from './VariableSelector';
import { createLinkedInFallbackFix, convertToColumnFix } from '@/utils/columnFixesUtils';
import { useCampaignStore } from '@/api/store/campaignStore';
import { useToast } from '@/hooks/use-toast';
import { MessagePreviewDialog } from './MessagePreviewDialog';

interface ConnectionMessageSheetProps {
  isOpen: boolean;
  viewMode: boolean;
  step: SequenceStep | null;
  connectionMessageState: ConnectionMessageState;
  groupedAccounts: {
    premium: any[];
    standard: any[];
  };
  variables: ValidatedVariable[];
  onClose: () => void;
  onSave: () => void;
  onDismiss: () => void;
  onUpdatePremiumMessage: (message: string) => void;
  onUpdateStandardMessage: (message: string) => void;
  onSetFocusedMessageType: (type: 'premium' | 'standard') => void;
  onInsertVariable: (variableId: string) => void;
  csvData?: any[];
  onUpdateCsvData?: (updatedData: any[]) => void;
  onPreview: (message: string, type: 'premium' | 'standard', fromConnectionSheet: boolean, accountType: 'premium' | 'non-premium') => void;
  csvConfigForViewMode?: any;
  onVariablesRefresh?: () => void;
}

export const ConnectionMessageSheet: React.FC<ConnectionMessageSheetProps> = ({
  isOpen,
  viewMode,
  step,
  connectionMessageState,
  groupedAccounts,
  variables,
  onClose,
  onSave,
  onDismiss,
  onUpdatePremiumMessage,
  onUpdateStandardMessage,
  onSetFocusedMessageType,
  onInsertVariable,
  csvData,
  onUpdateCsvData,
  onPreview,
  csvConfigForViewMode,
  onVariablesRefresh
}) => {
  // State for variable validation drawer
  const [selectedValidationVariable, setSelectedValidationVariable] = useState<ValidatedVariable | null>(null);
  const [isValidationDrawerOpen, setIsValidationDrawerOpen] = useState(false);

  // State for unified variable configuration modal
  const [isVariableConfigOpen, setIsVariableConfigOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<{ id: string, name: string, type: VariableType } | null>(null);

  // Removed local preview state - using onPreview prop instead

  // Refs for text editors
  const premiumEditorRef = useRef<LinkedInMessageEditorAdapterRef>(null);
  const standardEditorRef = useRef<LinkedInMessageEditorAdapterRef>(null);

  const { premiumMessage, standardMessage, focusedMessageType } = connectionMessageState;
  const { addCsvColumnFix, getCsvColumnFix, campaign } = useCampaignStore();
  const { toast } = useToast();

  // Handle variable selection from dropdown - always insert variables directly
  const handleVariableSelect = (variable: ValidatedVariable) => {
    // Insert variable into the currently focused message type
    handleVariableInserted(variable.id);
  };

  // Handle Premium variable selection - always insert into Premium message
  const handlePremiumVariableSelect = (variable: ValidatedVariable) => {
    if (premiumEditorRef.current) {
      premiumEditorRef.current.insertVariable(variable.id);
    }
  };

  // Handle Standard variable selection - always insert into Standard message
  const handleStandardVariableSelect = (variable: ValidatedVariable) => {
    if (standardEditorRef.current) {
      standardEditorRef.current.insertVariable(variable.id);
    }
  };

  // Handle variable insertion from validation drawer
  const handleVariableInserted = (variableId: string) => {
    // Insert variable into the currently focused message type
    if (focusedMessageType === 'premium' && premiumEditorRef.current) {
      premiumEditorRef.current.insertVariable(variableId);
    } else if (focusedMessageType === 'standard' && standardEditorRef.current) {
      standardEditorRef.current.insertVariable(variableId);
    }
  };

  // Close validation drawer
  const handleCloseValidationDrawer = () => {
    setIsValidationDrawerOpen(false);
    setSelectedValidationVariable(null);
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
    
    // Check if configuration has "allLeadsPresent" fix type
    const isAllLeadsPresent = hasConfiguration?.fixChain?.fixType === 'allLeadsPresent';
    
    if (isAllLeadsPresent) {
      // Find the variable to get allLeadsPresentInfo
      const variable = variables.find(v => v.id === variableId);
      const infoText = variable?.allLeadsPresentInfo || `All data for ${variableName} is present and no configuration is required.`;
      
      toast({
        title: "All Data Present",
        description: infoText,
        variant: "success",
      });
      return;
    }

    if (hasMissingData || hasConfiguration) {
      // Has missing data OR has configuration - open configuration modal
      setSelectedVariable({ id: variableId, name: variableName, type: 'csv' });
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

  // Handle API variable clicks
  const handleApiVariableClick = (variableId: string, variableName: string) => {
    // Always open configuration modal for API variables
    setSelectedVariable({ id: variableId, name: variableName, type: 'api' });
    setIsVariableConfigOpen(true);
  };

  // Handle preview for premium message
  const handlePremiumPreview = () => {
    // Check if there are premium accounts available
    const hasPremiumAccounts = groupedAccounts.premium.length > 0;
    const accountType = hasPremiumAccounts ? 'premium' : 'non-premium';
    console.log('Opening premium preview:', {
      hasPremiumAccounts,
      accountType,
      messageLength: premiumMessage.length,
      fromConnectionSheet: true
    });
    onPreview(premiumMessage, 'premium', true, accountType);
  };

  // Handle preview for standard message
  const handleStandardPreview = () => {
    // Check if there are standard accounts available
    const hasStandardAccounts = groupedAccounts.standard.length > 0;
    const accountType = hasStandardAccounts ? 'non-premium' : 'premium';
    console.log('Opening standard preview:', {
      hasStandardAccounts,
      accountType,
      messageLength: standardMessage.length,
      fromConnectionSheet: true
    });
    onPreview(standardMessage, 'standard', true, accountType);
  };

  // Handle copy for premium message
  const handlePremiumCopy = async () => {
    try {
      await navigator.clipboard.writeText(premiumMessage);
      toast({
        title: 'Copied!',
        description: 'Premium message copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy premium message to clipboard',
        variant: 'destructive',
      });
    }
  };

  // Handle copy for standard message
  const handleStandardCopy = async () => {
    try {
      await navigator.clipboard.writeText(standardMessage);
      toast({
        title: 'Copied!',
        description: 'Standard message copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy standard message to clipboard',
        variant: 'destructive',
      });
    }
  };

  // Get list of CSV variables with missing data
  const csvVariablesWithMissingData = variables
    .filter(v => v.type === 'fetch' && v.missingRows && v.missingRows.length > 0)
    .map(v => `${v.id}`);

  // Check if any variables are used in the messages (including LinkedIn sender variables)
  const hasVariablesInPremium = variables.some(variable =>
    premiumMessage.includes(`{${variable.id}}`) ||
    premiumMessage.includes(`{${variable.name}}`)
  ) || premiumMessage.includes('{sender_') || premiumMessage.includes('{linkedin_') || premiumMessage.includes('{csv_');

  const hasVariablesInStandard = variables.some(variable =>
    standardMessage.includes(`{${variable.id}}`) ||
    standardMessage.includes(`{${variable.name}}`)
  ) || standardMessage.includes('{sender_') || standardMessage.includes('{linkedin_') || standardMessage.includes('{csv_');

  const hasVariablesInMessages = hasVariablesInPremium || hasVariablesInStandard;

  // Check if any message exceeds the 300-character limit
  const exceedsCharacterLimit = premiumMessage.length > CHARACTER_LIMITS.PREMIUM || standardMessage.length > CHARACTER_LIMITS.STANDARD;

  const renderAccountList = (accounts: any[], type: 'premium' | 'standard') => {
    const bgColor = type === 'premium' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200';
    const textColor = type === 'premium' ? 'text-amber-900' : 'text-blue-900';
    const avatarBg = type === 'premium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800';

    return (
      <div className="flex flex-wrap gap-2">
        {accounts.map(account => (
          <div key={account.id} className={`flex items-center ${bgColor} border rounded-lg px-3 py-2 shadow-sm`}>
            <Avatar className="h-7 w-7 mr-2">
              {account.profileImageUrl ? (
                <AvatarImage src={account.profileImageUrl} alt={account.firstName || account.email || 'Account'} />
              ) : (
                <AvatarFallback className={`${avatarBg} text-sm font-medium`}>
                  {account.firstName?.[0]}
                </AvatarFallback>
              )}
            </Avatar>
            <span className={`text-sm font-medium ${textColor}`}>
              {account.firstName || 'Account'}
            </span>
            <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
          </div>
        ))}
      </div>
    );
  };

  const renderMessageInput = (
    message: string,
    messageType: 'premium' | 'standard',
    onUpdate: (message: string) => void,
    placeholder: string,
    editorRef?: React.RefObject<LinkedInMessageEditorAdapterRef>
  ) => {
    const limit = messageType === 'premium' ? CHARACTER_LIMITS.PREMIUM : CHARACTER_LIMITS.STANDARD;
    const isAtLimit = message.length >= limit;
    const isFocused = focusedMessageType === messageType;

    const baseClasses = "min-h-[120px] rounded-lg";
    const limitClasses = isAtLimit ? "ring-red-500 ring-2" : "";
    const typeClasses = messageType === 'premium'
      ? "bg-white ring-1 ring-amber-300 focus:ring-2 "
      : "bg-white ring-1 ring-blue-300  focus:ring-2";

    const handleCopy = messageType === 'premium' ? handlePremiumCopy : handleStandardCopy;

    return (
      <div className="space-y-2">
        <div className="relative">
          <LinkedInMessageEditorAdapter
            ref={editorRef}
            value={message}
            onChange={(value) => {
              if (!viewMode) {
                onUpdate(value);
              }
            }}
            placeholder={placeholder}
            className={`${baseClasses} ${typeClasses} ${limitClasses}`}
            disabled={viewMode}
            variables={variables}
            onLinkedInVariableClick={handleLinkedInVariableClick}
            onCsvVariableClick={handleCsvVariableClick}
            onApiVariableClick={handleApiVariableClick}
            csvVariablesWithMissingData={csvVariablesWithMissingData}
            getCsvColumnFix={getCsvColumnFix}
            addCsvColumnFix={addCsvColumnFix}
            csvData={csvData}
            onFocus={() => {
              // Set the focused message type when this editor is focused
              if (messageType === 'premium' && focusedMessageType !== 'premium') {
                onSetFocusedMessageType('premium');
              } else if (messageType === 'standard' && focusedMessageType !== 'standard') {
                onSetFocusedMessageType('standard');
              }
            }}
            campaignId={campaign?.id}
            onVariableCreated={onVariablesRefresh}
          />
            <div className="absolute -right-1 bottom-0 flex items-center gap-1">
              <Button
                variant="link"
                size="icon"
                onClick={handleCopy}
                className="border-purple-200 bg-none text-gray-700 hover:text-purple-800"
                title={`Copy ${messageType} message`}
              >
                <Copy className="w-2 h-2" />
              </Button>
            </div>
        </div>

        {isAtLimit && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div className="text-sm text-red-700">
              <span className="font-medium">Character limit reached ({limit})</span>
              {/* {messageType === 'standard' && (
                <span className="block text-xs mt-1">Upgrade to premium for longer messages</span>
              )} */}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="sm:max-w-lg overflow-y-auto scroll-smooth w-full p-0"
      >
        <div className="h-full flex flex-col">
          <div className="px-6 pt-6">
            <SheetHeader className="pb-6">
              <SheetTitle className="text-xl font-semibold text-gray-900">
                {viewMode ? "Connection Request Message" : "Manage Connection Request Note"}
              </SheetTitle>
            </SheetHeader>
          </div>

          <div className="flex-1 px-6 pb-8">
            <div className="space-y-4">

              {/* Variable Usage Warning */}
              {!viewMode && hasVariablesInMessages && (
                <div className="bg-purple-50/30 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-800">
                      <p className="font-medium mb-1">Variable Usage Notice</p>
                      <p className="text-purple-700">
                        Your message includes variables. If the final message exceeds the maximum limit, the connection request will be sent without a note.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Character Limit Exceeded Warning */}
              {!viewMode && exceedsCharacterLimit && (
                <div className="bg-purple-50/30 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-800">
                      <p className="font-medium mb-1">Character Limit Exceeded</p>
                      <p className="text-purple-700">
                        One or more messages exceed the character limit. Please shorten your messages to save changes.
                      </p>
                      <div className="mt-2 text-xs text-purple-600">
                        {premiumMessage.length > CHARACTER_LIMITS.PREMIUM && (
                          <p>Premium message: <strong>{premiumMessage.length}/{CHARACTER_LIMITS.PREMIUM}</strong> characters</p>
                        )}
                        {standardMessage.length > CHARACTER_LIMITS.STANDARD && (
                          <p>Standard message: <strong>{standardMessage.length}/{CHARACTER_LIMITS.STANDARD}</strong> characters</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* No Accounts Selected Warning */}
              {!viewMode && groupedAccounts.premium.length === 0 && groupedAccounts.standard.length === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-900 mb-2">No Accounts Selected</h3>
                  <p className="text-sm text-red-700 mb-4">
                    You need to select at least one LinkedIn account before you can add connection messages.
                  </p>
                  <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-xs text-red-800">
                    <strong>Next Steps:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Go to the Accounts section</li>
                      <li>Connect your LinkedIn accounts</li>
                      <li>Return here to add your connection messages</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Premium Accounts Section */}
              {groupedAccounts.premium.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Premium Accounts</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {groupedAccounts.premium.length} account{groupedAccounts.premium.length !== 1 ? 's' : ''}
                      </span>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  {renderAccountList(groupedAccounts.premium, 'premium')}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-gray-900">Premium Message</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${getCharacterLimitColor(premiumMessage.length, CHARACTER_LIMITS.PREMIUM)}`}>
                          {premiumMessage.length}/{CHARACTER_LIMITS.PREMIUM}
                        </span>
                        {premiumMessage.trim() && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePremiumPreview}
                            className="h-7 w-7 p-0 border-amber-300 hover:bg-amber-50 text-amber-700"
                            title="Preview premium message"
                          >
                            <EyeIcon className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {viewMode ? (
                      <div className="relative">
                        <LinkedInMessageEditorAdapter
                          ref={premiumEditorRef}
                          value={premiumMessage}
                          onChange={() => { /* disabled in view mode */ }}
                          placeholder={"Connection note (view-only)"}
                          className={`min-h-[120px] rounded-lg bg-white ring-1 ring-amber-300`}
                          disabled={true}
                          variables={variables}
                          onLinkedInVariableClick={undefined}
                          onCsvVariableClick={undefined}
                          csvVariablesWithMissingData={csvVariablesWithMissingData}
                          getCsvColumnFix={getCsvColumnFix}
                          addCsvColumnFix={addCsvColumnFix}
                          csvConfigForViewMode={csvConfigForViewMode}
                          csvData={csvData}
                          campaignId={campaign?.id}
                        />

                          <div className="absolute -right-1 bottom-0 flex items-center gap-1">
                            <Button
                              variant="link"
                              size="icon"
                              onClick={handlePremiumCopy}
                              className="border-purple-200 bg-none text-gray-700 hover:text-purple-800"
                              title="Copy premium message"
                            >
                              <Copy className="w-2 h-2" />
                            </Button>
                          </div>
                      </div>
                    ) : (
                      <>
                        {renderMessageInput(
                          premiumMessage,
                          'premium',
                          onUpdatePremiumMessage,
                          "Hi {first_name}, I'd like to connect with you... (Premium: 300 characters allowed)",
                          premiumEditorRef
                        )}

                        {/* Premium Variables Section */}
                        <div className="pt-3">
                          <VariableSelector
                            variables={variables}
                            variablesLoading={false}
                            onVariableSelect={handlePremiumVariableSelect}
                            disabled={viewMode}
                            layout="vertical"
                            buttonText="Variables"
                            buttonSize="sm"
                            buttonClassName="border-amber-300 hover:bg-amber-50 text-amber-700 text-xs h-7 bg-white"
                            label="Insert variable:"
                            buttonWidthClass="w-auto"
                            campaignId={campaign?.id}
                            onVariableCreated={onVariablesRefresh}
                          />

                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Standard Accounts Section */}
              {groupedAccounts.standard.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Standard Accounts</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {groupedAccounts.standard.length} account{groupedAccounts.standard.length !== 1 ? 's' : ''}
                      </span>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  {renderAccountList(groupedAccounts.standard, 'standard')}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-gray-900">Standard Message</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${getCharacterLimitColor(standardMessage.length, CHARACTER_LIMITS.STANDARD)}`}>
                          {standardMessage.length}/{CHARACTER_LIMITS.STANDARD}
                        </span>
                        {standardMessage.trim() && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleStandardPreview}
                            className="h-7 w-7 p-0 border-blue-300 hover:bg-blue-50 text-blue-700"
                            title="Preview standard message"
                          >
                            <EyeIcon className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {viewMode ? (
                      <div className="relative">
                        <LinkedInMessageEditorAdapter
                          ref={standardEditorRef}
                          value={standardMessage}
                          onChange={() => { /* disabled in view mode */ }}
                          placeholder={"Connection note (view-only)"}
                          className={`min-h-[120px] rounded-lg bg-white ring-1 ring-blue-300`}
                          disabled={true}
                          variables={variables}
                          onLinkedInVariableClick={undefined}
                          onCsvVariableClick={undefined}
                          csvVariablesWithMissingData={csvVariablesWithMissingData}
                          getCsvColumnFix={getCsvColumnFix}
                          addCsvColumnFix={addCsvColumnFix}
                          csvConfigForViewMode={csvConfigForViewMode}
                          csvData={csvData}
                          campaignId={campaign?.id}
                        />
                        {standardMessage.trim() && (
                          <div className="absolute -right-1 bottom-0 flex items-center gap-1">
                            <Button
                              variant="link"
                              size="icon"
                              onClick={handleStandardCopy}
                              className="border-purple-200 bg-none text-gray-700 hover:text-purple-800"
                              title="Copy standard message"
                            >
                              <Copy className="w-2 h-2" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {renderMessageInput(
                          standardMessage,
                          'standard',
                          onUpdateStandardMessage,
                          "Hi {first_name}, I'd like to connect with you... (Standard: 200 characters allowed)",
                          standardEditorRef
                        )}

                        {/* Standard Variables Section */}
                        <div className="pt-3">
                          <VariableSelector
                            variables={variables}
                            variablesLoading={false}
                            onVariableSelect={handleStandardVariableSelect}
                            disabled={viewMode}
                            layout="vertical"
                            buttonText="Variables"
                            buttonSize="sm"
                            buttonClassName="border-blue-300 hover:bg-blue-50 text-blue-700 text-xs h-7 bg-white"
                            buttonWidthClass="w-auto"
                            label="Insert variable:"
                            campaignId={campaign?.id}
                            onVariableCreated={onVariablesRefresh}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex gap-3">
              {!viewMode && (
                <Button
                  onClick={onSave}
                  className="flex-1 h-11"
                  disabled={viewMode || (groupedAccounts.premium.length === 0 && groupedAccounts.standard.length === 0) || exceedsCharacterLimit}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              )}
              {viewMode ? (
                <Button
                  variant="outline"
                  onClick={() => onClose()}
                  className="flex-1 h-11"
                >
                  <X className="w-4 h-4 mr-2" />
                  Dismiss
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={onDismiss}
                  className="flex-1 h-11"
                >
                  <X className="w-4 h-4 mr-2" />
                  {viewMode ? 'Close' : 'Dismiss'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>

      {/* Variable Validation Drawer */}
      <EnhancedVariableValidationDrawer
        variable={selectedValidationVariable}
        isOpen={isValidationDrawerOpen}
        onClose={handleCloseValidationDrawer}
        csvData={csvData}
        onVariableInserted={handleVariableInserted}
        shouldInsertOnApply={false} // Don't insert when reconfiguring existing variables
      />

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

      {/* Message Preview Dialog is now handled by Sequence component */}
    </Sheet>
  );
};
