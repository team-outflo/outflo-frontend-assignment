/**
 * Known variable prefixes that indicate non-API variables
 */
const KNOWN_PREFIXES = [ 'linkedin_', 'sender_'] as const;

/**
 * Check if a variable ID represents an API variable.
 * 
 * API variables are:
 * 1. Variables starting with 'api_' (legacy format)
 * 2. Variables without any known prefix (new format - backend treats unprefixed variables as API variables)
 * 
 * @param variableId - The variable ID to check
 * @param normaliseColumn - Optional: The normalized column name from the variable config
 * @returns true if the variable is an API variable, false otherwise
 */
export function isApiVariable(variableId: string, normaliseColumn?: string): boolean {
  if (!variableId) {
    return false;
  }

  // Legacy format: variables starting with 'api_'
  if (variableId.startsWith('api_') || variableId.startsWith('csv_')) {
    return true;
  }

  // Check if variable has any known non-API prefix
  const hasKnownPrefix = KNOWN_PREFIXES.some(prefix => variableId.startsWith(prefix));
  
  // If no known prefix, it's an API variable (new format)
  if (!hasKnownPrefix) {
    return true;
  }

  // If normaliseColumn is provided, check if it's an API variable by column name
  // This handles cases where variableId might be different but normaliseColumn indicates API
  if (normaliseColumn) {
    // Check if the normalized column doesn't have a known prefix
    const columnHasPrefix = KNOWN_PREFIXES.some(prefix => 
      normaliseColumn.startsWith(prefix)
    );
    if (!columnHasPrefix && !normaliseColumn.startsWith('api_') && !normaliseColumn.startsWith('csv_')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extracts the base name from an API variable ID.
 * Removes the 'api_' prefix if present, otherwise returns the variable ID as-is.
 * 
 * @param variableId - The API variable ID (e.g., 'api_email' or 'email')
 * @returns The base name without the 'api_' prefix (e.g., 'email')
 */
export function getApiVariableBaseName(variableId: string): string {
  if (!variableId) {
    return '';
  }
  
  // Remove 'api_' prefix if present (legacy format)
  if (variableId.startsWith('api_')) {
    return variableId.replace('api_', '');
  }
  
  // Return as-is for new format (no prefix)
  return variableId;
}
