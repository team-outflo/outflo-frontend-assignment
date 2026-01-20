import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createLinkedInFallbackFix } from '@/utils/columnFixesUtils';
import { useCampaignStore } from '@/api/store/campaignStore';
import { AlertTriangle, Check, X } from 'lucide-react';

interface LinkedInFallbackPopupProps {
  isOpen: boolean;
  onClose: () => void;
  linkedinVariableId: string; // e.g., "linkedin_company"
  variableName: string; // e.g., "Company"
}

export const LinkedInFallbackPopup: React.FC<LinkedInFallbackPopupProps> = ({
  isOpen,
  onClose,
  linkedinVariableId,
  variableName
}) => {
  const { addCsvColumnFix, getCsvColumnFix } = useCampaignStore();
  
  // Get existing configuration or set default to 'skipLeads'
  const existingFix = getCsvColumnFix(linkedinVariableId);
  const [selectedFixType, setSelectedFixType] = useState<'sendBlank' | 'insertDefaultValue' | 'skipLeads'>(
    existingFix?.fixChain.fixType || 'skipLeads'
  );
  const [defaultValue, setDefaultValue] = useState(
    existingFix?.fixChain.defaultValue || ''
  );

  const handleApply = () => {
    // LinkedIn variables use their original ID format (no csv_ prefix)
    const fixId = linkedinVariableId; // e.g., "linkedin_company"
    
    if (selectedFixType === 'insertDefaultValue' && !defaultValue.trim()) {
      alert('Please enter a default value');
      return;
    }

    const fallbackFix = createLinkedInFallbackFix(
      fixId,
      selectedFixType,
      selectedFixType === 'insertDefaultValue' ? defaultValue.trim() : undefined
    );

    addCsvColumnFix(fallbackFix);
    onClose();
  };

  const handleCancel = () => {
    // Reset to existing values or defaults
    const existingFix = getCsvColumnFix(linkedinVariableId);
    setSelectedFixType(existingFix?.fixChain.fixType || 'skipLeads');
    setDefaultValue(existingFix?.fixChain.defaultValue || '');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Configure "{variableName}" Field
            </DialogTitle>
          </div>
          
          {/* Status indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            existingFix 
              ? 'bg-blue-50 border border-blue-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {existingFix ? (
              <>
                <Check className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">Currently Configured</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700 font-medium">Needs Configuration</span>
              </>
            )}
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Choose what happens when LinkedIn data for "{variableName}" is not available:
          </div>

          <div className="space-y-3">
            {/* Send Blank */}
            <div 
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedFixType === 'sendBlank'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedFixType('sendBlank')}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedFixType === 'sendBlank'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedFixType === 'sendBlank' && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Send Blank</div>
                  <div className="text-sm text-gray-600">Leave field empty in messages</div>
                </div>
              </div>
            </div>

            {/* Insert Default Value */}
            <div 
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedFixType === 'insertDefaultValue'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedFixType('insertDefaultValue')}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedFixType === 'insertDefaultValue'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedFixType === 'insertDefaultValue' && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Insert Default Value</div>
                  <div className="text-sm text-gray-600">Use a fallback value</div>
                </div>
              </div>
              
              {selectedFixType === 'insertDefaultValue' && (
                <div className="mt-3 ml-8">
                  <Input
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    placeholder={`Enter default value for ${variableName.toLowerCase()}...`}
                    className="w-full"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && defaultValue.trim()) {
                        handleApply();
                      }
                    }}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Skip Leads */}
            <div 
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedFixType === 'skipLeads'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedFixType('skipLeads')}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedFixType === 'skipLeads'
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300'
                }`}>
                  {selectedFixType === 'skipLeads' && (
                    <X className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Skip Leads</div>
                  <div className="text-sm text-gray-600">Exclude from campaign entirely</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleApply}
            disabled={selectedFixType === 'insertDefaultValue' && !defaultValue.trim()}
            className="flex-1"
          >
            {existingFix ? 'Update' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
