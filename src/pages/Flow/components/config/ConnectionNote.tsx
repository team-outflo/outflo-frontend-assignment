import { useCampaignStore } from "@/api/store/campaignStore";
import { getCampaignVariables, getSystemVariables } from "@/api/variables/variables";
import { ConnectionMessageSheet } from "@/components/Campaign/Sequence/components/ConnectionMessageSheet";
import { MessagePreviewDialog } from "@/components/Campaign/Sequence/components/MessagePreviewDialog";
import { ConnectionMessageState, PreviewState, SequenceStep, ValidatedVariable } from "@/components/Campaign/Sequence/types";
import { validateCsvData } from "@/components/Campaign/Sequence/utils";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function ConnectionNote({
  workflowData,
  updateWorkflow,
  csvConfigForViewMode,
  viewModeCampaignData,
  isOpen,
  onClose,
  nodeId,
}) {
  const { getNode, updateNodeData } = useReactFlow();

  const campaignStore = useCampaignStore();
  const campaign = campaignStore.campaign;
  const viewMode = campaignStore.mode === 'view';

  const [variables, setVariables] = useState<ValidatedVariable[]>([]);
  const [variablesLoading, setVariablesLoading] = useState(true);
  const [currentConnectionStep, setCurrentConnectionStep] = useState<SequenceStep | null>(null);
  const [isConnectionMessageOpen, setIsConnectionMessageOpen] = useState<boolean>(isOpen);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const generateVariablesFromCsvData = async () => {
      setVariablesLoading(true);
      const allVariables: ValidatedVariable[] = [];

      try {
        // 1. Fetch "Fetched From Sheet" variables (csv_ prefix) from backend API - only in edit mode
        if (!viewMode && campaign?.id) {
          try {
            const csvVariables = await getCampaignVariables(campaign.id);

            // Map backend variables to ValidatedVariable format
            const fetchVariables: ValidatedVariable[] = csvVariables.map((variable: any) => ({
              id: variable.id,
              name: variable.name,
              description: variable.description,
              placeholder: variable.placeholder,
              exampleValue: variable.exampleValue || '',
              type: 'fetch' as const,
              source: 'sheet' as const,
              isValidated: variable.isValidated ?? true,
              missingRows: variable.missingRows || [],
              totalRows: variable.totalRows || 0,
              allLeadsPresentInfo: variable.allLeadsPresentInfo || '',
              inputBoxHoverInfo: variable.inputBoxHoverInfo || '',
              validationStatus: variable.isValidated ? 'valid' as const : 'pending' as const
            }));

            allVariables.push(...fetchVariables);
          } catch (error) {
            console.error('Failed to fetch campaign variables from backend:', error);
            // Fallback: Generate variables from CSV data if backend fails
            if (campaign?.leads?.data && campaign.leads.data.length > 0) {
              const csvColumns = campaign.csvConfig?.detectedColumns || [];

              if (csvColumns.length === 0) {
                const firstRow = campaign.leads.data[0];
                const fallbackColumns = Object.keys(firstRow);
                csvColumns.push(...fallbackColumns);
              }

              const validationMap = validateCsvData(campaign.leads.data, csvColumns, campaign.csvConfig);

              const fetchVariables: ValidatedVariable[] = csvColumns.map(column => {
                const variableId = `csv_${column}`;
                const displayName = column
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');

                const validationData = validationMap.get(column);

                const getExampleValue = (columnName: string) => {
                  if (columnName.includes('url') || columnName.includes('link')) {
                    return 'https://example.com';
                  } else if (columnName.includes('email')) {
                    return 'john@example.com';
                  } else if (columnName.includes('name')) {
                    return 'John';
                  } else if (columnName.includes('company')) {
                    return 'Acme Inc';
                  } else if (columnName.includes('title') || columnName.includes('position')) {
                    return 'Marketing Director';
                  } else if (columnName.includes('location') || columnName.includes('city')) {
                    return 'San Francisco, CA';
                  } else {
                    return 'Example Value';
                  }
                };

                return {
                  id: variableId,
                  name: displayName,
                  description: `Value from ${column} column (fetched from sheet)`,
                  placeholder: `{${variableId}}`,
                  exampleValue: getExampleValue(column),
                  type: 'fetch' as const,
                  source: 'sheet' as const,
                  isValidated: true,
                  missingRows: validationData?.missingRows || [],
                  totalRows: validationData?.totalRows || 0,
                  allLeadsPresentInfo: '',
                  inputBoxHoverInfo: '',
                  validationStatus: validationData?.validationStatus || 'pending'
                };
              });

              allVariables.push(...fetchVariables);
            }
          }
        }

        // 2. Generate "Fetched From LinkedIn" variables (linkedin_ prefix)
        const linkedinVariables: ValidatedVariable[] = [
          {
            id: 'linkedin_firstName',
            name: 'First Name',
            description: 'This variable is replaced with the recipient\'s first name fetched from their LinkedIn profile.',
            inputBoxHoverInfo: 'This variable is replaced with the recipient\'s first name fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
            placeholder: '{linkedin_firstName}',
            exampleValue: 'John',
            type: 'linkedin' as const,
            source: 'linkedin' as const,
            isValidated: false,
            missingRows: [],
            totalRows: 0,
            validationStatus: 'valid'
          },
          {
            id: 'linkedin_lastName',
            name: 'Last Name',
            description: 'This variable is replaced with the recipient\'s last name fetched from their LinkedIn profile.',
            inputBoxHoverInfo: 'This variable is replaced with the recipient\'s last name fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
            placeholder: '{linkedin_lastName}',
            exampleValue: 'Smith',
            type: 'linkedin' as const,
            source: 'linkedin' as const,
            isValidated: false,
            missingRows: [],
            totalRows: 0,
            validationStatus: 'valid'
          },
          {
            id: 'linkedin_company',
            name: 'Company',
            description: 'This variable is replaced with the recipient\'s current company fetched from their LinkedIn profile.',
            inputBoxHoverInfo: 'This variable is replaced with the recipient\'s current company fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
            placeholder: '{linkedin_company}',
            exampleValue: 'Acme Inc',
            type: 'linkedin' as const,
            source: 'linkedin' as const,
            isValidated: false,
            missingRows: [],
            totalRows: 0,
            validationStatus: 'valid'
          },
          {
            id: 'linkedin_jobTitle',
            name: 'Job Title',
            description: 'This variable is replaced with the recipient\'s current job title fetched from their LinkedIn profile.',
            inputBoxHoverInfo: 'This variable is replaced with the recipient\'s current job title fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
            placeholder: '{linkedin_jobTitle}',
            exampleValue: 'Marketing Director',
            type: 'linkedin' as const,
            source: 'linkedin' as const,
            isValidated: false,
            missingRows: [],
            totalRows: 0,
            validationStatus: 'valid'
          },
          {
            id: 'linkedin_headline',
            name: 'Headline',
            description: 'This variable is replaced with the recipient\'s headline fetched from their LinkedIn profile.',
            inputBoxHoverInfo: 'This variable is replaced with the recipient\'s headline fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
            placeholder: '{linkedin_headline}',
            exampleValue: 'Marketing Director at Acme Inc',
            type: 'linkedin' as const,
            source: 'linkedin' as const,
            isValidated: false,
            missingRows: [],
            totalRows: 0,
            validationStatus: 'valid'
          },
          {
            id: 'linkedin_location',
            name: 'Location',
            description: 'This variable is replaced with the recipient\'s location fetched from their LinkedIn profile.',
            inputBoxHoverInfo: 'This variable is replaced with the recipient\'s location fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
            placeholder: '{linkedin_location}',
            exampleValue: 'San Francisco, CA',
            type: 'linkedin' as const,
            source: 'linkedin' as const,
            isValidated: false,
            missingRows: [],
            totalRows: 0,
            validationStatus: 'valid'
          }
        ];

        allVariables.push(...linkedinVariables);

        // 3. Fetch "System" variables from API
        try {
          const accountIds = campaign?.senderAccounts?.map(account => account.id) || [];
          const systemVariablesFromAPI = await getSystemVariables(accountIds);
          const systemVariables: ValidatedVariable[] = systemVariablesFromAPI.map(variable => ({
            ...variable,
            source: variable.type === 'sender' ? 'system' as const : 'system' as const,
            isValidated: false,
            missingRows: [],
            totalRows: 0,
            validationStatus: 'valid' as const
          }));
          allVariables.push(...systemVariables);
        } catch (error) {
          console.error('Failed to fetch system variables:', error);
          const fallbackSystemVariables: ValidatedVariable[] = [
            {
              id: 'system_firstName',
              name: 'First Name',
              description: 'Contact\'s first name (fetched from system)',
              inputBoxHoverInfo: "",
              placeholder: '{system_firstName}',
              exampleValue: 'John',
              type: 'system' as const,
              source: 'system' as const,
              isValidated: false,
              missingRows: [],
              totalRows: 0,
              validationStatus: 'valid'
            },
            {
              id: 'system_lastName',
              name: 'Last Name',
              description: 'Contact\'s last name (fetched from system)',
              inputBoxHoverInfo: "",
              placeholder: '{system_lastName}',
              exampleValue: 'Smith',
              type: 'system' as const,
              source: 'system' as const,
              isValidated: false,
              missingRows: [],
              totalRows: 0,
              validationStatus: 'valid'
            },
            {
              id: 'system_company',
              name: 'Company',
              description: 'Contact\'s company (fetched from system)',
              inputBoxHoverInfo: "",
              placeholder: '{system_company}',
              exampleValue: 'Acme Inc',
              type: 'system' as const,
              source: 'system' as const,
              isValidated: false,
              missingRows: [],
              totalRows: 0,
              validationStatus: 'valid'
            },
            {
              id: 'system_title',
              name: 'Job Title',
              description: 'Contact\'s job title (fetched from system)',
              inputBoxHoverInfo: "",
              placeholder: '{system_title}',
              exampleValue: 'Marketing Director',
              type: 'system' as const,
              source: 'system' as const,
              isValidated: false,
              missingRows: [],
              totalRows: 0,
              validationStatus: 'valid'
            }
          ];
          allVariables.push(...fallbackSystemVariables);
        }

        // Remove duplicates based on ID
        const uniqueVariables = allVariables.filter((variable, index, self) =>
          index === self.findIndex(v => v.id === variable.id)
        );

        setVariables(uniqueVariables);
      } catch (error) {
        console.error('Error generating variables:', error);
      } finally {
        setVariablesLoading(false);
      }
    };

    generateVariablesFromCsvData();
  }, [viewMode, campaign?.id, campaign?.leads?.data, campaign?.csvConfig, campaign?.senderAccounts]);


  const [connectionMessageState, setConnectionMessageState] = useState<ConnectionMessageState>({
    premiumMessage: '',
    standardMessage: '',
    focusedMessageType: 'premium'
  });

  // Sync isConnectionMessageOpen with isOpen prop
  useEffect(() => {
    setIsConnectionMessageOpen(isOpen);
  }, [isOpen]);

  // Sync connectionMessageState with node data when sheet opens
  useEffect(() => {
    if (isOpen) {
      const nodeData = getNode(nodeId)?.data || {} as any;
      setConnectionMessageState({
        premiumMessage: (nodeData.premiumMessage as string) || '',
        standardMessage: (nodeData.standardMessage as string) || '',
        focusedMessageType: (nodeData.focusedMessageType as 'premium' | 'standard') || 'premium'
      });
    }
  }, [isOpen, nodeId, getNode]);

  // Handle delayed close to match sheet closing animation (300ms)
  const handleDelayedClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setIsConnectionMessageOpen(false);
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleSaveMessage = useCallback(() => {
    if (viewMode) return;
    updateNodeData(nodeId, ({data}) => ({
      ...data,
      premiumMessage: connectionMessageState.premiumMessage,
      standardMessage: connectionMessageState.standardMessage,
      focusedMessageType: connectionMessageState.focusedMessageType
    }));
    handleDelayedClose();
  }, [viewMode, nodeId, connectionMessageState, updateNodeData, handleDelayedClose]);

  const handleDismissMessage = useCallback(() => {
    if (viewMode) return;
    handleDelayedClose();
  }, [viewMode, handleDelayedClose]);


  const updatePremiumMessage = useCallback((message: string) => {
    setConnectionMessageState(prev => ({ ...prev, premiumMessage: message }));
  }, []);


  const updateStandardMessage = useCallback((message: string) => {
    setConnectionMessageState(prev => ({ ...prev, standardMessage: message }));
  }, []);

  const setFocusedMessageType = useCallback((type: 'premium' | 'standard') => {
    setConnectionMessageState(prev => ({ ...prev, focusedMessageType: type }));
  }, []);

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

  const [previewState, setPreviewState] = useState<PreviewState>({
    isOpen: false,
    message: '',
    stepId: null
  });

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

    const handleClosePreview = useCallback(() => {
      setPreviewState(prev => ({
        ...prev,
        isOpen: false,
        fromConnectionSheet: false,
        accountType: undefined
      }));
    }, []);

  return (
    <>
      <ConnectionMessageSheet
        isOpen={isConnectionMessageOpen}
        viewMode={viewMode}
        step={null}
        connectionMessageState={connectionMessageState}
        groupedAccounts={groupedAccounts}
        variables={variables}
        onClose={handleDelayedClose}
        onSave={handleSaveMessage}
        onDismiss={handleDismissMessage}
        onUpdatePremiumMessage={updatePremiumMessage}
        onUpdateStandardMessage={updateStandardMessage}
        onSetFocusedMessageType={setFocusedMessageType}
        onInsertVariable={insertConnectionVariable}
        csvData={campaign?.leads?.data}
        onPreview={handleConnectionPreview}
        csvConfigForViewMode={csvConfigForViewMode}
      />

      <MessagePreviewDialog
        isOpen={previewState.isOpen}
        message={previewState.message}
        onClose={handleClosePreview}
        viewMode={viewMode}
        fromConnectionSheet={previewState.fromConnectionSheet}
        accountType={previewState.accountType}
      />

    </>
  );
}
