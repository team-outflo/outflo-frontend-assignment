# Fallback Configuration Refactor

## Overview

The `UnifiedVariableConfigurationModal` has been refactored to simplify the mental model, eliminate code duplication, and improve maintainability. The refactor introduces a normalized state management system and a reusable `FallbackConfiguration` component.

## Architecture

### Core Components

1. **`FallbackConfiguration.tsx`** - Reusable component for all fallback scenarios
2. **`fallbackTypes.ts`** - Type definitions and mode configurations
3. **`fallbackUtils.ts`** - Pure functions for fix-chain creation and parsing
4. **`UnifiedVariableConfigurationModal.tsx`** - Main modal component (simplified)

### Three Fallback Scenarios

#### A. LinkedIn Variable Fallback (`linkedin` mode)
- **Options:**
  - Enter fallback value
  - Send blank
  - Skip lead
- **No nested logic** - Simple, linear options

#### B. Custom Variable Fallback (`custom` mode)
- **Options:**
  - Enter fallback value
  - Fetch from LinkedIn (with LinkedIn field dropdown)
  - Send blank
  - Skip lead
- **Fallback section** appears when "Fetch from LinkedIn" is selected and a LinkedIn field is chosen

#### C. Custom Variable with `allLeadsPresent` (`custom_all_present` mode)
- **Fixed fixType:** Always `allLeadsPresent` (user cannot change)
- **UI shows:** "All leads currently have this value"
- **Fallback only:** User can configure fallback for future missing data
- **Clear messaging:** "This fallback is inactive unless data becomes missing"

## State Management

### Normalized State (`FallbackState`)

```typescript
type FallbackState = {
  mode: 'insertValue' | 'fetchLinkedIn' | 'sendBlank' | 'skipLead';
  defaultValue?: string;
  linkedInField?: LinkedInField;
  fallbackMode?: 'insertValue' | 'sendBlank' | 'skipLead';
  fallbackDefaultValue?: string;
};
```

**Benefits:**
- Single source of truth
- No scattered booleans
- Clear state transitions
- Easy to validate

### Mode Configuration

Each fallback mode has a configuration object:

```typescript
const FALLBACK_MODE_CONFIGS: Record<FallbackMode, FallbackModeConfig> = {
  linkedin: { ... },
  custom: { ... },
  custom_all_present: { ... },
};
```

This drives:
- UI labels and descriptions
- Available options
- Contextual help text

## Fix-Chain Creation

### Pure Functions

All fix-chain logic is centralized in `fallbackUtils.ts`:

- **`buildFixChain(mode, state)`** - Converts normalized state to fixChain
- **`parseFixChain(mode, fixChain)`** - Converts fixChain to normalized state
- **`createColumnFix(columnName, mode, state)`** - Creates complete CsvColumnFix
- **`determineFallbackMode(variableType, existingFix)`** - Determines which mode to use
- **`validateFallbackState(mode, state)`** - Validates state before saving

### No Side Effects

- All functions are pure
- No fixType decisions in JSX
- No side effects in render functions
- Easy to test

## UX Improvements

### Clear Section Labels
- **"Primary Behavior"** - What happens when data exists/is missing
- **"Fallback if data is missing"** - Secondary fallback configuration

### Automatic Option Management
- Only one primary action selectable at a time
- Conflicting options automatically disabled
- Clear visual feedback

### Contextual Help
- Mode-specific help text
- Clear explanations of each option
- No warnings - only helpful guidance

## Code Reduction

### Before
- ~930 lines in single file
- Duplicated CSV/API UI blocks (~250 lines each)
- Scattered state management
- Complex conditional logic

### After
- ~400 lines in main modal
- ~300 lines in reusable component
- ~200 lines in utilities
- ~100 lines in types/config
- **Total: ~1000 lines** (slightly more, but much better organized)
- **Eliminated duplication** - CSV and API use same component
- **Clear separation of concerns**

## Migration Notes

### Backward Compatibility
- All existing props and callbacks remain the same
- Types are re-exported for compatibility
- No changes needed in parent components

### Testing Checklist
- [x] LinkedIn variable fallback
- [x] Custom variable fallback
- [x] Custom variable with allLeadsPresent
- [x] View mode (read-only)
- [x] Edit mode (full functionality)
- [x] State persistence
- [x] Fix-chain creation
- [x] Validation

## Future Enhancements

Potential improvements:
1. Add unit tests for utility functions
2. Add Storybook stories for each mode
3. Consider reducer pattern if state becomes more complex
4. Add analytics for user behavior
