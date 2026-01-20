import { describe, it, expect, vi, beforeEach } from 'vitest';
import { campaignStore } from '../campaign';
import { createMockCampaign, createMockCsvColumnFix } from '@/test/test-utils';

// Mock API calls
vi.mock('@/api/variables/variables', () => ({
  getSystemVariables: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/api/leads/leadsApi', () => ({
  getCampaignVariables: vi.fn().mockResolvedValue({ data: { variables: [] } }),
}));

describe('campaignStore', () => {
  beforeEach(() => {
    // Reset store before each test
    campaignStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('TC-012: Variables as Single Source of Truth', () => {
    it('initializes with empty variables array', () => {
      const state = campaignStore.getState();
      expect(state.variables).toEqual([]);
      expect(state.variablesLoading).toBe(false);
    });

    it('setVariables updates variables in store', () => {
      const mockVariables = [
        {
          id: 'linkedin_firstName',
          name: 'First Name',
          type: 'linkedin' as const,
          source: 'linkedin' as const,
          placeholder: '{linkedin_firstName}',
          exampleValue: 'John',
          isValidated: false,
          missingRows: [],
          totalRows: 0,
          validationStatus: 'valid' as const,
        },
      ];

      campaignStore.getState().setVariables(mockVariables);
      
      const state = campaignStore.getState();
      expect(state.variables).toEqual(mockVariables);
    });

    it('getVariables returns current variables', () => {
      const mockVariables = [
        {
          id: 'csv_company',
          name: 'Company',
          type: 'fetch' as const,
          source: 'sheet' as const,
          placeholder: '{csv_company}',
          exampleValue: 'Acme',
          isValidated: true,
          missingRows: [],
          totalRows: 10,
          validationStatus: 'valid' as const,
        },
      ];

      campaignStore.getState().setVariables(mockVariables);
      
      const variables = campaignStore.getState().getVariables();
      expect(variables).toEqual(mockVariables);
    });

    it('setVariablesLoading updates loading state', () => {
      campaignStore.getState().setVariablesLoading(true);
      expect(campaignStore.getState().variablesLoading).toBe(true);

      campaignStore.getState().setVariablesLoading(false);
      expect(campaignStore.getState().variablesLoading).toBe(false);
    });

    it('variables persist across store updates', () => {
      const mockVariables = [
        {
          id: 'test_var',
          name: 'Test',
          type: 'fetch' as const,
          source: 'sheet' as const,
          placeholder: '{test_var}',
          exampleValue: 'Test',
          isValidated: true,
          missingRows: [],
          totalRows: 5,
          validationStatus: 'valid' as const,
        },
      ];

      // Set variables
      campaignStore.getState().setVariables(mockVariables);

      // Update something else in the store
      campaignStore.getState().setStep(2);

      // Variables should still be there
      expect(campaignStore.getState().variables).toEqual(mockVariables);
    });
  });

  describe('Campaign Initialization', () => {
    it('initializes campaign with default step based on mode', () => {
      const mockCampaign = createMockCampaign();

      // Edit mode - should start at step 1
      campaignStore.getState().init(mockCampaign, 'edit');
      expect(campaignStore.getState().currentStep).toBe(1);

      // Reset
      campaignStore.getState().reset();

      // View mode - should start at step 2
      campaignStore.getState().init(mockCampaign, 'view');
      expect(campaignStore.getState().currentStep).toBe(2);
    });

    it('resets variables on init', () => {
      // Set some variables
      campaignStore.getState().setVariables([{
        id: 'test',
        name: 'Test',
        type: 'fetch' as const,
        source: 'sheet' as const,
        placeholder: '{test}',
        exampleValue: '',
        isValidated: true,
        missingRows: [],
        totalRows: 0,
        validationStatus: 'valid' as const,
      }]);

      // Init with new campaign
      const mockCampaign = createMockCampaign();
      campaignStore.getState().init(mockCampaign, 'edit');

      // Variables should be reset
      expect(campaignStore.getState().variables).toEqual([]);
    });
  });

  describe('CSV Column Fixes', () => {
    it('addCsvColumnFix adds new fix', () => {
      const mockCampaign = createMockCampaign();
      campaignStore.getState().init(mockCampaign, 'edit');

      const fix = createMockCsvColumnFix({
        columnName: 'csv_email',
        fixChain: { fixType: 'sendBlank' },
      });

      campaignStore.getState().addCsvColumnFix(fix);

      const state = campaignStore.getState();
      expect(state.campaign.csvConfig?.columnFixes).toContainEqual(
        expect.objectContaining({ columnName: 'csv_email' })
      );
    });

    it('getCsvColumnFix retrieves existing fix', () => {
      const mockCampaign = createMockCampaign({
        csvConfig: {
          columnFixes: [
            {
              columnName: 'csv_company',
              fixChain: { fixType: 'skipLeads' },
              appliedAt: Date.now(),
            },
          ],
          detectedColumns: ['company'],
          lastUpdated: Date.now(),
        },
      });
      campaignStore.getState().init(mockCampaign, 'edit');

      const fix = campaignStore.getState().getCsvColumnFix('company');
      expect(fix).toBeDefined();
      expect(fix?.fixChain.fixType).toBe('skipLeads');
    });

    it('getCsvColumnFix handles variable ID format', () => {
      const mockCampaign = createMockCampaign({
        csvConfig: {
          columnFixes: [
            {
              columnName: 'csv_company',
              fixChain: { fixType: 'sendBlank' },
              appliedAt: Date.now(),
            },
          ],
          detectedColumns: ['company'],
          lastUpdated: Date.now(),
        },
      });
      campaignStore.getState().init(mockCampaign, 'edit');

      // Should find fix with variable ID format
      const fix = campaignStore.getState().getCsvColumnFix('company');
      expect(fix).toBeDefined();
    });

    it('addCsvColumnFix updates existing fix', () => {
      const mockCampaign = createMockCampaign({
        csvConfig: {
          columnFixes: [
            {
              columnName: 'csv_email',
              fixChain: { fixType: 'skipLeads' },
              appliedAt: Date.now() - 1000,
            },
          ],
          detectedColumns: ['email'],
          lastUpdated: Date.now(),
        },
      });
      campaignStore.getState().init(mockCampaign, 'edit');

      // Add updated fix
      const newFix = createMockCsvColumnFix({
        columnName: 'csv_email',
        fixChain: { fixType: 'sendBlank' },
      });
      campaignStore.getState().addCsvColumnFix(newFix);

      const fix = campaignStore.getState().getCsvColumnFix('email');
      expect(fix?.fixChain.fixType).toBe('sendBlank');

      // Should only have one fix for this column
      const fixes = campaignStore.getState().campaign.csvConfig?.columnFixes || [];
      const emailFixes = fixes.filter(f => f.columnName === 'csv_email');
      expect(emailFixes.length).toBe(1);
    });
  });

  describe('Store Reset', () => {
    it('reset clears all state', () => {
      const mockCampaign = createMockCampaign({ name: 'Test Campaign' });
      campaignStore.getState().init(mockCampaign, 'edit');
      campaignStore.getState().setStep(3);
      campaignStore.getState().setVariables([{
        id: 'test',
        name: 'Test',
        type: 'fetch' as const,
        source: 'sheet' as const,
        placeholder: '{test}',
        exampleValue: '',
        isValidated: true,
        missingRows: [],
        totalRows: 0,
        validationStatus: 'valid' as const,
      }]);

      campaignStore.getState().reset();

      const state = campaignStore.getState();
      expect(state.currentStep).toBe(1);
      expect(state.campaign.name).toBeUndefined();
      expect(state.isEdited).toBe(false);
    });
  });

  describe('Edit Tracking', () => {
    it('marks as edited when campaign changes', () => {
      const mockCampaign = createMockCampaign();
      campaignStore.getState().init(mockCampaign, 'edit');

      expect(campaignStore.getState().isEdited).toBe(false);

      campaignStore.getState().setCampaignName('New Name');

      expect(campaignStore.getState().isEdited).toBe(true);
    });
  });

  describe('generateVariables', () => {
    it('sets variablesLoading to true while generating', async () => {
      const mockCampaign = createMockCampaign({ id: 'test-id' });
      campaignStore.getState().init(mockCampaign, 'edit');

      const generatePromise = campaignStore.getState().generateVariables();

      // Loading should be true during generation
      expect(campaignStore.getState().variablesLoading).toBe(true);

      await generatePromise;

      // Loading should be false after generation
      expect(campaignStore.getState().variablesLoading).toBe(false);
    });

    it('includes LinkedIn variables by default', async () => {
      const mockCampaign = createMockCampaign({ id: 'test-id' });
      campaignStore.getState().init(mockCampaign, 'edit');

      await campaignStore.getState().generateVariables();

      const variables = campaignStore.getState().variables;
      const linkedInVars = variables.filter(v => v.type === 'linkedin');
      
      expect(linkedInVars.length).toBeGreaterThan(0);
      expect(linkedInVars.some(v => v.id === 'linkedin_firstName')).toBe(true);
    });

    it('removes duplicate variables by ID', async () => {
      const mockCampaign = createMockCampaign({ id: 'test-id' });
      campaignStore.getState().init(mockCampaign, 'edit');

      await campaignStore.getState().generateVariables();

      const variables = campaignStore.getState().variables;
      const ids = variables.map(v => v.id);
      const uniqueIds = [...new Set(ids)];

      expect(ids.length).toBe(uniqueIds.length);
    });
  });
});

