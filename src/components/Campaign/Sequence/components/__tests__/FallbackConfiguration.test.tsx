import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { FallbackConfiguration } from '../FallbackConfiguration';
import type { FallbackState, FallbackMode } from '../fallbackTypes';

// Mock the TooltipInfo component to simplify testing
vi.mock('@/components/utils/TooltipInfo', () => ({
  TooltipInfo: ({ trigger, content }: { trigger: React.ReactNode; content: string }) => (
    <div data-testid="tooltip-info">
      {trigger}
      <span data-testid="tooltip-content" className="hidden">{content}</span>
    </div>
  ),
}));

describe('FallbackConfiguration', () => {
  const defaultState: FallbackState = {
    mode: 'skipLead',
    defaultValue: '',
    linkedInField: undefined,
    fallbackMode: undefined,
    fallbackDefaultValue: '',
  };

  const mockOnStateChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-001: FallbackConfiguration Component - Initial Render (LinkedIn mode)
  describe('TC-001: Initial Render - LinkedIn Mode', () => {
    it('renders with correct options for linkedin mode', () => {
      render(
        <FallbackConfiguration
          mode="linkedin"
          state={defaultState}
          variableName="First Name"
          onStateChange={mockOnStateChange}
        />
      );

      // Verify header displays
      expect(screen.getByText(/Configure Fallback for First Name/i)).toBeInTheDocument();

      // Verify radio options visible (insertValue, sendBlank, skipLead)
      expect(screen.getByText('Use a fallback value')).toBeInTheDocument();
      expect(screen.getByText('Send Blank')).toBeInTheDocument();
      expect(screen.getByText('Skip Lead')).toBeInTheDocument();

      // Verify "Fetch from LinkedIn" option is NOT visible for linkedin mode
      expect(screen.queryByText('Fetch from LinkedIn')).not.toBeInTheDocument();
    });

    it('hides header when showHeader is false', () => {
      render(
        <FallbackConfiguration
          mode="linkedin"
          state={defaultState}
          variableName="First Name"
          onStateChange={mockOnStateChange}
          showHeader={false}
        />
      );

      expect(screen.queryByText(/Configure Fallback for/i)).not.toBeInTheDocument();
    });
  });

  // TC-002: FallbackConfiguration - allLeadsPresent Mode
  describe('TC-002: allLeadsPresent Mode', () => {
    it('shows green banner and full options', () => {
      render(
        <FallbackConfiguration
          mode="allleadsPresent"
          state={defaultState}
          variableName="Company"
          onStateChange={mockOnStateChange}
        />
      );

      // Verify green banner "All leads currently have this value" displays
      expect(screen.getByText('All leads currently have this value')).toBeInTheDocument();
      expect(screen.getByText(/Configure fallback options for when data becomes missing/i)).toBeInTheDocument();

      // Verify all 4 options visible
      expect(screen.getByText('Use a fallback value')).toBeInTheDocument();
      expect(screen.getByText('Fetch from LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('Send Blank')).toBeInTheDocument();
      expect(screen.getByText('Skip Lead')).toBeInTheDocument();
    });
  });

  // TC-003: FallbackConfiguration - Custom Mode with LinkedIn Fetch
  describe('TC-003: Custom Mode with LinkedIn Fetch', () => {
    it('shows LinkedIn field dropdown when fetchLinkedIn is selected', () => {
      const stateWithFetchLinkedIn: FallbackState = {
        ...defaultState,
        mode: 'fetchLinkedIn',
      };

      render(
        <FallbackConfiguration
          mode="custom"
          state={stateWithFetchLinkedIn}
          variableName="Company Name"
          onStateChange={mockOnStateChange}
        />
      );

      // Verify LinkedIn field dropdown appears
      expect(screen.getByText('Select LinkedIn field')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('shows nested fallback section when LinkedIn field is selected', () => {
      const stateWithLinkedInField: FallbackState = {
        ...defaultState,
        mode: 'fetchLinkedIn',
        linkedInField: 'firstName',
      };

      render(
        <FallbackConfiguration
          mode="custom"
          state={stateWithLinkedInField}
          variableName="Company Name"
          onStateChange={mockOnStateChange}
        />
      );

      // Verify nested fallback section appears
      expect(screen.getByText(/Fallback if data is missing/i)).toBeInTheDocument();
    });

    it('progressive disclosure works - Fetch from LinkedIn shows field selector only when selected', () => {
      const { rerender } = render(
        <FallbackConfiguration
          mode="custom"
          state={defaultState}
          variableName="Test"
          onStateChange={mockOnStateChange}
        />
      );

      // Initially no LinkedIn field selector
      expect(screen.queryByText('Select LinkedIn field')).not.toBeInTheDocument();

      // After selecting fetchLinkedIn
      rerender(
        <FallbackConfiguration
          mode="custom"
          state={{ ...defaultState, mode: 'fetchLinkedIn' }}
          variableName="Test"
          onStateChange={mockOnStateChange}
        />
      );

      expect(screen.getByText('Select LinkedIn field')).toBeInTheDocument();
    });
  });

  // Additional test cases for comprehensive coverage
  describe('State Management', () => {
    it('calls onStateChange when radio option is selected', () => {
      render(
        <FallbackConfiguration
          mode="linkedin"
          state={defaultState}
          variableName="Test"
          onStateChange={mockOnStateChange}
        />
      );

      // Click on "Send Blank" radio
      const sendBlankRadio = screen.getByRole('radio', { name: /Send Blank/i });
      fireEvent.click(sendBlankRadio);

      expect(mockOnStateChange).toHaveBeenCalled();
    });

    it('auto-selects insertValue mode when typing in value input', () => {
      const stateWithInsertValue: FallbackState = {
        ...defaultState,
        mode: 'insertValue',
      };

      render(
        <FallbackConfiguration
          mode="linkedin"
          state={stateWithInsertValue}
          variableName="Test"
          onStateChange={mockOnStateChange}
        />
      );

      const input = screen.getByPlaceholderText('Enter fallback value');
      fireEvent.change(input, { target: { value: 'Default Name' } });

      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValue: 'Default Name',
        })
      );
    });
  });

  describe('Disabled State', () => {
    it('disables all inputs when disabled prop is true', () => {
      render(
        <FallbackConfiguration
          mode="linkedin"
          state={{ ...defaultState, mode: 'insertValue' }}
          variableName="Test"
          onStateChange={mockOnStateChange}
          disabled={true}
        />
      );

      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).toBeDisabled();
      });

      const input = screen.getByPlaceholderText('Enter fallback value');
      expect(input).toBeDisabled();
    });

    it('does not call onStateChange when disabled and option clicked', () => {
      render(
        <FallbackConfiguration
          mode="linkedin"
          state={defaultState}
          variableName="Test"
          onStateChange={mockOnStateChange}
          disabled={true}
        />
      );

      const sendBlankRadio = screen.getByRole('radio', { name: /Send Blank/i });
      fireEvent.click(sendBlankRadio);

      // Should not call onStateChange because component is disabled
      expect(mockOnStateChange).not.toHaveBeenCalled();
    });
  });

  describe('Contextual Help', () => {
    it('shows contextual help when provided', () => {
      render(
        <FallbackConfiguration
          mode="linkedin"
          state={defaultState}
          variableName="Test"
          onStateChange={mockOnStateChange}
          contextualHelp="This is helpful information"
        />
      );

      expect(screen.getByText('This is helpful information')).toBeInTheDocument();
    });

    it('does not show contextual help when not provided', () => {
      render(
        <FallbackConfiguration
          mode="linkedin"
          state={defaultState}
          variableName="Test"
          onStateChange={mockOnStateChange}
        />
      );

      expect(screen.queryByText(/This is helpful information/i)).not.toBeInTheDocument();
    });
  });

  describe('Empty/Edge States', () => {
    it('handles undefined state gracefully', () => {
      const emptyState: FallbackState = {
        mode: 'skipLead',
      };

      expect(() =>
        render(
          <FallbackConfiguration
            mode="linkedin"
            state={emptyState}
            variableName="Test"
            onStateChange={mockOnStateChange}
          />
        )
      ).not.toThrow();
    });

    it('handles empty variableName', () => {
      expect(() =>
        render(
          <FallbackConfiguration
            mode="linkedin"
            state={defaultState}
            variableName=""
            onStateChange={mockOnStateChange}
          />
        )
      ).not.toThrow();
    });
  });
});

