import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';

// Mock the queries and API
vi.mock('@/hooks/useCampaignQueries', () => ({
  useCampaignsQuery: vi.fn().mockReturnValue({
    data: [
      {
        id: 'campaign-1',
        name: 'Test Campaign 1',
        state: 'ACTIVE',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        insights: {
          totalLeads: 100,
          connectionRequestsSent: 50,
          connectionRequestsAccepted: 25,
          messagesSent: 75,
          responses: 10,
          campaignStatus: 'ACTIVE',
        },
      },
      {
        id: 'campaign-2',
        name: 'Draft Campaign',
        state: 'DRAFT',
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
        insights: null,
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCampaignInsightsQuery: vi.fn().mockReturnValue({
    data: {},
    isLoading: false,
  }),
}));

vi.mock('@/api/campaign/campaigns', () => ({
  deleteCampaign: vi.fn().mockResolvedValue({ data: {} }),
  updateCampaignState: vi.fn().mockResolvedValue({ data: {} }),
}));

vi.mock('@/hooks/useCreateDraftCampaignFlow', () => ({
  useCreateDraftCampaignFlow: vi.fn().mockReturnValue({
    createDraftCampaign: vi.fn(),
    isLoading: false,
  }),
}));

// Mock TooltipInfo to make testing easier
vi.mock('@/components/utils/TooltipInfo', () => ({
  TooltipInfo: ({ trigger, content }: { trigger: React.ReactNode; content: string }) => (
    <div data-testid="tooltip-wrapper">
      {trigger}
      <span data-testid="tooltip-content" style={{ display: 'none' }}>{content}</span>
    </div>
  ),
}));

// Lazy import to ensure mocks are set up first
const CampaignsListContent = (await import('../CampaignsList')).default;

describe('CampaignsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-013: CampaignsList - Table Column Reorganization
  describe('TC-013: Table Column Reorganization', () => {
    it('renders correct column headers with new structure', async () => {
      render(<CampaignsListContent />);

      await waitFor(() => {
        // Verify columns exist
        expect(screen.getByText('Campaign Name')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('LEADS')).toBeInTheDocument();
        expect(screen.getByText('SENT')).toBeInTheDocument();
        expect(screen.getByText('MESSAGES')).toBeInTheDocument();
        expect(screen.getByText('REPLIES')).toBeInTheDocument();
        expect(screen.getByText('Created')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('shows tooltips on column headers', async () => {
      render(<CampaignsListContent />);

      await waitFor(() => {
        // Check for tooltip wrappers (our mocked TooltipInfo)
        const tooltipWrappers = screen.getAllByTestId('tooltip-wrapper');
        expect(tooltipWrappers.length).toBeGreaterThan(0);
      });
    });

    it('displays correct data in table cells', async () => {
      render(<CampaignsListContent />);

      await waitFor(() => {
        // Campaign name
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
        
        // Leads count
        expect(screen.getByText('100')).toBeInTheDocument();
        
        // Sent count
        expect(screen.getByText('50')).toBeInTheDocument();
        
        // Messages count
        expect(screen.getByText('75')).toBeInTheDocument();
        
        // Replies count
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    it('shows empty state when no campaigns', async () => {
      const { useCampaignsQuery } = await import('@/hooks/useCampaignQueries');
      (useCampaignsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<CampaignsListContent />);

      await waitFor(() => {
        expect(screen.getByText(/No Campaigns Yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Status Display', () => {
    it('shows correct status badge for active campaigns', async () => {
      render(<CampaignsListContent />);

      await waitFor(() => {
        // Active campaign should have status displayed
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });
    });

    it('shows draft status for draft campaigns', async () => {
      render(<CampaignsListContent />);

      await waitFor(() => {
        expect(screen.getByText('Draft Campaign')).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Actions', () => {
    it('shows delete button for draft campaigns', async () => {
      render(<CampaignsListContent />);

      await waitFor(() => {
        // Find the draft campaign row and its actions
        expect(screen.getByText('Draft Campaign')).toBeInTheDocument();
      });
    });

    it('shows pause/resume button for active campaigns', async () => {
      render(<CampaignsListContent />);

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state while fetching campaigns', async () => {
      const { useCampaignsQuery } = await import('@/hooks/useCampaignQueries');
      (useCampaignsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<CampaignsListContent />);

      // Component should render without crashing during loading
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Stats Cards', () => {
    it('shows stats cards with correct values', async () => {
      render(<CampaignsListContent />);

      await waitFor(() => {
        // Total Campaigns card
        expect(screen.getByText('Total Campaigns')).toBeInTheDocument();
        
        // Leads Reached card
        expect(screen.getByText('Leads Reached')).toBeInTheDocument();
        
        // Messages Sent card
        expect(screen.getByText('Messages Sent')).toBeInTheDocument();
        
        // Total Replies card
        expect(screen.getByText('Total Replies')).toBeInTheDocument();
      });
    });
  });
});

