import type { CsvColumnFix } from '@/types/campaigns';
import type { FallbackState, FallbackMode } from './fallbackTypes';
import { convertToColumnFix } from '@/utils/columnFixesUtils';
import type { LinkedInField } from '@/utils/columnFixesUtils';

/**
 * Normalizes variable ID for consistent lookup
 * Handles variations like linkedin. vs linkedin_
 */
export function normalizeVariableId(variableId: string): string {
  return variableId.replace('linkedin.', 'linkedin_');
}

/**
 * Builds a fix chain from fallback state configuration.
 * 
 * For allLeadsPresent mode, creates a structure with optional nested fallback:
 * - fixType: 'allLeadsPresent'
 * - fallback: {
 *     fixType: 'fetchFromLinkedIn' | 'sendBlank' | 'insertDefaultValue' | 'skipLeads'
 *     sourceField?: string (for fetchFromLinkedIn)
 *     defaultValue?: string (for insertDefaultValue)
 *     fallback?: {  // Only when primary fallback is fetchFromLinkedIn
 *       fixType: 'sendBlank' | 'insertDefaultValue' | 'skipLeads'
 *       defaultValue?: string (for insertDefaultValue)
 *     }
 *   }
 */
export function buildFixChain(
  mode: FallbackMode,
  state: FallbackState
): CsvColumnFix['fixChain'] {
  // Handle allLeadsPresent mode
  // All options should result in fixType: 'allLeadsPresent' with a fallback object
  if (mode === 'allleadsPresent') {
    const fixChain: CsvColumnFix['fixChain'] = {
      fixType: 'allLeadsPresent',
    };

    // Map state.mode to fallback.fixType
    let fallbackFixType: 'sendBlank' | 'insertDefaultValue' | 'skipLeads' | 'fetchFromLinkedIn';
    let fallbackDefaultValue: string | undefined;
    let sourceField: LinkedInField | undefined;

    if (state.mode === 'insertValue') {
      // For insertValue, use insertDefaultValue (validation will catch empty values)
      fallbackFixType = 'insertDefaultValue';
      if (state.defaultValue) {
        fallbackDefaultValue = state.defaultValue;
      }
    } else if (state.mode === 'sendBlank') {
      fallbackFixType = 'sendBlank';
    } else if (state.mode === 'fetchLinkedIn' && state.linkedInField) {
      // For fetchLinkedIn, set fallback.fixType to 'fetchFromLinkedIn'
      fallbackFixType = 'fetchFromLinkedIn';
      sourceField = state.linkedInField;
    } else {
      // Default to skipLeads
      fallbackFixType = 'skipLeads';
    }

    // Build the fallback object
    const fallback: CsvColumnFix['fixChain']['fallback'] = {
      fixType: fallbackFixType,
    };

    if (fallbackDefaultValue) {
      fallback.defaultValue = fallbackDefaultValue;
    }

    if (sourceField) {
      fallback.sourceField = sourceField;
    }

    /**
     * Handle nested fallback for fetchFromLinkedIn in allLeadsPresent mode.
     * When the primary fallback is fetchFromLinkedIn, we can configure a nested fallback
     * that triggers if the LinkedIn fetch fails or returns no data.
     * 
     * Nested fallback structure:
     * fallback.fallback: {
     *   fixType: 'sendBlank' | 'insertDefaultValue' | 'skipLeads'
     *   defaultValue?: string (required when fixType is 'insertDefaultValue')
     * }
     */
    if (fallbackFixType === 'fetchFromLinkedIn' && state.fallbackMode) {
      const nestedFallback: CsvColumnFix['fixChain']['fallback']['fallback'] = {
        fixType:
          state.fallbackMode === 'insertValue'
            ? 'insertDefaultValue'
            : state.fallbackMode === 'sendBlank'
            ? 'sendBlank'
            : 'skipLeads',
      };

      if (state.fallbackMode === 'insertValue' && state.fallbackDefaultValue) {
        nestedFallback.defaultValue = state.fallbackDefaultValue;
      }

      fallback.fallback = nestedFallback;
    }

    fixChain.fallback = fallback;
    return fixChain;
  }

  // Handle LinkedIn mode
  if (mode === 'linkedin') {
    if (state.mode === 'insertValue' && state.defaultValue) {
      return {
        fixType: 'insertDefaultValue',
        defaultValue: state.defaultValue,
      };
    }

    if (state.mode === 'sendBlank') {
      return {
        fixType: 'sendBlank',
      };
    }

    // Default to skipLeads
    return {
      fixType: 'skipLeads',
    };
  }

  // Handle custom mode
  if (mode === 'custom') {
    if (state.mode === 'fetchLinkedIn' && state.linkedInField) {
      const fixChain: CsvColumnFix['fixChain'] = {
        fixType: 'fetchFromLinkedIn',
        sourceField: state.linkedInField,
      };

      // Add fallback if configured
      if (state.fallbackMode) {
        const fallback: CsvColumnFix['fixChain']['fallback'] = {
          fixType: state.fallbackMode === 'insertValue' 
            ? 'insertDefaultValue' 
            : state.fallbackMode === 'sendBlank' 
            ? 'sendBlank' 
            : 'skipLeads',
        };

        if (state.fallbackMode === 'insertValue' && state.fallbackDefaultValue) {
          fallback.defaultValue = state.fallbackDefaultValue;
        }

        fixChain.fallback = fallback;
      }

      return fixChain;
    }

    if (state.mode === 'insertValue' && state.defaultValue) {
      return {
        fixType: 'insertDefaultValue',
        defaultValue: state.defaultValue,
      };
    }

    if (state.mode === 'sendBlank') {
      return {
        fixType: 'sendBlank',
      };
    }

    // Default to skipLeads
    return {
      fixType: 'skipLeads',
    };
  }

  // Fallback
  return {
    fixType: 'skipLeads',
  };
}

/**
 * Converts CsvColumnFix fixChain to normalized FallbackState.
 * 
 * For allLeadsPresent mode with nested fallback:
 * - Parses the primary fallback (e.g., fetchFromLinkedIn)
 * - If nested fallback exists (fallback.fallback), extracts it to state.fallbackMode
 * - Maps nested fallback fixType to state.fallbackMode:
 *   - 'insertDefaultValue' -> 'insertValue'
 *   - 'sendBlank' -> 'sendBlank'
 *   - 'skipLeads' -> 'skipLead'
 */
export function parseFixChain(
  mode: FallbackMode,
  fixChain: CsvColumnFix['fixChain'] | undefined
): FallbackState {
  if (!fixChain) {
    return {
      mode: 'skipLead',
    };
  }

  // Handle allLeadsPresent mode
  // For allLeadsPresent, the fallback configuration becomes the PRIMARY selection
  // in the UI, because the FallbackConfiguration component shows main options directly
  if (mode === 'allleadsPresent' || fixChain.fixType === 'allLeadsPresent') {
    // When allLeadsPresent has a fallback, that fallback IS the user's primary choice
    if (fixChain.fallback) {
      // Check if this is a fetchLinkedIn option (fixType is 'fetchFromLinkedIn')
      if (fixChain.fallback.fixType === 'fetchFromLinkedIn' && fixChain.fallback.sourceField) {
        const state: FallbackState = {
          mode: 'fetchLinkedIn',
          linkedInField: fixChain.fallback.sourceField as LinkedInField,
        };

        // Parse nested fallback if it exists
        if (fixChain.fallback.fallback) {
          state.fallbackMode =
            fixChain.fallback.fallback.fixType === 'insertDefaultValue'
              ? 'insertValue'
              : fixChain.fallback.fallback.fixType === 'sendBlank'
              ? 'sendBlank'
              : 'skipLead';
          if (state.fallbackMode === 'insertValue' && fixChain.fallback.fallback.defaultValue) {
            state.fallbackDefaultValue = fixChain.fallback.fallback.defaultValue;
          }
        }

        return state;
      }

      // Handle other fallback types (insertDefaultValue, sendBlank, skipLeads)
      const primaryMode =
        fixChain.fallback.fixType === 'insertDefaultValue'
          ? 'insertValue'
          : fixChain.fallback.fixType === 'sendBlank'
          ? 'sendBlank'
          : 'skipLead';

      return {
        mode: primaryMode as FallbackState['mode'],
        defaultValue: fixChain.fallback.defaultValue || '',
      };
    }

    // No fallback configured, default to skipLead
    return {
      mode: 'skipLead',
    };
  }

  // Handle LinkedIn mode
  if (mode === 'linkedin') {
    if (fixChain.fixType === 'insertDefaultValue') {
      return {
        mode: 'insertValue',
        defaultValue: fixChain.defaultValue,
      };
    }

    if (fixChain.fixType === 'sendBlank') {
      return {
        mode: 'sendBlank',
      };
    }

    return {
      mode: 'skipLead',
    };
  }

  // Handle custom mode
  if (fixChain.fixType === 'fetchFromLinkedIn' && fixChain.sourceField) {
    const state: FallbackState = {
      mode: 'fetchLinkedIn',
      linkedInField: fixChain.sourceField as LinkedInField,
    };

    if (fixChain.fallback) {
      state.fallbackMode =
        fixChain.fallback.fixType === 'insertDefaultValue'
          ? 'insertValue'
          : fixChain.fallback.fixType === 'sendBlank'
          ? 'sendBlank'
          : 'skipLead';
      state.fallbackDefaultValue = fixChain.fallback.defaultValue;
    }

    return state;
  }

  if (fixChain.fixType === 'insertDefaultValue') {
    return {
      mode: 'insertValue',
      defaultValue: fixChain.defaultValue,
    };
  }

  if (fixChain.fixType === 'sendBlank') {
    return {
      mode: 'sendBlank',
    };
  }

  return {
    mode: 'skipLead',
  };
}

/**
 * Creates a CsvColumnFix from FallbackState
 */
export function createColumnFix(
  columnName: string,
  mode: FallbackMode,
  state: FallbackState
): CsvColumnFix {
  const fixChain = buildFixChain(mode, state);

  return {
    columnName,
    fixChain,
    appliedAt: Date.now(),
  };
}

/**
 * Determines FallbackMode from variable type and existing fix
 */
export function determineFallbackMode(
  variableType: 'linkedin' | 'csv' | 'api',
  existingFix: CsvColumnFix | undefined
): FallbackMode {
  if (variableType === 'linkedin') {
    return 'linkedin';
  }

  // Check if existing fix is allLeadsPresent
  if (existingFix?.fixChain?.fixType === 'allLeadsPresent') {
    return 'allleadsPresent';
  }

  return 'custom';
}

/**
 * Validates FallbackState for a given mode
 */
export function validateFallbackState(
  mode: FallbackMode,
  state: FallbackState
): { isValid: boolean; error?: string } {
  // For insertValue mode, defaultValue is required
  if (state.mode === 'insertValue' && !state.defaultValue?.trim()) {
    return {
      isValid: false,
      error: 'Default value is required when using "Insert Value" mode',
    };
  }

  // For fetchLinkedIn mode, linkedInField is required
  if (state.mode === 'fetchLinkedIn' && !state.linkedInField) {
    return {
      isValid: false,
      error: 'LinkedIn field is required when using "Fetch from LinkedIn" mode',
    };
  }

  // For fallback insertValue, fallbackDefaultValue is required
  if (
    state.fallbackMode === 'insertValue' &&
    !state.fallbackDefaultValue?.trim()
  ) {
    return {
      isValid: false,
      error: 'Fallback default value is required when using "Insert Value" fallback',
    };
  }

  return { isValid: true };
}
