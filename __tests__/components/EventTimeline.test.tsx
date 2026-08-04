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

  it('does not poll — fetches once on mount and issues no further requests over time', async () => {
    jest.useFakeTimers();
    mockFetchSequence();

    renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);

    await act(async () => {
      await Promise.resolve();
    });

    const callCountAfterMount = (global.fetch as jest.Mock).mock.calls.length;
    expect(callCountAfterMount).toBeGreaterThan(0);

    await act(async () => {
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
    });

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(callCountAfterMount);
  });
});
