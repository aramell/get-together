import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { WishlistDetail } from '@/components/groups/WishlistDetail';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const renderWithChakra = (component: React.ReactNode) => {
  return render(
    <ChakraProvider>
      {component}
    </ChakraProvider>
  );
};

describe('WishlistDetail Component', () => {
  const mockGroupId = 'group-123';
  const mockItemId = 'item-456';
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with title when isOpen is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: mockItemId,
          group_id: mockGroupId,
          created_by: 'user-123',
          title: 'Concert Tickets',
          description: 'Summer concerts',
          link: 'https://ticketmaster.com',
          created_at: '2026-03-16T10:00:00Z',
          updated_at: '2026-03-16T10:00:00Z',
          creator_name: 'John Doe',
          creator_email: 'john@example.com',
          interest_count: 5,
          user_is_interested: false,
        },
      }),
    });

    renderWithChakra(
      <WishlistDetail
        isOpen={true}
        onClose={mockOnClose}
        itemId={mockItemId}
        groupId={mockGroupId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Wishlist Item Details')).toBeInTheDocument();
    });
  });

  it('should display interest count from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: mockItemId,
          group_id: mockGroupId,
          created_by: 'user-123',
          title: 'Concert Tickets',
          description: null,
          link: null,
          created_at: '2026-03-16T10:00:00Z',
          updated_at: '2026-03-16T10:00:00Z',
          creator_name: 'John Doe',
          creator_email: 'john@example.com',
          interest_count: 5,
          user_is_interested: false,
        },
      }),
    });

    renderWithChakra(
      <WishlistDetail
        isOpen={true}
        onClose={mockOnClose}
        itemId={mockItemId}
        groupId={mockGroupId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('5 interested')).toBeInTheDocument();
    });
  });

  it('should show "Mark Interest" button when user is not interested', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: mockItemId,
          group_id: mockGroupId,
          created_by: 'user-123',
          title: 'Concert Tickets',
          created_at: '2026-03-16T10:00:00Z',
          updated_at: '2026-03-16T10:00:00Z',
          creator_name: 'John Doe',
          creator_email: 'john@example.com',
          interest_count: 5,
          user_is_interested: false,
        },
      }),
    });

    renderWithChakra(
      <WishlistDetail
        isOpen={true}
        onClose={mockOnClose}
        itemId={mockItemId}
        groupId={mockGroupId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Mark Interest')).toBeInTheDocument();
    });
  });

  it('should show "Unmark Interest" button when user is interested', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: mockItemId,
          group_id: mockGroupId,
          created_by: 'user-123',
          title: 'Concert Tickets',
          created_at: '2026-03-16T10:00:00Z',
          updated_at: '2026-03-16T10:00:00Z',
          creator_name: 'John Doe',
          creator_email: 'john@example.com',
          interest_count: 5,
          user_is_interested: true,
        },
      }),
    });

    renderWithChakra(
      <WishlistDetail
        isOpen={true}
        onClose={mockOnClose}
        itemId={mockItemId}
        groupId={mockGroupId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Unmark Interest')).toBeInTheDocument();
    });
  });

  it('should send POST request when marking interest', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: mockItemId,
          group_id: mockGroupId,
          created_by: 'user-123',
          title: 'Concert Tickets',
          created_at: '2026-03-16T10:00:00Z',
          updated_at: '2026-03-16T10:00:00Z',
          creator_name: 'John Doe',
          creator_email: 'john@example.com',
          interest_count: 5,
          user_is_interested: false,
        },
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { interest_count: 6 },
      }),
    });

    renderWithChakra(
      <WishlistDetail
        isOpen={true}
        onClose={mockOnClose}
        itemId={mockItemId}
        groupId={mockGroupId}
      />
    );

    const button = await waitFor(() => screen.getByText('Mark Interest'));
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/groups/${mockGroupId}/wishlist/${mockItemId}/interest`,
        { method: 'POST' }
      );
    });
  });

  it('should show error when fetching item fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    renderWithChakra(
      <WishlistDetail
        isOpen={true}
        onClose={mockOnClose}
        itemId={mockItemId}
        groupId={mockGroupId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Item not found')).toBeInTheDocument();
    });
  });
});
