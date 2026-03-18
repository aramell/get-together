import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { ConvertToEventModal } from '@/components/groups/ConvertToEventModal';
import type { WishlistItemResponse } from '@/lib/validation/wishlistSchema';

// Mock fetch
global.fetch = jest.fn();

const mockItem: WishlistItemResponse = {
  id: 'item-123',
  group_id: 'group-456',
  created_by: 'user-789',
  title: 'Concert Tickets',
  description: 'Summer music festival',
  link: 'https://festival.com',
  interest_count: 5,
  user_is_interested: true,
  creator_name: 'John Doe',
  creator_email: 'john@example.com',
};

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('ConvertToEventModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render modal when isOpen is true', () => {
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByText(/Convert "Concert Tickets" to Event/i)).toBeInTheDocument();
  });

  it('should not render modal when isOpen is false', () => {
    const { container } = renderWithChakra(
      <ConvertToEventModal
        isOpen={false}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const modalContent = container.querySelector('[role="dialog"]');
    expect(modalContent).not.toBeInTheDocument();
  });

  it('should display pre-filled item title (read-only)', () => {
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const titleInput = screen.getByDisplayValue('Concert Tickets') as HTMLInputElement;
    expect(titleInput).toBeDisabled();
  });

  it('should display item link if provided', () => {
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByDisplayValue('https://festival.com')).toBeInTheDocument();
  });

  it('should display interest count badge', () => {
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByText('5 users interested')).toBeInTheDocument();
  });

  it('should display suggested threshold based on interest count', () => {
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    // Suggested threshold = ceil(5 / 2) = 3
    expect(screen.getByText(/Suggested: 3/i)).toBeInTheDocument();
  });

  it('should allow editing description field', async () => {
    const user = userEvent.setup();
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const descriptionTextarea = screen.getByDisplayValue('Summer music festival');
    await user.clear(descriptionTextarea);
    await user.type(descriptionTextarea, 'Updated description');

    expect(descriptionTextarea).toHaveValue('Updated description');
  });

  it('should show character count for description field', async () => {
    const user = userEvent.setup();
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const descriptionTextarea = screen.getByDisplayValue('Summer music festival');
    const charCount = descriptionTextarea.parentElement?.querySelector('[color="gray.500"]');

    expect(charCount).toHaveTextContent(/2000/);
  });

  it('should require date field and show validation error if empty', async () => {
    const user = userEvent.setup();
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Create Event/i });
    expect(submitButton).toBeDisabled();

    // Verify submit button becomes enabled when date is filled
    const dateInput = screen.getByLabelText(/Date & Time/i);
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    await user.type(dateInput, futureDate);

    expect(submitButton).not.toBeDisabled();
  });

  it('should validate future date and show error for past date', async () => {
    const user = userEvent.setup();
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const dateInput = screen.getByLabelText(/Date & Time/i);
    const pastDate = new Date(Date.now() - 86400000).toISOString().slice(0, 16);
    await user.type(dateInput, pastDate);

    const submitButton = screen.getByRole('button', { name: /Create Event/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/must be in the future/i)).toBeInTheDocument();
    });
  });

  it('should validate threshold field (positive number)', async () => {
    const user = userEvent.setup();
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const thresholdInput = screen.getByLabelText(/Commitment Threshold/i);
    await user.type(thresholdInput, '-5');

    const submitButton = screen.getByRole('button', { name: /Create Event/i });
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    const dateInput = screen.getByLabelText(/Date & Time/i);
    await user.type(dateInput, futureDate);

    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/must be a positive number/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = jest.fn();
    const mockOnClose = jest.fn();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Event created successfully',
        data: {
          event: { id: 'event-123', title: 'Concert Tickets' },
          itemToEventLink: { itemId: 'item-123', eventId: 'event-123' },
        },
      }),
    });

    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={mockOnClose}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={mockOnSuccess}
      />
    );

    const dateInput = screen.getByLabelText(/Date & Time/i);
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    await user.type(dateInput, futureDate);

    const submitButton = screen.getByRole('button', { name: /Create Event/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/groups/group-456/wishlist/item-123/convert'),
      expect.any(Object)
    );
  });

  it('should show error message on API failure', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        message: 'Failed to create event',
        error: 'ALREADY_CONVERTED',
      }),
    });

    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const dateInput = screen.getByLabelText(/Date & Time/i);
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    await user.type(dateInput, futureDate);

    const submitButton = screen.getByRole('button', { name: /Create Event/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to create event/i)).toBeInTheDocument();
    });
  });

  it('should disable form while submitting', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true, message: 'Success' }),
              }),
            100
          )
        )
    );

    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const dateInput = screen.getByLabelText(/Date & Time/i);
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    await user.type(dateInput, futureDate);

    const submitButton = screen.getByRole('button', { name: /Create Event/i });
    await user.click(submitButton);

    // Check that submit button shows loading state
    expect(screen.getByText(/Creating Event/i)).toBeInTheDocument();
  });

  it('should close modal when Cancel button clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();

    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={mockOnClose}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should have accessible labels for form fields', () => {
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByLabelText(/Item Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Original Link/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date & Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Commitment Threshold/i)).toBeInTheDocument();
  });

  it('should have aria-label on Create Event button', () => {
    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const createButton = screen.getByRole('button', { name: /Create event from wishlist item/i });
    expect(createButton).toBeInTheDocument();
  });

  it('should handle copy link button', async () => {
    const user = userEvent.setup();

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={mockItem}
        onSuccess={jest.fn()}
      />
    );

    const copyButton = screen.getByRole('button', { name: /Copy link/i });
    await user.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://festival.com');
  });

  it('should not display link section if item has no link', () => {
    const itemWithoutLink = { ...mockItem, link: null };

    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={itemWithoutLink}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.queryByLabelText(/Original Link/i)).not.toBeInTheDocument();
  });

  it('should show no suggested threshold if interest count is 0', () => {
    const itemNoInterest = { ...mockItem, interest_count: 0 };

    renderWithChakra(
      <ConvertToEventModal
        isOpen={true}
        onClose={jest.fn()}
        groupId="group-456"
        itemId="item-123"
        item={itemNoInterest}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.queryByText(/Suggested:/i)).not.toBeInTheDocument();
  });
});
