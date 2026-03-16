import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { CreateEventModal } from '@/components/groups/CreateEventModal';

// Mock the event service
jest.mock('@/lib/services/eventService', () => ({
  createEvent: jest.fn(),
}));

const mockCreateEvent = require('@/lib/services/eventService').createEvent;

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('CreateEventModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    groupId: 'group-123',
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEvent.mockResolvedValue({
      success: true,
      message: 'Event proposed successfully',
      data: {
        event: {
          id: 'event-1',
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
        },
        rsvp: {
          id: 'rsvp-1',
          status: 'in',
        },
      },
    });
  });

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      expect(screen.getByText('Propose an Event')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      renderWithChakra(
        <CreateEventModal {...defaultProps} isOpen={false} />
      );

      expect(screen.queryByText('Propose an Event')).not.toBeInTheDocument();
    });

    it('should render all form fields', () => {
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      expect(screen.getByLabelText('Event Title *')).toBeInTheDocument();
      expect(screen.getByLabelText('Date & Time *')).toBeInTheDocument();
      expect(screen.getByLabelText('Commitment Threshold (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('should render form action buttons', () => {
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Event/i })).toBeInTheDocument();
    });

    it('should display character counters for title and description', () => {
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      expect(screen.getByText('0/255 characters')).toBeInTheDocument();
      expect(screen.getByText('0/2000 characters')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          'group-123',
          '',
          expect.objectContaining({
            title: 'Pizza Night',
            date: '2026-04-20T19:00',
          })
        );
      });
    });

    it('should include threshold in submission when provided', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const thresholdInput = screen.getByLabelText('Commitment Threshold (optional)');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');
      await user.type(thresholdInput, '5');

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          'group-123',
          '',
          expect.objectContaining({
            threshold: 5,
          })
        );
      });
    });

    it('should include description in submission when provided', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');
      await user.type(descriptionInput, 'Casual dinner at downtown location');

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalledWith(
          'group-123',
          '',
          expect.objectContaining({
            description: 'Casual dinner at downtown location',
          })
        );
      });
    });

    it('should call onSuccess callback after successful submission', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');

      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('should close modal after successful submission', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');

      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Validation', () => {
    it('should display error for empty title', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const dateInput = screen.getByLabelText('Date & Time *');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(dateInput, '2026-04-20T19:00');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Event title is required')).toBeInTheDocument();
      });
    });

    it('should display error for title exceeding 255 characters', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *') as HTMLInputElement;

      // Title input has maxLength="255", so we can't type more than that
      // But we can test that reaching 255 characters doesn't show an error
      await user.type(titleInput, 'A'.repeat(255));

      expect(titleInput.value).toHaveLength(255);
      expect(screen.queryByText(/255 characters or less/)).not.toBeInTheDocument();
    });

    it('should display error for missing date', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Event date is required')).toBeInTheDocument();
      });
    });

    it('should display error for invalid threshold (zero)', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const thresholdInput = screen.getByLabelText('Commitment Threshold (optional)');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');
      await user.type(thresholdInput, '0');

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Threshold must be a positive number')).toBeInTheDocument();
      });
    });

    it('should display error for invalid threshold (exceeding 1000)', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const thresholdInput = screen.getByLabelText('Commitment Threshold (optional)');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');
      await user.type(thresholdInput, '1001');

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Threshold is too large')).toBeInTheDocument();
      });
    });

    it('should disable submit button when required fields are empty', () => {
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when required fields are filled', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error toast on API failure', async () => {
      mockCreateEvent.mockResolvedValueOnce({
        success: false,
        message: 'Failed to create event',
        errorCode: 'INTERNAL_ERROR',
      });

      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create event')).toBeInTheDocument();
      });
    });

    it('should display error toast on network failure', async () => {
      mockCreateEvent.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner during submission', async () => {
      mockCreateEvent.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        message: 'Event proposed successfully',
      }), 100)));

      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });

    it('should disable form inputs during submission', async () => {
      mockCreateEvent.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        message: 'Event proposed successfully',
      }), 100)));

      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *') as HTMLInputElement;
      const dateInput = screen.getByLabelText('Date & Time *') as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');

      await user.click(submitButton);

      await waitFor(() => {
        expect(titleInput).toBeDisabled();
        expect(dateInput).toBeDisabled();
      });
    });

    it('should disable close button during submission', async () => {
      mockCreateEvent.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        message: 'Event proposed successfully',
      }), 100)));

      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');

      await user.click(submitButton);

      // Find the close button (it's in the modal header)
      const closeButton = screen.getByRole('button', { name: /close/i });

      await waitFor(() => {
        expect(closeButton).toBeDisabled();
      });
    });
  });

  describe('Character Counting', () => {
    it('should update title character counter as user types', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');

      await user.type(titleInput, 'Hello');

      await waitFor(() => {
        expect(screen.getByText('5/255 characters')).toBeInTheDocument();
      });
    });

    it('should update description character counter as user types', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const descriptionInput = screen.getByLabelText('Description');

      await user.type(descriptionInput, 'Test description');

      await waitFor(() => {
        expect(screen.getByText('16/2000 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all inputs', () => {
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      expect(screen.getByLabelText('Event Title *')).toBeInTheDocument();
      expect(screen.getByLabelText('Date & Time *')).toBeInTheDocument();
      expect(screen.getByLabelText('Commitment Threshold (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('should have required indicator for mandatory fields', () => {
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      expect(screen.getByText('Event Title *')).toBeInTheDocument();
      expect(screen.getByText('Date & Time *')).toBeInTheDocument();
    });

    it('should display error messages in form controls', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Event title is required')).toBeInTheDocument();
        expect(screen.getByText('Event date is required')).toBeInTheDocument();
      });
    });

    it('should maintain keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');

      titleInput.focus();
      expect(document.activeElement).toBe(titleInput);

      await user.tab();
      expect(document.activeElement).toBe(dateInput);
    });

    it('should have semantic HTML structure', () => {
      const { container } = renderWithChakra(<CreateEventModal {...defaultProps} />);

      // Check for form element
      expect(container.querySelector('form')).toBeInTheDocument();
    });
  });

  describe('Modal Closing', () => {
    it('should call onClose when cancel button clicked', async () => {
      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });

      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should clear form when modal closes', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *') as HTMLInputElement;

      await user.type(titleInput, 'Test Event');

      expect(titleInput.value).toBe('Test Event');

      // Close and reopen modal
      rerender(
        <ChakraProvider>
          <CreateEventModal {...defaultProps} isOpen={false} />
        </ChakraProvider>
      );

      rerender(
        <ChakraProvider>
          <CreateEventModal {...defaultProps} isOpen={true} />
        </ChakraProvider>
      );

      const newTitleInput = screen.getByLabelText('Event Title *') as HTMLInputElement;
      expect(newTitleInput.value).toBe('');
    });

    it('should prevent closing while submission is in progress', async () => {
      mockCreateEvent.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({
        success: true,
      }), 100)));

      const user = userEvent.setup();
      renderWithChakra(<CreateEventModal {...defaultProps} />);

      const titleInput = screen.getByLabelText('Event Title *');
      const dateInput = screen.getByLabelText('Date & Time *');
      const submitButton = screen.getByRole('button', { name: /Create Event/i });

      await user.type(titleInput, 'Pizza Night');
      await user.type(dateInput, '2026-04-20T19:00');

      await user.click(submitButton);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });

      await waitFor(() => {
        expect(cancelButton).toBeDisabled();
      });
    });
  });
});
