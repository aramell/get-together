import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventTimeline } from '@/components/groups/EventTimeline';
import { AuthProvider, useAuth } from '@/lib/contexts/AuthContext';
import { EventLabelsProvider } from '@/components/groups/EventLabelsContext';

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

  it('uses the Dinner label for the heading inside a provider', async () => {
    mockFetchSequence();
    renderWithProviders(
      <EventLabelsProvider eventType="dinner">
        <EventTimeline eventId="event-1" groupId="group-1" />
      </EventLabelsProvider>
    );
    expect(await screen.findByRole('heading', { level: 2, name: 'Schedule' })).toBeInTheDocument();
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

  describe('item comments (Story 14.3)', () => {
    const commentItems = [
      { ...mockItems[0], comment_count: 3 },
      { ...mockItems[1], comment_count: 0 },
    ];

    it('shows a comment icon on every row (including non-creator rows), with a badge only when count > 0', async () => {
      mockFetchSequence(commentItems as any);
      renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Arrive')).toBeInTheDocument());
      expect(screen.getByTestId('timeline-comment-trigger-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-comment-trigger-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-comment-count-item-1')).toHaveTextContent('3');
      expect(screen.queryByTestId('timeline-comment-count-item-2')).not.toBeInTheDocument();
      // Non-creator still sees no edit/delete item controls.
      expect(screen.getAllByLabelText('Edit item')).toHaveLength(1);
    });

    it('requests comments from the group-scoped timeline endpoint', async () => {
      mockFetchSequence(commentItems as any);
      renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Dinner')).toBeInTheDocument());
      (global.fetch as jest.Mock).mockImplementation((url: string) =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: url.includes('/comments') ? [] : commentItems,
          }),
        })
      );
      fireEvent.click(screen.getByTestId('timeline-comment-trigger-item-2'));

      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/groups/group-1/events/event-1/timeline/item-2/comments'
        )
      );
    });

    it('keeps the comment trigger and badge mounted while the creator edits the item', async () => {
      mockFetchSequence(commentItems as any);
      renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);

      await waitFor(() => expect(screen.getByText('Arrive')).toBeInTheDocument());
      const trigger = screen.getByTestId('timeline-comment-trigger-item-1');
      fireEvent.click(screen.getByLabelText('Edit item'));

      expect(screen.getByLabelText('Edit timeline item title')).toBeInTheDocument();
      // Same DOM node: the popover was not unmounted/remounted by entering edit mode.
      expect(screen.getByTestId('timeline-comment-trigger-item-1')).toBe(trigger);
      expect(screen.getByTestId('timeline-comment-count-item-1')).toHaveTextContent('3');
      // Item edit/delete controls are hidden while editing.
      expect(screen.queryByLabelText('Edit item')).not.toBeInTheDocument();
    });

    it('passes the group admin role to the comment thread so admins can moderate others\' comments', async () => {
      const otherComment = {
        id: 'cm-1',
        content: 'See you there',
        created_by: 'other-user',
        created_at: '2026-10-01T00:00:00Z',
        creator: { display_name: 'Bob' },
      };
      const mockWithRole = (role: 'admin' | 'member') => {
        global.fetch = jest.fn((url: string) => {
          let data: unknown = commentItems;
          if (url.includes('/comments')) data = [otherComment];
          else if (url === '/api/groups/group-1') data = { currentUserRole: role };
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data }) });
        }) as unknown as typeof fetch;
      };
      const openThread = async () => {
        await waitFor(() => expect(screen.getByText('Dinner')).toBeInTheDocument());
        fireEvent.click(screen.getByTestId('timeline-comment-trigger-item-2'));
        await screen.findByText('See you there');
      };

      mockWithRole('admin');
      const admin = renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);
      await openThread();
      fireEvent.click(screen.getByRole('button', { name: /view all|add a comment/i }));
      await waitFor(() => expect(screen.getAllByLabelText(/delete this comment/i).length).toBeGreaterThan(0));
      admin.unmount();

      mockWithRole('member');
      renderWithProviders(<EventTimeline eventId="event-1" groupId="group-1" />);
      await openThread();
      fireEvent.click(screen.getByRole('button', { name: /view all|add a comment/i }));
      await screen.findAllByText('See you there');
      expect(screen.queryAllByLabelText(/delete this comment/i)).toHaveLength(0);
    });
  });

  describe('guest (no-login) mode', () => {
    const guestTimeline = [
      { id: 'tl-1', item_time: '2026-09-20T14:00:00Z', title: 'Scavenger hunt', description: 'Bring a flashlight' },
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
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { timeline: guestTimeline } }) });
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
      renderWithProviders(<EventTimeline eventId="event-1" publicToken={'a'.repeat(64)} />);

      await waitFor(() => {
        expect(screen.getByText('Scavenger hunt')).toBeInTheDocument();
        expect(screen.getByText('Bring a flashlight')).toBeInTheDocument();
      });

      expect(screen.queryByLabelText(/new timeline item title/i)).not.toBeInTheDocument();
    });
    it('shows a read-only comment icon per row that reads from the public comments endpoint', async () => {
      global.fetch = jest.fn((url: string) => {
        if (typeof url === 'string' && url.includes('/planning')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { timeline: [{ ...guestTimeline[0], comment_count: 2 }] },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      }) as unknown as typeof fetch;
      renderWithProviders(<EventTimeline eventId="event-1" publicToken={'a'.repeat(64)} />);

      await waitFor(() => expect(screen.getByText('Scavenger hunt')).toBeInTheDocument());
      expect(screen.getByTestId('timeline-comment-count-tl-1')).toHaveTextContent('2');

      fireEvent.click(screen.getByTestId('timeline-comment-trigger-tl-1'));
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(`/api/events/public/${'a'.repeat(64)}/timeline/tl-1/comments`)
      );
    });

    it('guest thread is read-only: no comment form, and "Log in to comment" calls requestLogin', async () => {
      const requestLogin = jest.fn();
      global.fetch = jest.fn((url: string) => {
        if (typeof url === 'string' && url.includes('/planning')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { timeline: [{ ...guestTimeline[0], comment_count: 0 }] },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      }) as unknown as typeof fetch;
      renderWithProviders(
        <EventTimeline eventId="event-1" publicToken={'a'.repeat(64)} requestLogin={requestLogin} />
      );

      await waitFor(() => expect(screen.getByText('Scavenger hunt')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('timeline-comment-trigger-tl-1'));
      fireEvent.click(await screen.findByRole('button', { name: /view comments/i }));

      const login = await screen.findByRole('button', { name: /log in to comment/i });
      expect(screen.queryByLabelText('Comment input')).not.toBeInTheDocument();
      fireEvent.click(login);
      expect(requestLogin).toHaveBeenCalledTimes(1);
    });
  });
});
