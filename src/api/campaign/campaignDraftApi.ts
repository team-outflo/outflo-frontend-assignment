import { put } from "../../common/api/client";
import { checkUnauthorized } from "../../common/api/post-process";
import { GenericApiResponse } from "../../common/api/types";
import { mapCampaignDataForBackend } from "../../utils/campaignMapping";
import { updateCampaignAccounts } from "./campaignEditor";
import { campaignStore } from "../store/campaignStore/campaign";

/**
 * Save draft campaign - uses campaign data from store as single source of truth
 * Also updates accounts if accountIDs are present
 * Gets campaign directly from store instead of taking it as parameter
 * @returns Promise with API response
 */
export const saveDraftCampaign = async (): Promise<GenericApiResponse> => {
  try {
    // Get campaign directly from store
    // sequenceDraft contains both FLAT and TREE data independently
    // Both are preserved when saving to backend
    const campaign = campaignStore.getState().campaign;
    
    if (!campaign?.id) {
      throw new Error('Campaign ID is missing. Cannot save draft.');
    }

    // Update accounts if accountIDs are present
    if (campaign.accountIDs) {
      try {
        await updateCampaignAccounts(campaign.id, campaign.accountIDs);
      } catch (error) {
        console.error('Error updating campaign accounts:', error);
        // Don't throw - continue with draft save even if accounts update fails
      }
    }

    // Map campaign data to backend format using utils
    // sequenceDraft (containing both FLAT and TREE data) is sent to backend
    const backendPayload = await mapCampaignDataForBackend(campaign);

    // Send to draft endpoint
    const response = await put<GenericApiResponse, typeof backendPayload>(
      `/campaigns/${campaign.id}/draft`,
      backendPayload
    ).then(checkUnauthorized);

    // Reset isEdited flag after successful save
    campaignStore.getState().setIsEdited(false);

    return response;
  } catch (error) {
    console.error('Error saving draft campaign:', error);
    throw error;
  }
};

