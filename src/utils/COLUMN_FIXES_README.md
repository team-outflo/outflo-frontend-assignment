# Column Fixes System

This system provides a dynamic way to handle missing values in campaign lead data by converting UI selections into structured JSON for `columnFixes`.

## Overview

The system supports four types of fixes for missing column values:

1. **Send Blank** - Leave missing values empty in messages
2. **Insert Default Value** - Set a default value for all missing fields
3. **Skip Leads** - Exclude leads with missing values from the campaign
4. **Fetch From LinkedIn** - Automatically fetch missing values from LinkedIn profiles (with optional fallback)

## Key Components

### 1. Type Definitions (`src/types/campaigns.ts`)

```typescript
export type CsvColumnFix = {
  columnName: string;
  fixChain: {
    fixType: 'sendBlank' | 'insertDefaultValue' | 'skipLeads' | 'fetchFromLinkedIn';
    sourceField?: string; // LinkedIn field for fetchFromLinkedIn
    defaultValue?: string; // Required for insertDefaultValue
    fallback?: {
      fixType: 'sendBlank' | 'insertDefaultValue' | 'skipLeads';
      defaultValue?: string; // Required for insertDefaultValue fallback
    };
  };
  appliedAt: number;
};
```

### 2. Utility Functions (`src/utils/columnFixesUtils.ts`)

#### Core Functions:
- `convertToColumnFix(input: ColumnFixInput): CsvColumnFix` - Convert UI input to proper structure
- `convertToCsvConfig(inputs: ColumnFixInput[]): CsvConfig` - Convert multiple inputs to config
- `generateColumnFixesJson(inputs: ColumnFixInput[]): string` - Generate JSON string
- `validateColumnFixInput(input: ColumnFixInput)` - Validate single input
- `validateColumnFixInputs(inputs: ColumnFixInput[])` - Validate multiple inputs

#### Helper Functions:
- `createSimpleColumnFix()` - For basic fixes
- `createLinkedInColumnFix()` - For LinkedIn fetch fixes

### 3. Enhanced UI Component (`src/components/Campaign/Sequence/components/EnhancedVariableValidationDrawer.tsx`)

A complete UI component that handles:
- Missing value detection and display
- All four fix types with proper validation
- LinkedIn field selection
- Fallback configuration
- Real-time validation and error handling

### 4. Campaign Store Integration (`src/api/store/campaignStore/campaign.ts`)

New methods added:
- `addCsvColumnFixes(columnFixes: CsvColumnFix[])` - Add multiple fixes
- `removeCsvColumnFix(columnName: string)` - Remove specific fix
- `clearCsvColumnFixes()` - Clear all fixes

## Usage Examples

### Basic Usage

```typescript
import { convertToColumnFix, generateColumnFixesJson } from '@/utils/columnFixesUtils';

// Example UI selections
const selections = [
  {
    columnName: 'company',
    fixType: 'fetchFromLinkedIn',
    linkedInField: 'currentCompany',
    fallbackFixType: 'insertDefaultValue',
    fallbackDefaultValue: 'Unknown Company'
  },
  {
    columnName: 'email',
    fixType: 'insertDefaultValue',
    defaultValue: 'no-email@example.com'
  },
  {
    columnName: 'phone',
    fixType: 'sendBlank'
  }
];

// Generate JSON
const json = generateColumnFixesJson(selections);
console.log(json);
```

### Using with Campaign Store

```typescript
import { useCampaignStore } from '@/api/store/campaignStore';
import { convertToCsvConfig } from '@/utils/columnFixesUtils';

const { addCsvColumnFixes } = useCampaignStore();

// Convert and apply to store
const csvConfig = convertToCsvConfig(selections);
addCsvColumnFixes(csvConfig.columnFixes);
```

### Validation

```typescript
import { validateColumnFixInputs } from '@/utils/columnFixesUtils';

const validation = validateColumnFixInputs(selections);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

## LinkedIn Fields

Available LinkedIn fields for fetching:
- `firstName` - First Name
- `lastName` - Last Name
- `emailAddress` - Email Address
- `currentCompany` - Current Company
- `title` - Job Title
- `headline` - Headline
- `location` - Location
- `phoneNumber` - Phone Number

## JSON Output Structure

```json
{
  "columnFixes": [
    {
      "columnName": "company",
      "fixChain": {
        "fixType": "fetchFromLinkedIn",
        "sourceField": "currentCompany",
        "fallback": {
          "fixType": "insertDefaultValue",
          "defaultValue": "Unknown Company"
        }
      }
    },
    {
      "columnName": "email",
      "fixChain": {
        "fixType": "insertDefaultValue",
        "defaultValue": "no-email@example.com"
      }
    },
    {
      "columnName": "phone",
      "fixChain": {
        "fixType": "sendBlank"
      }
    }
  ],
  "lastUpdated": 1759230497406
}
```

## Rules and Validation

1. **Primary Fix Types**: Each column can have only one primary fix type
2. **Fallback**: Only allowed when primary fix type is `fetchFromLinkedIn`
3. **Required Fields**:
   - `defaultValue` required for `insertDefaultValue` (primary or fallback)
   - `linkedInField` required for `fetchFromLinkedIn`
4. **LinkedIn Fields**: Must be one of the predefined valid fields
5. **Validation**: All inputs are validated before conversion

## Integration with Existing Code

The system is designed to work seamlessly with your existing campaign sequence components:

1. **VariableValidationDrawer** - Can be replaced with `EnhancedVariableValidationDrawer`
2. **Campaign Store** - Already integrated with new methods
3. **Validation Utils** - Updated to handle new structure
4. **Type Safety** - Full TypeScript support with proper type checking

## Usage

This system provides a robust, type-safe way to handle missing column values dynamically while maintaining backward compatibility with existing code. The column fixes are configured through the `UnifiedVariableConfigurationModal` component, which handles the UI for selecting fallback options.
