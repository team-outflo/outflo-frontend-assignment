import { Campaign } from "../types/campaigns";

/**
 * Maps campaign data from store (frontend format) to backend API format
 * Campaign data from store is the single source of truth
 * 
 * sequenceDraft contains both FLAT and TREE data independently:
 * - flat: Array of configs for flat sequences
 * - nodes/edges: React Flow data for tree sequences
 * Both are preserved and sent to backend, allowing flexible switching between types
 * 
 * @param campaign - Campaign data from store
 * @returns Backend payload for draft API
 */
export const mapCampaignDataForBackend = async (campaign: Campaign): Promise<Record<string, unknown>> => {
  const excludeConnected = campaign.sequence?.excludeConnected || false;
  console.log('Campaign data:', campaign);
  console.log('Campaign data for backend:', campaign.leadListId);
  const sequenceDraft = campaign.sequenceDraft;

  // Map campaign data to backend format
  return {
    name: campaign.name,
    description: campaign.description || '',
    accountIDs: campaign.accountIDs || [],
    leadListId: campaign.leadListId || campaign.leads?.leadListId || null,
    sequenceDraft: sequenceDraft,
    excludeConnected: excludeConnected,
    operationalTimes: campaign.operationalTimes,
    timeZone: campaign.timeZone || 'IST',
    csvConfig: campaign.csvConfig,
    sequenceType: campaign.sequenceType,
  };
};
