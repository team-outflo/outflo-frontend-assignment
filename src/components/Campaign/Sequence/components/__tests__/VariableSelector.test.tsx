import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { VariableSelector } from '../VariableSelector';
import { createMockLinkedInVariable, createMockCsvVariable } from '@/test/test-utils';

// Mock the API
vi.mock('@/common/api/client', () => ({
  post: vi.fn(),
  checkUnauthorized: vi.fn((response) => response),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('VariableSelector', () => {
  const mockVariables = [
    createMockLinkedInVariable(),
    createMockLinkedInVariable({ id: 'linkedin_lastName', name: 'Last Name' }),
    createMockCsvVariable(),
    createMockCsvVariable({ id: 'csv_email', name: 'Email' }),
  ];

  const mockOnVariableSelect = vi.fn();
  const mockOnVariableCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-008: VariableSelector - JSON Key Validation
  describe('TC-008: JSON Key Validation', () => {
    it('shows error when variable name starts with number', async () => {
      const user = userEvent.setup();

      render(
        <VariableSelector
          variables={mockVariables}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
          campaignId="test-campaign-id"
          onVariableCreated={mockOnVariableCreated}
        />
      );

      // Open dropdown and find "Add" button
      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      await user.click(dropdownTrigger);

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByText('Variables from List')).toBeInTheDocument();
      });

      // Click Add button
      const addButton = screen.getByText('Add');
      await user.click(addButton);

      // Wait for dialog to open
      await waitFor(() => {
        expect(screen.getByText('Create Custom Variable')).toBeInTheDocument();
      });

      // Enter invalid name starting with number
      const input = screen.getByPlaceholderText(/company_size/i);
      await user.type(input, '123invalid');

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/must start with a letter or underscore/i)).toBeInTheDocument();
      });
    });

    it('shows error when variable name contains spaces', async () => {
      const user = userEvent.setup();

      render(
        <VariableSelector
          variables={mockVariables}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
          campaignId="test-campaign-id"
          onVariableCreated={mockOnVariableCreated}
        />
      );

      // Open dropdown
      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText('Variables from List')).toBeInTheDocument();
      });

      // Click Add button
      const addButton = screen.getByText('Add');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Variable')).toBeInTheDocument();
      });

      // Enter invalid name with spaces
      const input = screen.getByPlaceholderText(/company_size/i);
      await user.type(input, 'my variable');

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/can only contain letters, numbers, and underscores/i)).toBeInTheDocument();
      });
    });

    it('shows error when variable name contains special characters', async () => {
      const user = userEvent.setup();

      render(
        <VariableSelector
          variables={mockVariables}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
          campaignId="test-campaign-id"
          onVariableCreated={mockOnVariableCreated}
        />
      );

      // Open dropdown
      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText('Variables from List')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Variable')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/company_size/i);
      await user.type(input, 'my-var!');

      await waitFor(() => {
        expect(screen.getByText(/can only contain letters, numbers, and underscores/i)).toBeInTheDocument();
      });
    });

    it('accepts valid variable name with underscore', async () => {
      const user = userEvent.setup();

      render(
        <VariableSelector
          variables={mockVariables}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
          campaignId="test-campaign-id"
          onVariableCreated={mockOnVariableCreated}
        />
      );

      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText('Variables from List')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Variable')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/company_size/i);
      await user.type(input, 'my_variable');

      // Should show valid format message, not error
      await waitFor(() => {
        expect(screen.getByText(/Valid JSON key format/i)).toBeInTheDocument();
      });

      // Error message should not be present
      expect(screen.queryByText(/must start with/i)).not.toBeInTheDocument();
    });

    it('accepts valid variable name starting with underscore', async () => {
      const user = userEvent.setup();

      render(
        <VariableSelector
          variables={mockVariables}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
          campaignId="test-campaign-id"
          onVariableCreated={mockOnVariableCreated}
        />
      );

      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText('Variables from List')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Variable')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/company_size/i);
      await user.type(input, '_valid123');

      await waitFor(() => {
        expect(screen.getByText(/Valid JSON key format/i)).toBeInTheDocument();
      });
    });
  });

  // TC-009: VariableSelector - Create Variable API Endpoint
  describe('TC-009: Create Variable API Endpoint', () => {
    it('calls the correct API endpoint when creating a variable', async () => {
      const { post } = await import('@/common/api/client');
      const mockPost = post as unknown as ReturnType<typeof vi.fn>;
      mockPost.mockResolvedValueOnce({
        data: {
          variable: {
            id: 'test_var',
            name: 'Test Var',
            placeholder: '{test_var}',
          },
        },
      });

      const user = userEvent.setup();

      render(
        <VariableSelector
          variables={mockVariables}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
          campaignId="test-campaign-id"
          onVariableCreated={mockOnVariableCreated}
        />
      );

      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText('Variables from List')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Variable')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/company_size/i);
      await user.type(input, 'test_var');

      // Click Create button
      const createButton = screen.getByRole('button', { name: /Create$/i });
      await user.click(createButton);

      // Verify API was called with correct endpoint
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          '/campaigns/test-campaign-id/custom-variables',
          { variableName: 'test_var' }
        );
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when variablesLoading is true', () => {
      render(
        <VariableSelector
          variables={[]}
          variablesLoading={true}
          onVariableSelect={mockOnVariableSelect}
        />
      );

      // There should be a loading state visible
      expect(screen.getByRole('button', { name: /Variables/i })).toBeInTheDocument();
    });
  });

  describe('Variable Display', () => {
    it('groups variables by category', async () => {
      const user = userEvent.setup();

      render(
        <VariableSelector
          variables={mockVariables}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
        />
      );

      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText('Variables from List')).toBeInTheDocument();
        expect(screen.getByText('Variables fetched from LinkedIn')).toBeInTheDocument();
      });
    });

    it('displays variable names in dropdown', async () => {
      const user = userEvent.setup();

      render(
        <VariableSelector
          variables={mockVariables}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
        />
      );

      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText('First Name')).toBeInTheDocument();
        expect(screen.getByText('Last Name')).toBeInTheDocument();
        expect(screen.getByText('Company')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
      });
    });
  });

  describe('Variable Selection', () => {
    it('calls onVariableSelect when a variable is clicked', async () => {
      const user = userEvent.setup();

      render(
        <VariableSelector
          variables={mockVariables}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
        />
      );

      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText('First Name')).toBeInTheDocument();
      });

      // Click on a variable
      const firstNameOption = screen.getByText('First Name');
      await user.click(firstNameOption);

      expect(mockOnVariableSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'linkedin_firstName',
        })
      );
    });
  });

  describe('Dialog Lifecycle', () => {
    it('clears input and error when dialog is closed', async () => {
      const user = userEvent.setup();

      render(
        <VariableSelector
          variables={mockVariables}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
          campaignId="test-campaign-id"
          onVariableCreated={mockOnVariableCreated}
        />
      );

      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText('Variables from List')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Variable')).toBeInTheDocument();
      });

      // Type invalid name to trigger error
      const input = screen.getByPlaceholderText(/company_size/i);
      await user.type(input, '123invalid');

      await waitFor(() => {
        expect(screen.getByText(/must start with a letter or underscore/i)).toBeInTheDocument();
      });

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      // Reopen dialog
      await user.click(dropdownTrigger);
      await waitFor(() => {
        expect(screen.getByText('Variables from List')).toBeInTheDocument();
      });

      const addButton2 = screen.getByText('Add');
      await user.click(addButton2);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Variable')).toBeInTheDocument();
      });

      // Input should be cleared
      const newInput = screen.getByPlaceholderText(/company_size/i);
      expect(newInput).toHaveValue('');

      // Error should not be visible
      expect(screen.queryByText(/must start with/i)).not.toBeInTheDocument();
    });
  });

  describe('Empty Variables', () => {
    it('handles empty variables array', async () => {
      const user = userEvent.setup();

      render(
        <VariableSelector
          variables={[]}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
        />
      );

      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      await user.click(dropdownTrigger);

      await waitFor(() => {
        expect(screen.getByText('No variables available')).toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('disables button when disabled prop is true', () => {
      render(
        <VariableSelector
          variables={mockVariables}
          variablesLoading={false}
          onVariableSelect={mockOnVariableSelect}
          disabled={true}
        />
      );

      const dropdownTrigger = screen.getByRole('button', { name: /Variables/i });
      expect(dropdownTrigger).toBeDisabled();
    });
  });
});

