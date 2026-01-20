import { post, get, api } from "../../common/api/client";
import { checkUnauthorized } from "../../common/api/post-process";
import { GenericApiResponse } from "../../common/api/types";
import { authConfig } from "../../common/api/client";
import { AxiosRequestConfig } from "axios";

/**
 * Create an empty lead list
 * @param name - Name for the lead list
 * @returns Promise with lead list data
 */
export const createEmptyLeadList = async (
  name: string
): Promise<GenericApiResponse> => {
  return await post<GenericApiResponse, { name: string }>(
    "/leads/empty",
    { name }
  ).then(checkUnauthorized);
};

/**
 * Process CSV leads - creates a lead list and starts processing
 * @param campaignId - Campaign ID
 * @param name - Name for the lead list
 * @param s3Url - S3 URL of the uploaded CSV file
 * @param mainIdentifier - Main identifier column (e.g., "profile_url")
 * @returns Promise with lead list data
 */
export const processCsvLeads = async (
  campaignId: string,
  name: string,
  s3Url: string,
  mainIdentifier: string
): Promise<GenericApiResponse> => {
  return await post<GenericApiResponse, {
    campaignId: string;
    name: string;
    s3Url: string;
    mainIdentifier: string;
  }>("/leads/process-csv", {
    campaignId,
    name,
    s3Url,
    mainIdentifier,
  }).then(checkUnauthorized);
};

/**
 * Get lead list metadata by lead list ID (without leads)
 * @param leadListId - Lead list ID
 * @returns Promise with lead list metadata (status, columnMapping, source)
 */
export const getLeadListById = async (
  leadListId: string
): Promise<GenericApiResponse> => {
  return await get<GenericApiResponse>(
    `/leads/${leadListId}`
  ).then(checkUnauthorized);
};

/**
 * Get leads by lead list ID with pagination support
 * @param leadListId - Lead list ID
 * @param page - Page number (default: 1)
 * @param pageSize - Number of items per page (default: 100)
 * @returns Promise with leads data and lead list info
 */
export const getLeadsByListId = async (
  leadListId: string, 
  page: number = 1, 
  pageSize: number = 25
): Promise<GenericApiResponse> => {
  return await get<GenericApiResponse>(
    `/leads/${leadListId}/leads`,
    { page, pageSize }
  ).then(checkUnauthorized);
};

/**
 * Get leads by campaign ID with pagination support
 * @param campaignId - Campaign ID
 * @param page - Page number (default: 1)
 * @param pageSize - Number of items per page (default: 100)
 * @returns Promise with leads data and lead list info
 */
export const getLeadsByCampaignId = async (
  campaignId: string, 
  page: number = 1, 
  pageSize: number = 100
): Promise<GenericApiResponse> => {
  return await get<GenericApiResponse>(
    `/campaigns/${campaignId}/leads`,
    { page, pageSize }
  ).then(checkUnauthorized);
};

/**
 * Process LinkedIn search - creates a lead list and starts scraping
 * @param searchUrl - LinkedIn search URL
 * @param limit - Maximum number of leads to scrape
 * @param accountId - LinkedIn account ID to use for scraping
 * @param name - Name for the lead list
 * @param accountType - Account type: 'classic', 'sales_navigator', or 'recruiter'
 * @returns Promise with lead list data
 */
export const processLinkedInSearch = async (
  searchUrl: string,
  limit: number,
  accountId: string,
  name: string,
  accountType: 'classic' | 'sales_navigator' | 'recruiter' = 'classic'
): Promise<GenericApiResponse> => {
  return await post<GenericApiResponse, {
    searchUrl: string;
    limit: number;
    accountId: string;
    name: string;
    accountType: string;
  }>("/leads/process-linkedin-search", {
    searchUrl,
    limit,
    accountId,
    name,
    accountType,
  }).then(checkUnauthorized);
};

/**
 * Get all lead lists
 * @returns Promise with array of lead lists
 */
export const getAllLeadLists = async (): Promise<GenericApiResponse> => {
  return await get<GenericApiResponse>("/leads/").then(checkUnauthorized);
};

/**
 * Export leads as CSV by lead list ID
 * @param leadListId - Lead list ID
 * @returns Promise with CSV blob data
 */
export const exportLeadsAsCsv = async (leadListId: string): Promise<Blob> => {
  const config: AxiosRequestConfig = {
    ...authConfig(),
    responseType: 'blob',
  };
  
  const response = await api.get<Blob>(`/leads/${leadListId}/export`, {}, config);
  
  if (!response.ok || !response.data) {
    throw new Error(response.problem || 'Failed to export leads');
  }
  
  return response.data as Blob;
};

/**
 * Get campaign lead details by campaign lead ID
 * @param campaignLeadId - Campaign Lead ID
 * @returns Promise with campaign lead details including actions history
 */
export const getCampaignLeadById = async (
  campaignLeadId: string
): Promise<GenericApiResponse> => {
  return await get<GenericApiResponse>(
    `/campaign-leads/${campaignLeadId}`
  ).then(checkUnauthorized);
};

/**
 * Get sequence stats for a campaign
 * @param campaignId - Campaign ID
 * @returns Promise with sequence statistics (waiting, processed, failed counts per sequence)
 */
export const getSequenceStats = async (
  campaignId: string
): Promise<GenericApiResponse> => {
  return await get<GenericApiResponse>(
    `/campaign-leads/sequence-stats`,
    { campaignId }
  ).then(checkUnauthorized);
};

/**
 * Get leads for a specific sequence
 * @param campaignId - Campaign ID
 * @param sequenceId - Sequence ID (campaignSequenceId from node data)
 * @returns Promise with leads data for the sequence (waiting, processed, failed arrays)
 */
export const getSequenceLeads = async (
  campaignId: string,
  sequenceId: string
): Promise<GenericApiResponse> => {
  return await get<GenericApiResponse>(
    `/campaign-leads/sequence-leads`,
    { campaignId, sequenceId }
  ).then(checkUnauthorized);
};

/**
 * Get campaign variables (CSV variables) by campaign ID
 * @param campaignId - Campaign ID
 * @returns Promise with campaign variables data
 */
export const getCampaignVariables = async (
  campaignId: string
): Promise<GenericApiResponse> => {
  return await get<GenericApiResponse>(
    `/leads/campaign-variables/${campaignId}`
  ).then(checkUnauthorized);
};

