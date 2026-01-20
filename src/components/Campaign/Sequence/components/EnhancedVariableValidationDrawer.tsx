import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, User, ChevronDown, ChevronUp, Info, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TooltipInfo } from '@/components/utils/TooltipInfo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ValidatedVariable } from '../types';
import { CsvColumnFix } from '@/types/campaigns';
import { useCampaignStore } from '@/api/store/campaignStore';
import { convertToColumnFix, LINKEDIN_FIELDS, LinkedInField, ColumnFixInput, createLinkedInFallbackFix } from '@/utils/columnFixesUtils';
import { TooltipProvider } from '@radix-ui/react-tooltip';

interface EnhancedVariableValidationDrawerProps {
  variable: ValidatedVariable | null;
  isOpen: boolean;
  onClose: () => void;
  csvData?: any[];
  onVariableInserted?: (variableId: string) => void;
  shouldInsertOnApply?: boolean; // Whether to insert variable after applying fix
}

export const EnhancedVariableValidationDrawer: React.FC<EnhancedVariableValidationDrawerProps> = ({
  variable,
  isOpen,
  onClose,
  csvData = [],
  onVariableInserted,
  shouldInsertOnApply = false
}) => {
  const [fixApplied, setFixApplied] = useState(false);
  const [showDefaultValueModal, setShowDefaultValueModal] = useState(false);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);

  const [defaultValue, setDefaultValue] = useState('');
  const [linkedInField, setLinkedInField] = useState<LinkedInField>('firstName');
  const [fallbackFixType, setFallbackFixType] = useState<'sendBlank' | 'skipLeads' | 'insertDefaultValue'>('sendBlank');
  const [fallbackDefaultValue, setFallbackDefaultValue] = useState('');
  const [expandedFix, setExpandedFix] = useState<string | null>(null);
  const [selectedFixType, setSelectedFixType] = useState<string>('Skip Leads'); // Default to Skip Leads
  const { addCsvColumnFix, getCsvColumnFix } = useCampaignStore();

  // Check for existing configuration (must be before early return to avoid hook order issues)
  const columnName = variable ? (variable.id.startsWith('linkedin_') ? variable.id : `csv_${variable.name}`) : '';
  const existingFix = variable ? getCsvColumnFix(columnName) : null;
  
  // Set selected fix type based on existing configuration or default to Skip Leads
  useEffect(() => {
    if (!variable) return;
    
    if (existingFix) {
      const fixTypeMap = {
        'sendBlank': 'Send Blank',
        'skipLeads': 'Skip Leads', 
        'insertDefaultValue': 'Insert Default Value',
        'fetchFromLinkedIn': 'Fetch from LinkedIn'
      };
      setSelectedFixType(fixTypeMap[existingFix.fixChain.fixType] || 'Skip Leads');
      
      // Set default value if it exists
      if (existingFix.fixChain.defaultValue) {
        setDefaultValue(existingFix.fixChain.defaultValue);
      }
    } else {
      setSelectedFixType('Skip Leads'); // Default for new configurations
    }
  }, [variable?.id, existingFix]);

  if (!variable || !isOpen) return null;

  const missingRows = variable.missingRows;
  const totalRows = variable.totalRows;
  const missingPercentage = ((missingRows.length / totalRows) * 100).toFixed(1);
  
  // Check if this is a LinkedIn variable
  const isLinkedInVariable = variable.id.startsWith('linkedin_');

  const applyFixToCsvConfig = (input: ColumnFixInput) => {
    if (!variable) {
      return;
    }

    try {
      const columnFix = convertToColumnFix(input);
      addCsvColumnFix(columnFix);

      // Insert variable into text editor if callback is provided and shouldInsertOnApply is true
      if (onVariableInserted && shouldInsertOnApply) {
        const variableId = `csv_${variable.name}`;
        onVariableInserted(variableId);
      }

    } catch (error) {
      // Handle error silently or show user notification
    }
  };

  const handleApplyFix = (fixType: string) => {
    if (!variable) return;

    if (isLinkedInVariable) {
      // Handle LinkedIn variable fallback fixes using standard columnFixes
      const linkedinVariableId = variable.id; // e.g., "linkedin_company" (no csv_ prefix)
      
      switch (fixType) {
        case 'Send Blank':
          const blankFix = createLinkedInFallbackFix(linkedinVariableId, 'sendBlank');
          addCsvColumnFix(blankFix);
          setFixApplied(true);
          setTimeout(() => onClose(), 500);
          break;

        case 'Skip Leads':
          const skipFix = createLinkedInFallbackFix(linkedinVariableId, 'skipLeads');
          addCsvColumnFix(skipFix);
          setFixApplied(true);
          setTimeout(() => onClose(), 500);
          break;

        case 'Insert Default Value':
          setShowDefaultValueModal(true);
          break;
      }
    } else {
      // Handle regular CSV column fixes
      const columnName = `csv_${variable.name}`;

      switch (fixType) {
        case 'Send Blank':
          applyFixToCsvConfig({
            columnName,
            fixType: 'sendBlank'
          });
          setFixApplied(true);
          setTimeout(() => onClose(), 500);
          break;

        case 'Skip Leads':
          applyFixToCsvConfig({
            columnName,
            fixType: 'skipLeads'
          });
          setFixApplied(true);
          setTimeout(() => onClose(), 500);
          break;

        case 'Insert Default Value':
          setShowDefaultValueModal(true);
          break;

        case 'Fetch from LinkedIn':
          setShowLinkedInModal(true);
          break;
      }
    }
  };

  const handleDefaultValueSubmit = () => {
    if (!defaultValue.trim() || !variable) return;
    
    if (isLinkedInVariable) {
      // Handle LinkedIn variable default value using standard columnFixes
      const linkedinVariableId = variable.id; // e.g., "linkedin_company" (no csv_ prefix)
      const defaultFix = createLinkedInFallbackFix(linkedinVariableId, 'insertDefaultValue', defaultValue.trim());
      addCsvColumnFix(defaultFix);
    } else {
      // Handle regular CSV column default value
      const columnName = `csv_${variable.name}`;
      applyFixToCsvConfig({
        columnName,
        fixType: 'insertDefaultValue',
        defaultValue: defaultValue.trim()
      });
    }
    
    setFixApplied(true);
    setShowDefaultValueModal(false);
    setDefaultValue('');
    setTimeout(() => onClose(), 500);
  };

  const handleLinkedInSubmit = () => {
    if (!variable) return;

    // Use the variable ID format (csv_columnName) instead of raw column name
    const columnName = `csv_${variable.name}`;

    const input: ColumnFixInput = {
      columnName,
      fixType: 'fetchFromLinkedIn',
      linkedInField,
      fallbackFixType: fallbackFixType !== 'sendBlank' ? fallbackFixType : undefined,
      fallbackDefaultValue: fallbackFixType === 'insertDefaultValue' ? fallbackDefaultValue : undefined
    };

    applyFixToCsvConfig(input);
    setFixApplied(true);
    setShowLinkedInModal(false);
    setLinkedInField('firstName');
    setFallbackFixType('sendBlank');
    setFallbackDefaultValue('');
    setTimeout(() => onClose(), 500);
  };

  const handleDefaultValueCancel = () => {
    setShowDefaultValueModal(false);
    setDefaultValue('');
  };

  const handleLinkedInCancel = () => {
    setShowLinkedInModal(false);
    setLinkedInField('firstName');
    setFallbackFixType('sendBlank');
    setFallbackDefaultValue('');
  };

  const handleClose = () => {
    if (fixApplied) {
      onClose();
    }
  };

  const toggleExpanded = (fixType: string) => {
    setExpandedFix(expandedFix === fixType ? null : fixType);
  };

  const getLinkedInFieldLabel = (field: LinkedInField): string => {
    const labels: Record<LinkedInField, string> = {
      firstName: 'First Name',
      lastName: 'Last Name',
      company: 'Current Company',
      title: 'Current Job Title',
      headline: 'Headline',
      location: 'Location',
    };
    return labels[field];
  };

  const getFallbackFixTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      sendBlank: 'Send Blank',
      skipLeads: 'Skip Leads',
      insertDefaultValue: 'Insert Default Value'
    };
    return labels[type] || type;
  };

  const getLinkedInFieldOptions = () => {
    return LINKEDIN_FIELDS.map(field => ({
      value: field,
      label: getLinkedInFieldLabel(field)
    }));
  };

  return (
    <TooltipProvider>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader className="pb-4 flex-shrink-0">
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-left">
                Configure "{variable.name}" Field
              </SheetTitle>
                
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4  flex-1 pb-4">

          {/* Always Show Summary - Even When Configured */}
          <div className={`rounded-lg p-4 border ${
            missingRows.length > 0 
              ? 'bg-red-50 border-red-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  missingRows.length > 0 
                    ? 'bg-red-100' 
                    : 'bg-blue-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    missingRows.length > 0 
                      ? 'text-red-600' 
                      : 'text-blue-600'
                  }`} />
                </div>
                <div>
                  <div className={`font-semibold ${
                    missingRows.length > 0 
                      ? 'text-red-700' 
                      : 'text-blue-700'
                  }`}>
                    {missingRows.length > 0 
                      ? `${missingRows.length} Missing Values` 
                      : 'Field Configured'
                    }
                  </div>
                  <div className={`text-sm ${
                    missingRows.length > 0 
                      ? 'text-red-600' 
                      : 'text-blue-600'
                  }`}>
                    {totalRows} total rows
                    {missingRows.length === 0 && existingFix && (
                      <span className="ml-2">• Strategy: {
                        existingFix.fixChain.fixType === 'sendBlank' ? 'Send Blank' :
                        existingFix.fixChain.fixType === 'skipLeads' ? 'Skip Leads' :
                        existingFix.fixChain.fixType === 'insertDefaultValue' ? 'Insert Default' :
                        existingFix.fixChain.fixType === 'fetchFromLinkedIn' ? 'Fetch from LinkedIn' :
                        'Configured'
                      }</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Always Show Affected Rows - Even When Configured */}
          {(missingRows.length > 0 || existingFix) && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-3">
                {missingRows.length > 0 ? 'Affected Rows:' : 'Previously Affected Rows:'}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {missingRows.length > 0 ? (
                  // Show current missing rows
                  <>
                    {missingRows.slice(0, 8).map(rowIndex => {
                      const rowData = csvData[rowIndex] || {};
                      const linkedinUrl = rowData.linkedin_url || rowData.linkedinUrl || rowData.linkedin || rowData.profile_url;
                      
                      return (
                        <div key={rowIndex} className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 text-xs font-medium rounded">
                              {rowIndex + 1}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">
                                Row {rowIndex + 1}
                              </span>
                              {linkedinUrl && (
                                <a 
                                  href={linkedinUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 truncate max-w-[200px]"
                                  title={linkedinUrl}
                                >
                                  {linkedinUrl}
                                </a>
                              )}
                              {!linkedinUrl && (
                                <span className="text-xs text-gray-500">No LinkedIn URL</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {missingRows.length > 8 && (
                      <div className="text-center py-2">
                        <span className="text-xs text-gray-500">
                          +{missingRows.length - 8} more rows
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  // Show message when configured
                  <div className="text-center py-4">
                    <div className="text-sm text-gray-600">
                      This field has been configured and will handle missing values according to your selected strategy.
                    </div>
                    {existingFix && (
                      <div className="text-xs text-gray-500 mt-1">
                        You can update the configuration using the options below.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Configuration Options */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h4 className="font-medium text-lg text-gray-900 mb-6">
              {existingFix ? 'Update Configuration' : 'Choose Fix Strategy'}
            </h4>
            <div className="space-y-4">
              {isLinkedInVariable ? (
                // LinkedIn variable specific fixes
                <>
                  {/* Send Blank */}
                  <TooltipInfo
                    trigger={
                      <div className={`flex items-center justify-between p-4 border rounded-lg transition-all cursor-pointer ${
                        selectedFixType === 'Send Blank' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedFixType('Send Blank')}>
                        <div className="flex items-center justify-between flex-1">
                          <span className="font-medium text-gray-900">Send Blank</span>
                          <Info className="w-4 h-4 text-gray-400 ml-2" />
                        </div>
                        <Button 
                          size="sm" 
                          className="ml-4 w-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyFix('Send Blank');
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    }
                    content="Leave field empty when data is not available"
                    side="top"
                    align="center"
                  />
                  
                  {/* Insert Default Value */}
                  <div className={`border rounded-lg transition-all cursor-pointer ${
                    selectedFixType === 'Insert Default Value' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}>
                    <TooltipInfo
                      trigger={
                        <div className="flex items-center justify-between p-4"
                             onClick={() => setSelectedFixType('Insert Default Value')}>
                          <div className="flex items-center justify-between flex-1">
                            <span className="font-medium text-gray-900">Insert Default Value</span>
                            <Info className="w-4 h-4 text-gray-400 ml-2" />
                          </div>
                          <Button 
                            size="sm" 
                            className="ml-4 w-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyFix('Insert Default Value');
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      }
                      content="Set a default value for missing fields"
                      side="top"
                      align="center"
                    />
                    {existingFix?.fixChain.fixType === 'insertDefaultValue' && existingFix.fixChain.defaultValue && (
                      <div className="px-4 pb-3">
                        <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded font-mono">
                          Current: "{existingFix.fixChain.defaultValue}"
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Skip Leads */}
                  <TooltipInfo
                    trigger={
                      <div className={`flex items-center justify-between p-4 border rounded-lg transition-all cursor-pointer ${
                        selectedFixType === 'Skip Leads' 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 bg-white hover:border-red-300'
                      }`}
                      onClick={() => setSelectedFixType('Skip Leads')}>
                        <div className="flex items-center justify-between flex-1">
                          <span className="font-medium text-gray-900">Skip Leads</span>
                          <Info className="w-4 h-4 text-gray-400 ml-2" />
                        </div>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="ml-4 w-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyFix('Skip Leads');
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    }
                    content="Exclude leads with missing data from campaign"
                    side="top"
                    align="center"
                  />
                </>
              ) : (
                // Regular CSV column fixes
                <>
                  {/* Send Blank */}
                  <TooltipInfo
                    trigger={
                      <div className={`flex items-center justify-between p-4 border rounded-lg transition-all cursor-pointer ${
                        selectedFixType === 'Send Blank' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedFixType('Send Blank')}>
                        <div className="flex items-center justify-between flex-1">
                          <span className="font-medium text-gray-900">Send Blank</span>
                          <Info className="w-4 h-4 text-gray-400 ml-2" />
                        </div>
                        <Button 
                          size="sm" 
                          className="ml-4 w-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyFix('Send Blank');
                          }}
                        >
                          {existingFix?.fixChain.fixType === 'sendBlank' ? 'Update' : 'Apply'}
                        </Button>
                      </div>
                    }
                    content="Leave missing values empty in messages"
                    side="top"
                    align="center"
                  />
                  
                  {/* Fetch from LinkedIn */}
                  <TooltipInfo
                    trigger={
                      <div className={`flex items-center justify-between p-4 border rounded-lg transition-all cursor-pointer ${
                        selectedFixType === 'Fetch from LinkedIn' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedFixType('Fetch from LinkedIn')}>
                        <div className="flex items-center justify-between flex-1">
                          <span className="font-medium text-gray-900">Fetch from LinkedIn</span>
                          <Info className="w-4 h-4 text-gray-400 ml-2" />
                        </div>
                        <Button 
                          size="sm" 
                          className="ml-4 w-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyFix('Fetch from LinkedIn');
                          }}
                        >
                          {existingFix?.fixChain.fixType === 'fetchFromLinkedIn' ? 'Update' : 'Config'}
                        </Button>
                      </div>
                    }
                    content="Get missing values from LinkedIn profiles"
                    side="top"
                    align="center"
                  />
                  
                  {/* Insert Default Value */}
                  <div className={`border rounded-lg transition-all cursor-pointer ${
                    selectedFixType === 'Insert Default Value' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}>
                    <TooltipInfo
                      trigger={
                        <div className="flex items-center justify-between p-4"
                             onClick={() => setSelectedFixType('Insert Default Value')}>
                          <div className="flex items-center justify-between flex-1">
                            <span className="font-medium text-gray-900">Insert Default Value</span>
                            <Info className="w-4 h-4 text-gray-400 ml-2" />
                          </div>
                          <Button 
                            size="sm" 
                            className="ml-4 w-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyFix('Insert Default Value');
                            }}
                          >
                            {existingFix?.fixChain.fixType === 'insertDefaultValue' ? 'Update' : 'Apply'}
                          </Button>
                        </div>
                      }
                      content="Set a default value for all missing fields"
                      side="top"
                      align="center"
                    />
                    {existingFix?.fixChain.fixType === 'insertDefaultValue' && existingFix.fixChain.defaultValue && (
                      <div className="px-4 pb-3">
                        <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded font-mono">
                          Current: "{existingFix.fixChain.defaultValue}"
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Skip Leads */}
                  <TooltipInfo
                    trigger={
                      <div className={`flex items-center justify-between p-4 border rounded-lg transition-all cursor-pointer ${
                        selectedFixType === 'Skip Leads' 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 bg-white hover:border-red-300'
                      }`}
                      onClick={() => setSelectedFixType('Skip Leads')}>
                        <div className="flex items-center justify-between flex-1">
                          <span className="font-medium text-gray-900">Skip Leads</span>
                          <Info className="w-4 h-4 text-gray-400 ml-2" />
                        </div>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="ml-4 w-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyFix('Skip Leads');
                          }}
                        >
                          {existingFix?.fixChain.fixType === 'skipLeads' ? 'Update' : 'Apply'}
                        </Button>
                      </div>
                    }
                    content="Exclude leads with missing values from campaign"
                    side="top"
                    align="center"
                  />
                </>
              )}
            </div>
          </div>
        </div>

      </SheetContent>

      {/* Default Value Modal */}
      <Dialog open={showDefaultValueModal} onOpenChange={setShowDefaultValueModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Default Value</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="defaultValue">
                Default value for "{variable.name}"
              </Label>
               <Input
                 id="defaultValue"
                 placeholder={`Enter default value for ${variable.name}`}
                 value={defaultValue}
                 onChange={(e) => setDefaultValue(e.target.value)}
                 onKeyDown={(e) => {
                   const target = e.target as HTMLInputElement;
                   if (e.key === 'Enter' && target.value.trim()) {
                     e.preventDefault();
                     handleDefaultValueSubmit();
                   }
                   if (e.key === 'Escape') {
                     e.preventDefault();
                     handleDefaultValueCancel();
                   }
                 }}
                 onFocus={(e) => {
                   // Set cursor to end of input when focused
                   const input = e.target;
                   const len = input.value.length;
                   setTimeout(() => {
                     input.setSelectionRange(len, len);
                   }, 0);
                 }}
                 onBlur={(e) => {
                   // Trim whitespace on blur
                   const trimmed = e.target.value.trim();
                   if (trimmed !== e.target.value) {
                     setDefaultValue(trimmed);
                   }
                 }}
                 autoFocus
                 autoComplete="off"
                 spellCheck={false}
                 className="w-full"
               />
            </div>
            
            <div className="text-sm text-gray-600">
              This value will be used for all {missingRows.length} missing entries in the "{variable.name}" column.
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleDefaultValueCancel}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDefaultValueSubmit}
              disabled={!defaultValue.trim()}
            >
              Apply Default Value
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LinkedIn Field Selection Modal */}
      <Dialog open={showLinkedInModal} onOpenChange={setShowLinkedInModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Fetch from LinkedIn - {variable.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4 overflow-y-auto flex-1 min-h-0">
            {/* LinkedIn Field Selection */}
            <div className="space-y-3">
              <Label htmlFor="linkedInField" className="text-base font-medium">
                Select LinkedIn field to fetch for "{variable.name}"
              </Label>
              <Select value={linkedInField} onValueChange={(value: LinkedInField) => setLinkedInField(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a LinkedIn field..." />
                </SelectTrigger>
                <SelectContent>
                  {getLinkedInFieldOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600">
                This field will be fetched from LinkedIn profiles to fill missing values.
              </p>
            </div>

            {/* Fallback Configuration */}
            <div className="space-y-4">
              <Label className="text-base font-medium">What should happen if LinkedIn data is not available?</Label>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    id="fallback-sendBlank"
                    name="fallback"
                    value="sendBlank"
                    checked={fallbackFixType === 'sendBlank'}
                    onChange={(e) => setFallbackFixType(e.target.value as any)}
                    className="mt-1 text-blue-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="fallback-sendBlank" className="text-sm font-medium cursor-pointer">
                      Send Blank
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Leave the field empty in messages
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    id="fallback-skipLeads"
                    name="fallback"
                    value="skipLeads"
                    checked={fallbackFixType === 'skipLeads'}
                    onChange={(e) => setFallbackFixType(e.target.value as any)}
                    className="mt-1 text-blue-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="fallback-skipLeads" className="text-sm font-medium cursor-pointer">
                      Skip Leads
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Exclude leads with missing LinkedIn data from the campaign
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    id="fallback-insertDefaultValue"
                    name="fallback"
                    value="insertDefaultValue"
                    checked={fallbackFixType === 'insertDefaultValue'}
                    onChange={(e) => setFallbackFixType(e.target.value as any)}
                    className="mt-1 text-blue-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="fallback-insertDefaultValue" className="text-sm font-medium cursor-pointer">
                      Insert Default Value
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Use a fallback value when LinkedIn data is not available
                    </p>
                  </div>
                </div>
              </div>

              {/* Fallback Default Value Input */}
              {fallbackFixType === 'insertDefaultValue' && (
                <div className="ml-6 space-y-2 p-4 bg-blue-50 rounded-lg">
                  <Label htmlFor="fallbackDefaultValue" className="text-sm font-medium">
                    Fallback default value
                  </Label>
                   <Input
                     id="fallbackDefaultValue"
                     placeholder="Enter fallback default value"
                     value={fallbackDefaultValue}
                     onChange={(e) => setFallbackDefaultValue(e.target.value)}
                     onKeyDown={(e) => {
                       const target = e.target as HTMLInputElement;
                       if (e.key === 'Enter' && target.value.trim()) {
                         e.preventDefault();
                         handleLinkedInSubmit();
                       }
                       if (e.key === 'Escape') {
                         e.preventDefault();
                         handleLinkedInCancel();
                       }
                     }}
                     onFocus={(e) => {
                       // Set cursor to end of input when focused
                       const input = e.target;
                       const len = input.value.length;
                       setTimeout(() => {
                         input.setSelectionRange(len, len);
                       }, 0);
                     }}
                     onBlur={(e) => {
                       // Trim whitespace on blur
                       const trimmed = e.target.value.trim();
                       if (trimmed !== e.target.value) {
                         setFallbackDefaultValue(trimmed);
                       }
                     }}
                     autoComplete="off"
                     spellCheck={false}
                     className="w-full"
                   />
                  <p className="text-xs text-gray-600">
                    This value will be used for all {missingRows.length} missing entries when LinkedIn data is not available.
                  </p>
                </div>
              )}
            </div>
            
            <div className="text-sm text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <strong>How it works:</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• First, try to fetch <strong>"{getLinkedInFieldLabel(linkedInField)}"</strong> from LinkedIn profiles</li>
                    <li>• If LinkedIn data is not available: 
                      {fallbackFixType === 'sendBlank' && ' Leave the field blank'}
                      {fallbackFixType === 'skipLeads' && ' Skip those leads from the campaign'}
                      {fallbackFixType === 'insertDefaultValue' && ` Use "${fallbackDefaultValue || '[not set]'}" as fallback`}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={handleLinkedInCancel}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleLinkedInSubmit}
              disabled={fallbackFixType === 'insertDefaultValue' && !fallbackDefaultValue.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Apply LinkedIn Fetch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Sheet>
    </TooltipProvider>
  );
};
