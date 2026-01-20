import React, { useState } from 'react';
import { X, AlertTriangle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ValidatedVariable } from '../types';
import { CsvColumnFix } from '@/types/campaigns';
import { useCampaignStore } from '@/api/store/campaignStore';

interface VariableValidationDrawerProps {
  variable: ValidatedVariable | null;
  isOpen: boolean;
  onClose: () => void;
  csvData?: any[];
  onVariableInserted?: (variableId: string) => void; // Callback to insert variable into text editor
}

export const VariableValidationDrawer: React.FC<VariableValidationDrawerProps> = ({
  variable,
  isOpen,
  onClose,
  csvData = [],
  onVariableInserted
}) => {
  const [fixApplied, setFixApplied] = useState(false);
  const [showDefaultValueModal, setShowDefaultValueModal] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const { addCsvColumnFix } = useCampaignStore();

  if (!variable || !isOpen) return null;

  const missingRows = variable.missingRows;
  const totalRows = variable.totalRows;
  const missingPercentage = ((missingRows.length / totalRows) * 100).toFixed(1);

  const applyFixToCsvConfig = (fixType: string, defaultValue?: string) => {
    if (!variable) {
      return;
    }

    const columnName = variable.name;
    let csvFixType: string;

    switch (fixType) {
      case 'Send Blank':
        csvFixType = 'sendBlank';
        break;

      case 'Insert Default Value':
        csvFixType = 'insertDefaultValue';
        break;

      case 'Skip Leads':
        csvFixType = 'skipLeads';
        break;

      case 'Fetch from LinkedIn':
        csvFixType = 'fetchFromLinkedIn';
        break;

      default:
        return;
    }

    // Save the fix to csv_config
    const columnFix: CsvColumnFix = {
      columnName,
      fixType: csvFixType,
      defaultValue: defaultValue || undefined,
      appliedAt: Date.now()
    };

    addCsvColumnFix(columnFix);

    // Insert variable into text editor if callback is provided
    if (onVariableInserted) {
      // Convert column name to proper variable ID (csv_ prefix + sanitized name)
      const variableId = `csv_${columnName}`;
      onVariableInserted(variableId);
    }
  };

  const handleApplyFix = (fixType: string) => {
    if (fixType === 'Insert Default Value') {
      setShowDefaultValueModal(true);
      return;
    }
    
    applyFixToCsvConfig(fixType);
    setFixApplied(true);
    
    // Close the drawer after applying fix
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleDefaultValueSubmit = () => {
    if (!defaultValue.trim()) {
      return; // Don't submit if empty
    }
    
    applyFixToCsvConfig('Insert Default Value', defaultValue);
    setFixApplied(true);
    setShowDefaultValueModal(false);
    setDefaultValue('');
    
    // Close the drawer after applying fix
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleDefaultValueCancel = () => {
    setShowDefaultValueModal(false);
    setDefaultValue('');
  };

  const handleClose = () => {
    if (fixApplied) {
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] flex flex-col">
        <SheetHeader className="pb-4 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-left">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Missing Values in "{variable.name}"
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pb-4">
          {/* Summary */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="destructive" className="text-xs">
                {missingRows.length} Missing Values
              </Badge>
              <span className="text-sm text-gray-600">
                out of {totalRows} total rows ({missingPercentage}%)
              </span>
            </div>
            <p className="text-sm text-red-700">
              The following rows are missing values for the "{variable.name}" column:
            </p>
          </div>

          {/* Missing Rows List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-900">Affected Rows:</h4>
            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {missingRows.map(rowIndex => {
                const rowData = csvData[rowIndex] || {};
                const otherColumns = Object.keys(rowData).filter(col => col !== variable.name);
                
                return (
                  <div key={rowIndex} className="border border-red-200 rounded-lg p-3 bg-red-50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                        {rowIndex + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-900">Row {rowIndex + 1}</span>
                      <Badge variant="outline" className="text-xs border-red-300 text-red-700">
                        Missing {variable.name}
                      </Badge>
                    </div>
                    
                    {/* Show other column values for context */}
                    {otherColumns.length > 0 && (
                      <div className="ml-8 space-y-1">
                        <p className="text-xs text-gray-600 font-medium">Available data:</p>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          {otherColumns.slice(0, 8).map(column => (
                            <div key={column} className="flex gap-1">
                              <span className="text-gray-500 font-medium">{column}:</span>
                              <span className="text-gray-700 truncate">
                                {rowData[column] || '—'}
                              </span>
                            </div>
                          ))}
                          {otherColumns.length > 8 && (
                            <div className="text-gray-500 text-xs">
                              +{otherColumns.length - 8} more columns
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggested Fixes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-sm text-blue-900 mb-3">Suggested Fixes:</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border border-blue-300 rounded-lg bg-white hover:bg-blue-50 transition-colors">
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="font-medium text-blue-700">1. Send Blank</span>
                  <span className="text-xs text-blue-600 mt-1 break-words">Leave missing values empty in messages</span>
                </div>
                <Button 
                  size="sm" 
                  className="ml-3 flex-shrink-0"
                  onClick={() => handleApplyFix('Send Blank')}
                >
                  Apply
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border border-blue-300 rounded-lg bg-white hover:bg-blue-50 transition-colors">
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="font-medium text-blue-700">2. Fetch Field From LinkedIn</span>
                  <span className="text-xs text-blue-600 mt-1 break-words">Automatically fetch missing values from LinkedIn profiles</span>
                </div>
                <Button 
                  size="sm" 
                  className="ml-3 flex-shrink-0"
                  onClick={() => handleApplyFix('Fetch from LinkedIn')}
                >
                  Apply
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border border-blue-300 rounded-lg bg-white hover:bg-blue-50 transition-colors">
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="font-medium text-blue-700">3. Insert Default Value</span>
                  <span className="text-xs text-blue-600 mt-1 break-words">Set a default value for all missing fields</span>
                </div>
                <Button 
                  size="sm" 
                  className="ml-3 flex-shrink-0"
                  onClick={() => handleApplyFix('Insert Default Value')}
                >
                  Apply
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border border-red-300 rounded-lg bg-white hover:bg-red-50 transition-colors">
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="font-medium text-red-700">4. Skip Leads With Missing Values</span>
                  <span className="text-xs text-red-600 mt-1 break-words">Exclude leads with missing values from the campaign</span>
                </div>
                <Button 
                  size="sm" 
                  variant="destructive"
                  className="ml-3 flex-shrink-0"
                  onClick={() => handleApplyFix('Skip Leads')}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 p-4 bg-white border-t">
          {!fixApplied && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 text-center">
                Please select a fix option above before closing
              </p>
            </div>
          )}
          <Button 
            onClick={handleClose} 
            variant="outline" 
            className="w-full"
            disabled={!fixApplied}
          >
            <X className="w-4 h-4 mr-2" />
            {fixApplied ? 'Close' : 'Select a fix to continue'}
          </Button>
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
                  if (e.key === 'Enter') {
                    handleDefaultValueSubmit();
                  }
                }}
                autoFocus
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
    </Sheet>
  );
};
