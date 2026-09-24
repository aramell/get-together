import React from 'react';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { format, addDays, subDays } from 'date-fns';
import { EventChecklist } from '@/components/groups/EventChecklist';
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

const mockItems = [
  { id: 'item-1', created_by: 'user-1', assigned_to: null, title: 'Book venue', is_checked: false },
  { id: 'item-2', created_by: 'other-user', assigned_to: 'user-1', title: 'Bring speakers', is_checked: false },
];

const mockMembers = [
  { user_id: 'user-1', name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { user_id: 'other-user', name: 'Bob', email: 'bob@example.com', role: 'member' },
];

const todayStr = format(new Date(), 'yyyy-MM-dd');
const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

function mockFetchSequence(itemsResponse = mockItems, membersResponse = mockMembers) {
  global.fetch = jest.fn((url: string) => {
    if (typeof url === 'string' && url.includes('/checklist')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: itemsResponse }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { members: membersResponse } }) });
  }) as unknown as typeof fetch;
}

describe('EventChecklist Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders checklist items with assignee badges', async () => {
    mockFetchSequence();
    renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByText('Book venue')).toBeInTheDocument();
      expect(screen.getByText('Bring speakers')).toBeInTheDocument();
    });

    // "Alice" appears both as the assignee badge on item-2 and as an option
    // in the add-item assignee dropdown — assert at least one match rather
    // than requiring uniqueness.
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('renders the "Checklist" section title as a semantic h2 heading', async () => {
    mockFetchSequence();
    renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /checklist/i })).toBeInTheDocument();
    });
  });

  it('populates the assignee dropdown from group members', async () => {
    mockFetchSequence();
    renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/assign to/i)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/assign to/i) as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.textContent);
    expect(optionLabels).toContain('Alice');
    expect(optionLabels).toContain('Bob');
  });

  it('adds a new item and appends it to the list', async () => {
    mockFetchSequence();
    renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Book venue')).toBeInTheDocument());

    const newItem = { id: 'item-3', created_by: 'user-1', assigned_to: null, title: 'Confirm headcount', is_checked: false };
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, data: newItem }) })
    );

    fireEvent.change(screen.getByLabelText(/new checklist item title/i), { target: { value: 'Confirm headcount' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(screen.getByText('Confirm headcount')).toBeInTheDocument();
    });
  });

  it('optimistically checks an item and reverts on request failure', async () => {
    mockFetchSequence();
    renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Book venue')).toBeInTheDocument());

    const checkbox = screen.getByRole('checkbox', { name: /mark "book venue" as done/i });
    expect(checkbox).not.toBeChecked();

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: false, json: async () => ({ success: false, error: 'Server error' }) })
    );

    fireEvent.click(checkbox);

    // Optimistic flip happens synchronously
    expect(checkbox).toBeChecked();

    // Reverts once the failed request resolves
    await waitFor(() => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it('checks an item successfully and keeps the checked state', async () => {
    mockFetchSequence();
    renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Book venue')).toBeInTheDocument());

    const checkbox = screen.getByRole('checkbox', { name: /mark "book venue" as done/i });

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, data: { ...mockItems[0], is_checked: true } }) })
    );

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });
  });

  it('shows edit/delete controls only for the item creator', async () => {
    mockFetchSequence();
    renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Book venue')).toBeInTheDocument());

    // item-1 created_by === 'user-1' (the current user) → controls present
    // item-2 created_by === 'other-user' → controls absent
    const editButtons = screen.getAllByLabelText('Edit item');
    const deleteButtons = screen.getAllByLabelText('Delete item');
    expect(editButtons).toHaveLength(1);
    expect(deleteButtons).toHaveLength(1);
  });

  it('deletes an item and removes it from the list', async () => {
    mockFetchSequence();
    renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Book venue')).toBeInTheDocument());

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, message: 'deleted' }) })
    );

    fireEvent.click(screen.getByLabelText('Delete item'));

    await waitFor(() => {
      expect(screen.queryByText('Book venue')).not.toBeInTheDocument();
    });
  });

  it('polls every 5 seconds and does not stack overlapping requests when a response is slow', async () => {
    jest.useFakeTimers();

    let resolveSlowFetch: (value: any) => void = () => {};
    let checklistCallCount = 0;

    global.fetch = jest.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/checklist')) {
        checklistCallCount += 1;
        if (checklistCallCount === 1) {
          // Initial fetch resolves immediately
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: mockItems }) });
        }
        // The first poll is slow — deliberately never resolves until we say so,
        // so we can prove the in-flight guard blocks a second overlapping poll.
        return new Promise((resolve) => {
          resolveSlowFetch = resolve;
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { members: mockMembers } }) });
    }) as unknown as typeof fetch;

    renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(checklistCallCount).toBe(1); // initial fetch

    // First poll tick — starts a slow request
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(checklistCallCount).toBe(2);

    // Second poll tick fires while the first poll is still in flight — the
    // in-flight guard (isFetchingRef) must block a third call from starting.
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(checklistCallCount).toBe(2); // still 2, not 3 — the guard worked

    // Let the slow request resolve, then confirm the next tick is allowed through.
    await act(async () => {
      resolveSlowFetch({ ok: true, json: async () => ({ success: true, data: mockItems }) });
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(checklistCallCount).toBe(3);
  });

  describe('Today/date grouping', () => {
    const groupedItems = [
      { id: 'today-item', created_by: 'user-1', assigned_to: null, title: 'Today task', is_checked: false, item_date: todayStr },
      { id: 'future-item', created_by: 'user-1', assigned_to: null, title: 'Future task', is_checked: false, item_date: tomorrowStr },
      { id: 'past-item', created_by: 'user-1', assigned_to: null, title: 'Past task', is_checked: false, item_date: yesterdayStr },
      { id: 'undated-item', created_by: 'user-1', assigned_to: null, title: 'Undated task', is_checked: false, item_date: null },
    ];

    it('renders a today-dated item inside a "Today" group above the general list', async () => {
      mockFetchSequence(groupedItems);
      renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: /today/i })).toBeInTheDocument();
        expect(screen.getByText('Today task')).toBeInTheDocument();
      });
    });

    it('renders future/past-dated items only in the general list, not duplicated under Today', async () => {
      mockFetchSequence(groupedItems);
      renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Future task')).toBeInTheDocument());
      expect(screen.getByText('Past task')).toBeInTheDocument();
      expect(screen.getAllByText('Today task')).toHaveLength(1);
    });

    it('shows a date badge on dated items and omits it on an undated item', async () => {
      mockFetchSequence(groupedItems);
      renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Today task')).toBeInTheDocument());

      const todayLabel = format(new Date(), 'MMM d');
      const todayRow = screen.getByText('Today task').closest('div') as HTMLElement;
      expect(within(todayRow).getByText(todayLabel)).toBeInTheDocument();

      const undatedRow = screen.getByText('Undated task').closest('div') as HTMLElement;
      expect(within(undatedRow).queryByText(todayLabel)).not.toBeInTheDocument();
    });

    it('does not show a "Today" heading when no item is dated today', async () => {
      mockFetchSequence([groupedItems[1], groupedItems[2], groupedItems[3]]);
      renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Future task')).toBeInTheDocument());
      expect(screen.queryByRole('heading', { level: 3, name: /today/i })).not.toBeInTheDocument();
    });

    it('regroups an item on a poll tick when its date rolls from today to yesterday, without a reload', async () => {
      jest.useFakeTimers();

      let checklistCallCount = 0;
      global.fetch = jest.fn((url: string) => {
        if (typeof url === 'string' && url.includes('/checklist')) {
          checklistCallCount += 1;
          const item_date = checklistCallCount === 1 ? todayStr : yesterdayStr;
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: [{ id: 'rollover-item', created_by: 'user-1', assigned_to: null, title: 'Rollover task', is_checked: false, item_date }],
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { members: mockMembers } }) });
      }) as unknown as typeof fetch;

      renderWithProviders(<EventChecklist eventId="event-1" groupId="group-1" />);

      await act(async () => {
        await Promise.resolve();
      });
      await waitFor(() => expect(screen.getByRole('heading', { level: 3, name: /today/i })).toBeInTheDocument());

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.queryByRole('heading', { level: 3, name: /today/i })).not.toBeInTheDocument();
        expect(screen.getByText('Rollover task')).toBeInTheDocument();
      });
    });
  });

  describe('guest (no-login) mode', () => {
    const guestChecklist = [
      { id: 'chk-1', title: 'Bring firewood', is_checked: false, assignee_first_name: 'Andrew' },
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
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { checklist: guestChecklist } }) });
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

    it('renders read-only items from the public endpoint, with no add-item form', async () => {
      renderWithProviders(<EventChecklist eventId="event-1" publicToken={'a'.repeat(64)} />);

      await waitFor(() => {
        expect(screen.getByText('Bring firewood')).toBeInTheDocument();
        expect(screen.getByText('Andrew')).toBeInTheDocument();
      });

      expect(screen.queryByLabelText(/new checklist item title/i)).not.toBeInTheDocument();
    });

    it('clicking the disabled checkbox calls requestLogin instead of toggling', async () => {
      const requestLogin = jest.fn();
      renderWithProviders(
        <EventChecklist eventId="event-1" publicToken={'a'.repeat(64)} requestLogin={requestLogin} />
      );

      await waitFor(() => expect(screen.getByText('Bring firewood')).toBeInTheDocument());

      fireEvent.click(screen.getByLabelText(/log in to mark/i));

      expect(requestLogin).toHaveBeenCalledTimes(1);
    });

    it('stays on the read-only guest view when a resolved group_id belongs to a non-member (403)', async () => {
      // Simulates a guest who logged in via the modal (accessToken now set)
      // whose public planning fetch resolved group_id, but who isn't
      // actually a member of that group -- the authenticated checklist
      // fetch below must 403, and the widget must NOT flip to the
      // interactive/member render just because group_id resolved.
      (useAuth as jest.Mock).mockReturnValue({
        userId: 'user-1',
        accessToken: 'test-token',
        isAuthenticated: true,
        isLoading: false,
      });

      global.fetch = jest.fn((url: string) => {
        if (typeof url === 'string' && url.includes('/planning')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: { checklist: guestChecklist, group_id: 'group-1' } }),
          });
        }
        if (typeof url === 'string' && url.includes('/api/groups/group-1/events/event-1/checklist')) {
          return Promise.resolve({ ok: false, status: 403, json: async () => ({ success: false, error: 'Forbidden' }) });
        }
        return Promise.resolve({ ok: false, status: 403, json: async () => ({ success: false, error: 'Forbidden' }) });
      }) as unknown as typeof fetch;

      renderWithProviders(<EventChecklist eventId="event-1" publicToken={'a'.repeat(64)} />);

      await waitFor(() => expect(screen.getByText('Bring firewood')).toBeInTheDocument());

      // Still the guest read-only render: the checkbox is wired to
      // requestLogin (aria-label says "Log in to..."), not a real toggle,
      // and no member-only add-item form is present.
      expect(screen.getByLabelText(/log in to mark/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/new checklist item title/i)).not.toBeInTheDocument();
    });
  });
});
