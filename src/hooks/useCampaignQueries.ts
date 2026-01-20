import { useQuery } from "../common/api";
import { getAccount } from "../api/accounts/accounts";
import { useAuthStore } from "../api/store/authStore";
import { getCampaignById, getCampaignInsights, getCampaigns } from "../api/campaign/campaigns";
import { fetchDraftCampaign } from "../api/campaign/campaignEditor";
import { getLeadsByCampaignId, getLeadListById } from "../api/leads/leadsApi";
import { fetchAllLeadsByListId } from "../utils/leadsUtils";
import { Campaign, CampaignInsights, CampaignState, CampaignStep, CampaignStepType, TCampaignConnectionRequest, TCampaignFollowUp, Lead, ColumnMapping } from "../types/campaigns";
import { Account as AccountType } from "../types/accounts";

// Helper function to map backend configs to frontend sequence steps
const mapConfigsToSequenceSteps = (configs: any[]): CampaignStep[] => {
  const steps: CampaignStep[] = [];
  // Ensure configs is always an array
  if (!Array.isArray(configs)) {
    return steps;
  }
  configs.forEach((config) => {
    if (config.action === 'SEND_CONNECTION_REQUEST') {
      steps.push({
        type: CampaignStepType.CONNECTION_REQUEST,
        data: {
          message: config.data?.text || '',
          delay: config.data?.delay?.toString() || '0',
          premiumMessage: config.data?.premiumMessage || config.data?.premiumText || '',
          standardMessage: config.data?.standardMessage || config.data?.standardText || '',
        } as TCampaignConnectionRequest,
      });
    } else if (config.action === 'SEND_MESSAGE') {
      steps.push({
        type: CampaignStepType.FOLLOW_UP,
        data: {
          message: config.data?.text || '',
          delay: config.data?.delay?.toString() || '0',
          premiumMessage: config.data?.premiumMessage || config.data?.premiumText || '',
          standardMessage: config.data?.standardMessage || config.data?.standardText || '',
          attachments: config.data?.attachments || [],
        } as TCampaignFollowUp,
      });
    }
  });
  return steps;
};

export const useCampaignsQuery = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const campaigns = (await getCampaigns()).data;
      return campaigns;
    },
    options: {
      refetchInterval: 120000,
      enabled: isAuthenticated,
      refetchOnMount: true, // Add this to ensure data is fresh when component mounts
      staleTime: 0, // Set stale time to 0 to always refetch on mount
    },
  });
};

export const useCampaignByIdQuery = (id: string, options: { enabled: boolean }) => {
  const { isAuthenticated } = useAuthStore();

  // Base enabled condition: must be authenticated and have a campaign ID
  const baseEnabled = isAuthenticated && !!id;
  // Combine base conditions with the provided enabled flag
  const enabled = baseEnabled && options.enabled;

  return useQuery<Campaign>({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const response = await getCampaignById(id);
      console.log("response.data", response.data);
      return response.data;
    },
    options: {
      enabled,
    },
  });
};

export const useDraftCampaignByIdQuery = (id: string, options: { enabled: boolean }) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<any>({
    queryKey: ["campaign", id, "draft"],
    queryFn: async () => {
      const response = await fetchDraftCampaign(id);
      return response.data;
    },
    options: {
      enabled: isAuthenticated && !!id && options.enabled,
    },
  });
};

export const useCampaignInsights = (campaignId: string) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<CampaignInsights>({
    queryKey: ["campaigns/insights", campaignId],
    queryFn: async () => (await getCampaignInsights(campaignId)).data,
    options: {
      enabled: isAuthenticated && !!campaignId,
    },
  });
};


export interface LeadsQueryResult {
  leads: Lead[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  leadList: {
    id: string;
    name: string;
    totalLeads: number;
    status: string;
    columnMapping?: ColumnMapping[];
  } | null;
}

export const useLeadsByListIdQuery = (leadListId: string | null | undefined, options: { enabled: boolean }) => {
  const { isAuthenticated } = useAuthStore();

  const baseEnabled = isAuthenticated && !!leadListId;
  const enabled = baseEnabled && options.enabled;

  return useQuery<LeadsQueryResult>({
    queryKey: ["leads", leadListId],
    queryFn: async () => {
      if (!leadListId) {
        return {
          leads: [],
          pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
          leadList: null,
        };
      }

      // First, get leadList metadata to check status
      const metadataResponse = await getLeadListById(leadListId);
      const leadListMetadata = (metadataResponse.data as any)?.leadList;

      if (!leadListMetadata) {
        return {
          leads: [],
          pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
          leadList: null,
        };
      }

      // Only fetch leads if status is ACTIVE
      if (leadListMetadata.status === 'ACTIVE') {
        // Fetch first page of leads; additional pages will be fetched on demand
        const { leads, pagination } = await fetchAllLeadsByListId(leadListId, {
          page: 1,
          pageSize: 25,
        });

        const leadListWithPagination = {
          ...leadListMetadata,
          pagination: leadListMetadata.pagination || pagination,
        };

        return {
          leads,
          pagination,
          leadList: leadListWithPagination,
        };
      }

      // If status is PROCESSING or other, return empty leads with metadata
      return {
        leads: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
        leadList: leadListMetadata,
      };
    },
    options: {
      enabled,
    },
  });
};

export const useLeadsByCampaignIdQuery = (campaignId: string | null | undefined, options: { enabled: boolean }) => {
  const { isAuthenticated } = useAuthStore();

  const baseEnabled = isAuthenticated && !!campaignId;
  const enabled = baseEnabled && options.enabled;

  return useQuery<LeadsQueryResult>({
    queryKey: ["leads", "campaign", campaignId],
    queryFn: async () => {
      if (!campaignId) {
        return {
          leads: [],
          pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
          leadList: null,
        };
      }

      // Fetch first page to get pagination info
      const firstPageResponse = await getLeadsByCampaignId(campaignId, 1, 100);
      const firstPageData = firstPageResponse.data as any;
      const pagination = firstPageData?.pagination || { page: 1, pageSize: 100, total: 0, totalPages: 0 };
      const leadList = firstPageData?.leadList || null;

      // Collect all leads from first page
      let allLeads = firstPageData?.leads 

      // If there are more pages, fetch them all
      if (pagination.totalPages > 1) {
        const remainingPages = [];
        for (let page = 2; page <= pagination.totalPages; page++) {
          remainingPages.push(getLeadsByCampaignId(campaignId, page, pagination.pageSize));
        }

        // Fetch all remaining pages in parallel
        const remainingResponses = await Promise.all(remainingPages);
        remainingResponses.forEach((response) => {
          const pageData = (response.data as any)?.leads || [];
          allLeads = [...allLeads, ...pageData];
        });
      }

      return {
        leads: allLeads,
        pagination,
        leadList,
      };
    },
    options: {
      enabled,
    },
  });
};

export const mapBackendCampaignToFrontend = async (backendCampaign: any): Promise<Campaign> => {

  console.log("backendCampaign",backendCampaign)

  const campaign: Campaign = {
    id: backendCampaign.id,
    name: backendCampaign.name,
    description: backendCampaign.description ?? "",
    createdAt: backendCampaign.createdAtEpoch,
    updatedAt: backendCampaign.updatedAtEpoch,
    state: backendCampaign.status as CampaignState,
    orgID: backendCampaign.orgId,
    leads: {
      leadListId: backendCampaign.leadListId,
      fileName: backendCampaign.leads?.name,
      columnMapping: backendCampaign.leads?.columnMapping,
    },
    senderAccounts: [], // Will be populated below
    accountIDs: backendCampaign.accountIDs?.map((id: string) => id) ?? [],

    sequenceType: backendCampaign.sequenceType || "TREE",
    sequenceDraft: backendCampaign.sequenceDraft,
    sequence: {
      steps: mapConfigsToSequenceSteps(backendCampaign.configs || backendCampaign.sequenceDraft || []),
      excludeConnected: (() => {
        // First check top-level excludeConnected
        if (backendCampaign.excludeConnected !== undefined) {
          return backendCampaign.excludeConnected;
        }
        // Then check all follow-up message configs (SEND_MESSAGE actions)
        const configs = backendCampaign.configs || backendCampaign.sequenceDraft || [];
        const followUpConfig = configs.find((config: any) => 
          config.action === "SEND_MESSAGE" && config.data?.excludeConnected !== undefined
        );
        return followUpConfig?.data?.excludeConnected ?? false;
      })(),
    },
    accountStatuses: backendCampaign.accountDetails ?? {},
    leadListId: backendCampaign.leadListId,
    operationalTimes: backendCampaign.operationalTimes ?? undefined,
    timeZone: backendCampaign.timeZone || "IST",
    csvConfig: backendCampaign.csvConfig ?? undefined,
  };

  console.log("campaign sequenceDraft",campaign.sequenceDraft)
  // Process accounts using account information from various sources
  if (campaign.accountIDs && campaign.accountIDs.length > 0) {
    try {
      const senderAccounts = await Promise.all(
        campaign.accountIDs.map(async (id: string) => {
          // Check if account exists in accountStatuses first
          if (campaign.accountStatuses && id in campaign.accountStatuses) {
            const accountDetails = campaign.accountStatuses[id];

            // Use complete info from accountDetails for both active and deleted accounts
            return {
              id,
              firstName: accountDetails.firstName || "",
              lastName: accountDetails.lastName || "",
              fullName: accountDetails.fullName || `${accountDetails.firstName || ""} ${accountDetails.lastName || ""}`.trim(),
              email: accountDetails.email || "",
              status: accountDetails.status || "unknown",
              isDeleted: accountDetails.deleted || accountDetails.status === "deleted",
              isPremium: !!accountDetails.isPremium,
              profileImage: accountDetails.profileImage || "",
              connectionStatus: accountDetails.connectionStatus || "",
              syncStatus: accountDetails.syncStatus || "",
            };
          }

          // Fall back to API fetch if not in accountStatuses
          try {
            const accountResponse = await getAccount(id);
            return {
              ...accountResponse.data,
              isDeleted: false,
              isPremium: !!accountResponse.data?.isPremium,
              profileImage: accountResponse.data?.profileImageUrl || "",
              connectionStatus: accountResponse.data?.connectionStatus || "",
              syncStatus: accountResponse.data?.syncStatus || "",
            };
          } catch (error) {
            console.error(`Failed to fetch account ${id}:`, error);
            return {
              id,
              firstName: "Unknown",
              lastName: "Account",
              fullName: "Unknown Account",
              isDeleted: true
            };
          }
        }),
      );

      campaign.senderAccounts = senderAccounts as AccountType[];
      console.log("Sender accounts with deletion status:", senderAccounts);
    } catch (error) {
      console.error("Error processing sender accounts:", error);
      campaign.senderAccounts = [];
    }
  }

  return campaign;
};
