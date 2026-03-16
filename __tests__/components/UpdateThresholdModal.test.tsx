import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { UpdateThresholdModal } from '@/components/groups/UpdateThresholdModal';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => 'user-456'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider>{component}</ChakraProvider>);
}

describe('UpdateThresholdModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    eventId: 'event-123',
    groupId: 'group-789',
    currentThreshold: 5,
    currentInCount: 3,
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      expect(screen.getByText('Update Threshold')).toBeInTheDocument();
      expect(screen.getByText('Current confirmations: 3')).toBeInTheDocument();
    });

    it('should show checkbox for threshold requirement', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      expect(screen.getByText('Require confirmations')).toBeInTheDocument();
    });

    it('should display current threshold value in input', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      expect(input).toBeInTheDocument();
    });

    it('should show helper text about auto-confirmation', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      expect(screen.getByText(/When 5 people confirm/)).toBeInTheDocument();
    });

    it('should handle null threshold (no requirement)', () => {
      const props = { ...defaultProps, currentThreshold: null };
      renderWithChakra(<UpdateThresholdModal {...props} />);

      const checkbox = screen.getByRole('checkbox', { name: /Require confirmations/ });
      expect(checkbox).not.toBeChecked();
      expect(screen.getByText('Event will require manual confirmation')).toBeInTheDocument();
    });
  });

  describe('Form interactions', () => {
    it('should enable threshold input when checkbox is checked', () => {
      const props = { ...defaultProps, currentThreshold: null };
      renderWithChakra(<UpdateThresholdModal {...props} />);

      const checkbox = screen.getByRole('checkbox', { name: /Require confirmations/ });
      fireEvent.click(checkbox);

      const input = screen.getByPlaceholderText('e.g., 5') as HTMLInputElement;
      expect(input).not.toBeDisabled();
    });

    it('should disable threshold input when checkbox is unchecked', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox', { name: /Require confirmations/ });
      fireEvent.click(checkbox);

      const input = screen.getByPlaceholderText('e.g., 5') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('should update input value when user types', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '10' } });

      expect(input.value).toBe('10');
      expect(screen.getByText(/When 10 people confirm/)).toBeInTheDocument();
    });

    it('should clear errors when user modifies input', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '2001' } });

      // Try to submit (will have error)
      const button = screen.getByRole('button', { name: /Update/ });
      fireEvent.click(button);

      waitFor(() => {
        expect(screen.getByText(/between 1 and 1000/)).toBeInTheDocument();
      });
    });
  });

  describe('Form validation', () => {
    it('should show error for threshold below 1', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '0' } });

      const button = screen.getByRole('button', { name: /Update/ });
      fireEvent.click(button);

      waitFor(() => {
        expect(screen.getByText(/between 1 and 1000/)).toBeInTheDocument();
      });
    });

    it('should show error for threshold above 1000', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '1001' } });

      const button = screen.getByRole('button', { name: /Update/ });
      fireEvent.click(button);

      waitFor(() => {
        expect(screen.getByText(/between 1 and 1000/)).toBeInTheDocument();
      });
    });

    it('should show error for non-numeric input', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'abc' } });

      const button = screen.getByRole('button', { name: /Update/ });
      fireEvent.click(button);

      waitFor(() => {
        expect(screen.getByText(/between 1 and 1000/)).toBeInTheDocument();
      });
    });

    it('should disable Update button when threshold is empty', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });

      const button = screen.getByRole('button', { name: /Update/ }) as HTMLButtonElement;
      expect(button).toBeDisabled();
    });

    it('should allow submission with valid threshold', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '10' } });

      const button = screen.getByRole('button', { name: /Update/ }) as HTMLButtonElement;
      expect(button).not.toBeDisabled();
    });
  });

  describe('Form submission', () => {
    it('should call API with correct threshold value', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Threshold updated successfully',
        }),
      });

      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '8' } });

      const button = screen.getByRole('button', { name: /Update/ });
      fireEvent.click(button);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/groups/group-789/events/event-123/threshold'),
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ threshold: 8 }),
          })
        );
      });
    });

    it('should call API to remove threshold when unchecked', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Threshold updated successfully',
        }),
      });

      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox', { name: /Require confirmations/ });
      fireEvent.click(checkbox);

      const button = screen.getByRole('button', { name: /Update/ });
      fireEvent.click(button);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/groups/group-789/events/event-123/threshold'),
          expect.objectContaining({
            body: JSON.stringify({ threshold: null }),
          })
        );
      });
    });

    it('should show loading state during submission', async () => {
      (fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true, message: 'Updated' }),
                }),
              100
            )
          )
      );

      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Update/ });
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveTextContent('Updating');
      });
    });

    it('should close modal and call onSuccess on successful submission', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Threshold updated successfully',
        }),
      });

      const onSuccess = jest.fn();
      renderWithChakra(
        <UpdateThresholdModal {...defaultProps} onSuccess={onSuccess} />
      );

      const button = screen.getByRole('button', { name: /Update/ });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Error handling', () => {
    it('should show error toast on API failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'You do not have permission',
        }),
      });

      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Update/ });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('You do not have permission')).toBeInTheDocument();
      });
    });

    it('should disable form during submission', async () => {
      (fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                }),
              100
            )
          )
      );

      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Update/ });
      fireEvent.click(button);

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeDisabled();
    });
  });

  describe('Modal closing', () => {
    it('should close modal on Cancel button click', () => {
      const onClose = jest.fn();
      renderWithChakra(
        <UpdateThresholdModal {...defaultProps} onClose={onClose} />
      );

      const button = screen.getByRole('button', { name: /Cancel/ });
      fireEvent.click(button);

      expect(onClose).toHaveBeenCalled();
    });

    it('should reset form values on close', () => {
      const onClose = jest.fn();
      renderWithChakra(
        <UpdateThresholdModal {...defaultProps} onClose={onClose} />
      );

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '10' } });

      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      expect(screen.getByLabelText('Threshold value')).toBeInTheDocument();
      expect(screen.getByLabelText('Update threshold')).toBeInTheDocument();
      expect(screen.getByLabelText('Cancel')).toBeInTheDocument();
    });

    it('should have semantic HTML structure', () => {
      renderWithChakra(<UpdateThresholdModal {...defaultProps} />);

      const heading = screen.getByText('Update Threshold');
      expect(heading.closest('header')).toBeInTheDocument();
    });
  });
});
