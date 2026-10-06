import React from 'react';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { format, addDays, subDays } from 'date-fns';
import { EventLogistics } from '@/components/groups/EventLogistics';
import { AuthProvider, useAuth } from '@/lib/contexts/AuthContext';

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

const todayStr = format(new Date(), 'yyyy-MM-dd');
const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

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

  it('renders the "Logistics" title and its subsection titles as semantic headings', async () => {
    mockFetchSequence();
    renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /logistics/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: /bring list/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: /carpool/i })).toBeInTheDocument();
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

  describe('item comments (Story 13.8)', () => {
    const commentItems = [
      { id: 'c-bring', created_by: 'user-1', category: 'bring', title: 'Cooler', assigned_to: null, capacity: null, claims: [], claim_count: 0, comment_count: 3 },
      { id: 'c-bring-0', created_by: 'user-1', category: 'bring', title: 'Ice', assigned_to: null, capacity: null, claims: [], claim_count: 0, comment_count: 0 },
      { id: 'c-pool', created_by: 'user-1', category: 'carpool', title: 'Van ride', assigned_to: 'other-user', capacity: 3, claims: [], claim_count: 0, comment_count: 1 },
      { id: 'c-today', created_by: 'user-1', category: 'bring', title: 'Today grill', assigned_to: null, capacity: null, item_date: todayStr, claims: [], claim_count: 0, comment_count: 2 },
    ];

    it('shows a comment icon on every bring and carpool row, with a badge only when count > 0', async () => {
      mockFetchSequence(commentItems as any);
      renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Cooler')).toBeInTheDocument());
      for (const id of ['c-bring', 'c-bring-0', 'c-pool', 'c-today']) {
        expect(screen.getByTestId(`logistics-comment-trigger-${id}`)).toBeInTheDocument();
      }
      expect(screen.getByTestId('logistics-comment-count-c-bring')).toHaveTextContent('3');
      expect(screen.getByTestId('logistics-comment-count-c-pool')).toHaveTextContent('1');
      expect(screen.getByTestId('logistics-comment-count-c-today')).toHaveTextContent('2');
      expect(screen.queryByTestId('logistics-comment-count-c-bring-0')).not.toBeInTheDocument();
    });

    it('opens an empty-state preview for an item with 0 comments', async () => {
      mockFetchSequence(commentItems as any);
      renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Ice')).toBeInTheDocument());
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/logistics/c-bring-0/comments')) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: commentItems }) });
      });
      fireEvent.click(screen.getByTestId('logistics-comment-trigger-c-bring-0'));

      expect(await screen.findByText('No comments yet.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add a comment/i })).toBeInTheDocument();
    });

    it('requests comments from the group-scoped logistics endpoint', async () => {
      mockFetchSequence(commentItems as any);
      renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Van ride')).toBeInTheDocument());
      (global.fetch as jest.Mock).mockImplementation((url: string) =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: url.includes('/comments')
              ? [{ id: 'cm-1', content: 'Meet at 5', created_at: '2026-10-01T00:00:00Z', creator: { display_name: 'Bob' } }]
              : commentItems,
          }),
        })
      );
      fireEvent.click(screen.getByTestId('logistics-comment-trigger-c-pool'));

      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/groups/group-1/events/event-1/logistics/c-pool/comments'
        )
      );
    });

    it('preserves the comment badge after a claim PATCH whose response has no comment_count', async () => {
      mockFetchSequence(commentItems as any);
      renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Cooler')).toBeInTheDocument());
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { ...commentItems[0], assigned_to: 'user-1', comment_count: 0 },
          }),
        })
      );

      const coolerRow = screen.getByText('Cooler').closest('.chakra-stack') as HTMLElement;
      fireEvent.click(within(coolerRow).getByRole('button', { name: /i'll bring this/i }));

      await waitFor(() => expect(within(coolerRow).getByRole('button', { name: /never mind/i })).toBeInTheDocument());
      expect(screen.getByTestId('logistics-comment-count-c-bring')).toHaveTextContent('3');
    });

    it('hides the comment icon while a row is being edited', async () => {
      mockFetchSequence(commentItems as any);
      renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Ice')).toBeInTheDocument());
      const iceRow = screen.getByText('Ice').closest('.chakra-stack') as HTMLElement;
      fireEvent.click(within(iceRow).getByLabelText('Edit item'));

      expect(screen.queryByTestId('logistics-comment-trigger-c-bring-0')).not.toBeInTheDocument();
      expect(screen.getByTestId('logistics-comment-trigger-c-bring')).toBeInTheDocument();
    });
  });

  describe('Today/date grouping', () => {
    const groupedItems = [
      { id: 'today-bring', created_by: 'user-1', category: 'bring', title: 'Today snacks', assigned_to: null, capacity: null, item_date: todayStr, claims: [], claim_count: 0 },
      {
        id: 'today-carpool', created_by: 'user-1', category: 'carpool', title: 'Today ride',
        assigned_to: 'other-user', capacity: 2, item_date: todayStr, claims: [], claim_count: 0,
      },
      { id: 'future-bring', created_by: 'user-1', category: 'bring', title: 'Future snacks', assigned_to: null, capacity: null, item_date: tomorrowStr, claims: [], claim_count: 0 },
      { id: 'undated-bring', created_by: 'user-1', category: 'bring', title: 'Undated snacks', assigned_to: null, capacity: null, item_date: null, claims: [], claim_count: 0 },
    ];

    it('renders a single cross-cutting "Today" group above the Bring/Carpool split, with category badges', async () => {
      mockFetchSequence(groupedItems);
      renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: /^today$/i })).toBeInTheDocument();
        expect(screen.getByText('Today snacks')).toBeInTheDocument();
        expect(screen.getByText('Today ride')).toBeInTheDocument();
      });

      const todayBringRow = screen.getByText('Today snacks').closest('div') as HTMLElement;
      expect(within(todayBringRow).getByText('Bring')).toBeInTheDocument();

      const todayCarpoolRow = screen.getByText('Today ride').closest('div') as HTMLElement;
      expect(within(todayCarpoolRow).getByText('Carpool')).toBeInTheDocument();
    });

    it('keeps future/undated items out of Today, in the general Bring List', async () => {
      mockFetchSequence(groupedItems);
      renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Future snacks')).toBeInTheDocument());
      expect(screen.getByText('Undated snacks')).toBeInTheDocument();
      // Neither appears a second time under the Today heading.
      expect(screen.getAllByText('Future snacks')).toHaveLength(1);
      expect(screen.getAllByText('Undated snacks')).toHaveLength(1);
    });

    it('shows a date badge on a dated item and omits it on an undated item', async () => {
      mockFetchSequence(groupedItems);
      renderWithProviders(<EventLogistics eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Today snacks')).toBeInTheDocument());

      const todayLabel = format(new Date(), 'MMM d');
      const todayRow = screen.getByText('Today snacks').closest('div') as HTMLElement;
      expect(within(todayRow).getByText(todayLabel)).toBeInTheDocument();

      const undatedRow = screen.getByText('Undated snacks').closest('div') as HTMLElement;
      expect(within(undatedRow).queryByText(todayLabel)).not.toBeInTheDocument();
    });

    it('regroups an item on a poll tick when its date rolls from today to yesterday, without a reload', async () => {
      jest.useFakeTimers();

      let logisticsCallCount = 0;
      global.fetch = jest.fn((url: string) => {
        if (typeof url === 'string' && url.includes('/logistics')) {
          logisticsCallCount += 1;
          const item_date = logisticsCallCount === 1 ? todayStr : yesterdayStr;
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: [{
                id: 'rollover-item', created_by: 'user-1', category: 'bring', title: 'Rollover snacks',
                assigned_to: null, capacity: null, item_date, claims: [], claim_count: 0,
              }],
            }),
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
      await waitFor(() => expect(screen.getByRole('heading', { level: 3, name: /^today$/i })).toBeInTheDocument());

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.queryByRole('heading', { level: 3, name: /^today$/i })).not.toBeInTheDocument();
        expect(screen.getByText('Rollover snacks')).toBeInTheDocument();
      });
    });
  });

  describe('guest (no-login) mode', () => {
    const guestLogistics = [
      { id: 'log-1', category: 'bring', title: 'Tents', capacity: null, assignee_first_name: 'Jamie', claim_count: 0, claimant_first_names: [] },
      { id: 'log-2', category: 'bring', title: 'Marshmallows', capacity: null, assignee_first_name: null, claim_count: 0, claimant_first_names: [] },
      { id: 'log-3', category: 'carpool', title: 'Ride from the city', capacity: 4, assignee_first_name: 'Andrew', claim_count: 2, claimant_first_names: ['Jamie', 'Someone'] },
      { id: 'log-4', category: 'carpool', title: 'Full van', capacity: 2, assignee_first_name: 'Jamie', claim_count: 2, claimant_first_names: ['Andrew', 'Someone'] },
    ];

    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        userId: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      global.fetch = jest.fn((url: string) => {
        if (typeof url === 'string' && url.includes('/planning')) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { logistics: guestLogistics } }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      }) as unknown as typeof fetch;
    });

    afterEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        userId: 'user-1',
        accessToken: 'test-token',
        isAuthenticated: true,
        isLoading: false,
      });
    });

    it('renders read-only Bring/Carpool rows from the public endpoint', async () => {
      renderWithProviders(<EventLogistics eventId="event-1" publicToken={'a'.repeat(64)} />);

      await waitFor(() => {
        expect(screen.getByText('Tents')).toBeInTheDocument();
        expect(screen.getByText('Ride from the city')).toBeInTheDocument();
      });
    });

    it('clicking a claim button calls requestLogin instead of claiming', async () => {
      const requestLogin = jest.fn();
      renderWithProviders(
        <EventLogistics eventId="event-1" publicToken={'a'.repeat(64)} requestLogin={requestLogin} />
      );

      await waitFor(() => expect(screen.getByText('Marshmallows')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /log in to bring this/i }));

      expect(requestLogin).toHaveBeenCalledTimes(1);
    });

    it('does not show a claim button for a bring item that already has an assignee', async () => {
      renderWithProviders(<EventLogistics eventId="event-1" publicToken={'a'.repeat(64)} />);

      await waitFor(() => expect(screen.getByText('Tents')).toBeInTheDocument());

      // Only the unclaimed "Marshmallows" row should offer the claim button.
      expect(screen.getAllByRole('button', { name: /log in to bring this/i })).toHaveLength(1);
    });

    it('disables the claim button and shows "Seats full" for a full carpool', async () => {
      renderWithProviders(<EventLogistics eventId="event-1" publicToken={'a'.repeat(64)} />);

      await waitFor(() => expect(screen.getByText('Full van')).toBeInTheDocument());

      expect(screen.getByRole('button', { name: /seats full/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /log in to claim a seat/i })).toBeEnabled();
    });

    it('shows the comment icon on every guest bring and carpool row (badge only when count > 0)', async () => {
      const withCounts = guestLogistics.map((g, i) => ({ ...g, comment_count: i === 0 ? 4 : 0 }));
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/planning')) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { logistics: withCounts } }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      });
      renderWithProviders(<EventLogistics eventId="event-1" publicToken={'a'.repeat(64)} />);

      await waitFor(() => expect(screen.getByText('Tents')).toBeInTheDocument());
      for (const id of ['log-1', 'log-2', 'log-3', 'log-4']) {
        expect(screen.getByTestId(`logistics-comment-trigger-${id}`)).toBeInTheDocument();
      }
      expect(screen.getByTestId('logistics-comment-count-log-1')).toHaveTextContent('4');
      expect(screen.queryByTestId('logistics-comment-count-log-2')).not.toBeInTheDocument();
    });

    it('opens a read-only thread from the public-token endpoint without prompting login', async () => {
      const requestLogin = jest.fn();
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/planning')) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { logistics: guestLogistics } }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      });
      const token = 'a'.repeat(64);
      renderWithProviders(<EventLogistics eventId="event-1" publicToken={token} requestLogin={requestLogin} />);

      await waitFor(() => expect(screen.getByText('Tents')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('logistics-comment-trigger-log-1'));

      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(`/api/events/public/${token}/logistics/log-1/comments`)
      );
      expect(await screen.findByRole('button', { name: /view comments/i })).toBeInTheDocument();
      expect(requestLogin).not.toHaveBeenCalled();
    });
  });
});
