import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import { LeadsGridView } from '@/components/Leads/LeadsGridView';
import { LeadImportCards } from './LeadImportCards';
import { CSVImportModal } from './CSVImportModal';
import { SavedListsModal } from './SavedListsModal';
import { LinkedInImportModal } from './LinkedInImportModal';
import { LinkedInAccountType } from '@/components/Leads/LinkedInSearchForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Users, Loader2, CheckCircle2 } from 'lucide-react';

// Import hooks
import { useLeadsState } from '@/hooks/useLeadsState';
import { useLeadsProcessing } from '@/hooks/useLeadsProcessing';
import { useCsvProcessing } from '@/hooks/useCsvProcessing';
import { useLeadListStatus } from '@/hooks/useLeadListStatus';

// Import API functions
import { processCsvLeads, getLeadsByListId, getLeadListById } from '@/api/leads/leadsApi';
import { saveDraftCampaign } from '@/api/campaign/campaignDraftApi';

// Import types and utilities
import { Lead as LeadUI } from '@/types/leads';
import { Lead } from '@/types/campaigns';
import { transformToLead, fetchAllLeadsByListId } from '@/utils/leadsUtils';
import { normalizeToCamelCase } from '@/utils/columnNormalization';
import NextSequenceButton from './NextSequenceButton';
import { TooltipInfo } from '@/components/utils/TooltipInfo';

const DEFAULT_PAGE_SIZE = 25;

const ListOfLeads: React.FC = () => {
    const { toast } = useToast();
    const { setLeadsFile, setLeadsS3Data, setLeadsFromList, campaign, getMainIdentifier, setIsFetchingLeads } = useCampaignStore();
    const store = useCampaignStore();
    const storeLeads = store.campaign.leads;


    // Processing state
    const [processingLeadListId, setProcessingLeadListId] = useState<string | null>(null);
    const [leadListData, setLeadListData] = useState<any>(null);
    
    // Import Method Modal state (contains LeadImportCards)
    const [isImportMethodModalOpen, setIsImportMethodModalOpen] = useState(false);
    
    // CSV Import Modal state
    const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
    
    // Saved Lists Modal state
    const [isSavedListsModalOpen, setIsSavedListsModalOpen] = useState(false);
    
    // LinkedIn Import Modal state
    const [isLinkedInImportModalOpen, setIsLinkedInImportModalOpen] = useState(false);
    const [linkedInAccountType, setLinkedInAccountType] = useState<LinkedInAccountType>('classic');

    // Use our custom state hook
    const {
        leads,
        showLeadsGrid,
        searchQuery,
        uploadedFile,
        showColumnMapping,
        validationComplete,
        validRowsCount,
        parsedCsvData,
        isLoading,
        isProcessing,
        uploadInitiated,
        totalCount,
        setLeads,
        setShowLeadsGrid,
        setSearchQuery,
        setUploadedFile,
        setShowColumnMapping,
        setValidationComplete,
        setValidRowsCount,
        setParsedCsvData,
        setIsLoading,
        setIsProcessing,
        resetState,
    } = useLeadsState();

    // State for LinkedIn column detection
    const [detectedLinkedInColumns, setDetectedLinkedInColumns] = useState<string[]>([]);
    const [suggestedLinkedInColumn, setSuggestedLinkedInColumn] = useState<string | null>(null);

    // Pagination state
    const [activeLeadListId, setActiveLeadListId] = useState<string | null>(null);
    const [paginationInfo, setPaginationInfo] = useState({
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPages: 0,
    });
    const [isPageLoading, setIsPageLoading] = useState(false);

    // Handle S3 upload complete - auto-process if main identifier is available
    const handleS3UploadComplete = useCallback(async (s3Url: string, mainIdentifier: string | null) => {
        if (!campaign?.id) {
            console.log('Campaign ID not available, skipping auto-processing');
            return;
        }

        if (!mainIdentifier) {
            console.log('No main identifier auto-detected, waiting for user selection');
            // Ensure column mapping modal is shown for user to select main identifier
            setShowColumnMapping(true);
            // Show warning toast to inform user
            toast({
                title: "LinkedIn Column Required",
                description: "Please select which column contains LinkedIn profile URLs in the mapping modal to proceed.",
                variant: "destructive",
            });
            return;
        }

        // Auto-process CSV if we have main identifier
        const listName = `Campaign CSV Import - ${campaign.name || 'campaign'} - ${new Date().toISOString().split('T')[0]}`;
        
        try {
            setIsProcessing(true);
            console.log('Auto-processing CSV with:', { campaignId: campaign.id, s3Url, mainIdentifier, listName });
            
            const response = await processCsvLeads(
                campaign.id,
                listName,
                s3Url,
                mainIdentifier
            );

            const leadListId = (response.data as any)?.leadList?.id;
            
            if (!leadListId) {
                throw new Error('Lead list ID not found in response');
            }

            // Update campaign store with leadListId immediately
            try {
                store.updateCampaign({ leadListId });
                // Save draft campaign - it will get campaign directly from store
                await saveDraftCampaign();
                console.log('Draft campaign updated with leadListId (auto CSV processing):', leadListId);
            } catch (error) {
                console.error('Error saving draft campaign:', error);
            }

            toast({
                title: 'Success',
                description: 'CSV processing started automatically. Please wait...',
            });

            // Start polling for status
            setProcessingLeadListId(leadListId);
            setShowColumnMapping(false);
            setIsCsvImportModalOpen(false);
        } catch (error) {
            console.error('Error auto-processing CSV:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to process CSV automatically',
                variant: 'destructive',
            });
            setIsProcessing(false);
            // Show column mapping modal as fallback
            setShowColumnMapping(true);
        }
    }, [campaign, setIsProcessing, setShowColumnMapping, setProcessingLeadListId, toast, store, setIsCsvImportModalOpen]);

    // Use CSV processing hook
    const { handleFileUpload, validateAndSetMainIdentifier } = useCsvProcessing({
        uploadedFile,
        setParsedCsvData,
        setValidRowsCount,
        setUploadedFile,
        setShowColumnMapping,
        setValidationComplete,
        setIsLoading,
        setLeadsFile,
        setLeadsS3Data,
        onS3UploadComplete: handleS3UploadComplete,
    });

    // Polling for lead list status (CSV and LinkedIn Search)
    const {
        status: leadListStatus,
        isLoading: isPolling,
    } = useLeadListStatus({
        leadListId: processingLeadListId,
        enabled: !!processingLeadListId,
        onComplete: async (leadListId) => {
            // Processing complete, fetch leads
            // Note: handleLoadLeadsFromList will handle the transition state
            // and keep processingLeadListId set until leads are actually loaded
            await handleLoadLeadsFromList(leadListId);
            // Close all modals after leads are loaded (handled in handleLoadLeadsFromList)
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
            setProcessingLeadListId(null);
        },
    });

    // Check if campaign was initialized with PROCESSING status and start polling
    useEffect(() => {
        const leadListId = storeLeads?.leadListId || campaign?.leadListId;
        const leadListMetadata = storeLeads?.leadListMetadata;
        
        // If we have a leadListId and metadata shows PROCESSING status, start polling
        if (leadListId && leadListMetadata?.status === 'PROCESSING' && !processingLeadListId) {
            console.log('Campaign initialized with PROCESSING status, starting polling:', leadListId);
            setProcessingLeadListId(leadListId);
            // Store leadListData for UI display
            setLeadListData(leadListMetadata);
        }
    }, [storeLeads?.leadListId, storeLeads?.leadListMetadata, campaign?.leadListId, processingLeadListId]);

    // Load existing leads from store
    useEffect(() => {
        if (storeLeads) {
            const hasLeads = (storeLeads.data || []).length > 0;
            
            if (hasLeads) {
                const formattedLeads: LeadUI[] = (storeLeads.data || []).map((item: Lead) => {
                    // Extract data from details object for transformToLead
                    const details = item.details || {};
                    return transformToLead({
                        ...details,
                        linkedinUrl: details.linkedinUrl || item.url || '',
                        id: item.id,
                        firstName: item.firstName || details.firstName || '',
                        lastName: details.lastName || '',
                    });
                });

                setLeads(formattedLeads);
                setValidRowsCount(formattedLeads.length);

                const metadataPagination = storeLeads.leadListMetadata?.pagination;
                if (metadataPagination) {
                    setPaginationInfo({
                        page: metadataPagination.page || 1,
                        pageSize: metadataPagination.pageSize || DEFAULT_PAGE_SIZE,
                        total: metadataPagination.total || formattedLeads.length,
                        totalPages: metadataPagination.totalPages || 1,
                    });
                }
            } else {
                // No leads but we might have an empty list
                setLeads([]);
                setValidRowsCount(0);
            }

            // Show grid if we have a leadListId (even if empty)
            if (storeLeads.leadListId || campaign?.leadListId) {
                setShowLeadsGrid(true);
                
                if (storeLeads.leadListId) {
                    setActiveLeadListId(storeLeads.leadListId);
                } else if (campaign?.leadListId) {
                    setActiveLeadListId(campaign.leadListId);
                }
            }
        }
    }, [storeLeads, setLeads, setValidRowsCount, setShowLeadsGrid, setActiveLeadListId, campaign?.leadListId, setPaginationInfo]);

    // Filter leads based on search query
    const filteredLeads = useMemo(() => {
        if (!searchQuery.trim()) {
            return leads;
        }

        const query = searchQuery.toLowerCase().trim();
        return leads.filter(lead => {
            return (
                (lead.firstName?.toLowerCase().includes(query)) ||
                (lead.lastName?.toLowerCase().includes(query)) ||
                (lead.company?.toLowerCase().includes(query)) ||
                (lead.location?.toLowerCase().includes(query)) ||
                (`${lead.firstName} ${lead.lastName}`.trim().toLowerCase().includes(query))
            );
        });
    }, [leads, searchQuery]);

    const totalLeadsAvailable = useMemo(() => {
        if (paginationInfo.total) {
            return paginationInfo.total;
        }

        if (leadListData?.totalLeads) {
            return leadListData.totalLeads;
        }

        if (storeLeads?.leadListMetadata?.totalLeads) {
            return storeLeads.leadListMetadata.totalLeads;
        }

        return totalCount || leads.length;
    }, [paginationInfo.total, leadListData, storeLeads?.leadListMetadata?.totalLeads, totalCount, leads.length]);

    const validLinkedInCount = totalLeadsAvailable;

    const loadLeadsPage = useCallback(async ({
        leadListId,
        page,
        metadataOverride,
        showPageLoader = false,
    }: {
        leadListId: string;
        page: number;
        metadataOverride?: any;
        showPageLoader?: boolean;
    }) => {
        if (showPageLoader) {
            setIsPageLoading(true);
        }

        try {
            const { leads: fetchedLeads, pagination, leadList } = await fetchAllLeadsByListId(leadListId, {
                page,
                pageSize: paginationInfo.pageSize || DEFAULT_PAGE_SIZE,
                fetchAll: false,
            });

            const resolvedMetadata = leadList || metadataOverride || leadListData || {};
            const columnMapping = resolvedMetadata.columnMapping || [];
            const source = resolvedMetadata.source || null;

            const metadataWithPagination = {
                ...resolvedMetadata,
                columnMapping,
                source,
                pagination,
                totalLeads: resolvedMetadata.totalLeads ?? pagination.total,
            };

            const formattedLeadsForStore: Lead[] = fetchedLeads;
            const formattedLeadsForUI: LeadUI[] = fetchedLeads;

            setLeadsFromList(leadListId, formattedLeadsForStore, columnMapping, source, metadataWithPagination);
            setLeadListData(metadataWithPagination);
            setLeads(formattedLeadsForUI);
            setValidRowsCount(metadataWithPagination.totalLeads ?? formattedLeadsForUI.length);
            setShowLeadsGrid(true);
            setPaginationInfo({
                page: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                totalPages: pagination.totalPages || 0,
            });
            setActiveLeadListId(leadListId);

            return { pagination };
        } finally {
            if (showPageLoader) {
                setIsPageLoading(false);
            }
        }
    }, [leadListData, paginationInfo.pageSize, setLeadsFromList, setLeadListData, setLeads, setValidRowsCount, setShowLeadsGrid, setPaginationInfo, setActiveLeadListId, setIsPageLoading]);

    // Handle loading leads from any list (CSV, LinkedIn Search, or Saved Lists)
    const handleLoadLeadsFromList = useCallback(async (leadListId: string) => {
        try {
            setIsLoading(true);
            
            // First, get leadList metadata to check status
            const metadataResponse = await getLeadListById(leadListId);
            const leadListMetadata = (metadataResponse.data as any)?.leadList;
            
            if (!leadListMetadata) {
                throw new Error('Lead list metadata not found');
            }

            const status = leadListMetadata.status;
            const columnMapping = leadListMetadata.columnMapping || [];
            const source = leadListMetadata.source || null;

            // Store leadList metadata in campaign store
            setLeadsFromList(leadListId, [], columnMapping, source, leadListMetadata);
            
            // Store leadList data for displaying import method
            setLeadListData(leadListMetadata);

            // If status is PROCESSING, don't fetch leads yet - just show progress
            if (status === 'PROCESSING') {
                setProcessingLeadListId(leadListId);
                setIsImportMethodModalOpen(false);
                setIsLoading(false);
                return;
            }

            // If status is ACTIVE, fetch leads with pagination
            if (status === 'ACTIVE') {
                setIsFetchingLeads(true);
                
                try {
                    const { pagination } = await loadLeadsPage({
                        leadListId,
                        page: 1,
                        metadataOverride: leadListMetadata,
                    });

                    setProcessingLeadListId(null);
                    setIsImportMethodModalOpen(false);

                    // Save draft campaign with updated leadListId
                    try {
                        await saveDraftCampaign();
                        console.log('Draft campaign updated with leadListId:', leadListId);
                    } catch (error) {
                        console.error('Error saving draft campaign:', error);
                        // Don't show error toast - leads loading was successful
                    }

                    const totalDescription = pagination?.total
                        ? `Loaded ${pagination.total.toLocaleString()} leads (page ${pagination.page} of ${pagination.totalPages || 1})`
                        : 'Loaded leads successfully';

                    toast({
                        title: 'Success',
                        description: totalDescription,
                    });
                } finally {
                    setIsFetchingLeads(false);
                }
            } else {
                throw new Error(`Unexpected lead list status: ${status}`);
            }
        } catch (error) {
            console.error('Error loading leads:', error);
            // Reset fetching state on error
            setIsFetchingLeads(false);
            setProcessingLeadListId(null);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to load leads',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setLeadsFromList, setLeads, setValidRowsCount, setShowLeadsGrid, setIsFetchingLeads, toast, campaign, store, loadLeadsPage]);

    const handlePageChange = useCallback((nextPage: number) => {
        if (!activeLeadListId) {
            return;
        }

        if (nextPage < 1) {
            return;
        }

        if (paginationInfo.totalPages && nextPage > paginationInfo.totalPages) {
            return;
        }

        loadLeadsPage({
            leadListId: activeLeadListId,
            page: nextPage,
            showPageLoader: true,
        }).catch(error => {
            console.error('Error loading page of leads:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to load this page of leads',
                variant: 'destructive',
            });
        });
    }, [activeLeadListId, paginationInfo.totalPages, loadLeadsPage, toast]);

    // Handle CSV processing with new API flow
    const handleCsvProcessing = useCallback(async () => {
        if (!campaign?.id) {
            toast({
                title: 'Error',
                description: 'Campaign ID is missing',
                variant: 'destructive',
            });
            return;
        }

        const s3Url = storeLeads?.s3Url;
        if (!s3Url) {
            toast({
                title: 'Error',
                description: 'S3 URL is missing. Please upload the file first.',
                variant: 'destructive',
            });
            return;
        }

        const mainIdentifier = getMainIdentifier() || suggestedLinkedInColumn || 'profile_url';
        const listName = `Campaign CSV Import - ${campaign.name || 'campaign'} - ${new Date().toISOString().split('T')[0]}`;

        try {
            setIsProcessing(true);
            const response = await processCsvLeads(
                campaign.id,
                listName,
                s3Url,
                mainIdentifier
            );

            const leadListId = (response.data as any)?.leadList?.id;
            
            if (!leadListId) {
                throw new Error('Lead list ID not found in response');
            }

            // Update campaign store with leadListId immediately
            try {
                // Update the campaign in store with leadListId
                store.updateCampaign({ leadListId });
                setLeads([]);
                // Save draft campaign - it will get campaign directly from store
                await saveDraftCampaign();
                console.log('Draft campaign updated with leadListId (CSV processing):', leadListId);
            } catch (error) {
                console.error('Error saving draft campaign:', error);
                // Don't throw - processing started successfully
            }

            toast({
                title: 'Success',
                description: 'CSV processing started. Please wait...',
            });

            // Start polling for status
            setProcessingLeadListId(leadListId);
            setShowColumnMapping(false);
            setIsCsvImportModalOpen(false);
        } catch (error) {
            console.error('Error processing CSV:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to process CSV',
                variant: 'destructive',
            });
            setIsProcessing(false);
        }
    }, [campaign, storeLeads, getMainIdentifier, suggestedLinkedInColumn, setIsProcessing, setShowColumnMapping, toast, store, setIsCsvImportModalOpen]);

    // Handle LinkedIn Search processing started
    const handleLinkedInSearchStarted = useCallback(async (leadListId: string) => {
        setProcessingLeadListId(leadListId);
        
        
        // Update campaign store with leadListId immediately
        if (campaign?.id) {
            try {
                // Update the campaign in store with leadListId
                store.updateCampaign({ leadListId });
                setLeads([]);
                // Save draft campaign - it will get campaign directly from store
                await saveDraftCampaign();

                console.log('Draft campaign updated with leadListId (LinkedIn search):', leadListId);
            } catch (error) {
                console.error('Error saving draft campaign:', error);
                // Don't show error toast - processing started successfully
            }
        }
        
        toast({
            title: 'Processing Started',
            description: 'LinkedIn search is being processed. Please wait...',
        });
        setIsLinkedInImportModalOpen(false);
    }, [toast, campaign, store]);

    // Handle Saved List leads loaded
    const handleSavedListLeadsLoaded = useCallback((leadListId: string, _leadsData: any[]) => {
        handleLoadLeadsFromList(leadListId);
        setIsSavedListsModalOpen(false);
    }, [handleLoadLeadsFromList]);



    // Handle modal close
    const handleModalClose = useCallback(() => {
        setShowColumnMapping(false);
        resetState();
    }, [setShowColumnMapping, resetState]);

    // Handle CSV import modal close
    const handleCsvImportModalClose = useCallback((open: boolean) => {
        setIsCsvImportModalOpen(open);
        // Reset state when modal closes (only if not processing)
        if (!open && !(processingLeadListId && (isPolling || leadListStatus === 'PROCESSING'))) {
            resetState();
        }
    }, [processingLeadListId, isPolling, leadListStatus, resetState]);

    // Handle Saved Lists modal close
    const handleSavedListsModalClose = useCallback((open: boolean) => {
        setIsSavedListsModalOpen(open);
        // Reset processing state when modal closes (only if not processing)
        if (!open && !(processingLeadListId && (isPolling || leadListStatus === 'PROCESSING'))) {
            setProcessingLeadListId(null);
        }
    }, [processingLeadListId, isPolling, leadListStatus]);

    // Handle LinkedIn Import modal close
    const handleLinkedInImportModalClose = useCallback((open: boolean) => {
        setIsLinkedInImportModalOpen(open);
        // Reset processing state when modal closes (only if not processing)
        if (!open && !(processingLeadListId && (isPolling || leadListStatus === 'PROCESSING'))) {
            setProcessingLeadListId(null);
        }
    }, [processingLeadListId, isPolling, leadListStatus]);

    // Handle LinkedIn import with account type
    const handleLinkedInImport = useCallback((accountType: LinkedInAccountType) => {
        setLinkedInAccountType(accountType);
        setIsLinkedInImportModalOpen(true);
        // Close import method modal when opening specific import modal
        setIsImportMethodModalOpen(false);
    }, []);

    // Handle CSV import - close import method modal and open CSV modal
    const handleCsvImport = useCallback(() => {
        setIsImportMethodModalOpen(false);
        setIsCsvImportModalOpen(true);
    }, []);

    // Handle Saved Lists - close import method modal and open saved lists modal
    const handleSavedLists = useCallback(() => {
        setIsImportMethodModalOpen(false);
        setIsSavedListsModalOpen(true);
    }, []);

    // Handle LinkedIn column confirmed
    const handleLinkedInColumnConfirmed = (columnName: string, csvData: any[]) => {
        setSuggestedLinkedInColumn(columnName);
        
        if (csvData.length > 0) {
            const isValid = validateAndSetMainIdentifier(columnName, csvData);
            if (isValid) {
                console.log(`Main identifier "${columnName}" automatically set for auto-processing`);
            }
        }
    };

    // Handle LinkedIn columns detected
    const handleLinkedInColumnsDetected = (detectedColumns: string[], suggestedColumn: string | null, csvData: any[]) => {
        // Normalize columns to camelCase to match parsedCsvData format
        const transformedColumns = detectedColumns.map(column => normalizeToCamelCase(column));
        const transformedSuggestedColumn = suggestedColumn ? normalizeToCamelCase(suggestedColumn) : null;
            
        setDetectedLinkedInColumns(transformedColumns);
        setSuggestedLinkedInColumn(transformedSuggestedColumn);
    };

    // Handle LinkedIn column selected
    const handleLinkedInColumnSelected = (columnName: string) => {
        if (parsedCsvData.length > 0) {
            const isValid = validateAndSetMainIdentifier(columnName, parsedCsvData);
            if (isValid) {
                setSuggestedLinkedInColumn(columnName);
                handleLinkedInColumnConfirmed(columnName, parsedCsvData);
            }
        }
    };

    // Handle reupload request
    const handleReuploadRequest = () => {
        resetState();
        setDetectedLinkedInColumns([]);
        setSuggestedLinkedInColumn(null);
        setActiveLeadListId(null);
        setPaginationInfo({
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
            total: 0,
            totalPages: 0,
        });
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    // Show processing status if:
    // 1. Polling and status is PROCESSING
    // 2. Store has PROCESSING status
    // 3. Fetching leads after status became ACTIVE (transition state)
    const storeProcessingStatus = storeLeads?.leadListMetadata?.status === 'PROCESSING';

    console.log('storeProcessingStatus', storeProcessingStatus, storeLeads);
    const isFetchingLeads = storeLeads?.isFetchingLeads || false;
    const isProcessingStatus: boolean = !!(processingLeadListId && (isPolling || leadListStatus === 'PROCESSING')) || 
                                         !!(storeProcessingStatus && storeLeads?.leadListId) ||
                                         isFetchingLeads;
                                        
    console.log('storeProcessingStatusdfdv', isProcessingStatus);
    
    // Get progress info from store or leadListData
    const getProgressInfo = () => {
        const metadata = storeLeads?.leadListMetadata || leadListData;
        if (!metadata) return null;
        
        const totalLeads = metadata.totalLeads || 0;
        let limit = 0;
        
        // For LinkedIn: get limit from source.metadata.limit
        if (metadata.source?.type === 'LINKEDIN') {
            limit = metadata.source.metadata?.limit || totalLeads;
        }
        // For CSV: get limit from source.metadata.totalRows
        else if (metadata.source?.type === 'CSV') {
            limit = metadata.source.metadata?.totalRows || totalLeads;
        }
        // Fallback to totalLeads if no limit found
        else {
            limit = totalLeads;
        }
        
        return {
            totalLeads,
            limit,
            processed: totalLeads,
            pending: Math.max(0, limit - totalLeads),
        };
    };
    
    const progressInfo = getProgressInfo();
   
    
    // Fetch leadList data during polling to check status
    useEffect(() => {
        if (processingLeadListId && (isPolling || leadListStatus === 'PROCESSING')) {
            const fetchLeadListData = async () => {
                try {
                    setIsFetchingLeads(true);
                    const response = await getLeadListById(processingLeadListId);
                    const leadList = (response.data as any)?.leadList;
                    if (leadList) {
                        setLeadListData(leadList);
                        // Update store with latest metadata
                        const columnMapping = leadList.columnMapping || [];
                        const source = leadList.source || null;
                        setLeadsFromList(processingLeadListId, [], columnMapping, source, leadList);
                                                
                    }
                } catch (error) {
                    console.error('Error fetching leadList data:', error);
                }
                finally {
                    setIsFetchingLeads(false);
                }
            };
            fetchLeadListData();
        }
    }, [processingLeadListId, isPolling, leadListStatus, setLeadsFromList]);


 
    
    return (
        <div>
            {/* Always render modals so they can open from anywhere */}
            {/* CSV Import Modal - Always rendered so it can open from card grid */}
            <CSVImportModal
                isOpen={isCsvImportModalOpen}
                onClose={handleCsvImportModalClose}
                isProcessing={isProcessing}
                isProcessingStatus={isProcessingStatus}
                isLoading={isLoading}
                uploadedFile={uploadedFile}
                showColumnMapping={showColumnMapping}
                parsedCsvData={parsedCsvData}
                validRowsCount={validRowsCount}
                validationComplete={validationComplete}
                uploadInitiated={uploadInitiated}
                detectedLinkedInColumns={detectedLinkedInColumns}
                suggestedLinkedInColumn={suggestedLinkedInColumn}
                onFileUpload={handleFileUpload}
                onLinkedInColumnConfirmed={handleLinkedInColumnConfirmed}
                onLinkedInColumnsDetected={handleLinkedInColumnsDetected}
                onLinkedInColumnSelected={handleLinkedInColumnSelected}
                onUploadAll={handleCsvProcessing}
                onReuploadRequest={handleReuploadRequest}
                onModalClose={handleModalClose}
                onValidRowsCountUpdate={setValidRowsCount}
            />

            {/* Saved Lists Modal - Always rendered so it can open from card grid */}
            <SavedListsModal
                isOpen={isSavedListsModalOpen}
                onClose={handleSavedListsModalClose}
                isProcessingStatus={isProcessingStatus}
                onSavedListLeadsLoaded={handleSavedListLeadsLoaded}
            />

            {/* LinkedIn Import Modal - Always rendered so it can open from card grid */}
            {campaign?.id && (
                <LinkedInImportModal
                    isOpen={isLinkedInImportModalOpen}
                    onClose={handleLinkedInImportModalClose}
                    campaignId={campaign.id}
                    accountType={linkedInAccountType}
                    isProcessingStatus={isProcessingStatus}
                    onProcessingStarted={handleLinkedInSearchStarted}
                />
            )}

            {/* Import Method Modal - Always rendered so it can open from anywhere */}
            <Dialog open={isImportMethodModalOpen} onOpenChange={setIsImportMethodModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className='pb-4'>How would you like to add leads?</DialogTitle>
                        {/* <DialogDescription>Choose a method to import your leads</DialogDescription> */}
                    </DialogHeader>
                    <LeadImportCards
                        onCsvImport={handleCsvImport}
                        onLinkedInSearch={handleLinkedInImport}
                        onSavedLists={handleSavedLists}
                    />
                </DialogContent>
            </Dialog>

            {/* Conditional content - show leads grid or empty state */}
            {showLeadsGrid && !isProcessingStatus ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">List of Leads</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    // Just open the import method modal without clearing leads
                                    setIsImportMethodModalOpen(true);
                                }}
                                className="text-sm text-primary hover:underline"
                            >
                                Change Import Method
                            </button>
                            <NextSequenceButton />
                        </div>
                    </div>
                    <LeadsGridView
                        leads={filteredLeads}
                        searchQuery={searchQuery}
                        totalCount={totalLeadsAvailable}
                        validLinkedInCount={validLinkedInCount}
                        leadListId={storeLeads?.leadListId || campaign?.leadListId || null}
                        columnMapping={storeLeads?.columnMapping}
                        campaignLeads={storeLeads?.data || []}
                        onSearchChange={setSearchQuery}
                        pagination={paginationInfo}
                        onPageChange={handlePageChange}
                        isPageLoading={isPageLoading}
                    />
                </div>
            ) : (
                <div className="relative flex flex-col items-center justify-center min-h-[400px] py-12 px-4">
                    {/* Next Button in top right corner */}
                    <div className="absolute top-4 right-4">
                        <NextSequenceButton />
                    </div>
                    
                    {isProcessingStatus ? (
                        /* Processing Banner */
                        <div className="w-full text-center">
                            {/* Title */}
                            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                                {isFetchingLeads 
                                    ? 'Loading your leads...' 
                                    : 'Processing your import...'}
                            </h3>
                            
                            {/* Status Badge */}
                            <div className="inline-flex items-center px-4 py-1.5  mb-4">
                                <Loader2 className="w-10 h-10 text-gray-600 animate-spin mr-2" />
                               
                            </div>
                            
                            {/* Descriptive Message */}
                            {/* <p className="text-sm text-gray-600 mb-8 leading-relaxed">
                                {isFetchingLeads 
                                    ? 'Fetching leads from server. This may take a few moments...'
                                    : 'Your leads are being imported and processed. This may take a few moments.'}
                            </p> */}
                            
                            {/* Progress Metrics */}
                            {progressInfo && (
                                <div className="flex items-center justify-center gap-16 mt-10">
                                    {/* Processed Section */}
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">
                                            Processed
                                        </p>
                                        <div className="flex items-baseline justify-center gap-1">
                                            <p className="text-3xl font-bold text-gray-900">
                                                {progressInfo.totalLeads.toLocaleString()}
                                            </p>
                                            {progressInfo.totalLeads > 0 && (
                                                <span className="text-xs text-green-600">✓</span>
                                            )}
                                        </div>
                                        {progressInfo.limit > 0 && (
                                            <p className="text-sm text-gray-400 mt-2">
                                                of {progressInfo.limit.toLocaleString()} total
                                            </p>
                                        )}
                                    </div>
                                    
                                    {/* Pending Section */}
                                    {progressInfo.pending > 0 && (
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">
                                                Pending
                                            </p>
                                            <p className="text-3xl font-bold text-gray-400">
                                                {progressInfo.pending.toLocaleString()}
                                            </p>
                                            {progressInfo.limit > 0 && (
                                                <p className="text-xs text-gray-400 mt-2">
                                                    remaining
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Tip Message */}
                            <div className="border-t mt-4 border-gray-200 max-w-md mx-auto"></div>
                            <div className="pt-3 border-gray-200">
                                <p className="text-sm text-gray-600">
                                    💡  <strong>Note: </strong> Leads are being saved to the list <span className="font-bold text-gray-600">{storeLeads?.leadListMetadata?.name}</span>. <br />
                                    <br />
                                    You can close this campaign. We’ll auto-import the remaining leads. <br />
                                   Access them later in Saved Lists under Import Leads.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-md w-full text-center">
                            {/* Icon Container with Gradient Background */}
                            <div className="relative mb-8 flex justify-center">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-purple-200 rounded-full blur-2xl opacity-60"></div>
                                </div>
                                <div className="relative w-24 h-24 bg-gradient-to-br from-primary/10 to-purple-100 rounded-2xl flex items-center justify-center shadow-lg border border-primary/20">
                                    <Users className="w-12 h-12 text-primary" />
                                </div>
                            </div>

                            {/* Title and Description */}
                            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                            Add leads to begin
                            </h3>
                            <p className="text-gray-600 mb-8 text-base leading-relaxed">
                            Import from CSV, LinkedIn search, or your saved lists.
                            </p>

                            {/* Import Button */}
                            <Button
                                onClick={() => setIsImportMethodModalOpen(true)}
                                className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-2 px-6 py-3 text-base font-semibold"
                                size="lg"
                            >
                                <Upload className="w-5 h-5" />
                                Import Leads
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ListOfLeads;
