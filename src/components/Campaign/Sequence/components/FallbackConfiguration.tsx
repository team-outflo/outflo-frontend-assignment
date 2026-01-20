import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tag, Info, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { LINKEDIN_FIELDS, LinkedInField } from '@/utils/columnFixesUtils';
import { TooltipInfo } from '@/components/utils/TooltipInfo';
import type { FallbackState, FallbackMode } from './fallbackTypes';

interface FallbackConfigurationProps {
  mode: FallbackMode;
  state: FallbackState;
  variableName: string;
  disabled?: boolean;
  onStateChange: (state: FallbackState) => void;
  showHeader?: boolean;
  headerDescription?: string;
  contextualHelp?: string;
  successMessage?: string;
}

const LINKEDIN_FIELD_LABELS: Record<LinkedInField, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  company: 'Current Company',
  title: 'Job Title',
  headline: 'Headline',
  location: 'Location',
};

export const FallbackConfiguration: React.FC<FallbackConfigurationProps> = ({
  mode,
  state,
  variableName,
  disabled = false,
  onStateChange,
  showHeader = true,
  headerDescription,
  contextualHelp,
  successMessage,
}) => {
  const updateState = (updates: Partial<FallbackState>) => {
    onStateChange({ ...state, ...updates });
  };

  const handleModeChange = (newMode: FallbackState['mode']) => {
    // When changing primary mode, reset conflicting fields
    if (newMode === 'insertValue') {
      updateState({ mode: newMode, linkedInField: undefined });
    } else if (newMode === 'fetchLinkedIn') {
      updateState({ mode: newMode, defaultValue: '' });
    } else if (newMode === 'sendBlank' || newMode === 'skipLead') {
      updateState({ mode: newMode, defaultValue: '', linkedInField: undefined });
    }
  };

  const handleDefaultValueChange = (value: string) => {
    if (value.trim()) {
      // Auto-select insertValue mode when user types
      if (state.mode !== 'insertValue') {
        updateState({ mode: 'insertValue', defaultValue: value, linkedInField: undefined });
      } else {
        updateState({ defaultValue: value });
      }
    } else {
      updateState({ defaultValue: '' });
    }
  };

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-green-900">
                Configure Fallback for {variableName}
              </h3>
              {headerDescription && (
                <TooltipInfo
                  trigger={<Info className="h-4 w-4 text-green-600 flex-shrink-0 cursor-pointer" />}
                  content={headerDescription}
                  side="bottom"
                  align="center"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPrimaryBehavior = () => {
    // For allLeadsPresent mode, show the green banner AND full options below
    if (mode === 'allleadsPresent') {
      // Determine current radio value for allLeadsPresent mode
      const currentValue = state.mode === 'insertValue' && state.defaultValue
        ? 'insertValue'
        : state.mode;

      return (
        <>
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-900">
                  All leads currently have this value
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Configure fallback options for when data becomes missing in the future.
                </p>
              </div>
            </div>
          </div>

          {/* Full options for allLeadsPresent - same as custom mode */}
          <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-white">
            <RadioGroup
              value={currentValue}
              onValueChange={(value) => {
                if (disabled) return;
                handleModeChange(value as FallbackState['mode']);
              }}
              disabled={disabled}
            >
              {/* Option 1: Enter Fallback Value */}
              <div className="flex items-start space-x-3 py-2">
                <RadioGroupItem value="insertValue" id="allpresent-insert-value" className="mt-1" disabled={disabled} />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="allpresent-insert-value" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    Use a fallback value
                  </Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      value={state.defaultValue || ''}
                      onChange={(e) => {
                        if (disabled) return;
                        handleDefaultValueChange(e.target.value);
                      }}
                      placeholder="Enter fallback value"
                      disabled={disabled || state.mode !== 'insertValue'}
                      className={`pl-10 rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 ${disabled || state.mode !== 'insertValue'
                          ? 'bg-gray-100 cursor-not-allowed opacity-60'
                          : ''
                        }`}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    This value will be used when the field is missing.
                  </p>
                </div>
              </div>

              {/* Option 2: Fetch from LinkedIn */}
              <div className="flex items-start space-x-3 py-2">
                <RadioGroupItem value="fetchLinkedIn" id="allpresent-fetch-linkedin" className="mt-1" disabled={disabled} />
                <div className="flex-1">
                  <Label htmlFor="allpresent-fetch-linkedin" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    Fetch from LinkedIn
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">Fetch data from LinkedIn profiles</p>

                  {/* LinkedIn Field Selection (progressive disclosure) */}
                  {state.mode === 'fetchLinkedIn' && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Label htmlFor="allpresent-linkedin-field" className="text-sm font-medium text-blue-900">
                        Select LinkedIn field
                      </Label>
                      <Select
                        value={state.linkedInField || ''}
                        onValueChange={(value: LinkedInField) => {
                          if (disabled) return;
                          updateState({ linkedInField: value });
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger className="mt-1" disabled={disabled}>
                          <SelectValue placeholder="Select LinkedIn field" />
                        </SelectTrigger>
                        <SelectContent>
                          {LINKEDIN_FIELDS.map((field) => (
                            <SelectItem key={field} value={field}>
                              {LINKEDIN_FIELD_LABELS[field]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Fallback Configuration for LinkedIn fetch */}
                  {state.mode === 'fetchLinkedIn' && state.linkedInField && (
                    <div className="mt-4">
                      <div className="mb-2">
                        <Label className="text-sm font-semibold text-gray-900">
                          Fallback if LinkedIn data is missing
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Configure what happens if LinkedIn fetch fails or returns no data.
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        {renderFallbackOptions(true)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Option 3: Send Blank */}
              <div className="flex items-start space-x-3 py-2">
                <RadioGroupItem value="sendBlank" id="allpresent-send-blank" className="mt-1" disabled={disabled} />
                <div className="flex-1">
                  <Label htmlFor="allpresent-send-blank" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    Send Blank
                  </Label>
                  <p className="text-xs text-gray-500">Leave the field empty in messages</p>
                </div>
              </div>

              {/* Option 4: Skip Lead */}
              <div className="flex items-start space-x-3 py-2">
                <RadioGroupItem value="skipLead" id="allpresent-skip-lead" className="mt-1" disabled={disabled} />
                <div className="flex-1">
                  <Label htmlFor="allpresent-skip-lead" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    Skip Lead
                  </Label>
                  <p className="text-xs text-gray-500">Skip leads with missing data from the campaign</p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </>
      );
    }

    // Determine current radio value
    const currentValue = state.mode === 'insertValue' && state.defaultValue
      ? 'insertValue'
      : state.mode;

    return (
      <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-white">
        <RadioGroup
          value={currentValue}
          onValueChange={(value) => {
            if (disabled) return;
            handleModeChange(value as FallbackState['mode']);
          }}
          disabled={disabled}
        >
          {/* Option 1: Enter Fallback Value */}
          <div className="flex items-start space-x-3 py-2">
            <RadioGroupItem value="insertValue" id="insert-value" className="mt-1" disabled={disabled} />
            <div className="flex-1 space-y-2">
              <Label htmlFor="insert-value" className="text-sm font-semibold text-gray-900 cursor-pointer">
                Use a fallback value
              </Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  value={state.defaultValue || ''}
                  onChange={(e) => {
                    if (disabled) return;
                    handleDefaultValueChange(e.target.value);
                  }}
                  placeholder="Enter fallback value"
                  disabled={disabled || state.mode !== 'insertValue'}
                  className={`pl-10 rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 ${disabled || state.mode !== 'insertValue'
                      ? 'bg-gray-100 cursor-not-allowed opacity-60'
                      : ''
                    }`}
                />
              </div>
              <p className="text-xs text-gray-500">
                This value will be used when the field is missing.
              </p>
            </div>
          </div>

          {/* Option 2: Fetch from LinkedIn (only for custom variables) */}
          {mode === 'custom' && (
            <div className="flex items-start space-x-3 py-2">
              <RadioGroupItem value="fetchLinkedIn" id="fetch-linkedin" className="mt-1" disabled={disabled} />
              <div className="flex-1">
                <Label htmlFor="fetch-linkedin" className="text-sm font-semibold text-gray-900 cursor-pointer">
                  Fetch from LinkedIn
                </Label>
                <p className="text-xs text-gray-500 mt-1">Fetch data from LinkedIn profiles</p>

                {/* Description when Fetch from LinkedIn is selected */}
                {state.mode === 'fetchLinkedIn' && (
                  <p className="text-xs text-gray-600 mt-2 italic">
                    This field will be fetched from LinkedIn profiles to fill missing values.
                  </p>
                )}

                {/* LinkedIn Field Selection (progressive disclosure) */}
                {state.mode === 'fetchLinkedIn' && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Label htmlFor="linkedin-field" className="text-sm font-medium text-blue-900">
                      Select LinkedIn field
                    </Label>
                    <Select
                      value={state.linkedInField || ''}
                      onValueChange={(value: LinkedInField) => {
                        if (disabled) return;
                        updateState({ linkedInField: value });
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger className="mt-1" disabled={disabled}>
                        <SelectValue placeholder="Select LinkedIn field" />
                      </SelectTrigger>
                      <SelectContent>
                        {LINKEDIN_FIELDS.map((field) => (
                          <SelectItem key={field} value={field}>
                            {LINKEDIN_FIELD_LABELS[field]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Fallback Configuration (inline, appears right after LinkedIn field selector) */}
                {state.mode === 'fetchLinkedIn' && state.linkedInField && (
                  <div className="mt-4">
                    <div className="mb-2">
                      <Label className="text-sm font-semibold text-gray-900">
                        Fallback if data is missing
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Configure what happens if LinkedIn fetch fails or returns no data.
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {renderFallbackOptions(true)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Option 3: Send Blank */}
          <div className="flex items-start space-x-3 py-2">
            <RadioGroupItem value="sendBlank" id="send-blank" className="mt-1" disabled={disabled} />
            <div className="flex-1">
              <Label htmlFor="send-blank" className="text-sm font-semibold text-gray-900 cursor-pointer">
                Send Blank
              </Label>
              <p className="text-xs text-gray-500">Leave the field empty in messages</p>
            </div>
          </div>

          {/* Option 4: Skip Lead */}
          <div className="flex items-start space-x-3 py-2">
            <RadioGroupItem value="skipLead" id="skip-lead" className="mt-1" disabled={disabled} />
            <div className="flex-1">
              <Label htmlFor="skip-lead" className="text-sm font-semibold text-gray-900 cursor-pointer">
                Skip Lead
              </Label>
              <p className="text-xs text-gray-500">Skip leads with missing data from the campaign</p>
            </div>
          </div>
        </RadioGroup>
      </div>
    );
  };

  const renderFallbackOptions = (isInline: boolean = false) => {
    const fallbackMode = state.fallbackMode || 'skipLead';
    const fallbackDefaultValue = state.fallbackDefaultValue || '';

    return (
      <div className={isInline ? 'mt-4' : 'ml-7 p-3 bg-gray-50 border border-gray-200 rounded-lg '}>
        <RadioGroup
          value={fallbackMode === 'insertValue' && fallbackDefaultValue ? 'insertValue' : fallbackMode}
          onValueChange={(value) => {
            if (disabled) return;
            updateState({
              fallbackMode: value as FallbackState['fallbackMode'],
              fallbackDefaultValue: value === 'insertValue' ? fallbackDefaultValue : '',
            });
          }}
          disabled={disabled}
        >
          {/* Fallback: Enter Value */}
          <div className="flex items-start space-x-3 py-2">
            <RadioGroupItem value="insertValue" id="fallback-insert-value" className="mt-1" disabled={disabled} />
            <div className="flex-1 space-y-2">
              <Label htmlFor="fallback-insert-value" className="text-sm font-semibold text-gray-900 cursor-pointer">
                Use a fallback value
              </Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  value={fallbackDefaultValue}
                  onChange={(e) => {
                    if (disabled) return;
                    const value = e.target.value;
                    if (value.trim()) {
                      updateState({
                        fallbackMode: 'insertValue',
                        fallbackDefaultValue: value,
                      });
                    } else {
                      updateState({
                        fallbackDefaultValue: '',
                      });
                    }
                  }}
                  placeholder="Enter fallback value"
                  disabled={disabled || fallbackMode !== 'insertValue'}
                  className={`pl-10 rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 ${disabled || fallbackMode !== 'insertValue'
                      ? 'bg-gray-100 cursor-not-allowed opacity-60'
                      : ''
                    }`}
                />
              </div>
            </div>
          </div>

          {/* Fallback: Send Blank */}
          <div className="flex items-start space-x-3 py-2">
            <RadioGroupItem value="sendBlank" id="fallback-send-blank" className="mt-1" disabled={disabled} />
            <div className="flex-1">
              <Label htmlFor="fallback-send-blank" className="text-sm font-semibold text-gray-900 cursor-pointer">
                Send Blank
              </Label>
              <p className="text-xs text-gray-500">Leave the field empty</p>
            </div>
          </div>

          {/* Fallback: Skip Lead */}
          <div className="flex items-start space-x-3 py-2">
            <RadioGroupItem value="skipLead" id="fallback-skip-lead" className="mt-1" disabled={disabled} />
            <div className="flex-1">
              <Label htmlFor="fallback-skip-lead" className="text-sm font-semibold text-gray-900 cursor-pointer">
                Skip Lead
              </Label>
              <p className="text-xs text-gray-500">Skip leads with missing data</p>
            </div>
          </div>
        </RadioGroup>
      </div>
    );
  };

  // const renderFallbackSection = () => {
  //   // Fallback section is no longer needed as a separate section
  //   // For allLeadsPresent: options are now rendered inline in renderPrimaryBehavior
  //   // For fetchLinkedIn: fallback is rendered inline within the Fetch from LinkedIn option
  //   return null;
  // };

  return (
    <div className="space-y-4">
      {/* {renderHeader()} */}
      {contextualHelp && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start">
            <AlertTriangle className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="text-xs">{contextualHelp}</p>
            </div>
          </div>
        </div>
      )}
      {successMessage && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-900">
              {successMessage}
            </p>
            <p className="text-xs text-green-700 mt-1">
              Configure fallback options for when data becomes missing in the future.
            </p>
          </div>
        </div>
        </div>
      )}
      {/* <div className="p-4 border border-gray-200 rounded-lg bg-white"> */}
        {renderPrimaryBehavior()}
        {/* {renderFallbackSection()} */}

      {/* </div> */}
    </div>
  );
};
