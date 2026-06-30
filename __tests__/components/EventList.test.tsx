import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock Chakra UI components
jest.mock('@chakra-ui/react', () => ({
  Box: ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>,
  VStack: ({ children, ...props }: any) => <div data-testid="vstack" {...props}>{children}</div>,
  HStack: ({ children, ...props }: any) => <div data-testid="hstack" {...props}>{children}</div>,
  Button: ({ children, onClick, ...props }: any) => (
    <button data-testid="button" onClick={onClick} {...props}>{children}</button>
  ),
  Spinner: () => <div data-testid="spinner">Loading...</div>,
  Text: ({ children, ...props }: any) => <p data-testid="text" {...props}>{children}</p>,
  Alert: ({ children, ...props }: any) => <div data-testid="alert" {...props}>{children}</div>,
  AlertIcon: () => <span data-testid="alert-icon" />,
  useToast: () => jest.fn(),
}));

// Mock EventCard
jest.mock('@/components/groups/EventCard', () => ({
  EventCard: ({ event, userRsvpStatus, onClick }: any) => (
    <div data-testid="event-card" onClick={onClick}>
      <h3>{event.title}</h3>
      <p>{event.momentum.in} in, {event.momentum.maybe} maybe, {event.momentum.out} out</p>
      {userRsvpStatus && <span>RSVP: {userRsvpStatus}</span>}
    </div>
  ),
}));

// Import component after mocking
const EventList = require('@/components/groups/EventList').EventList;

describe('EventList Component', () => {
  const mockEvents = [
    {
      id: '1',
      title: 'Pizza Night',
      date: '2026-04-20T19:00:00Z',
      status: 'proposal',
      momentum: { in: 3, maybe: 1, out: 0 },
      threshold: 5,
    },
    {
      id: '2',
      title: 'Hiking Trip',
      date: '2026-05-10T08:00:00Z',
      status: 'confirmed',
      momentum: { in: 5, maybe: 0, out: 1 },
      threshold: null,
    },
  ];

  let mockFetch: jest.Mock;
  let pollingInterval: NodeJS.Timeout | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    (global as any).fetch = mockFetch;

    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockEvents,
        total_count: 2,
      }),
    });

    // Clear any intervals
    jest.clearAllTimers();
  });

  afterEach(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    jest.clearAllTimers();
  });

  describe('Initial Load', () => {
    it('should display events when loaded successfully', async () => {
      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={() => {}}
        />
      );

      // Should show loading initially
      expect(screen.getByTestId('spinner')).toBeInTheDocument();

      // Wait for events to load
      await waitFor(() => {
        expect(screen.getAllByTestId('event-card')).toHaveLength(2);
      });

      expect(screen.getByText('Pizza Night')).toBeInTheDocument();
      expect(screen.getByText('Hiking Trip')).toBeInTheDocument();
    });

    it('should show empty state when no events', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          total_count: 0,
        }),
      });

      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument();
        expect(screen.getByText(/No events yet/i)).toBeInTheDocument();
      });
    });

    it('should show error state on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument();
        expect(screen.getByText(/Error loading events/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should load events with default pagination parameters', async () => {
      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={() => {}}
        />
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getAllByTestId('event-card')).toHaveLength(2);
      });

      // Check that fetch was called with correct URL
      expect(mockFetch).toHaveBeenCalled();
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/api/groups/group-123/events');
      expect(callUrl).toContain('limit=20');
      expect(callUrl).toContain('offset=0');
    });

    it('should show Load More button when more events exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockEvents.slice(0, 1),
          total_count: 5,
        }),
      });

      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={1}
          onEventClick={() => {}}
        />
      );

      await waitFor(() => {
        const loadMoreBtn = screen.getByText(/Load More/i);
        expect(loadMoreBtn).toBeInTheDocument();
      });
    });

    it.skip('should load next page when Load More is clicked', async () => {
      // First fetch - only first event
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockEvents[0]],
          total_count: 2,
        }),
      });

      // Second fetch - when Load More is clicked
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockEvents[1]],
          total_count: 2,
        }),
      });

      const { rerender } = render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={1}
          onEventClick={() => {}}
        />
      );

      // First page should load
      await waitFor(() => {
        expect(screen.getByText('Pizza Night')).toBeInTheDocument();
      });

      // Now there should be a Load More button since total_count=2 and offset=1
      let loadMoreBtn: HTMLElement | null = null;
      await waitFor(() => {
        const buttons = screen.getAllByTestId('button');
        loadMoreBtn = buttons.find(btn => btn.textContent?.includes('Load'));
        expect(loadMoreBtn).toBeTruthy();
      });

      // Click the Load More button
      if (loadMoreBtn) {
        fireEvent.click(loadMoreBtn);
      }

      // Second page should load - both events should be visible now
      await waitFor(() => {
        expect(screen.getByText('Hiking Trip')).toBeInTheDocument();
      });

      // Should have made 2 API calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should hide Load More button when all events are loaded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockEvents,
          total_count: 2,
        }),
      });

      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={() => {}}
        />
      );

      await waitFor(() => {
        const loadMoreBtn = screen.queryByText(/Load More/i);
        expect(loadMoreBtn).not.toBeInTheDocument();
      });
    });
  });

  describe('Real-Time Polling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should poll events every 5 seconds', async () => {
      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={() => {}}
          enablePolling={true}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Advance time by 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should detect new events via polling', async () => {
      const newEvent = {
        id: '3',
        title: 'New Event',
        date: '2026-06-01T10:00:00Z',
        status: 'proposal',
        momentum: { in: 0, maybe: 0, out: 0 },
        threshold: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockEvents,
            total_count: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [...mockEvents, newEvent],
            total_count: 3,
          }),
        });

      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={() => {}}
          enablePolling={true}
        />
      );

      // Initial load
      await waitFor(() => {
        expect(screen.getAllByTestId('event-card')).toHaveLength(2);
      });

      // Advance time for next poll
      jest.advanceTimersByTime(5000);

      // Should show new event
      await waitFor(() => {
        expect(screen.getByText('New Event')).toBeInTheDocument();
      });
    });

    it('should update momentum counts in real-time', async () => {
      const updatedEvents = [
        { ...mockEvents[0], momentum: { in: 5, maybe: 0, out: 0 } },
        mockEvents[1],
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockEvents,
            total_count: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: updatedEvents,
            total_count: 2,
          }),
        });

      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={() => {}}
          enablePolling={true}
        />
      );

      // Initial momentum: 3 in
      await waitFor(() => {
        expect(screen.getByText('3 in, 1 maybe, 0 out')).toBeInTheDocument();
      });

      // Advance timer for polling
      jest.advanceTimersByTime(5000);

      // Updated momentum: 5 in
      await waitFor(() => {
        expect(screen.getByText('5 in, 0 maybe, 0 out')).toBeInTheDocument();
      });
    });

    it('should not poll when enablePolling is false', async () => {
      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={() => {}}
          enablePolling={false}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Advance time by 10 seconds
      jest.advanceTimersByTime(10000);

      // Should not have made additional calls
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Interaction', () => {
    it('should call onEventClick when event card is clicked', async () => {
      const mockOnClick = jest.fn();

      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={mockOnClick}
        />
      );

      await waitFor(() => {
        const eventCard = screen.getAllByTestId('event-card')[0];
        fireEvent.click(eventCard);
      });

      expect(mockOnClick).toHaveBeenCalledWith(mockEvents[0]);
    });
  });

  describe('RSVP Status Display', () => {
    it('should show user RSVP status if provided', async () => {
      const userRsvpStatus = { '1': 'in' };

      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={() => {}}
          userRsvpStatus={userRsvpStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('RSVP: in')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while fetching', () => {
      mockFetch.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: [], total_count: 0 }),
        }), 1000))
      );

      render(
        <EventList
          groupId="group-123"
          userId="user-456"
          limit={20}
          onEventClick={() => {}}
        />
      );

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });
});
