import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

interface AllProvidersProps {
  children: React.ReactNode;
}

const AllProviders = ({ children }: AllProvidersProps) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Mock data factories
export const createMockVariable = (overrides = {}) => ({
  id: 'test_variable',
  name: 'Test Variable',
  description: 'A test variable',
  placeholder: '{test_variable}',
  exampleValue: 'Test Value',
  type: 'fetch' as const,
  source: 'sheet' as const,
  isValidated: true,
  missingRows: [],
  totalRows: 10,
  allLeadsPresentInfo: '',
  inputBoxHoverInfo: 'Test hover info',
  validationStatus: 'valid' as const,
  ...overrides,
});

export const createMockLinkedInVariable = (overrides = {}) => ({
  id: 'linkedin_firstName',
  name: 'First Name',
  description: 'LinkedIn first name',
  placeholder: '{linkedin_firstName}',
  exampleValue: 'John',
  type: 'linkedin' as const,
  source: 'linkedin' as const,
  isValidated: false,
  missingRows: [],
  totalRows: 0,
  validationStatus: 'valid' as const,
  ...overrides,
});

export const createMockCsvVariable = (overrides = {}) => ({
  id: 'csv_company',
  name: 'Company',
  description: 'Company from CSV',
  placeholder: '{csv_company}',
  exampleValue: 'Acme Inc',
  type: 'fetch' as const,
  source: 'sheet' as const,
  isValidated: true,
  missingRows: [1, 3, 5],
  totalRows: 10,
  allLeadsPresentInfo: '',
  inputBoxHoverInfo: 'Company data from CSV',
  validationStatus: 'pending' as const,
  ...overrides,
});

export const createMockCampaign = (overrides = {}) => ({
  id: 'test-campaign-id',
  name: 'Test Campaign',
  state: 'DRAFT',
  status: 'DRAFT',
  leads: {
    data: [],
    columnMapping: [],
  },
  sequence: {
    steps: [],
    excludeConnected: false,
  },
  senderAccounts: [],
  csvConfig: {
    columnFixes: [],
    detectedColumns: [],
    lastUpdated: Date.now(),
  },
  ...overrides,
});

export const createMockFallbackState = (overrides = {}) => ({
  mode: 'skipLead' as const,
  defaultValue: '',
  linkedInField: undefined,
  fallbackMode: undefined,
  fallbackDefaultValue: '',
  ...overrides,
});

export const createMockCsvColumnFix = (overrides = {}) => ({
  columnName: 'csv_test',
  fixChain: {
    fixType: 'skipLeads' as const,
  },
  appliedAt: Date.now(),
  ...overrides,
});

