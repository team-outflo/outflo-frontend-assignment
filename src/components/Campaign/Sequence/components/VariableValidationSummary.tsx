import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ValidatedVariable } from '../types';
import { getValidationStatusStyles } from '../utils';

interface VariableValidationSummaryProps {
  variables: ValidatedVariable[];
  className?: string;
}

export const VariableValidationSummary: React.FC<VariableValidationSummaryProps> = ({
  variables,
  className = ''
}) => {
  // Only show validation for sheet variables (type 'fetch')
  const sheetVariables = variables.filter(v => v.type === 'fetch');
  const invalidVariables = sheetVariables.filter(v => v.isValidated && v.validationStatus === 'invalid');
  const validVariables = sheetVariables.filter(v => v.isValidated && v.validationStatus === 'valid');
  const pendingVariables = sheetVariables.filter(v => !v.isValidated || v.validationStatus === 'pending');

  const totalMissingValues = invalidVariables.reduce((sum, v) => sum + v.missingRows.length, 0);
  const totalRows = sheetVariables.length > 0 ? sheetVariables[0].totalRows : 0;

  if (sheetVariables.length === 0) {
    return null;
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Info className="w-4 h-4" />
          Variable Validation Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span className="text-green-700 font-medium">{validVariables.length}</span>
            <span className="text-gray-600">Valid</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            <span className="text-red-700 font-medium">{invalidVariables.length}</span>
            <span className="text-gray-600">Invalid</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-gray-700 font-medium">{pendingVariables.length}</span>
            <span className="text-gray-600">Pending</span>
          </div>
        </div>

        {/* Missing Values Alert */}
        {totalMissingValues > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  {totalMissingValues} missing values found
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Some variables have empty values in {invalidVariables.length} columns across {totalRows} rows
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Variable Details */}
        <div className="space-y-2">
          {invalidVariables.map(variable => {
            const validationStyles = getValidationStatusStyles(variable.validationStatus);
            const missingPercentage = ((variable.missingRows.length / variable.totalRows) * 100).toFixed(1);
            
            return (
              <div key={variable.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${validationStyles.bgColor.replace('50', '500')}`}></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{variable.name}</span>
                    <span className="text-xs text-red-600">
                      {variable.missingRows.length} missing ({missingPercentage}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {validVariables.map(variable => (
            <div key={variable.id} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">{variable.name}</span>
                <span className="text-xs text-green-600">All values present</span>
              </div>
            </div>
          ))}

          {pendingVariables.map(variable => (
            <div key={variable.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">{variable.name}</span>
                <span className="text-xs text-gray-600">Validation pending</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
