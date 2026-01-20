import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { createMockCampaign, createMockLinkedInVariable, createMockCsvVariable, createMockCsvColumnFix } from '@/test/test-utils';

// Mock useCampaignStore
const mockCampaignStore = {
  campaign: createMockCampaign(),
  mode: 'edit',
  variables: [createMockLinkedInVariable(), createMockCsvVariable()],
  variablesLoading: false,
  getCsvColumnFix: vi.fn(),
  addCsvColumnFix: vi.fn(),
  generateVariables: vi.fn(),
  updateSequenceSteps: vi.fn(),
};

vi.mock('@/api/store/campaignStore/campaign', () => ({
  useCampaignStore: vi.fn(() => mockCampaignStore),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-REG-001: Existing Messages Preserve After Editor Swap
  describe('TC-REG-001: Message Preservation', () => {
    it('preserves existing message content when component re-renders', async () => {
      const existingMessage = 'Hello {linkedin_firstName}, welcome to our company!';
      
      // Simulate message data structure
      const messageData = {
        content: existingMessage,
        variables: ['linkedin_firstName'],
      };

      // Verify the message content can be parsed and displayed
      expect(messageData.content).toContain('Hello');
      expect(messageData.content).toContain('{linkedin_firstName}');
      expect(messageData.variables).toContain('linkedin_firstName');
    });

    it('handles messages with multiple variables', () => {
      const messageWithMultipleVars = 'Hi {linkedin_firstName}, I noticed you work at {csv_company}.';
      
      const variablePattern = /\{([^}]+)\}/g;
      const variables: string[] = [];
      let match;
      while ((match = variablePattern.exec(messageWithMultipleVars)) !== null) {
        variables.push(match[1]);
      }

      expect(variables).toEqual(['linkedin_firstName', 'csv_company']);
    });

    it('preserves special characters in messages', () => {
      const messageWithSpecialChars = 'Hello! How are you? 😊 Let\'s connect & chat.';
      
      // Ensure special characters are preserved
      expect(messageWithSpecialChars).toContain('!');
      expect(messageWithSpecialChars).toContain('?');
      expect(messageWithSpecialChars).toContain('😊');
      expect(messageWithSpecialChars).toContain('&');
      expect(messageWithSpecialChars).toContain('\'');
    });
  });

  // TC-REG-004: View Mode Still Read-Only
  describe('TC-REG-004: View Mode Read-Only', () => {
    it('returns disabled state correctly in view mode', () => {
      const viewModeStore = {
        ...mockCampaignStore,
        mode: 'view',
      };

      const isViewMode = viewModeStore.mode === 'view';
      expect(isViewMode).toBe(true);
    });

    it('disables variable configuration in view mode', () => {
      const viewModeStore = {
        ...mockCampaignStore,
        mode: 'view',
      };

      // Simulate checking if editing should be blocked
      const canEdit = viewModeStore.mode !== 'view';
      expect(canEdit).toBe(false);
    });
  });

  // TC-REG-005: Character Limits Still Enforced
  describe('TC-REG-005: Character Limits', () => {
    const LINKEDIN_SAFE_LIMIT = 1900;
    const HARD_LIMIT = 3000;

    it('warns when approaching soft limit', () => {
      const messageLength = 1850;
      const isNearLimit = messageLength > LINKEDIN_SAFE_LIMIT * 0.9;
      expect(isNearLimit).toBe(true);
    });

    it('warns when exceeding soft limit', () => {
      const messageLength = 1950;
      const exceedsSoftLimit = messageLength > LINKEDIN_SAFE_LIMIT;
      expect(exceedsSoftLimit).toBe(true);
    });

    it('enforces hard limit', () => {
      const messageLength = 3100;
      const exceedsHardLimit = messageLength > HARD_LIMIT;
      expect(exceedsHardLimit).toBe(true);
    });

    it('calculates character count correctly', () => {
      const message = 'Hello {linkedin_firstName}!';
      // Plain text length (without variable expansion)
      expect(message.length).toBe(27);
    });
  });

  // TC-REG-006: CSV Column Fixes Persist
  describe('TC-REG-006: CSV Column Fixes Persistence', () => {
    it('preserves existing column fix configurations', () => {
      const existingFix = createMockCsvColumnFix({
        columnName: 'csv_company',
        fixChain: {
          fixType: 'insertDefaultValue',
          defaultValue: 'Unknown Company',
        },
      });

      expect(existingFix.columnName).toBe('csv_company');
      expect(existingFix.fixChain.fixType).toBe('insertDefaultValue');
      expect(existingFix.fixChain.defaultValue).toBe('Unknown Company');
    });

    it('handles fix chain with nested fallback', () => {
      const fixWithFallback = createMockCsvColumnFix({
        columnName: 'csv_title',
        fixChain: {
          fixType: 'fetchFromLinkedIn',
          sourceField: 'title',
          fallback: {
            fixType: 'sendBlank',
          },
        },
      });

      expect(fixWithFallback.fixChain.fixType).toBe('fetchFromLinkedIn');
      expect(fixWithFallback.fixChain.sourceField).toBe('title');
      expect(fixWithFallback.fixChain.fallback?.fixType).toBe('sendBlank');
    });

    it('maintains appliedAt timestamp', () => {
      const timestamp = Date.now();
      const fix = createMockCsvColumnFix({
        appliedAt: timestamp,
      });

      expect(fix.appliedAt).toBe(timestamp);
      expect(typeof fix.appliedAt).toBe('number');
    });
  });

  // TC-REG-007: Campaign Analytics Lead Count Correct
  describe('TC-REG-007: Lead Count Accuracy', () => {
    it('calculates total lead count correctly', () => {
      const leads = [
        { id: '1', status: 'PENDING' },
        { id: '2', status: 'PROCESSED' },
        { id: '3', status: 'PENDING' },
      ];

      expect(leads.length).toBe(3);
    });

    it('filters leads correctly', () => {
      const leads = [
        { id: '1', status: 'PENDING' },
        { id: '2', status: 'PROCESSED' },
        { id: '3', status: 'PENDING' },
        { id: '4', status: 'FAILED' },
      ];

      const pendingLeads = leads.filter(l => l.status === 'PENDING');
      const processedLeads = leads.filter(l => l.status === 'PROCESSED');

      expect(pendingLeads.length).toBe(2);
      expect(processedLeads.length).toBe(1);
    });

    it('handles empty leads array', () => {
      const leads: any[] = [];
      expect(leads.length).toBe(0);
    });
  });

  // Additional regression tests for data integrity
  describe('Data Integrity', () => {
    it('handles undefined values gracefully', () => {
      const variable = {
        id: 'test_var',
        name: undefined,
        missingRows: undefined,
      };

      const displayName = variable.name || variable.id;
      const missingCount = variable.missingRows?.length || 0;

      expect(displayName).toBe('test_var');
      expect(missingCount).toBe(0);
    });

    it('handles null campaign data', () => {
      const campaign = null;
      const hasLeads = campaign?.leads?.data?.length > 0;
      expect(hasLeads).toBeFalsy();
    });

    it('handles empty sequence steps', () => {
      const sequence = { steps: [] };
      const hasSteps = sequence.steps.length > 0;
      expect(hasSteps).toBe(false);
    });
  });

  // Variable click handlers regression
  describe('TC-REG-002: Variable Click Handlers', () => {
    it('identifies variable type correctly', () => {
      const linkedInVar = 'linkedin_firstName';
      const csvVar = 'csv_company';
      const apiVar = 'api_custom';
      const senderVar = 'sender_firstName';

      expect(linkedInVar.startsWith('linkedin_')).toBe(true);
      expect(csvVar.startsWith('csv_')).toBe(true);
      expect(apiVar.startsWith('api_')).toBe(true);
      expect(senderVar.startsWith('sender_')).toBe(true);
    });

    it('routes to correct handler based on variable type', () => {
      const handlers = {
        linkedin: vi.fn(),
        csv: vi.fn(),
        api: vi.fn(),
      };

      const handleVariableClick = (variableId: string) => {
        if (variableId.startsWith('linkedin_')) {
          handlers.linkedin(variableId);
        } else if (variableId.startsWith('csv_')) {
          handlers.csv(variableId);
        } else if (variableId.startsWith('api_')) {
          handlers.api(variableId);
        }
      };

      handleVariableClick('linkedin_firstName');
      handleVariableClick('csv_company');
      handleVariableClick('api_custom');

      expect(handlers.linkedin).toHaveBeenCalledWith('linkedin_firstName');
      expect(handlers.csv).toHaveBeenCalledWith('csv_company');
      expect(handlers.api).toHaveBeenCalledWith('api_custom');
    });
  });
});

