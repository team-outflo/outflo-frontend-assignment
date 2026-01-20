import React, { useMemo, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import { ConnectionStep } from './components/ConnectionStep';
import { FollowUpGroup } from './components/FollowUpGroup';
import { ConnectionMessageSheet } from './components/ConnectionMessageSheet';
import { MessagePreviewDialog } from './components/MessagePreviewDialog';
import { SequenceControls } from './components/SequenceControls';
import { groupStepsForRendering, convertApiWorkflowToSteps, convertStepsToApiFormat, generateGroupId, generateStepId, validateCsvData, convertFlatConfigsToSteps } from './utils';
import { SequenceStep, ConnectionMessageState, PreviewState, ValidatedVariable } from './types';
import { Button } from '@/components/ui/button';
import { getSystemVariables, getApiVariables } from '@/api/variables/variables';
import { getCampaignVariables } from '@/api/leads/leadsApi';
import { Plus, Settings } from 'lucide-react';
import NextSequenceButton from '../NextSequenceButton';
import { DEFAULT_FOLLOWUP_DELAY } from './constants';
import { resolveCampaignCsvConflicts } from '@/api/campaign/campaignConflictResolution';
import { saveDraftCampaign } from '@/api/campaign/campaignDraftApi';

export interface SequenceRef {
  openSettings: () => void;
}

const Sequence = forwardRef<SequenceRef>((props, ref) => {
  // Get campaign data directly from store
  const campaignStore = useCampaignStore();
  const campaign = campaignStore.campaign;
  const viewMode = campaignStore.mode === 'view';
  const { 
    updateSequenceSteps, 
    setSequenceSettings, 
    updateSequenceExcludeConnected,
    variables,
    variablesLoading,
    generateVariables,
    getCsvColumnFix,
    addCsvColumnFix,
    removeCsvColumnFix,
    setCsvConfig
  } = campaignStore;

  // Derive steps and excludeConnected directly from store (single source of truth)
  // Use sequenceDraft.flat for FLAT sequences (both edit and view mode)
  // Use sequence.steps for TREE sequences or legacy format
  const steps = useMemo(() => {
    const sequenceType = campaign?.sequenceType || 'TREE';
    
    // For FLAT sequences, always use sequenceDraft.flat (both edit and view mode)
    if (sequenceType === 'FLAT' && campaign?.sequenceDraft?.flat && Array.isArray(campaign.sequenceDraft.flat) && campaign.sequenceDraft.flat.length > 0) {
      return convertFlatConfigsToSteps(campaign.sequenceDraft.flat);
    }
    
    // For TREE sequences or legacy format, use sequence.steps
    const workflowData = campaign?.sequence || {};
    return convertApiWorkflowToSteps(workflowData);
  }, [campaign?.sequenceType, campaign?.sequenceDraft?.flat, campaign?.sequence]);
  
  const excludeConnected = useMemo(() => campaign?.sequence?.excludeConnected ?? false, [campaign?.sequence?.excludeConnected]);

  // UI state (not part of campaign sequence)
  const [connectionMessageState, setConnectionMessageState] = useState<ConnectionMessageState>({
    premiumMessage: '',
    standardMessage: '',
    focusedMessageType: 'premium'
  });
  const [previewState, setPreviewState] = useState<PreviewState>({
    isOpen: false,
    message: '',
    stepId: null
  });
  const [isConnectionMessageOpen, setIsConnectionMessageOpen] = useState(false);
  const [currentConnectionStep, setCurrentConnectionStep] = useState<SequenceStep | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Generate variables when campaign data changes
  useEffect(() => {
    generateVariables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, campaign?.id, campaign?.leads?.data, campaign?.csvConfig, campaign?.senderAccounts]);


  // Resolve CSV conflicts when component mounts in edit mode
  useEffect(() => {
    if (!viewMode && campaign?.id) {
      resolveCampaignCsvConflicts(campaign.id)
        .then((csvConfig) => {
          if (csvConfig) {
            setCsvConfig(csvConfig);
            // TODO: Remove saveDraftCampaign call - the resolve-all-conflicts API already persists changes to backend
            // This is temporary and should be removed once confirmed the API handles persistence
            saveDraftCampaign().catch((error) => {
              console.error('Failed to save draft after conflict resolution:', error);
            });
          }
        })
        .catch((error) => {
          console.error('Failed to resolve CSV conflicts:', error);
          // Continue without breaking the flow
        });
    }
  }, [viewMode, campaign?.id, setCsvConfig]);

  // Helper to update store with new steps
  const updateStepsInStore = useCallback((newSteps: SequenceStep[], overrideExcludeConnected?: boolean) => {
    if (viewMode) return;
    const apiSteps = convertStepsToApiFormat(newSteps);
    updateSequenceSteps(apiSteps);

    const currentExcludeConnected = overrideExcludeConnected ?? excludeConnected;

    if (overrideExcludeConnected !== undefined) {
      setSequenceSettings({ excludeConnected: overrideExcludeConnected });
    }
  }, [viewMode, excludeConnected, updateSequenceSteps, setSequenceSettings]);

  // Actions - directly update store
  const updateConnectionMessage = useCallback((
    stepId: string,
    premiumMessage: string,
    standardMessage: string
  ) => {
    if (viewMode) return;
    const updatedSteps = steps.map(step =>
      step.id === stepId ? {
        ...step,
        premiumConnectionMessage: premiumMessage,
        standardConnectionMessage: standardMessage,
        connectionMessage: premiumMessage || standardMessage
      } : step
    );
    updateStepsInStore(updatedSteps);
  }, [viewMode, steps, updateStepsInStore]);

  const addFollowUp = useCallback(() => {
    if (viewMode) return;
    const groupId = generateGroupId();
    const delayStep: SequenceStep = {
      id: generateStepId('delay'),
      type: 'delay',
      delay: {
        days: DEFAULT_FOLLOWUP_DELAY.DAYS,
        hours: DEFAULT_FOLLOWUP_DELAY.HOURS,
        minutes: DEFAULT_FOLLOWUP_DELAY.MINUTES
      },
      groupId
    };
    const followUpStep: SequenceStep = {
      id: generateStepId('followup'),
      type: 'followup',
      content: '',
      groupId
    };
    const updatedSteps = [...steps, delayStep, followUpStep];
    updateStepsInStore(updatedSteps);
  }, [viewMode, steps, updateStepsInStore]);

  const deleteFollowUpGroup = useCallback((groupId: string) => {
    if (viewMode) return;
    const updatedSteps = steps.filter(step => step.groupId !== groupId);
    updateStepsInStore(updatedSteps);
  }, [viewMode, steps, updateStepsInStore]);

  const updateStepContent = useCallback((stepId: string, content: string) => {
    if (viewMode) return;
    const updatedSteps = steps.map(step =>
      step.id === stepId ? { ...step, content } : step
    );
    updateStepsInStore(updatedSteps);
  }, [viewMode, steps, updateStepsInStore]);

  const updateStepAttachments = useCallback((stepId: string, attachments: string[]) => {
    if (viewMode) return;
    const updatedSteps = steps.map(step =>
      step.id === stepId ? { ...step, attachments } : step
    );
    updateStepsInStore(updatedSteps);
  }, [viewMode, steps, updateStepsInStore]);

  const updateDelay = useCallback((
    stepId: string,
    field: 'days' | 'hours' | 'minutes',
    value: number
  ) => {
    if (viewMode) return;

    // Find the step being updated
    const stepToUpdate = steps.find(step => step.id === stepId);
    if (!stepToUpdate || !stepToUpdate.delay) return;

    // Calculate the new delay values
    const newDelay = {
      ...stepToUpdate.delay,
      [field]: value
    };

    // Check if this is the first follow-up delay step
    const delayStepIndex = steps.findIndex(step => step.id === stepId && step.type === 'delay');

    // Check if this delay step is part of the first follow-up group
    // The first follow-up group is the first delay+followup pair after the connection step
    let isFirstFollowUp = false;
    if (delayStepIndex >= 0 && delayStepIndex < steps.length - 1) {
      const delayStep = steps[delayStepIndex];
      const nextStep = steps[delayStepIndex + 1];

      // Check if this is a delay step followed by a followup step with the same groupId
      if (delayStep.type === 'delay' &&
        nextStep.type === 'followup' &&
        delayStep.groupId === nextStep.groupId) {
        // Count how many follow-up groups come before this one
        const followUpGroupsBefore = steps
          .slice(0, delayStepIndex)
          .filter(step => step.type === 'followup')
          .length;

        isFirstFollowUp = followUpGroupsBefore === 0;
      }
    }

    // Validate: First follow-up must have at least 3 hours total
    if (isFirstFollowUp) {
      const totalHours = (newDelay.days || 0) * 24 + (newDelay.hours || 0);
      if (totalHours < 3) {
        return; // Prevent the update (visual error shown in DelayStep component)
      }
    }

    const updatedSteps = steps.map(step =>
      step.id === stepId && step.delay
        ? { ...step, delay: newDelay }
        : step
    );
    updateStepsInStore(updatedSteps);
  }, [viewMode, steps, updateStepsInStore]);

  const insertVariable = useCallback((stepId: string, variableId: string) => {
    if (viewMode) return;
    const step = steps.find(s => s.id === stepId);
    if (step && step.type === 'followup') {
      const textarea = document.querySelector(`textarea[data-step-id="${stepId}"]`) as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const content = step.content || '';
        const newContent = content.substring(0, start) + `{${variableId}}` + content.substring(end);
        updateStepContent(stepId, newContent);
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = start + variableId.length + 2;
          textarea.selectionEnd = start + variableId.length + 2;
        }, 0);
      } else {
        const newContent = (step.content || '') + `{${variableId}}`;
        updateStepContent(stepId, newContent);
      }
    }
  }, [viewMode, steps, updateStepContent]);

  const insertConnectionVariable = useCallback((variableId: string) => {
    if (viewMode) return;
    const { focusedMessageType } = connectionMessageState;
    const variableText = `{${variableId}}`;
    setConnectionMessageState(prev => ({
      ...prev,
      [focusedMessageType === 'premium' ? 'premiumMessage' : 'standardMessage']:
        prev[focusedMessageType === 'premium' ? 'premiumMessage' : 'standardMessage'] + variableText
    }));
  }, [viewMode, connectionMessageState]);

  const handleAddMessage = useCallback((step: SequenceStep) => {
    if (viewMode) {
      setCurrentConnectionStep(step);
      setConnectionMessageState({
        premiumMessage: step.premiumConnectionMessage || '', // Don't fallback to connectionMessage for premium
        standardMessage: step.standardConnectionMessage || '', // Don't fallback to connectionMessage for standard
        focusedMessageType: 'premium',
      });
      setIsConnectionMessageOpen(true);
      return;
    }
    const hasAccounts = campaign?.senderAccounts && campaign.senderAccounts.length > 0;
    if (!hasAccounts) return;
    setCurrentConnectionStep(step);
    setConnectionMessageState({
      premiumMessage: step.premiumConnectionMessage || '', // Don't fallback to connectionMessage for premium
      standardMessage: step.standardConnectionMessage || '', // Don't fallback to connectionMessage for standard
      focusedMessageType: 'premium'
    });
    setIsConnectionMessageOpen(true);
  }, [viewMode, campaign]);

  const handleSaveMessage = useCallback(() => {
    if (viewMode) return;
    if (currentConnectionStep) {
      // Save messages as-is without auto-syncing
      // If standard message is empty, it stays empty (no auto-fill from premium)
      updateConnectionMessage(
        currentConnectionStep.id,
        connectionMessageState.premiumMessage,
        connectionMessageState.standardMessage
      );
    }
    setIsConnectionMessageOpen(false);
    setCurrentConnectionStep(null);
  }, [viewMode, currentConnectionStep, connectionMessageState, updateConnectionMessage]);

  const handleDismissMessage = useCallback(() => {
    if (viewMode) return;
    setIsConnectionMessageOpen(false);
    setCurrentConnectionStep(null);
  }, [viewMode]);

  const handlePreview = useCallback((stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step || !step.content) return;
    setPreviewState({
      isOpen: true,
      message: step.content,
      stepId
    });
  }, [steps]);

  const handleViewContent = useCallback((content: string) => {
    if (!content) return;
    setPreviewState({
      isOpen: true,
      message: content,
      stepId: null
    });
  }, []);

  const handleToggleExcludeConnected = useCallback((checked: boolean) => {
    if (viewMode) return;
    updateSequenceExcludeConnected(checked);
  }, [viewMode, updateSequenceExcludeConnected]);

  // Group connected accounts by premium status using the central store only, with deep fallbacks
  const groupedAccounts = useMemo(() => {
    const statuses = (campaign as any)?.accountStatuses || {};
    const accountDetails = (campaign as any)?.accountDetails || {};

    // Prefer senderAccounts from store; otherwise build from accountStatuses; 
    // lastly fallback to accountIDs as minimal placeholders
    let baseAccounts: any[] = Array.isArray(campaign?.senderAccounts) && campaign.senderAccounts.length > 0
      ? campaign.senderAccounts as any[]
      : [];

    if (baseAccounts.length === 0 && statuses && typeof statuses === 'object') {
      baseAccounts = Object.entries(statuses).map(([id, detail]: any) => ({ id, ...(detail || {}) }));
    }

    if (baseAccounts.length === 0 && Array.isArray((campaign as any)?.accountIDs) && (campaign as any).accountIDs.length > 0) {
      baseAccounts = (campaign as any).accountIDs.map((id: string) => ({ id }));
    }

    // Enrich using accountStatuses and accountDetails when possible
    const enriched = baseAccounts.map((acc: any) => ({
      ...acc,
      ...(acc?.id && accountDetails?.[acc.id] ? accountDetails[acc.id] : {}),
      ...(acc?.id && statuses?.[acc.id] ? statuses[acc.id] : {}),
    }));

    const isConnected = (acc: any) => {
      // Consider explicit flags when present
      const connectedFlag = acc?.connected;
      if (connectedFlag !== undefined) {
        return Boolean(connectedFlag);
      }
      const statusStr = String(acc?.status || '').toLowerCase();
      const connectionStr = String(acc?.connectionStatus || '').toUpperCase();
      const deleted = acc?.isDeleted === true || statusStr === 'deleted';
      const disconnected = connectionStr === 'DISCONNECTED';
      return !deleted && !disconnected;
    };

    const connected = enriched.filter(isConnected);

    const premium = connected.filter((acc: any) => acc?.isPremium);
    const standard = connected.filter((acc: any) => !acc?.isPremium);

    return { premium, standard };
  }, [campaign?.senderAccounts, (campaign as any)?.accountStatuses, (campaign as any)?.accountDetails, (campaign as any)?.accountIDs]);

  // Group steps for rendering
  const groupedSteps = useMemo(() => groupStepsForRendering(steps), [steps]);
  const hasFollowUps = groupedSteps.some(group => group.type === 'followup-group');

  // Memoized connection message state updaters
  const updatePremiumMessage = useCallback((message: string) => {
    setConnectionMessageState(prev => ({ ...prev, premiumMessage: message }));
  }, []);

  const updateStandardMessage = useCallback((message: string) => {
    setConnectionMessageState(prev => ({ ...prev, standardMessage: message }));
  }, []);

  const setFocusedMessageType = useCallback((type: 'premium' | 'standard') => {
    setConnectionMessageState(prev => ({ ...prev, focusedMessageType: type }));
  }, []);

  // Handle preview from ConnectionMessageSheet
  const handleConnectionPreview = useCallback((message: string, type: 'premium' | 'standard', fromConnectionSheet: boolean, accountType: 'premium' | 'non-premium') => {
    setPreviewState({
      isOpen: true,
      message,
      stepId: null,
      type,
      fromConnectionSheet,
      accountType
    });
  }, []);

  // Memoized preview close handler
  const handleClosePreview = useCallback(() => {
    setPreviewState(prev => ({
      ...prev,
      isOpen: false,
      fromConnectionSheet: false,
      accountType: undefined
    }));
  }, []);


  // Get CSV config for view mode
  const csvConfigForViewMode = campaign?.csvConfig;


  const renderStepConnector = () => (
    <div className="flex justify-center py-2">
      <div className="w-px h-8 bg-gray-300"></div>
    </div>
  );

  const renderRequestAcceptedStatus = () => (
    <div className="flex justify-center py-2">
      <div className="bg-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full flex items-center">
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
        If Request Accepted
      </div>
    </div>
  );

  return (
    <div className="relative">
      <div className="">
        <div className={`max-w-2xl mx-auto`}>
          <SequenceControls
            viewMode={viewMode}
            hasFollowUps={hasFollowUps}
            excludeConnected={excludeConnected}
            onToggleExcludeConnected={handleToggleExcludeConnected}
            setIsSidebarOpen={setIsSidebarOpen}
            isSidebarOpen={isSidebarOpen}
          />

          <div className="space-y-1">
            {groupedSteps.map((group, index) => (
              <div key={index}>
                {group.type === 'connection' && (
                  <>
                    <ConnectionStep
                      step={group.step!}
                      viewMode={viewMode}
                      onAddMessage={handleAddMessage}
                      onViewContent={handleViewContent}
                      hasAccounts={viewMode || (campaign?.senderAccounts && campaign.senderAccounts.length > 0)}
                    />
                    {
                      <div className="flex justify-center py-1">
                        <div className="w-px h-4 bg-gray-300"></div>
                      </div>
                    }
                    {renderRequestAcceptedStatus()}
                    {(hasFollowUps || index < groupedSteps.length - 1) && (
                      <div className="flex justify-center py-0.5">
                        <div className="w-px h-4 bg-gray-300"></div>
                      </div>
                    )}
                  </>
                )}
                {group.type === 'followup-group' && (
                  <>
                    <FollowUpGroup
                      delayStep={group.delayStep!}
                      followUpStep={group.followUpStep!}
                      index={group.index}
                      followUpNumber={steps.filter((s, i) => s.type === 'followup' && i <= group.index).length}
                      viewMode={viewMode}
                      variables={variables}
                      variablesLoading={variablesLoading}
                      onUpdateDelay={updateDelay}
                      onUpdateContent={updateStepContent}
                      onUpdateAttachments={updateStepAttachments}
                      onDeleteGroup={deleteFollowUpGroup}
                      onPreview={handlePreview}
                      csvData={campaign?.leads?.data}
                      csvConfigForViewMode={csvConfigForViewMode}
                      excludeConnected={excludeConnected}
                      onVariablesRefresh={generateVariables}
                    />
                    {index < groupedSteps.length - 1 && renderStepConnector()}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Connection Message Sheet */}
        <ConnectionMessageSheet
          isOpen={isConnectionMessageOpen}
          viewMode={viewMode}
          step={currentConnectionStep}
          connectionMessageState={connectionMessageState}
          groupedAccounts={groupedAccounts}
          variables={variables}
          onClose={() => setIsConnectionMessageOpen(false)}
          onSave={handleSaveMessage}
          onDismiss={handleDismissMessage}
          onUpdatePremiumMessage={updatePremiumMessage}
          onUpdateStandardMessage={updateStandardMessage}
          onSetFocusedMessageType={setFocusedMessageType}
          onInsertVariable={insertConnectionVariable}
          csvData={campaign?.leads?.data}
          onPreview={handleConnectionPreview}
          csvConfigForViewMode={csvConfigForViewMode}
          onVariablesRefresh={generateVariables}
        />

        {/* Message Preview Dialog */}
        <MessagePreviewDialog
          isOpen={previewState.isOpen}
          message={previewState.message}
          onClose={handleClosePreview}
          viewMode={viewMode}
          fromConnectionSheet={previewState.fromConnectionSheet}
          accountType={previewState.accountType}
        />




        {/* Add Follow-up Button - Moved to bottom */}
        {!viewMode && (
          <div className="pt-6 mt-6">
            <div className="text-center space-y-3">
              <Button
                onClick={addFollowUp}
                className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0"
                size="sm"
              >
                <Plus className="w-5 h-5" />
              </Button>
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">Add Follow-up Message</p>
                <p className="text-xs text-gray-500">Create additional touchpoints to increase engagement</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
});

Sequence.displayName = 'Sequence';

export default Sequence;
