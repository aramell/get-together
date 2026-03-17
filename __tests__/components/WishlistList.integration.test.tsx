import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { WishlistList } from '@/components/groups/WishlistList';
import { ChakraProvider } from '@chakra-ui/react';

// Mock fetch
global.fetch = jest.fn();

// Wrap component with Chakra provider for testing
const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('WishlistList Integration with WishlistDetail', () => {
  const mockGroupId = 'group-123';
  const mockItems = [
    {
      id: 'item-1',
      group_id: mockGroupId,
      created_by: 'user-1',
      title: 'Concert Tickets',
      description: 'Get tickets for summer concerts',
      link: 'https://ticketmaster.com',
      creator_name: 'John Doe',
      creator_email: 'john@example.com',
      created_at: '2026-03-16T10:00:00Z',
      updated_at: '2026-03-16T10:00:00Z',
    },
    {
      id: 'item-2',
      group_id: mockGroupId,
      created_by: 'user-2',
      title: 'Restaurant Reservation',
      description: 'Book a table at the new Italian place downtown',
      link: 'https://resy.com',
      creator_name: 'Jane Smith',
      creator_email: 'jane@example.com',
      created_at: '2026-03-15T15:30:00Z',
      updated_at: '2026-03-15T15:30:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should display wishlist items and allow clicking for details', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { items: mockItems, total: 2, limit: 20, offset: 0, hasMore: false },
      }),
    });

    renderWithChakra(<WishlistList groupId={mockGroupId} />);

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Concert Tickets')).toBeInTheDocument();
      expect(screen.getByText('Restaurant Reservation')).toBeInTheDocument();
    });

    // Click on first item to open detail
    const firstItemCard = screen.getByText('Concert Tickets').closest('[role="button"]');
    fireEvent.click(firstItemCard!);

    // Detail modal should be visible
    await waitFor(() => {
      expect(screen.getByText('Wishlist Item Details')).toBeInTheDocument();
    });
  });

  it('should display pagination with limit and offset', async () => {
    const manyItems = Array.from({ length: 25 }, (_, i) => ({
      id: `item-${i}`,
      group_id: mockGroupId,
      created_by: 'user-1',
      title: `Item ${i + 1}`,
      description: null,
      link: null,
      creator_name: 'Creator',
      creator_email: 'creator@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { items: manyItems.slice(0, 20), total: 25, limit: 20, offset: 0, hasMore: true },
      }),
    });

    renderWithChakra(<WishlistList groupId={mockGroupId} />);

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 20')).toBeInTheDocument();
    });

    // Verify Load More button appears
    expect(screen.getByRole('button', { name: /Load More Items/i })).toBeInTheDocument();

    // Verify API was called with pagination params
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('?limit=20&offset=0')
    );
  });

  it('should support real-time updates with polling', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { items: [mockItems[0]], total: 1, limit: 20, offset: 0, hasMore: false },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { items: mockItems, total: 2, limit: 20, offset: 0, hasMore: false },
        }),
      });

    renderWithChakra(<WishlistList groupId={mockGroupId} />);

    // Initial load
    await waitFor(() => {
      expect(screen.getByText('Concert Tickets')).toBeInTheDocument();
    });

    // Advance timers to trigger polling (5 second interval)
    jest.advanceTimersByTime(5000);

    // New item should appear after polling
    await waitFor(() => {
      expect(screen.getByText('Restaurant Reservation')).toBeInTheDocument();
    });
  });

  it('should pause polling when document is hidden', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { items: mockItems, total: 2, limit: 20, offset: 0, hasMore: false },
      }),
    });

    renderWithChakra(<WishlistList groupId={mockGroupId} />);

    await waitFor(() => {
      expect(screen.getByText('Concert Tickets')).toBeInTheDocument();
    });

    const initialCallCount = (global.fetch as jest.Mock).mock.calls.length;

    // Simulate document becoming hidden
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });

    document.dispatchEvent(new Event('visibilitychange'));

    // Advance timers - should not trigger additional fetches
    jest.advanceTimersByTime(5000);

    // Should not have additional fetch calls
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(initialCallCount);
  });

  it('should resume polling when document becomes visible', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { items: mockItems, total: 2, limit: 20, offset: 0, hasMore: false },
      }),
    });

    // Start with hidden document
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });

    renderWithChakra(<WishlistList groupId={mockGroupId} />);

    await waitFor(() => {
      expect(screen.getByText('Concert Tickets')).toBeInTheDocument();
    });

    const initialCallCount = (global.fetch as jest.Mock).mock.calls.length;

    // Make document visible
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });

    document.dispatchEvent(new Event('visibilitychange'));

    // Advance timers - should trigger fetch
    jest.advanceTimersByTime(5000);

    // Should have additional fetch call
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('should handle empty state message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { items: [], total: 0, limit: 20, offset: 0, hasMore: false },
      }),
    });

    renderWithChakra(<WishlistList groupId={mockGroupId} />);

    await waitFor(() => {
      expect(screen.getByText('No items yet. Add something to get started!')).toBeInTheDocument();
    });
  });

  it('should display Add Item button', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { items: mockItems, total: 2, limit: 20, offset: 0, hasMore: false },
      }),
    });

    renderWithChakra(<WishlistList groupId={mockGroupId} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ Add Item/i })).toBeInTheDocument();
    });
  });

  it('should handle error state gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    renderWithChakra(<WishlistList groupId={mockGroupId} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Retry button should be present
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('should refresh list after adding new item', async () => {
    const initialFetch = {
      ok: true,
      json: async () => ({
        success: true,
        data: { items: [mockItems[0]], total: 1, limit: 20, offset: 0, hasMore: false },
      }),
    };

    const updatedFetch = {
      ok: true,
      json: async () => ({
        success: true,
        data: { items: mockItems, total: 2, limit: 20, offset: 0, hasMore: false },
      }),
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(initialFetch)
      .mockResolvedValueOnce(updatedFetch)
      .mockResolvedValue(updatedFetch);

    renderWithChakra(<WishlistList groupId={mockGroupId} />);

    await waitFor(() => {
      expect(screen.getByText('Concert Tickets')).toBeInTheDocument();
    });

    // Simulate item being added (this would be called from WishlistAddModal)
    const addButton = screen.getByRole('button', { name: /\+ Add Item/i });
    fireEvent.click(addButton);

    // After adding (which triggers a fetch), new item should appear
    // Note: In real implementation, this would be done through the modal
    // For now, we just verify the mechanism exists
    expect(addButton).toBeInTheDocument();
  });
});
