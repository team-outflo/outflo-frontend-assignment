import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import ReviewLaunch from '../ReviewLaunch';
import { useCampaignStore } from '@/api/store/campaignStore/campaign';
import { createMockCampaign } from '@/test/test-utils';

// Mock the campaign store
vi.mock('@/api/store/campaignStore/campaign', () => ({
  useCampaignStore: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'test-campaign-id' }),
  };
});

// Mock the API calls
vi.mock('@/common/api/client', () => ({
  get: vi.fn().mockResolvedValue({ data: {} }),
  post: vi.fn().mockResolvedValue({ data: {} }),
  put: vi.fn().mockResolvedValue({ data: {} }),
  checkUnauthorized: vi.fn((response) => response),
}));

describe('ReviewLaunch', () => {
  const mockStore = {
    campaign: createMockCampaign({
      id: 'test-campaign-id',
      name: 'Test Campaign',
      leads: {
        data: [{ id: '1', details: { company: 'Acme' } }],
        leadListId: 'lead-list-1',
        columnMapping: [],
      },
      senderAccounts: [{ id: 'acc-1', name: 'Test Account' }],
      sequence: {
        steps: [
          {
            id: 'step-1',
            type: 1,
            data: {
              message: 'Hello {csv_company}!',
              delay: 86400000,
            },
          },
        ],
        excludeConnected: false,
      },
      csvConfig: {
        columnFixes: [],
        detectedColumns: ['company'],
        lastUpdated: Date.now(),
      },
    }),
    mode: 'edit',
    currentStep: 4,
    variables: [
      {
        id: 'csv_company',
        name: 'Company',
        type: 'fetch',
        source: 'sheet',
      },
    ],
    getCsvColumnFix: vi.fn(),
    goToStep: vi.fn(),
    setOperationalTimes: vi.fn(),
    getLeadsData: vi.fn().mockReturnValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
  });

  // TC-011: ReviewLaunch - Variable Configuration Validation
  describe('TC-011: Variable Configuration Validation', () => {
    it('shows warning when CSV/API variables lack configuration', () => {
      // Mock store with unconfigured variable
      const storeWithUnconfigured = {
        ...mockStore,
        getCsvColumnFix: vi.fn().mockReturnValue(null), // No configuration
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithUnconfigured);

      render(<ReviewLaunch />);

      // Should show warning about missing variable configuration
      expect(screen.getByText(/Missing required information/i)).toBeInTheDocument();
      expect(screen.getByText(/Missing variable configurations/i)).toBeInTheDocument();
    });

    it('shows specific unconfigured variable names', () => {
      const storeWithUnconfigured = {
        ...mockStore,
        getCsvColumnFix: vi.fn().mockReturnValue(null),
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithUnconfigured);

      render(<ReviewLaunch />);

      // Should show the specific variable that needs configuration
      expect(screen.getByText(/csv_company/i)).toBeInTheDocument();
    });

    it('disables confirmation checkbox when variables are unconfigured', () => {
      const storeWithUnconfigured = {
        ...mockStore,
        getCsvColumnFix: vi.fn().mockReturnValue(null),
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithUnconfigured);

      render(<ReviewLaunch />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });

    it('shows "Configure Variables" on launch button when variables unconfigured', () => {
      const storeWithUnconfigured = {
        ...mockStore,
        getCsvColumnFix: vi.fn().mockReturnValue(null),
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithUnconfigured);

      render(<ReviewLaunch />);

      expect(screen.getByRole('button', { name: /Configure Variables/i })).toBeInTheDocument();
    });

    it('enables launch when all variables are configured', () => {
      const storeWithConfigured = {
        ...mockStore,
        getCsvColumnFix: vi.fn().mockReturnValue({
          columnName: 'csv_company',
          fixChain: { fixType: 'sendBlank' },
          appliedAt: Date.now(),
        }),
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithConfigured);

      render(<ReviewLaunch />);

      // Should NOT show warning about missing variable configuration
      expect(screen.queryByText(/Missing variable configurations/i)).not.toBeInTheDocument();

      // Checkbox should be enabled
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeDisabled();
    });

    it('does not require configuration for linkedin_ variables', () => {
      const storeWithLinkedInOnly = {
        ...mockStore,
        campaign: {
          ...mockStore.campaign,
          sequence: {
            steps: [
              {
                id: 'step-1',
                type: 1,
                data: {
                  message: 'Hello {linkedin_firstName}!',
                  delay: 86400000,
                },
              },
            ],
          },
        },
        getCsvColumnFix: vi.fn().mockReturnValue(null),
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithLinkedInOnly);

      render(<ReviewLaunch />);

      // Should NOT show warning for linkedin variables
      expect(screen.queryByText(/Missing variable configurations/i)).not.toBeInTheDocument();
    });
  });

  describe('Validation Display', () => {
    it('shows error when no leads list', () => {
      const storeWithNoLeads = {
        ...mockStore,
        campaign: {
          ...mockStore.campaign,
          leads: {
            data: [],
            leadListId: null,
            columnMapping: [],
          },
        },
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithNoLeads);

      render(<ReviewLaunch />);

      expect(screen.getByText(/No leads found/i)).toBeInTheDocument();
    });

    it('shows error when no sender accounts', () => {
      const storeWithNoSenders = {
        ...mockStore,
        campaign: {
          ...mockStore.campaign,
          senderAccounts: [],
        },
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithNoSenders);

      render(<ReviewLaunch />);

      expect(screen.getByText(/No sender accounts found/i)).toBeInTheDocument();
    });
  });

  describe('View Mode', () => {
    it('shows "View Senders" instead of "Edit Senders" in view mode', () => {
      const viewModeStore = {
        ...mockStore,
        mode: 'view',
        getCsvColumnFix: vi.fn().mockReturnValue({
          columnName: 'csv_company',
          fixChain: { fixType: 'sendBlank' },
          appliedAt: Date.now(),
        }),
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(viewModeStore);

      render(<ReviewLaunch />);

      expect(screen.getByText('View Senders')).toBeInTheDocument();
      expect(screen.queryByText('Edit Senders')).not.toBeInTheDocument();
    });

    it('shows "View Sequence" instead of "Edit Sequence" in view mode', () => {
      const viewModeStore = {
        ...mockStore,
        mode: 'view',
        getCsvColumnFix: vi.fn().mockReturnValue({
          columnName: 'csv_company',
          fixChain: { fixType: 'sendBlank' },
          appliedAt: Date.now(),
        }),
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(viewModeStore);

      render(<ReviewLaunch />);

      expect(screen.getByText('View Sequence')).toBeInTheDocument();
      expect(screen.queryByText('Edit Sequence')).not.toBeInTheDocument();
    });
  });

  describe('Delay Parsing', () => {
    it('correctly parses delay as number', () => {
      const storeWithNumberDelay = {
        ...mockStore,
        getCsvColumnFix: vi.fn().mockReturnValue({
          columnName: 'csv_company',
          fixChain: { fixType: 'sendBlank' },
          appliedAt: Date.now(),
        }),
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithNumberDelay);

      render(<ReviewLaunch />);

      // Component should render without errors
      expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    });

    it('correctly parses delay as string number', () => {
      const storeWithStringDelay = {
        ...mockStore,
        campaign: {
          ...mockStore.campaign,
          sequence: {
            steps: [
              {
                id: 'step-1',
                type: 1,
                data: {
                  message: 'Hello!',
                  delay: '86400000', // String instead of number
                },
              },
            ],
          },
        },
        getCsvColumnFix: vi.fn().mockReturnValue({
          columnName: 'csv_company',
          fixChain: { fixType: 'sendBlank' },
          appliedAt: Date.now(),
        }),
      };
      (useCampaignStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithStringDelay);

      render(<ReviewLaunch />);

      // Component should render without errors
      expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    });
  });
});

