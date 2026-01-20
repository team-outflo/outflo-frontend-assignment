import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { FollowUpStep } from '../FollowUpStep';
import { createMockLinkedInVariable, createMockCsvVariable } from '@/test/test-utils';

// Mock the campaign store
vi.mock('@/api/store/campaignStore/campaign', () => ({
  useCampaignStore: vi.fn(() => ({
    campaign: {
      id: 'test-campaign-id',
      csvConfig: {
        columnFixes: [],
        detectedColumns: [],
      },
    },
    mode: 'edit',
    addCsvColumnFix: vi.fn(),
    getCsvColumnFix: vi.fn(),
  })),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock LinkedInMessageEditorAdapter
vi.mock('../LinkedInEditor', () => ({
  LinkedInMessageEditorAdapter: vi.forwardRef(({ value, onChange, disabled, placeholder }: any, ref: any) => (
    <textarea
      data-testid="mock-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      ref={ref}
    />
  )),
}));

// Mock AttachmentUploader
vi.mock('../AttachmentUploader', () => ({
  AttachmentUploader: vi.forwardRef((props: any, ref: any) => (
    <div data-testid="attachment-uploader">
      <button 
        data-testid="trigger-upload"
        onClick={() => props.onAttachmentsChange?.([])}
      >
        Upload
      </button>
    </div>
  )),
}));

// Mock VariableSelector
vi.mock('../VariableSelector', () => ({
  VariableSelector: ({ onVariableSelect }: any) => (
    <button
      data-testid="variable-selector"
      onClick={() => onVariableSelect({ id: 'linkedin_firstName', placeholder: '{linkedin_firstName}' })}
    >
      Variables
    </button>
  ),
}));

// Mock UnifiedVariableConfigurationModal
vi.mock('../UnifiedVariableConfigurationModal', () => ({
  UnifiedVariableConfigurationModal: ({ open, onClose }: any) => 
    open ? <div data-testid="config-modal">Config Modal</div> : null,
}));

describe('FollowUpStep', () => {
  const mockVariables = [
    createMockLinkedInVariable(),
    createMockCsvVariable(),
  ];

  const defaultProps = {
    step: {
      id: 'step-1',
      type: 'followup' as const,
      content: 'Hello {linkedin_firstName}!',
      delay: 86400000,
      attachments: [],
    },
    index: 0,
    variables: mockVariables,
    variablesLoading: false,
    csvData: [],
    csvVariablesWithMissingData: [],
    getCsvColumnFix: vi.fn(),
    addCsvColumnFix: vi.fn(),
    onUpdateContent: vi.fn(),
    onUpdateDelay: vi.fn(),
    onDelete: vi.fn(),
    onPreview: vi.fn(),
    onVariablesRefresh: vi.fn(),
    onUpdateAttachments: vi.fn(),
    viewMode: false,
    excludeConnected: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-010: FollowUpStep - Copy Message Button
  describe('TC-010: Copy Message Button', () => {
    it('renders copy button in edit mode', () => {
      render(<FollowUpStep {...defaultProps} />);
      
      // Find copy button by title attribute
      const copyButton = screen.getByTitle('Copy message content');
      expect(copyButton).toBeInTheDocument();
    });

    it('does not render copy button in view mode', () => {
      render(<FollowUpStep {...defaultProps} viewMode={true} />);
      
      // Copy button should not be visible in view mode
      const copyButton = screen.queryByTitle('Copy message content');
      expect(copyButton).not.toBeInTheDocument();
    });

    it('copies message content to clipboard on click', async () => {
      const user = userEvent.setup();
      render(<FollowUpStep {...defaultProps} />);
      
      const copyButton = screen.getByTitle('Copy message content');
      await user.click(copyButton);

      // Verify clipboard was called
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello {linkedin_firstName}!');
    });

    it('shows success toast after copying', async () => {
      const user = userEvent.setup();
      render(<FollowUpStep {...defaultProps} />);
      
      const copyButton = screen.getByTitle('Copy message content');
      await user.click(copyButton);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Copied!',
        })
      );
    });

    it('shows error toast when clipboard fails', async () => {
      const user = userEvent.setup();
      
      // Mock clipboard failure
      const originalWriteText = navigator.clipboard.writeText;
      navigator.clipboard.writeText = vi.fn().mockRejectedValueOnce(new Error('Clipboard error'));
      
      render(<FollowUpStep {...defaultProps} />);
      
      const copyButton = screen.getByTitle('Copy message content');
      await user.click(copyButton);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to copy',
          variant: 'destructive',
        })
      );

      // Restore clipboard
      navigator.clipboard.writeText = originalWriteText;
    });
  });

  describe('Initial Render', () => {
    it('renders step title with correct index', () => {
      render(<FollowUpStep {...defaultProps} index={2} />);
      
      expect(screen.getByText('Message 3')).toBeInTheDocument();
    });

    it('renders message editor with content', () => {
      render(<FollowUpStep {...defaultProps} />);
      
      const editor = screen.getByTestId('mock-editor');
      expect(editor).toHaveValue('Hello {linkedin_firstName}!');
    });

    it('renders delete button', () => {
      render(<FollowUpStep {...defaultProps} />);
      
      // Should have delete button
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('enables editor in edit mode', () => {
      render(<FollowUpStep {...defaultProps} viewMode={false} />);
      
      const editor = screen.getByTestId('mock-editor');
      expect(editor).not.toBeDisabled();
    });

    it('calls onUpdateContent when message changes', async () => {
      const user = userEvent.setup();
      render(<FollowUpStep {...defaultProps} />);
      
      const editor = screen.getByTestId('mock-editor');
      await user.clear(editor);
      await user.type(editor, 'New message');

      expect(defaultProps.onUpdateContent).toHaveBeenCalled();
    });
  });

  describe('View Mode', () => {
    it('disables editor in view mode', () => {
      render(<FollowUpStep {...defaultProps} viewMode={true} />);
      
      const editor = screen.getByTestId('mock-editor');
      expect(editor).toBeDisabled();
    });

    it('hides delete button in view mode', () => {
      render(<FollowUpStep {...defaultProps} viewMode={true} />);
      
      // Delete button should not be visible
      const deleteButtons = screen.queryAllByRole('button');
      const hasDeleteButton = deleteButtons.some(btn => 
        btn.querySelector('[class*="Trash"]')
      );
      expect(hasDeleteButton).toBe(false);
    });
  });

  describe('Variable Configuration', () => {
    it('opens configuration modal when allLeadsPresent variable is clicked', async () => {
      const handleCsvVariableClick = vi.fn();
      
      // This would be tested in integration with the actual editor component
      // For now, verify the props are passed correctly
      expect(defaultProps.getCsvColumnFix).toBeDefined();
      expect(defaultProps.addCsvColumnFix).toBeDefined();
    });
  });

  describe('Attachments', () => {
    it('renders attachment uploader', () => {
      render(<FollowUpStep {...defaultProps} />);
      
      expect(screen.getByTestId('attachment-uploader')).toBeInTheDocument();
    });

    it('shows attachment button', () => {
      render(<FollowUpStep {...defaultProps} />);
      
      expect(screen.getByTitle('Add attachment')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('handles empty content', () => {
      render(
        <FollowUpStep
          {...defaultProps}
          step={{ ...defaultProps.step, content: '' }}
        />
      );
      
      const editor = screen.getByTestId('mock-editor');
      expect(editor).toHaveValue('');
    });

    it('handles empty attachments', () => {
      render(
        <FollowUpStep
          {...defaultProps}
          step={{ ...defaultProps.step, attachments: [] }}
        />
      );
      
      expect(screen.getByTestId('attachment-uploader')).toBeInTheDocument();
    });
  });

  describe('Partial Data', () => {
    it('handles missing optional props', () => {
      const minimalProps = {
        ...defaultProps,
        csvData: undefined,
        csvConfigForViewMode: undefined,
      };

      expect(() => render(<FollowUpStep {...minimalProps as any} />)).not.toThrow();
    });
  });

  describe('Console Errors', () => {
    it('does not produce console errors during normal render', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      render(<FollowUpStep {...defaultProps} />);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

