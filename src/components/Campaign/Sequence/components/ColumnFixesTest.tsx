import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedVariableValidationDrawer } from './EnhancedVariableValidationDrawer';
import { ValidatedVariable } from '../types';

/**
 * Test component to demonstrate the enhanced LinkedIn field selection
 */
export const ColumnFixesTest: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<ValidatedVariable | null>(null);

  // Mock LinkedIn variable with missing values
  const mockLinkedInVariable: ValidatedVariable = {
    id: 'linkedin_company',
    name: 'Company',
    description: 'Contact\'s company (fetched from LinkedIn)',
    placeholder: '{linkedin_company}',
    exampleValue: 'Acme Inc',
    type: 'linkedin',
    source: 'linkedin',
    isValidated: true,
    missingRows: [1, 3, 5], // Rows 2, 4, 6 are missing
    totalRows: 10,
    validationStatus: 'invalid'
  };

  // Mock regular CSV variable for comparison
  const mockCsvVariable: ValidatedVariable = {
    id: 'csv_company',
    name: 'company',
    description: 'Company name from CSV',
    placeholder: '{csv_company}',
    exampleValue: 'Acme Corp',
    type: 'fetch',
    source: 'sheet',
    isValidated: true,
    missingRows: [1, 3, 5], // Rows 2, 4, 6 are missing
    totalRows: 10,
    validationStatus: 'invalid'
  };

  // Mock CSV variable with no missing data (should show as normal indigo)
  const mockValidCsvVariable: ValidatedVariable = {
    id: 'csv_email',
    name: 'email',
    description: 'Email from CSV',
    placeholder: '{csv_email}',
    exampleValue: 'john@example.com',
    type: 'fetch',
    source: 'sheet',
    isValidated: true,
    missingRows: [], // No missing rows
    totalRows: 10,
    validationStatus: 'valid'
  };

  // Mock CSV data
  const mockCsvData = [
    { id: 1, name: 'John Doe', company: 'Tech Corp', email: 'john@tech.com' },
    { id: 2, name: 'Jane Smith', company: '', email: 'jane@example.com' }, // Missing company
    { id: 3, name: 'Bob Johnson', company: 'Startup Inc', email: 'bob@startup.com' },
    { id: 4, name: 'Alice Brown', company: '', email: 'alice@test.com' }, // Missing company
    { id: 5, name: 'Charlie Wilson', company: 'Big Corp', email: 'charlie@big.com' },
    { id: 6, name: 'Diana Lee', company: '', email: 'diana@sample.com' }, // Missing company
    { id: 7, name: 'Eve Davis', company: 'Innovation Ltd', email: 'eve@innovation.com' },
    { id: 8, name: 'Frank Miller', company: 'Global Inc', email: 'frank@global.com' },
    { id: 9, name: 'Grace Taylor', company: 'Future Corp', email: 'grace@future.com' },
    { id: 10, name: 'Henry Clark', company: 'Next Gen', email: 'henry@next.com' }
  ];

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Column Fixes Test - LinkedIn Field Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Test the Enhanced Variable Validation Drawer</h3>
            <p className="text-sm text-gray-600">
              Test both LinkedIn variables and CSV variables to see different fix options:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• <strong>LinkedIn variables:</strong> Show 3 simple options (Send Blank, Insert Default, Skip Leads)</li>
              <li>• <strong>CSV variables:</strong> Show 4 options including LinkedIn field fetching</li>
              <li>• Dynamic validation and proper JSON generation</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button onClick={() => {
                setSelectedVariable(mockLinkedInVariable);
                setIsDrawerOpen(true);
              }}>
                Test LinkedIn Variable (linkedin_company)
              </Button>
              <div className="text-sm text-gray-600">
                Missing values: <Badge variant="destructive">{mockLinkedInVariable.missingRows.length}</Badge> out of {mockLinkedInVariable.totalRows}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button onClick={() => {
                setSelectedVariable(mockCsvVariable);
                setIsDrawerOpen(true);
              }}>
                Test CSV Variable (csv_company)
              </Button>
              <div className="text-sm text-gray-600">
                Missing values: <Badge variant="destructive">{mockCsvVariable.missingRows.length}</Badge> out of {mockCsvVariable.totalRows}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button onClick={() => {
                setSelectedVariable(mockValidCsvVariable);
                setIsDrawerOpen(true);
              }}>
                Test Valid CSV Variable (csv_email)
              </Button>
              <div className="text-sm text-gray-600">
                Missing values: <Badge variant="secondary">{mockValidCsvVariable.missingRows.length}</Badge> out of {mockValidCsvVariable.totalRows}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded space-y-2">
            <div><strong>Note:</strong> This is a test component. In the actual application, the drawer would be triggered 
            when clicking on a variable with missing values in the sequence editor.</div>
            
            <div className="mt-3">
              <strong>Visual Status System:</strong>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs">🔴 Red: Unconfigured (needs attention)</span>
                <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">🔵 Blue: Configured (ready to go)</span>
                <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs">🟣 Indigo: No issues (normal)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Variable Validation Drawer */}
      <EnhancedVariableValidationDrawer
        variable={selectedVariable}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedVariable(null);
        }}
        csvData={mockCsvData}
        onVariableInserted={(variableId) => {
          console.log('Variable inserted:', variableId);
        }}
        shouldInsertOnApply={false} // Test component - don't insert
      />
    </div>
  );
};
