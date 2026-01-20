import { CsvColumnFix, CsvConfig } from '@/types/campaigns';

// LinkedIn fields that can be fetched
export const LINKEDIN_FIELDS = [
  'firstName',
  'lastName', 
  'company',
  'title',
  'headline',
  'location'
] as const;

export type LinkedInField = typeof LINKEDIN_FIELDS[number];

// UI input structure for each column fix
export interface ColumnFixInput {
  columnName: string;
  fixType: 'sendBlank' | 'skipLeads' | 'insertDefaultValue' | 'fetchFromLinkedIn' | 'allLeadsPresent';
  defaultValue?: string;
  linkedInField?: LinkedInField;
  fallbackFixType?: 'sendBlank' | 'skipLeads' | 'insertDefaultValue' | 'fetchFromLinkedIn';
  fallbackDefaultValue?: string;
  nestedFallbackFixType?: 'sendBlank' | 'skipLeads' | 'insertDefaultValue';
  nestedFallbackDefaultValue?: string;
}

/**
 * Converts UI selections to proper CsvColumnFix structure
 */
export const convertToColumnFix = (input: ColumnFixInput): CsvColumnFix => {
  const { columnName, fixType, defaultValue, linkedInField, fallbackFixType, fallbackDefaultValue, nestedFallbackFixType, nestedFallbackDefaultValue } = input;

  // Validate required fields based on fixType
  if (fixType === 'insertDefaultValue' && !defaultValue) {
    throw new Error(`defaultValue is required for insertDefaultValue fix type on column: ${columnName}`);
  }

  if (fixType === 'fetchFromLinkedIn' && !linkedInField) {
    throw new Error(`linkedInField is required for fetchFromLinkedIn fix type on column: ${columnName}`);
  }

  if (fixType === 'fetchFromLinkedIn' && !LINKEDIN_FIELDS.includes(linkedInField!)) {
    throw new Error(`Invalid LinkedIn field: ${linkedInField}. Must be one of: ${LINKEDIN_FIELDS.join(', ')}`);
  }

  // Validate fallback if provided
  if (fallbackFixType === 'insertDefaultValue' && !fallbackDefaultValue) {
    throw new Error(`fallbackDefaultValue is required for insertDefaultValue fallback on column: ${columnName}`);
  }

  if (fallbackFixType === 'fetchFromLinkedIn' && !linkedInField) {
    throw new Error(`linkedInField is required for fetchFromLinkedIn fallback on column: ${columnName}`);
  }

  // Build the fix chain
  const fixChain: CsvColumnFix['fixChain'] = {
    fixType,
    ...(fixType === 'insertDefaultValue' && { defaultValue }),
    ...(fixType === 'fetchFromLinkedIn' && { sourceField: linkedInField }),
    // Support fallback for both fetchFromLinkedIn and allLeadsPresent
    ...((fixType === 'fetchFromLinkedIn' || fixType === 'allLeadsPresent') && fallbackFixType && {
      fallback: {
        fixType: fallbackFixType,
        ...(fallbackFixType === 'insertDefaultValue' && { defaultValue: fallbackDefaultValue }),
        ...(fallbackFixType === 'fetchFromLinkedIn' && linkedInField && { sourceField: linkedInField }),
        // Support nested fallback for fetchFromLinkedIn in allLeadsPresent mode
        ...(fixType === 'allLeadsPresent' && fallbackFixType === 'fetchFromLinkedIn' && nestedFallbackFixType && {
          fallback: {
            fixType: nestedFallbackFixType,
            ...(nestedFallbackFixType === 'insertDefaultValue' && nestedFallbackDefaultValue && { defaultValue: nestedFallbackDefaultValue })
          }
        })
      }
    })
  };

  return {
    columnName,
    fixChain,
    appliedAt: Date.now()
  };
};

/**
 * Converts multiple UI selections to CsvConfig
 */
export const convertToCsvConfig = (inputs: ColumnFixInput[]): CsvConfig => {
  const columnFixes = inputs.map(convertToColumnFix);
  
  return {
    columnFixes,
    detectedColumns: [],
    lastUpdated: Date.now()
  };
};

/**
 * Generates JSON string from UI selections
 */
export const generateColumnFixesJson = (inputs: ColumnFixInput[]): string => {
  const csvConfig = convertToCsvConfig(inputs);
  return JSON.stringify(csvConfig, null, 2);
};

/**
 * Validates a single column fix input
 */
export const validateColumnFixInput = (input: ColumnFixInput): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!input.columnName?.trim()) {
    errors.push('Column name is required');
  }

  if (!input.fixType) {
    errors.push('Fix type is required');
  }

  if (input.fixType === 'insertDefaultValue' && !input.defaultValue?.trim()) {
    errors.push('Default value is required for insertDefaultValue fix type');
  }

  if (input.fixType === 'fetchFromLinkedIn') {
    if (!input.linkedInField) {
      errors.push('LinkedIn field is required for fetchFromLinkedIn fix type');
    } else if (!LINKEDIN_FIELDS.includes(input.linkedInField)) {
      errors.push(`Invalid LinkedIn field: ${input.linkedInField}. Must be one of: ${LINKEDIN_FIELDS.join(', ')}`);
    }
  }

  if (input.fallbackFixType === 'insertDefaultValue' && !input.fallbackDefaultValue?.trim()) {
    errors.push('Fallback default value is required for insertDefaultValue fallback');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates multiple column fix inputs
 */
export const validateColumnFixInputs = (inputs: ColumnFixInput[]): { isValid: boolean; errors: string[] } => {
  const allErrors: string[] = [];
  
  inputs.forEach((input, index) => {
    const validation = validateColumnFixInput(input);
    if (!validation.isValid) {
      allErrors.push(`Column ${index + 1} (${input.columnName}): ${validation.errors.join(', ')}`);
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

/**
 * Helper to create a simple column fix (for backward compatibility)
 */
export const createSimpleColumnFix = (
  columnName: string, 
  fixType: 'sendBlank' | 'skipLeads' | 'insertDefaultValue', 
  defaultValue?: string
): CsvColumnFix => {
  return convertToColumnFix({
    columnName,
    fixType,
    defaultValue
  });
};

/**
 * Helper to create a LinkedIn fetch column fix
 */
export const createLinkedInColumnFix = (
  columnName: string,
  linkedInField: LinkedInField,
  fallbackFixType?: 'sendBlank' | 'skipLeads' | 'insertDefaultValue',
  fallbackDefaultValue?: string
): CsvColumnFix => {
  return convertToColumnFix({
    columnName,
    fixType: 'fetchFromLinkedIn',
    linkedInField,
    fallbackFixType,
    fallbackDefaultValue
  });
};

/**
 * Create a LinkedIn fallback fix using the standard CsvColumnFix format
 */
export const createLinkedInFallbackFix = (
  linkedinVariableId: string, // e.g., "csv_linkedin_company"
  fixType: 'sendBlank' | 'insertDefaultValue' | 'skipLeads',
  defaultValue?: string
): CsvColumnFix => {
  if (fixType === 'insertDefaultValue' && !defaultValue) {
    throw new Error('defaultValue is required for insertDefaultValue fix type');
  }

  return {
    columnName: linkedinVariableId,
    fixChain: {
      fixType,
      ...(fixType === 'insertDefaultValue' && { defaultValue })
    },
    appliedAt: Date.now()
  };
};
