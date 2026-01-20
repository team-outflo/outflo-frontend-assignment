import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCampaignStore, ICampaignStoreState, ICampaignStoreActions, campaignStore } from '@/api/store/campaignStore/campaign';
import { useCampaignByIdQuery, useDraftCampaignByIdQuery, mapBackendCampaignToFrontend, useLeadsByCampaignIdQuery, useLeadsByListIdQuery } from '@/hooks/useCampaignQueries';
import { useCampaignInsightsQuery } from '@/hooks/useCampaignInsights';
import { jsonToNodesAndEdges } from '@/pages/Flow/utils/json-to-nodes-edges';
import { queryClient } from '@/lib/query-client';
import { checkUnauthorized, get } from '@/common/api';

// Stable empty array reference to prevent re-renders
const EMPTY_LEADS_ARRAY: never[] = [];

export const useCampaignOrchestrator = () => {
  const store = useCampaignStore() as ICampaignStoreState & ICampaignStoreActions;
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  // Track the last campaign ID to detect changes
  const lastCampaignIdRef = useRef<string | undefined>(undefined);
  // Track if campaign has been initialized to prevent re-initialization loops
  const initializedCampaignIdRef = useRef<string | undefined>(undefined);

  // Determine mode early based on URL path
  const mode = useMemo(() => {
    return location.pathname.includes("/view/") ? "view" : "edit";
  }, [location.pathname]);

  // Use draft API when in edit mode, regular API when in view mode
  const {
    data: regularCampaignData,
    isLoading: regularCampaignLoading,
    error: regularCampaignError
  } = useCampaignByIdQuery(id || '', { enabled: !!id && mode === 'view' });

  const {
    data: draftCampaignData,
    isLoading: draftCampaignLoading,
    error: draftCampaignError
  } = useDraftCampaignByIdQuery(id || '', { enabled: !!id && mode === 'edit' });

  // Select the appropriate data based on mode
  const campaignData = mode === 'edit' ? draftCampaignData : regularCampaignData;
  const campaignLoading = mode === 'edit' ? draftCampaignLoading : regularCampaignLoading;
  const campaignError = mode === 'edit' ? draftCampaignError : regularCampaignError;

  // Only fetch insights in view mode, not in edit mode
  const {
    data: campaignInsights,
    isLoading: insightsLoading,
    isFetching: insightsFetching,
    refetch: refreshInsights
  } = useCampaignInsightsQuery(id || '', { enabled: mode === 'view' });

  // Extract leadListId from campaign data
  const leadListId = useMemo(() => {
    return campaignData?.leadListId || campaignData?.leads?.leadListId || null;
  }, [campaignData]);

  // Determine campaign status (check both state and status fields)
  const campaignStatus = useMemo(() => {
    const state = campaignData?.state || campaignData?.status;
    if (typeof state === 'string') {
      return state.toUpperCase();
    }
    return state?.toString().toUpperCase() || 'DRAFT';
  }, [campaignData]);

  // Use campaign ID for non-draft campaigns, lead list ID for draft campaigns
  const isDraft = campaignStatus === 'DRAFT';
  const shouldUseCampaignId = !isDraft && !!id;
  const shouldUseLeadListId = isDraft && !!leadListId;

  // Fetch leads using campaign ID for non-draft campaigns
  const {
    data: leadsQueryResultByCampaign,
    isLoading: leadsLoadingByCampaign,
    error: leadsErrorByCampaign
  } = useLeadsByCampaignIdQuery(id || null, { enabled: shouldUseCampaignId && !!campaignData });

  // Fetch leads using lead list ID for draft campaigns
  const {
    data: leadsQueryResultByList,
    isLoading: leadsLoadingByList,
    error: leadsErrorByList
  } = useLeadsByListIdQuery(leadListId, { enabled: shouldUseLeadListId && !!campaignData });

  // Use the appropriate query result based on campaign status
  const leadsQueryResult = shouldUseCampaignId ? leadsQueryResultByCampaign : leadsQueryResultByList;
  const leadsLoading = shouldUseCampaignId ? leadsLoadingByCampaign : leadsLoadingByList;
  const leadsError = shouldUseCampaignId ? leadsErrorByCampaign : leadsErrorByList;

  // Extract leads data from query result with stable reference for empty array
  const leadsData = useMemo(() => {
    return leadsQueryResult?.leads || EMPTY_LEADS_ARRAY;
  }, [leadsQueryResult?.leads]);

  // Extract leadListMetadata from leadList
  const leadListMetadata = useMemo(() => {
    return leadsQueryResult?.leadList || null;
  }, [leadsQueryResult?.leadList]);

  // Extract columnMapping from leadListMetadata (not from lead responses)
  const columnMapping = useMemo(() => {
    return leadListMetadata?.columnMapping || [];
  }, [leadListMetadata?.columnMapping]);

  // Extract source from leadListMetadata (not from lead responses)
  const source = useMemo(() => {
    return (leadListMetadata as any)?.source || null;
  }, [(leadListMetadata as any)?.source]);

  // Centralized URL state management
  const syncModeWithUrl = useCallback(() => {
    // Only update if mode actually changed
    if (store.mode !== mode) {
      store.setMode(mode);
    }
  }, [mode, store.mode]);

  // Clear store when campaign ID changes (root fix for stale data)
  useEffect(() => {
    const currentCampaignId = id || undefined;
    // If campaign ID changed, clear the store immediately to prevent showing old data
    if (currentCampaignId !== lastCampaignIdRef.current && lastCampaignIdRef.current !== undefined) {
      console.log('Campaign ID changed, clearing store:', {
        from: lastCampaignIdRef.current,
        to: currentCampaignId
      });
      store.reset();
      // Reset initialization tracking
      initializedCampaignIdRef.current = undefined;
    }
    // Update the ref for next comparison
    lastCampaignIdRef.current = currentCampaignId;
  }, [id, store]);

  // Centralized campaign initialization
  const initializeCampaign = useCallback(async () => {
    // Only initialize if we have campaign data AND it matches the current campaign ID
    if (campaignData && id) {
      // Both draft and regular responses are already the campaign object (extracted by checkUnauthorized)
      const campaignId = campaignData.id;
      if (campaignId === id) {
        // Prevent re-initialization if already initialized for this campaign (unless store is empty)
        const currentStoreState = campaignStore.getState();
        const isStoreEmpty = !currentStoreState.campaign?.id || currentStoreState.campaign.id === '';
        if (initializedCampaignIdRef.current === id && !leadsLoading && !isStoreEmpty) {
          console.log('Campaign already initialized, skipping...');
          return;
        }
        // Always initialize if store is empty (first load or after reset)
        if (isStoreEmpty) {
          console.log('Store is empty, initializing campaign...');
        }

        // Wait for leads to be fetched if leadListId exists
        const shouldWaitForLeads = !!leadListId && !leadsError;
        if (shouldWaitForLeads && leadsLoading) {
          console.log('Waiting for leads to be fetched before initialization...');
          return;
        }

        console.log('Initializing campaign store with data:', campaignData);

        try {
          // Map backend campaign data to frontend format
          const mappedCampaign = await mapBackendCampaignToFrontend(campaignData);
          console.log("mapped campaign",mappedCampaign)

          // Store leadListMetadata if available
          if (leadListMetadata) {
            console.log('Storing leadListMetadata in campaign:', leadListMetadata);
            mappedCampaign.leads = {
              ...mappedCampaign.leads,
              leadListId: leadListId || mappedCampaign.leads?.leadListId,
              leadListMetadata: leadListMetadata,
              // Extract columnMapping and source from metadata
              columnMapping: columnMapping.length > 0 ? columnMapping : mappedCampaign.leads?.columnMapping,
              source: source || mappedCampaign.leads?.source,
            };
          }

          // Merge leads data if available (only if status is ACTIVE)
          if (leadsData && leadsData.length > 0) {
            console.log('Merging leads data into campaign:', leadsData.length, 'leads');
            mappedCampaign.leads = {
              ...mappedCampaign.leads,
              data: leadsData,
            };
          }

            // const config = await queryClient.fetchQuery({
            //    queryKey: ["sequence-config"],
            //       queryFn: async () => {
            //         const data = await get("/campaigns/sequences/config").then(response => checkUnauthorized(response, false));
            //         return data?.data?.config ?? {};
            //       },
            // })

          

 

          // Extract nodes and edges from sequenceDraft for initialization
          const sequenceDraft = mappedCampaign.sequenceDraft;
          const nodes = sequenceDraft?.nodes || [];
          const edges = sequenceDraft?.edges || [];

          // Initialize the store with the campaign data
          const storeState = campaignStore.getState();
          storeState.init(mappedCampaign, storeState.mode, nodes, edges);
          // Mark as initialized
          initializedCampaignIdRef.current = id;
        } catch (error) {
          console.error('Error mapping campaign data:', error);
          // Fallback: initialize with raw data
          const fallbackCampaign = campaignData as any;

          
          // Store leadListMetadata if available
          if (leadListMetadata) {
            fallbackCampaign.leads = {
              ...fallbackCampaign.leads,
              leadListId: leadListId || fallbackCampaign.leads?.leadListId,
              leadListMetadata: leadListMetadata,
              columnMapping: columnMapping.length > 0 ? columnMapping : fallbackCampaign.leads?.columnMapping,
              source: source || fallbackCampaign.leads?.source,
            };
          }

          
          if (leadsData && leadsData.length > 0) {
            fallbackCampaign.leads = {
              ...fallbackCampaign.leads,
              data: leadsData,
            };
          }

          // Extract nodes and edges from fallback campaign data
          const fallbackSequenceDraft = fallbackCampaign.sequenceDraft;
          const fallbackNodes = fallbackSequenceDraft?.nodes || [];
          const fallbackEdges = fallbackSequenceDraft?.edges || [];

          const storeState = campaignStore.getState();
          storeState.init(fallbackCampaign, storeState.mode, fallbackNodes, fallbackEdges);
          // Mark as initialized
          initializedCampaignIdRef.current = id;
        }
      }
    }
  }, [campaignData, id, leadListId, leadsData, columnMapping, source, leadListMetadata, leadsLoading, leadsError]);

  // Centralized navigation actions
  const goToAllCampaigns = useCallback(() => {
    // Check for unsaved changes before navigating
    // Note: The actual blocking is handled by useNavigationBlocker in CampaignEditorPage
    // This function will be intercepted if there are unsaved changes
    navigate('/allcampaigns');
  }, [navigate]);

  const goToStep = useCallback((step: number) => {
    store.setState({ currentStep: step });
  }, []);

  // Effects for orchestration
  useEffect(() => {
    syncModeWithUrl();
  }, [syncModeWithUrl]);

  useEffect(() => {
    initializeCampaign();
  }, [initializeCampaign]);

  // Centralized loading and error states
  // Show loading if: query is loading OR campaign ID doesn't match (prevents showing stale data) OR leads are loading
  const isLoading = campaignLoading || leadsLoading || (id !== undefined && store.campaign.id !== id);
  const hasError = !!campaignError || !!leadsError;

  return {
    // Single source of truth from store
    campaign: store.campaign,
    mode: store.mode,
    currentStep: store.currentStep,
    // Data from queries (orchestrated through store)
    campaignData,
    campaignInsights,
    leadsQueryResult,
    // Loading and error states (centralized)
    isLoading,
    hasError,
    campaignError,
    leadsError,
    insightsLoading,
    insightsFetching,
    // Actions (centralized)
    actions: {
      goToAllCampaigns,
      goToStep,
      refreshInsights,
      setMode: store.setMode,
      updateCampaign: store.updateCampaign,
    }
  };
};
