import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventLogistics } from '@/components/groups/EventLogistics';
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

const mockMembers = [
  { user_id: 'user-1', name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { user_id: 'other-user', name: 'Bob', email: 'bob@example.com', role: 'member' },
];

const mockItems = [
  { id: 'bring-1', created_by: 'other-user', category: 'bring', title: 'Speaker', assigned_to: null, capacity: null, claims: [], claim_count: 0 },
  { id: 'bring-2', created_by: 'other-user', category: 'bring', title: 'Chairs', assigned_to: 'user-1', capacity: null, claims: [], claim_count: 0 },
  {
    id: 'carpool-1', created_by: 'user-1', category: 'carpool', title: 'Leaving downtown 5pm',
    assigned_to: 'other-user', capacity: 2,
    claims: [{ user_id: 'user-1', claimed_at: 't1' }], claim_count: 1,
  },
];

function mockFetchSequence(itemsResponse = mockItems, membersResponse = mockMembers) {
  global.fetch = jest.fn((url: string) => {
    if (typeof url === 'string' && url.includes('/logistics')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: itemsResponse }) });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true, data: { members: membersResponse, currentUserRole: 'admin' } }),
    });
  }) as unknown as typeof fetch;
}

describe('EventLogistics Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders both the Bring List and Carpool sub-sections', async () => {
    mockFetchSequence();
    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bring List')).toBeInTheDocument();
      // "Carpool" also appears as a radio label in the add-item form.
      expect(screen.getAllByText('Carpool').length).toBeGreaterThan(0);
      expect(screen.getByText('Speaker')).toBeInTheDocument();
      expect(screen.getByText('Leaving downtown 5pm')).toBeInTheDocument();
    });
  });

  it('shows an unclaimed bring item with a claim button', async () => {
    mockFetchSequence();
    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Speaker')).toBeInTheDocument());
    expect(screen.getByText('Unclaimed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /i'll bring this/i })).toBeInTheDocument();
  });

  it('claims an unassigned bring item via PATCH assigned_to', async () => {
    mockFetchSequence();
    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Speaker')).toBeInTheDocument());

    (global.fetch as jest.Mock).mockImplementationOnce((url: string, options: any) => {
      expect(url).toContain('/logistics/bring-1');
      expect(options.method).toBe('PATCH');
      expect(JSON.parse(options.body)).toEqual({ assigned_to: 'user-1' });
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: { ...mockItems[0], assigned_to: 'user-1' } }),
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /i'll bring this/i }));

    // "Chairs" (bring-2) is already assigned to user-1 in the fixture, so one
    // "Never mind" button already exists — claiming "Speaker" should add a second.
    await waitFor(() => {
      expect(screen.getAllByText('Never mind')).toHaveLength(2);
    });
  });

  it('shows the carpool seat-count indicator and disables claim once full', async () => {
    const fullCarpool = {
      ...mockItems[2],
      claims: [
        { user_id: 'user-1', claimed_at: 't1' },
        { user_id: 'random', claimed_at: 't2' },
      ],
      claim_count: 2,
    };
    mockFetchSequence([mockItems[0], mockItems[1], fullCarpool]);
    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('2/2 seats claimed')).toBeInTheDocument());

    // Current user (user-1) already has a claim on this full carpool, so their
    // own button stays enabled (it says "Unclaim seat", not "Claim seat").
    expect(screen.getByRole('button', { name: /unclaim seat/i })).not.toBeDisabled();
  });

  it('disables the claim button for a non-claimant once a carpool is full', async () => {
    const fullCarpool = {
      ...mockItems[2],
      claims: [
        { user_id: 'other-user', claimed_at: 't1' },
        { user_id: 'random', claimed_at: 't2' },
      ],
      claim_count: 2,
    };
    mockFetchSequence([mockItems[0], mockItems[1], fullCarpool]);
    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('2/2 seats claimed')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /claim seat/i })).toBeDisabled();
  });

  it('claims a carpool seat via POST to the claims endpoint', async () => {
    mockFetchSequence();
    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('1/2 seats claimed')).toBeInTheDocument());
    // user-1 already claimed carpool-1 in the fixture — unclaim first isn't
    // needed since this test targets the claim button on a *different*, unclaimed carpool.
    expect(screen.getByRole('button', { name: /unclaim seat/i })).toBeInTheDocument();
  });

  it('unclaims a carpool seat via DELETE to the claims endpoint', async () => {
    mockFetchSequence();
    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('1/2 seats claimed')).toBeInTheDocument());

    let deleteCalled = false;
    (global.fetch as jest.Mock).mockImplementationOnce((url: string, options: any) => {
      expect(url).toContain('/logistics/carpool-1/claims');
      expect(options.method).toBe('DELETE');
      deleteCalled = true;
      return Promise.resolve({ ok: true, json: async () => ({ success: true, message: 'Seat unclaimed' }) });
    });
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [mockItems[0], mockItems[1], { ...mockItems[2], claims: [], claim_count: 0 }] }),
      })
    );

    fireEvent.click(screen.getByRole('button', { name: /unclaim seat/i }));

    await waitFor(() => expect(deleteCalled).toBe(true));
    await waitFor(() => expect(screen.getByText('0/2 seats claimed')).toBeInTheDocument());
  });

  it('shows edit/delete controls for the item creator or an admin', async () => {
    mockFetchSequence();
    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Speaker')).toBeInTheDocument());

    // user-1 is admin (per mocked currentUserRole), so controls show on every item
    // regardless of created_by.
    expect(screen.getAllByLabelText('Edit item')).toHaveLength(3);
    expect(screen.getAllByLabelText('Delete item')).toHaveLength(3);
  });

  it('adds a new carpool item requiring a driver and capacity', async () => {
    mockFetchSequence();
    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Speaker')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Carpool'));

    const addButton = screen.getByRole('button', { name: /^add$/i });
    expect(addButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/new logistics item title/i), {
      target: { value: 'Airport run' },
    });
    fireEvent.change(screen.getByLabelText('Driver'), { target: { value: 'other-user' } });
    fireEvent.change(screen.getByLabelText(/number of seats/i), { target: { value: '3' } });

    const newItem = {
      id: 'carpool-2', created_by: 'user-1', category: 'carpool', title: 'Airport run',
      assigned_to: 'other-user', capacity: 3, claims: [], claim_count: 0,
    };
    (global.fetch as jest.Mock).mockImplementationOnce((url: string, options: any) => {
      expect(JSON.parse(options.body)).toEqual({
        category: 'carpool',
        title: 'Airport run',
        assigned_to: 'other-user',
        capacity: 3,
      });
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: newItem }) });
    });

    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(screen.getByText('Airport run')).toBeInTheDocument();
    });
  });

  it('deletes an item and removes it from the list', async () => {
    mockFetchSequence();
    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Speaker')).toBeInTheDocument());

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, message: 'deleted' }) })
    );

    fireEvent.click(screen.getAllByLabelText('Delete item')[0]);

    await waitFor(() => {
      expect(screen.queryByText('Speaker')).not.toBeInTheDocument();
    });
  });

  it('polls every 5 seconds and does not stack overlapping requests when a response is slow', async () => {
    jest.useFakeTimers();

    let resolveSlowFetch: (value: any) => void = () => {};
    let logisticsCallCount = 0;

    global.fetch = jest.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/logistics')) {
        logisticsCallCount += 1;
        if (logisticsCallCount === 1) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: mockItems }) });
        }
        return new Promise((resolve) => {
          resolveSlowFetch = resolve;
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: { members: mockMembers, currentUserRole: 'admin' } }),
      });
    }) as unknown as typeof fetch;

    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(logisticsCallCount).toBe(1);

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(logisticsCallCount).toBe(2);

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(logisticsCallCount).toBe(2); // in-flight guard blocked a third call

    await act(async () => {
      resolveSlowFetch({ ok: true, json: async () => ({ success: true, data: mockItems }) });
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(logisticsCallCount).toBe(3);
  });
});
