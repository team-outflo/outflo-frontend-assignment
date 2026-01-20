import type { LinkedInField } from '@/utils/columnFixesUtils';

/**
 * Fallback mode determines which UI configuration to show
 */
export type FallbackMode = 'linkedin' | 'custom' | 'allleadsPresent';

/**
 * Normalized state for fallback configuration
 * Represents a single source of truth for all fallback options
 */
export type FallbackState = {
  // Primary behavior mode
  mode: 'insertValue' | 'fetchLinkedIn' | 'sendBlank' | 'skipLead';
  
  // Default value (for insertValue mode)
  defaultValue?: string;
  
  // LinkedIn field (for fetchLinkedIn mode)
  linkedInField?: LinkedInField;
  
  // Fallback behavior (for fetchLinkedIn and allLeadsPresent modes)
  fallbackMode?: 'insertValue' | 'sendBlank' | 'skipLead';
  fallbackDefaultValue?: string;
};

/**
 * Configuration object for each fallback mode
 */
export interface FallbackModeConfig {
  mode: FallbackMode;
  title: string;
  description: string;
  headerDescription?: string;
  contextualHelp?: string;
  successMessage?: string;
  supportsLinkedInFetch: boolean;
  supportsAllLeadsPresent: boolean;
}

/**
 * Mode configurations
 */
export const FALLBACK_MODE_CONFIGS: Record<FallbackMode, FallbackModeConfig> = {
  linkedin: {
    mode: 'linkedin',
    title: 'LinkedIn Fallback',
    description: 'Configure fallback behavior for LinkedIn variables',
    headerDescription: 'Set what happens when LinkedIn data is missing',
    successMessage: "We fetch data from LinkedIn profiles to fill missing values.",
    contextualHelp: null,
    supportsLinkedInFetch: false,
    supportsAllLeadsPresent: false,
  },
  custom: {
    mode: 'custom',
    title: 'Custom Variable Fallback',
    description: 'Configure fallback behavior for custom variables',
    headerDescription: 'Set what happens when custom variable data is missing',
    contextualHelp: "This variable is used in the message sequence. Its configuration is required, and the campaign cannot be launched until it is configured.",
    successMessage: null,
    supportsLinkedInFetch: true,
    supportsAllLeadsPresent: true,
  },
  allleadsPresent: {
    mode: 'allleadsPresent',
    title: 'All Leads Present',
    description: 'All leads currently have this value. Configure fallback for future cases.',
    headerDescription: 'This fallback is inactive unless data becomes missing in the future.',
    contextualHelp :null,
    successMessage: null,
    // contextualHelp: 'Configure what happens if data becomes missing in the future.',
    supportsLinkedInFetch: false,
    supportsAllLeadsPresent: false,
  },
};
