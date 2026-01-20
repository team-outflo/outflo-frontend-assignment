
import { post } from '@/common/api/client';

export interface EnrichmentRequest {
  message: string; // Message template with variables like {first_name}, {company}, etc.
  leadLinkedInData: {
    firstName: string;
    lastName: string;
    headline: string;
    location: string;
    company: string;
    title: string;
  };
  leadCsvData: any; // Raw CSV data including all custom variables - backend will handle enrichment
  leadSenderData: {
    firstName: string;
    lastName: string;
  };
  csvConfig: {
    columnFixes: any[]; // Column mapping configurations for backend processing
    detectedColumns: string[]; // Original column names detected from CSV
  };
}

export interface EnrichmentResponse {
  enrichedMessage: string;
  success: boolean;
  error?: string;
}

export interface VariablesResponse {
  variables: string[];
  success: boolean;
  error?: string;
}

// Enrichment API service - sends raw data to backend for processing
export class EnrichmentService {
  private static baseUrl = '/campaigns/enrichment';

  // Send message template and raw data to backend for enrichment
  // Backend handles all variable replacement and enrichment logic
  static async processMessage(request: EnrichmentRequest): Promise<EnrichmentResponse> {
    try {
      const response = await post(`${this.baseUrl}/process`, request);
      if (response.ok && response.data) {
        const data = response.data as any;
        const result = data?.data?.result;
        console.log('Enrichment API result:', result);        
        if (result && result.status && result.status  === 'success') {
          return {
            enrichedMessage: result.text,
            success: true
          };
        } else {
          const errorMessage = "Lead will be skipped" ;
          return {
            enrichedMessage: errorMessage,
            success: true
          };
      
        }
      } else {
        const data = response.data as any;
        const errorMessage = data?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Enrichment API error:', error);
      return {
        enrichedMessage: request.message,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

}

