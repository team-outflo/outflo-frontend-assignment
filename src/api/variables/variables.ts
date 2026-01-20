import { api, get, post } from "../../common/api";
import { checkUnauthorized } from "../../common/api";
import { authStore } from "../store/authStore";

export interface Variable {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  exampleValue: string;
  type: 'fetch' | 'linkedin' | 'system' | 'lead' | 'sender' | 'custom' | 'api';
  source?: 'sheet' | 'linkedin' | 'system' | 'api';
}

// Fetch available variables for messaging
export const getMessageVariables = async (): Promise<Variable[]> => {
  try {
    const response = await api.get('/campaigns/variables');
    return (response.data as any)?.variables || [];
  } catch (error) {
    console.error("Error fetching message variables:", error);
    // Return default variables if API fails
    return [
      { id: 'system_first_name', name: 'First Name', description: 'Contact\'s first name (from system)', placeholder: '{system_first_name}', exampleValue: 'John', type: 'system', source: 'system' },
      { id: 'system_last_name', name: 'Last Name', description: 'Contact\'s last name (from system)', placeholder: '{system_last_name}', exampleValue: 'Smith', type: 'system', source: 'system' },
      { id: 'system_company', name: 'Company', description: 'Contact\'s company (from system)', placeholder: '{system_company}', exampleValue: 'Acme Inc', type: 'system', source: 'system' },
      { id: 'system_job_title', name: 'Job Title', description: 'Contact\'s job title (from system)', placeholder: '{system_job_title}', exampleValue: 'Marketing Director', type: 'system', source: 'system' }
    ];
  }
};

// Get variables specific to a campaign's lead list
export const getCampaignVariables = async (leadListId: string): Promise<Variable[]> => {
  try {
    console.log('Fetching campaign variables for leadListId:', leadListId);
    
    // Use the proper get function that includes authentication
    const response = await get(`/leads/campaign-variables/${leadListId}`);
    
    return (response.data as any)?.data?.variables || [];
  } catch (error) {
    console.error("Error fetching campaign variables:", error);
    // Return fallback variables
    return [
      { id: 'csv_first_name', name: 'First Name', description: 'Contact\'s first name (from sheet)', placeholder: '{csv_first_name}', exampleValue: 'John', type: 'fetch', source: 'sheet' },
      { id: 'csv_last_name', name: 'Last Name', description: 'Contact\'s last name (from sheet)', placeholder: '{csv_last_name}', exampleValue: 'Smith', type: 'fetch', source: 'sheet' },
    ];
  }
};

// Get API variables for a specific campaign
export const getApiVariables = async (campaignId: string): Promise<Variable[]> => {
  try {
    console.log('Fetching API variables for campaignId:', campaignId);
    
    const response = await get(`/campaigns/${campaignId}/custom-variables`);
    
    return (response.data as any)?.data?.variables || [];
  } catch (error) {
    console.error("Error fetching API variables:", error);
    // Return empty array on error
    return [];
  }
};



// Fetch system variables from backend (requires account IDs)
export const getSystemVariables = async (accountIds: string[]): Promise<Variable[]> => {
  try {
    const response = await post('/campaigns/sender-details', {
      accountIds
    });
    return (response.data as any)?.variables || [];
  } catch (error) {
    console.error("Error fetching system variables:", error);
    checkUnauthorized(error);
    // Return fallback system variables
    return [
      { id: 'system_firstName', name: 'First Name', description: 'Contact\'s first name (fetched from system)', placeholder: '{system_first_name}', exampleValue: 'John', type: 'system' },
      { id: 'system_lastName', name: 'Last Name', description: 'Contact\'s last name (fetched from system)', placeholder: '{system_last_name}', exampleValue: 'Smith', type: 'system' },
    ];
  }
};

// Handler function for serverless API
export async function handler(req, res) {
  try {
    const method = req.method;
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Skip 'api' if it's in the path
    const startIdx = pathParts[0] === 'api' ? 1 : 0;
    
    // Only GET method is currently supported for variables
    if (method !== 'GET') {
      return res.status(405).json({ error: "Method not allowed" });
    }
    
    // Check if this is a campaign-specific variables request
    const isCampaignVariables = pathParts.includes('campaign-variables');
    
    if (isCampaignVariables) {
      // Extract the lead list ID from the URL
      const leadListIdIdx = pathParts.indexOf('campaign-variables') + 1;
      const leadListId = pathParts.length > leadListIdIdx ? pathParts[leadListIdIdx] : null;
      
      if (!leadListId) {
        return res.status(400).json({ error: "Missing lead list ID" });
      }
      
      // Extract auth token from request header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized - Missing authentication token" });
      }
      
      const campaignVariables = await getCampaignVariables(leadListId);
      return res.status(200).json({ variables: campaignVariables });
    } else {
      // General message variables request
      const messageVariables = await getMessageVariables();
      return res.status(200).json({ variables: messageVariables });
    }
  } catch (error) {
    console.error("Variables API error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}