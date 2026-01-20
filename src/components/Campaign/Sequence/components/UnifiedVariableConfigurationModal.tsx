import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCampaignStore } from '@/api/store/campaignStore';
import { Info } from 'lucide-react';
import { FallbackConfiguration } from './FallbackConfiguration';
import { TooltipInfo } from '@/components/utils/TooltipInfo';
import {
  determineFallbackMode,
  parseFixChain,
  createColumnFix,
  validateFallbackState,
} from './fallbackUtils';
import { FALLBACK_MODE_CONFIGS } from './fallbackTypes';
import type { FallbackState, FallbackMode } from './fallbackTypes';
import type { VariableType, FixType } from './UnifiedVariableConfigurationModal.types';
import type { LinkedInField } from '@/utils/columnFixesUtils';

// Re-export types for backward compatibility
export type { VariableType, FixType };

interface UnifiedVariableConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  variableType: VariableType;
  variableId: string;
  variableName: string;
  onApply: (
    fixType: FixType,
    defaultValue?: string,
    linkedInField?: LinkedInField,
    fallbackFixType?: 'sendBlank' | 'insertDefaultValue' | 'skipLeads' | 'fetchFromLinkedIn',
    nestedFallbackFixType?: 'sendBlank' | 'insertDefaultValue' | 'skipLeads',
    nestedFallbackDefaultValue?: string
  ) => void;
}

export const UnifiedVariableConfigurationModal: React.FC<UnifiedVariableConfigurationModalProps> = ({
  isOpen,
  onClose,
  variableType,
  variableId,
  variableName,
  onApply,
}) => {
  const { getCsvColumnFix, mode, campaign } = useCampaignStore();
  // Subscribe to columnFixes changes for reactive updates
  const columnFixes = campaign?.csvConfig?.columnFixes ?? [];
  const modalRef = useRef<HTMLDivElement>(null);
  const isViewMode = mode === 'view';

  // Normalized state
  const [fallbackMode, setFallbackMode] = useState<FallbackMode>('custom');
  const [fallbackState, setFallbackState] = useState<FallbackState>({
    mode: 'skipLead',
  });

  // Load configuration when modal opens or when columnFixes change
  useEffect(() => {
    if (!isOpen) return;

    // Get existing fix
    let existing;
    if (isViewMode && campaign?.csvConfig?.columnFixes) {
      existing = campaign.csvConfig.columnFixes.find(
        (fix: any) =>
          fix.columnName === variableId ||
          fix.columnName === variableId.replace('linkedin.', 'linkedin_')
      );
    } else {
      existing = getCsvColumnFix(variableId);
    }

    // Determine mode
    const mode = determineFallbackMode(variableType, existing);
    setFallbackMode(mode);

    // Parse existing fix or use defaults (draft state only - not persisted)
    if (existing?.fixChain) {
      const parsedState = parseFixChain(mode, existing.fixChain);
      setFallbackState(parsedState);
    } else {
      // Set default UI state (draft only - not persisted until Apply is clicked)
      if (mode === 'linkedin') {
        setFallbackState({ mode: 'skipLead' });
      } else if (mode === 'allleadsPresent') {
        setFallbackState({
          mode: 'skipLead',
        });
      } else {
        // setFallbackState({ mode: 'skipLead' });
        setFallbackState({ mode: 'insertValue', defaultValue: '' });
      }
      // NOTE: No automatic persistence here - changes only saved on Apply
    }
  }, [
    isOpen, 
    variableId, 
    variableType, 
    getCsvColumnFix, 
    isViewMode, 
    // Use columnFixes array directly - Zustand creates new array on update, so this will trigger re-run
    columnFixes,
    campaign?.csvConfig?.lastUpdated
  ]);

  // Handle clicks outside modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      if (modalRef.current && modalRef.current.contains(target)) {
        return;
      }

      const isDropdownClick =
        target.closest('[data-radix-popper-content-wrapper]') ||
        target.closest('[data-radix-select-content]') ||
        target.closest('[role="listbox"]') ||
        target.closest('[data-state="open"]') ||
        target.closest('[data-radix-portal]') ||
        target.closest('[data-radix-select-viewport]');

      if (isDropdownClick) {
        return;
      }

      onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Handle save
  const handleSave = () => {
    // Validate state
    const validation = validateFallbackState(fallbackMode, fallbackState);
    if (!validation.isValid) {
      // Could show error toast here
      console.error(validation.error);
      return;
    }

    // Create column fix
    const columnFix = createColumnFix(variableId, fallbackMode, fallbackState);
    const fixChain = columnFix.fixChain;

    // Convert to onApply format
    const fixType: FixType = fixChain.fixType;
    let defaultValue: string | undefined;
    let linkedInField: LinkedInField | undefined;
    let fallbackFixType: 'sendBlank' | 'insertDefaultValue' | 'skipLeads' | 'fetchFromLinkedIn' | undefined;

    if (fixType === 'insertDefaultValue') {
      defaultValue = fixChain.defaultValue;
    } else if (fixType === 'fetchFromLinkedIn' && fixChain.sourceField) {
      linkedInField = fixChain.sourceField as LinkedInField;
      if (fixChain.fallback) {
        fallbackFixType =
          fixChain.fallback.fixType === 'insertDefaultValue'
            ? 'insertDefaultValue'
            : fixChain.fallback.fixType === 'sendBlank'
            ? 'sendBlank'
            : 'skipLeads';
        if (fallbackFixType === 'insertDefaultValue') {
          defaultValue = fixChain.fallback.defaultValue;
        }
      }
    } else if (fixType === 'allLeadsPresent' && fixChain.fallback) {
      // Handle fetchFromLinkedIn in fallback
      if (fixChain.fallback.fixType === 'fetchFromLinkedIn' && fixChain.fallback.sourceField) {
        linkedInField = fixChain.fallback.sourceField as LinkedInField;
        fallbackFixType = 'fetchFromLinkedIn';
        // Handle nested fallback for when LinkedIn fetch fails
        let nestedFallbackFixType: 'sendBlank' | 'insertDefaultValue' | 'skipLeads' | undefined;
        let nestedFallbackDefaultValue: string | undefined;
        if (fixChain.fallback.fallback) {
          nestedFallbackFixType =
            fixChain.fallback.fallback.fixType === 'insertDefaultValue'
              ? 'insertDefaultValue'
              : fixChain.fallback.fallback.fixType === 'sendBlank'
              ? 'sendBlank'
              : 'skipLeads';
          if (nestedFallbackFixType === 'insertDefaultValue') {
            nestedFallbackDefaultValue = fixChain.fallback.fallback.defaultValue;
          }
        }
        onApply(fixType, defaultValue, linkedInField, fallbackFixType, nestedFallbackFixType, nestedFallbackDefaultValue);
        onClose();
        return;
      } else {
        // Handle other fallback types (insertDefaultValue, sendBlank, skipLeads)
        fallbackFixType =
          fixChain.fallback.fixType === 'insertDefaultValue'
            ? 'insertDefaultValue'
            : fixChain.fallback.fixType === 'sendBlank'
            ? 'sendBlank'
            : 'skipLeads';
        if (fallbackFixType === 'insertDefaultValue') {
          defaultValue = fixChain.fallback.defaultValue;
        }
      }
    }

    onApply(fixType, defaultValue, linkedInField, fallbackFixType, undefined, undefined);
    onClose();
  };

  // Get configuration for current mode
  const modeConfig = FALLBACK_MODE_CONFIGS[fallbackMode];

  // Check if this is a new configuration
  const existing = getCsvColumnFix(variableId);
  const isNewConfiguration = !existing;

  // Get title with variable ID
  const getTitleWithId = () => {
    const getVariableIdColor = (id: string) => {
      if (id.startsWith('csv_') || variableType === 'api') {
        return 'text-green-600 bg-green-50 border-green-200';
      } else if (id.startsWith('linkedin_')) {
        return 'text-blue-600 bg-blue-50 border-blue-200';
      } else if (id.startsWith('sender_')) {
        return 'text-purple-600 bg-purple-50 border-purple-200';
      }
      return 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const titleText =
      isViewMode
        ? 'View Configuration'
        : variableType === 'linkedin'
        ? 'LinkedIn Fallback'
        : variableType === 'api'
        ? 'Custom Variable Fallback'
        : 'Configure';

    return (
      <div className="flex items-center justify-items-end space-x-1">
        <span>
          {titleText} for {`{ ${variableName} }`}
          {/* {isNewConfiguration && !isViewMode ? ' (Needs Configuration)' : ''} */}
        </span>
        {/* {isNewConfiguration && !isViewMode && (
          <TooltipInfo
            trigger={<Info className="h-4 w-4 text-amber-600 flex-shrink-0 cursor-pointer" />}
            content="This variable needs configuration. The default selection is 'Skip Lead', but no changes will be saved until you click 'Apply Configuration'."
            side="top"
            align="start"
          />
        )} */}
        <span
          className={`items-center p-1 rounded text-xs mt-1 ${getVariableIdColor(variableId)}`}
        >
          {variableId}
        </span>
      </div>
    );
  };

  // Check if save should be disabled
  const isSaveDisabled = () => {
    if (isViewMode) return true;
    const validation = validateFallbackState(fallbackMode, fallbackState);
    return !validation.isValid;
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[95vh] overflow-y-auto"
        ref={modalRef}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {getTitleWithId()}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Show view mode indicator */}
          {isViewMode && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Info className="h-4 w-4 text-blue-600 mr-2" />
                <p className="text-sm text-blue-800">
                  View mode: Configuration is read-only. You can see the current settings but cannot
                  modify them.
                </p>
              </div>
            </div>
          )}

          {/* Fallback Configuration Component */}
          <FallbackConfiguration
            mode={fallbackMode}
            state={fallbackState}
            variableName={variableName}
            disabled={isViewMode}
            onStateChange={setFallbackState}
            showHeader={true}
            headerDescription={modeConfig.headerDescription}
            contextualHelp={modeConfig.contextualHelp}
            successMessage={modeConfig.successMessage}
          />
        </div>

        <DialogFooter className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} className="px-6">
            {isViewMode ? 'Close' : 'Cancel'}
          </Button>
          {!isViewMode && (
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25"
            >
              {variableType === 'linkedin' ? 'Save' : 'Apply Configuration'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
