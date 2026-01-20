import { post, checkUnauthorized } from "../../common/api";
import { GenericApiResponse } from "../../common/api/types";

export interface CreateDraftCampaignPayload {
  name: string;
}

export const createDraftCampaign = async (
  payload: CreateDraftCampaignPayload,
): Promise<GenericApiResponse> => {
  return await post<GenericApiResponse, CreateDraftCampaignPayload>(
    "/campaigns/draft",
    payload,
  ).then(checkUnauthorized);
};


