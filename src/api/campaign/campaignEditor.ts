import { get, post, put } from "../../common/api/client";
import { checkUnauthorized } from "../../common/api/post-process";
import { GenericApiResponse } from "../../common/api/types";

// Core fetches
export const fetchCampaign = async (id: string) =>
  await get<GenericApiResponse>(`/campaigns/${id}`).then(checkUnauthorized);

export const fetchDraftCampaign = async (id: string) =>
  await get<GenericApiResponse>(`/campaigns/${id}/draft`).then(checkUnauthorized);

// Generic update
export const saveCampaign = async (id: string, patch: Record<string, unknown>) =>
  await put<GenericApiResponse, Record<string, unknown>>(`/campaigns/${id}`, patch).then(checkUnauthorized);

// Accounts
export const updateCampaignAccounts = async (id: string, accountIds: string[]) =>
  await put<GenericApiResponse, { accountIds: string[] }>(`/campaigns/${id}/accounts`, { accountIds }).then(checkUnauthorized);

export const getActiveCampaignAccounts = async (id: string) =>
  await get<GenericApiResponse>(`/campaigns/${id}/accounts/active`).then(checkUnauthorized);

// Leads
export const getCampaignLeads = async (id: string) =>
  await get<GenericApiResponse>(`/campaigns/${id}/leads`).then(checkUnauthorized);

// Sequence
export const updateCampaignSequence = async (id: string, configs: any[]) =>
  await put<GenericApiResponse, { configs: any[] }>(`/campaigns/${id}/sequence`, { configs }).then(checkUnauthorized);

export const getCurrentSequence = async (id: string) =>
  await get<GenericApiResponse>(`/campaigns/${id}/current-sequence`).then(checkUnauthorized);

// Operational Hours
export const updateOperationalHours = async (
  id: string,
  operationalTimes: Record<string, { startTime: number; endTime: number; enabled: boolean }>,
) =>
  await put<GenericApiResponse, { operationalTimes: Record<string, { startTime: number; endTime: number; enabled: boolean }> }>(
    `/campaigns/${id}/operational-hours`,
    { operationalTimes },
  ).then(checkUnauthorized);

// CSV Config
export const getCsvConfig = async (id: string) =>
  await get<GenericApiResponse>(`/campaigns/${id}/csv-config`).then(checkUnauthorized);

export const updateCsvConfig = async (id: string, csvConfig: unknown) =>
  await put<GenericApiResponse, { csvConfig: unknown }>(`/campaigns/${id}/csv-config`, { csvConfig }).then(checkUnauthorized);

// Operational hours + settings (fetched from full details per API design)
export const fetchOperationalHours = async (id: string) =>
  await get<GenericApiResponse>(`/campaigns/${id}`).then(checkUnauthorized);

export const fetchSettings = async (id: string) =>
  await get<GenericApiResponse>(`/campaigns/${id}`).then(checkUnauthorized);


