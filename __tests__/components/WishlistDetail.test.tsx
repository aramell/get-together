import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { WishlistDetail } from '@/components/groups/WishlistDetail';
import { ChakraProvider } from '@chakra-ui/react';

// Mock fetch
global.fetch = jest.fn();

// Wrap component with Chakra provider for testing
const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('WishlistDetail', () => {
  const mockGroupId = 'group-123';
  const mockItemId = 'item-456';
  const mockItem = {
    id: mockItemId,
    group_id: mockGroupId,
    created_by: 'user-789',
    title: 'Concert Tickets',
    description: 'Get tickets for summer concerts at the amphitheater',
    link: 'https://ticketmaster.com',
    creator_name: 'John Doe',
    creator_email: 'john@example.com',
    created_at: '2026-03-16T10:00:00Z',
    updated_at: '2026-03-16T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state when fetching', () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(() => {
          /* Never resolves */
        })
    );

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    // Modal should be open and Spinner should be rendering (will not find item details yet)
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText(mockItem.title)).not.toBeInTheDocument();
  });

  it('should fetch and display item details when modal opens', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockItem,
      }),
    });

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    await waitFor(() => {
      expect(screen.getByText(mockItem.title)).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText(mockItem.description)).toBeInTheDocument();
  });

  it('should display link as clickable with correct attributes', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockItem,
      }),
    });

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    await waitFor(() => {
      const link = screen.getByRole('link', { name: mockItem.link });
      expect(link).toHaveAttribute('href', mockItem.link);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('should display interest count placeholder', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockItem,
      }),
    });

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    await waitFor(() => {
      expect(screen.getByText('0 interested')).toBeInTheDocument();
      expect(screen.getByText('(Coming in Story 5.3)')).toBeInTheDocument();
    });
  });

  it('should display disabled buttons for future features', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockItem,
      }),
    });

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mark Interested/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Convert to Event/i })).toBeDisabled();
    });
  });

  it('should handle 404 error when item not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    await waitFor(() => {
      expect(screen.getByText('Item not found')).toBeInTheDocument();
    });
  });

  it('should handle 403 error when user lacks access', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    await waitFor(() => {
      expect(screen.getByText('You do not have access to this item')).toBeInTheDocument();
    });
  });

  it('should handle generic fetch errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch item details')).toBeInTheDocument();
    });
  });

  it('should call API with correct itemId and groupId', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockItem,
      }),
    });

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/groups/${mockGroupId}/wishlist/${mockItemId}`
      );
    });
  });

  it('should handle missing description gracefully', async () => {
    const itemWithoutDesc = { ...mockItem, description: null };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: itemWithoutDesc,
      }),
    });

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    await waitFor(() => {
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });
  });

  it('should handle missing link gracefully', async () => {
    const itemWithoutLink = { ...mockItem, link: null };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: itemWithoutLink,
      }),
    });

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    await waitFor(() => {
      expect(screen.queryByText('Link')).not.toBeInTheDocument();
    });
  });

  it('should render with proper semantic HTML and ARIA labels', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockItem,
      }),
    });

    renderWithChakra(
      <WishlistDetail isOpen={true} onClose={jest.fn()} itemId={mockItemId} groupId={mockGroupId} />
    );

    await waitFor(() => {
      // Modal should be present with proper role
      expect(screen.getByRole('dialog', { name: 'Wishlist Item Details' })).toBeInTheDocument();

      // Close button should be present and accessible
      expect(screen.getAllByRole('button', { name: 'Close' })[0]).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
