
import { api, checkUnauthorized, get, post, put, del, authConfig } from "../../common/api";
import { GenericApiResponse } from "../../common/api/types";
import {
  GetCampaignByIdResponse,
  GetCampaignInsightsResponse,
  GetCampaignsResponse,
  UpdateCampaignRequest,
} from "../types/campaignTypes";
import { Campaign, CampaignConfig, CampaignState, CampaignStepType } from "../../types/campaigns";
import { authStore } from "../store/authStore";
import { zoneMap } from '@/utils/timezoneUtils';
import { AxiosRequestConfig } from "axios";

export const getCampaigns = async (): Promise<GetCampaignsResponse> => {
  // Mocking

  const params = {};
  return await get<GetCampaignsResponse, typeof params>("/campaigns", params).then(checkUnauthorized);
  // return await get<GetAccountsResponse>("/accounts/").then(checkUnauthorized);
};

export const getCampaignById = async (campaignId: string): Promise<GetCampaignByIdResponse> => {
  const params = {};
  return await get<GetCampaignByIdResponse, typeof params>(`/campaigns/${campaignId}`, params)
    .then((response) => checkUnauthorized(response, false)) // Disable camelizeKeys to preserve account IDs
    .then((response) => {
      // Log the raw response to understand the structure
      console.log("Raw campaign response:", response.data);

      // Preserve accountStatuses exactly as is
      const accountStatuses = response.data.accountStatuses || {};
      console.log("Account statuses from backend:", accountStatuses);

      // Preserve leads as returned by backend
      const leads = response.data.leads;

      return {
        ...response,
        data: {
          ...response.data,
          accountStatuses,
          leads: leads, // keep original details
          configs: response.data.configs,
        },
      };
    });
};


export const launchCampaign = async (campaignId: string): Promise<GenericApiResponse> => {
  return await post<GenericApiResponse, {}>(`/campaigns/${campaignId}/launch`, {}).then(checkUnauthorized);
};

export const getCampaignInsights = async (campaignId: string): Promise<GetCampaignInsightsResponse> => {
  const params = {};
  return await get<GetCampaignInsightsResponse, typeof params>(`/campaigns/insights/${campaignId}`, params).then(
    checkUnauthorized,
  );
};

// Fix the convertDelayToMs function to handle both string and number inputs
const convertDelayToMs = (delay: string | number): number => {
  // If delay is a number, assume it's already in seconds and convert to milliseconds
  if (typeof delay === 'number') {
    return delay * 1000; // Convert seconds to milliseconds
  }

  // If it's a string, try to match the pattern
  if (typeof delay === 'string') {
    // First check if it's just a number as a string
    if (!isNaN(Number(delay))) {
      return Number(delay) * 1000;
    }

    // Try the original pattern
    const match = delay.match(/(\d+)days(\d+)hours/);
    if (match) {
      const days = parseInt(match[1], 10);
      const hours = parseInt(match[2], 10);

      const MS_PER_HOUR = 3600000; // 1 hour = 3600000 ms
      const MS_PER_DAY = MS_PER_HOUR * 24;

      return days * MS_PER_DAY + hours * MS_PER_HOUR;
    }
  }

  // Default value if parsing fails
  console.warn('Failed to parse delay value:', delay);
  return 0;
};



export const postCampaign = async (campaignData: Campaign): Promise<GenericApiResponse> => {
  console.log("Posting Campaign Data:", campaignData);

  // Extract account IDs
  const accountIDs = campaignData.senderAccounts?.map((account) => account.id) || [];

  // Format configs
  let configs: CampaignConfig[] = [];
  if (campaignData.configs && campaignData.configs.length > 0) {
    configs = campaignData.configs.map((config) => ({
      id: config.id || null,
      parentId: config.parentId || null,
      action: config.action,
      data: {
        delay: typeof config.data.delay === "number" ? config.data.delay * 1000 : 0,
        text: config.data.text || "",
        ...(config.data.premiumText ? { premiumText: config.data.premiumText } : {}),
        ...(config.data.standardText ? { standardText: config.data.standardText } : {}),
        ...(config.data.excludeConnected !== undefined
          ? { excludeConnected: config.data.excludeConnected }
          : {}),
      },
    }));
  } else if (campaignData.workflow?.steps) {
    configs = campaignData.workflow.steps.map((step, index) => ({
      id: null,
      parentId: null,
      action:
        step.type === CampaignStepType.FOLLOW_UP
          ? "SEND_MESSAGE"
          : "SEND_CONNECTION_REQUEST",
      data: {
        delay:
          step.type === CampaignStepType.FOLLOW_UP
            ? convertDelayToMs(step.data.delay || "")
            : 0,
        text: step.data.message || "",
        ...(step.type === CampaignStepType.CONNECTION_REQUEST &&
          step.data.premiumMessage
          ? { premiumText: step.data.premiumMessage }
          : {}),
        ...(step.type === CampaignStepType.CONNECTION_REQUEST &&
          step.data.standardMessage
          ? { standardText: step.data.standardMessage }
          : {}),
        ...(step.type === CampaignStepType.FOLLOW_UP &&
          campaignData.workflow?.excludeConnected !== undefined
          ? { excludeConnected: campaignData.workflow.excludeConnected }
          : {}),
      },
    }));
  }

  // Convert operational times to minutes
  const defaultOperationalTimesInMinutes = {
    monday: { startTime: 540, endTime: 1020, enabled: true },     // 9:00 → 17:00
    tuesday: { startTime: 540, endTime: 1020, enabled: true },
    wednesday: { startTime: 540, endTime: 1020, enabled: true },
    thursday: { startTime: 540, endTime: 1020, enabled: true },
    friday: { startTime: 540, endTime: 1020, enabled: true },
    saturday: { startTime: 540, endTime: 1020, enabled: false },
    sunday: { startTime: 540, endTime: 1020, enabled: false },
  };

  const operationalTimes = Object.fromEntries(
    Object.entries(campaignData.operationalTimes || defaultOperationalTimesInMinutes).map(
      ([day, { startTime, endTime, enabled }]) => [
        day,
        {
          // If value is over 60, assume it's in seconds and convert to minutes, else assume already in minutes
          startTime: startTime > 60 ? Math.floor(startTime / 60) : startTime,
          endTime: endTime > 60 ? Math.floor(endTime / 60) : endTime,
          enabled,
        },
      ]
    )
  );

  // Map time zone
  const userTimeZone = campaignData.timeZone;
  const ianaZone = zoneMap[userTimeZone];
  console.log("User Time Zone:", userTimeZone, "IANA Zone:", ianaZone);

  // Build request payload (JSON)
  const payload = {
    name: campaignData.name || "test_campaign",
    description: campaignData.description || "Test description",
    accountIDs,
    configs,
    operationalTimes, // now in minutes
    timeZone: ianaZone,
    csvConfig: campaignData.csvConfig || null, // Include CSV configuration
    s3Url: campaignData.leads?.s3Url || null, // Include S3 URL for file reference
  };

  console.log("Final JSON payload:", payload);
  console.log("Campaign leads data:", campaignData.leads);
  console.log("S3 URL from leads:", campaignData.leads?.s3Url);

  // Send JSON request
  return await api
    .post(`/campaigns`, payload, {
      headers: {
        authorization: authStore.getState().accessToken,
        "Content-Type": "application/json",
      },
    })
    .then(checkUnauthorized);
};



const mapCampaignStateToBackendStatus = (state: CampaignState): string => {
  switch (state) {
    case CampaignState.COMPLETED:
      return "success";
    case CampaignState.PAUSED:
      return "paused";
    case CampaignState.RUNNING:
      return "active";
    default:
      return state;
  }
};

export const deleteCampaign = async (campaignId: string): Promise<GenericApiResponse> => {
  return await del<GenericApiResponse>(`/campaigns/${campaignId}`).then(checkUnauthorized);
};

export const updateCampaign = async (
  campaignId: string,
  campaignData: UpdateCampaignRequest,
): Promise<GenericApiResponse> => {
  const backendStatus = mapCampaignStateToBackendStatus(campaignData.status as CampaignState);


  console.log("Updating Campaign Data:", backendStatus);
  // Create a deep copy of the campaign data
  const updatedCampaignData = {
    ...campaignData,
    status: backendStatus,
  };

  // Convert operational times from seconds to minutes if they exist
  if (updatedCampaignData.operationalTimes) {
    const convertedTimes = { ...updatedCampaignData.operationalTimes };

    // Convert each day's times from seconds to minutes
    Object.keys(convertedTimes).forEach((day) => {
      if (day === "timezone" || typeof convertedTimes[day] !== "object") return;

      const dayData = convertedTimes[day];
      if (dayData && typeof dayData === "object") {
        if ("startTime" in dayData && typeof dayData.startTime === "number") {
          dayData.startTime = Math.floor(dayData.startTime / 60);
        }
        if ("endTime" in dayData && typeof dayData.endTime === "number") {
          dayData.endTime = Math.floor(dayData.endTime / 60);
        }
      }
    });

    updatedCampaignData.operationalTimes = convertedTimes;
  }

  console.log("Update Campaign Data:", updatedCampaignData);
  return await put<GenericApiResponse, UpdateCampaignRequest>(`/campaigns/${campaignId}`, updatedCampaignData).then(
    checkUnauthorized,
  );
};

export const refreshCampaignLeads = async (campaignId: string): Promise<GenericApiResponse> => {
  const params = {};
  return await get<GenericApiResponse, typeof params>(`/campaigns/${campaignId}/refresh-leads`, params).then(
    checkUnauthorized,
  );
};

/**
 * Export campaign leads as CSV
 * @param campaignId - Campaign ID
 * @returns Promise with CSV blob data and filename
 */
export const exportCampaignLeadsAsCsv = async (campaignId: string): Promise<{ blob: Blob; filename: string }> => {
  const config: AxiosRequestConfig = {
    ...authConfig({
      Accept: "text/csv",
    }),
    responseType: 'blob',
  };
  
  const response = await api.get<Blob>(`/campaigns/${campaignId}/leads/export`, {}, config);
  
  if (!response.ok || !response.data) {
    throw new Error(response.problem || 'Failed to export campaign leads');
  }
  
  // Extract filename from Content-Disposition header
  let filename = `campaign_leads_${campaignId}.csv`; // Default fallback
  
  // Axios normalizes headers to lowercase, so check for 'content-disposition'
  const headers = response.headers || {};
  const contentDisposition = headers['content-disposition'] || headers['Content-Disposition'];
  
  if (contentDisposition) {
    // Match filename in Content-Disposition header
    // Handles formats like: filename="file.csv" or filename=file.csv
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      // Remove quotes if present and trim whitespace
      filename = filenameMatch[1].replace(/['"]/g, '').trim();
    }
  }
  
  return {
    blob: response.data as Blob,
    filename,
  };
};

// Handler function for serverless API
export async function handler(req, res) {
  try {
    const method = req.method;
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Skip 'api' if it's in the path
    const startIdx = pathParts[0] === 'api' ? 1 : 0;

    // Check if we have a campaign ID or other specific endpoints in the URL
    const hasCampaignId = pathParts.length > startIdx + 1;
    const campaignId = hasCampaignId ? pathParts[startIdx + 1] : null;
    const subPath = pathParts.length > startIdx + 2 ? pathParts[startIdx + 2] : null;

    switch (method) {
      case 'GET':
        if (!campaignId) {
          // GET /api/campaigns - get all campaigns
          const campaignsData = await getCampaigns();
          return res.status(200).json(campaignsData.data);
        } else if (subPath === 'insights') {
          // GET /api/campaigns/insights/{campaignId}
          const insightsData = await getCampaignInsights(campaignId);
          return res.status(200).json(insightsData.data);
        } else if (subPath === 'refresh-leads') {
          // GET /api/campaigns/{campaignId}/refresh-leads
          const refreshData = await refreshCampaignLeads(campaignId);
          return res.status(200).json(refreshData.data);
        } else {
          // GET /api/campaigns/{campaignId} - get specific campaign
          const campaignData = await getCampaignById(campaignId);
          return res.status(200).json(campaignData.data);
        }

      case 'POST':
        // POST /api/campaigns - create a new campaign
        if (!req.body) {
          return res.status(400).json({ error: "Missing campaign data" });
        }

        const newCampaign = await postCampaign(req.body);
        return res.status(201).json(newCampaign.data);

      case 'PUT':
        // PUT /api/campaigns/{campaignId} - update a campaign
        if (!campaignId) {
          return res.status(400).json({ error: "Missing campaign ID" });
        }
        if (!req.body) {
          return res.status(400).json({ error: "Missing campaign data" });
        }

        const updatedCampaign = await updateCampaign(campaignId, req.body);
        return res.status(200).json(updatedCampaign.data);

      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Campaigns API error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
