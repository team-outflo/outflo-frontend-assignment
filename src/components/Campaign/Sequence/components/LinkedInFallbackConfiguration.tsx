import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag, Info } from 'lucide-react';
import { TooltipInfo } from '@/components/utils/TooltipInfo';

interface LinkedInFallbackConfigurationProps {
  variableName: string;
  defaultValue: string;
  onDefaultValueChange: (value: string) => void;
  ignoreAndSendBlank: boolean;
  onIgnoreAndSendBlankChange: (value: boolean) => void;
  onSave: () => void;
  disabled?: boolean;
}

export const LinkedInFallbackConfiguration: React.FC<LinkedInFallbackConfigurationProps> = ({
  variableName,
  defaultValue,
  onDefaultValueChange,
  ignoreAndSendBlank,
  onIgnoreAndSendBlankChange,
  onSave,
  disabled = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && defaultValue.trim()) {
      onSave();
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Configuration Card */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
  
        
        {/* Default Value Input */}
        <div className="space-y-2">
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              value={defaultValue}
              onChange={(e) => {
                if (disabled) return;
                onDefaultValueChange(e.target.value);
              }}
              placeholder="Enter fallback value"
              disabled={disabled || ignoreAndSendBlank}
              className={`pl-10 rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 ${
                disabled || ignoreAndSendBlank ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
              }`}
              onKeyDown={handleKeyDown}
            />
          </div>
          
        </div>
        <div className="flex items-start bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
          <svg className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0zm-9-4h.01" />
          </svg>
          <div className="text-sm text-amber-800">
            <span className="font-medium">Default behavior:</span>
            <span className="ml-1">
              If you do not provide a fallback value, leads with missing data for this variable will be <span className="font-semibold">skipped</span> from the campaign.
            </span>
          </div>
        </div>


        {/* Ignore and Send Blank Option */}
        <div className="flex items-center space-x-3 mt-4">
          <input
            type="checkbox"
            id="ignore-and-send-blank"
            checked={ignoreAndSendBlank}
            onChange={(e) => {
              if (disabled) return;
              onIgnoreAndSendBlankChange(e.target.checked);
              // Clear default value when "Ignore and send blank" is selected
              if (e.target.checked) {
                onDefaultValueChange('');
              }
            }}
            disabled={disabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <label htmlFor="ignore-and-send-blank" className="text-sm font-semibold text-gray-900 cursor-pointer">
                Ignore and send blank
              </label>
              <TooltipInfo
                trigger={<Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />}
                content="Sends empty value if no data found. Lead won't be skipped."
                side="top"
                align="center"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
