import { useQueryClient } from "@tanstack/react-query";

import { GenericApiResponse, useMutation } from "../common/api";
import { postCampaign, updateCampaign, deleteCampaign } from "../api/campaign/campaigns";
import { createDraftCampaign, CreateDraftCampaignPayload } from "../api/campaign/campaignDrafts";
import { Campaign } from "../types/campaigns";
import { UpdateCampaignRequest } from "../api/types/campaignTypes";

export const usePostCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation<GenericApiResponse, { CampaignData: Campaign }>({
    mutationKey: ["postCampaign"],
    mutationFn: async ({ CampaignData }) => await postCampaign(CampaignData),
    options: {
      // Only invalidate queries on success - do NOT clear local data on error
      // This ensures campaign data persists in the UI even if API call fails
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["campaigns"],
          }),
        ]);
      },
      // Note: No onError handler here - we let the component handle errors
      // and preserve all local campaign data for retry attempts
    },
  });
};

export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation<GenericApiResponse, { campaignId: string; campaignData: UpdateCampaignRequest }>({
    mutationKey: ["updateCampaign"],
    mutationFn: async ({ campaignId, campaignData }) => await updateCampaign(campaignId, campaignData),
    options: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["campaigns"],
          }),
        ]);
      },
    },
  });
};

export const useCreateDraftCampaign = () => {
  return useMutation<GenericApiResponse, { payload: CreateDraftCampaignPayload }>({
    mutationKey: ["createDraftCampaign"],
    mutationFn: async ({ payload }) => await createDraftCampaign(payload),
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation<GenericApiResponse, { campaignId: string }>({
    mutationKey: ["deleteCampaign"],
    mutationFn: async ({ campaignId }) => await deleteCampaign(campaignId),
    options: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["campaigns"],
          }),
          queryClient.invalidateQueries({
            queryKey: ["campaignInsights"],
          }),
        ]);
      },
    },
  });
};
