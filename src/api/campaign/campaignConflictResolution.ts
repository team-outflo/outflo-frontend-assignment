import { put } from "../../common/api/client";
import { checkUnauthorized } from "../../common/api/post-process";
import { CsvConfig } from "../../types/campaigns";

/**
 * Response type for the resolve-all-conflicts API
 */
interface ResolveConflictsResponse {
  status: number;
  data: {
    csvConfig: CsvConfig;
    campaignId: string;
  };
  error: null;
}

/**
 * Resolves all CSV variable conflicts for a campaign by calling the backend API.
 * The backend handles all conflict resolution logic and returns the updated csvConfig.
 * 
 * @param campaignId - The ID of the campaign to resolve conflicts for
 * @returns Promise that resolves to the updated csvConfig, or null/undefined on error
 */
export const resolveCampaignCsvConflicts = async (
  campaignId: string
): Promise<CsvConfig | null> => {
  if (!campaignId) {
    console.warn('Cannot resolve conflicts: campaign ID is missing');
    return null;
  }

  try {
    const response = await put<ResolveConflictsResponse, {}>(
      `/campaigns/${campaignId}/resolve-all-conflicts`,
      {}
    ).then(checkUnauthorized);

    if (response?.data?.csvConfig) {
      return response.data.csvConfig;
    }

    console.warn('Resolve conflicts API returned no csvConfig');
    return null;
  } catch (error: any) {
    // Handle specific error status codes gracefully
    const status = error?.response?.status || error?.status;
    
    if (status === 400) {
      // Campaign has no LeadList - safe to ignore
      console.warn('Campaign has no LeadList, skipping conflict resolution');
      return null;
    } else if (status === 404) {
      // Campaign not found
      console.error('Campaign not found for conflict resolution:', campaignId);
      return null;
    } else if (status === 401) {
      // Auth issue - already handled by checkUnauthorized, but log it
      console.error('Unauthorized access to conflict resolution endpoint');
      return null;
    } else if (status === 500) {
      // Generic server error
      console.error('Server error during conflict resolution:', error);
      return null;
    } else {
      // Other errors
      console.error('Failed to resolve CSV conflicts:', error);
      return null;
    }
  }
};

