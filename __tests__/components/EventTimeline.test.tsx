import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventTimeline } from '@/components/groups/EventTimeline';
import { AuthProvider } from '@/lib/contexts/AuthContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/groups/group-1/events/event-1',
}));

jest.mock('@/lib/contexts/AuthContext', () => ({
  ...jest.requireActual('@/lib/contexts/AuthContext'),
  useAuth: jest.fn(() => ({
    userId: 'user-1',
    accessToken: 'test-token',
    isAuthenticated: true,
    isLoading: false,
  })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider>
      <AuthProvider>{component}</AuthProvider>
    </ChakraProvider>
  );
};

const mockItems = [
  {
    id: 'item-1',
    created_by: 'user-1',
    item_time: '2026-08-15T18:00:00.000Z',
    title: 'Arrive',
    description: null,
  },
  {
    id: 'item-2',
    created_by: 'other-user',
    item_time: '2026-08-15T19:00:00.000Z',
    title: 'Dinner',
    description: 'At the big table',
  },
];

function mockFetchSequence(itemsResponse = mockItems) {
  global.fetch = jest.fn((url: string) => {
    if (typeof url === 'string' && url.includes('/timeline')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: itemsResponse }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ success: true, data: {} }) });
  }) as unknown as typeof fetch;
}

describe('EventTimeline Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders timeline items ordered as returned, with time and title', async () => {
    mockFetchSequence();
    renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByText('Arrive')).toBeInTheDocument();
      expect(screen.getByText('Dinner')).toBeInTheDocument();
    });

    expect(screen.getByText('At the big table')).toBeInTheDocument();
  });

  it('renders the "Timeline" section title as a semantic h2 heading', async () => {
    mockFetchSequence();
    renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /timeline/i })).toBeInTheDocument();
    });
  });

  it('adds a new item and refetches the list', async () => {
    mockFetchSequence();
    renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Arrive')).toBeInTheDocument());

    const newItem = {
      id: 'item-3',
      created_by: 'user-1',
      item_time: '2026-08-15T21:00:00.000Z',
      title: 'Games',
      description: null,
    };
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, data: newItem }) })
    );
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, data: [...mockItems, newItem] }) })
    );

    fireEvent.change(screen.getByLabelText(/new timeline item time/i), { target: { value: '2026-08-15T21:00' } });
    fireEvent.change(screen.getByLabelText(/new timeline item title/i), { target: { value: 'Games' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(screen.getByText('Games')).toBeInTheDocument();
    });
  });

  it('shows edit/delete controls only for the item creator', async () => {
    mockFetchSequence();
    renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Arrive')).toBeInTheDocument());

    // item-1 created_by === 'user-1' (the current user) → controls present
    // item-2 created_by === 'other-user' → controls absent
    const editButtons = screen.getAllByLabelText('Edit item');
    const deleteButtons = screen.getAllByLabelText('Delete item');
    expect(editButtons).toHaveLength(1);
    expect(deleteButtons).toHaveLength(1);
  });

  it('deletes an item and removes it from the list', async () => {
    mockFetchSequence();
    renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Arrive')).toBeInTheDocument());

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, message: 'deleted' }) })
    );

    fireEvent.click(screen.getByLabelText('Delete item'));

    await waitFor(() => {
      expect(screen.queryByText('Arrive')).not.toBeInTheDocument();
    });
  });

  it('polls every 5 seconds and does not stack overlapping requests when a response is slow', async () => {
    jest.useFakeTimers();

    let resolveSlowFetch: (value: any) => void = () => {};
    let timelineCallCount = 0;

    global.fetch = jest.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/timeline')) {
        timelineCallCount += 1;
        if (timelineCallCount === 1) {
          // Initial fetch resolves immediately
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: mockItems }) });
        }
        // The first poll is slow — deliberately never resolves until we say so,
        // so we can prove the in-flight guard blocks a second overlapping poll.
        return new Promise((resolve) => {
          resolveSlowFetch = resolve;
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: {} }) });
    }) as unknown as typeof fetch;

    renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(timelineCallCount).toBe(1); // initial fetch

    // First poll tick — starts a slow request
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(timelineCallCount).toBe(2);

    // Second poll tick fires while the first poll is still in flight — the
    // in-flight guard (isFetchingRef) must block a third call from starting.
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(timelineCallCount).toBe(2); // still 2, not 3 — the guard worked

    // Let the slow request resolve, then confirm the next tick is allowed through.
    await act(async () => {
      resolveSlowFetch({ ok: true, json: async () => ({ success: true, data: mockItems }) });
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(timelineCallCount).toBe(3);
  });
});
