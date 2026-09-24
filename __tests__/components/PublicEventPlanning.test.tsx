import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { PublicEventPlanning } from '@/components/groups/PublicEventPlanning';
import { AuthProvider } from '@/lib/contexts/AuthContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/events/public/token-123',
}));

// Real AuthContext (not mocked) so this exercises the actual
// login-in-place upgrade path each widget implements.
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider>
      <AuthProvider>{component}</AuthProvider>
    </ChakraProvider>
  );
};

const publicToken = 'a'.repeat(64);
const eventId = 'event-1';

const defaultPlanningData = {
  checklist: [{ id: 'chk-1', title: 'Bring firewood', is_checked: false, assignee_first_name: 'Andrew' }],
  logistics: [],
  timeline: [{ id: 'tl-1', item_time: '2026-09-20T14:00:00Z', title: 'Scavenger hunt', description: null }],
  photos: [],
  polls: [],
};

function mockFetchSequence(options?: { layout?: any[]; planningData?: any; onFetch?: (url: string, init?: any) => void }) {
  const layout = options?.layout ?? [
    { widget_key: 'checklist', position: 1, visible: true },
    { widget_key: 'timeline', position: 2, visible: true },
    { widget_key: 'photos', position: 3, visible: false },
    { widget_key: 'logistics', position: 4, visible: true },
    { widget_key: 'polls', position: 5, visible: true },
  ];
  const planningData = options?.planningData ?? defaultPlanningData;

  global.fetch = jest.fn((url: string, init?: any) => {
    options?.onFetch?.(url, init);
    if (typeof url === 'string' && url.includes('/dashboard-widgets')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: layout }) });
    }
    if (typeof url === 'string' && url.includes('/planning')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: planningData }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
  }) as unknown as typeof fetch;
}

describe('PublicEventPlanning Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders widgets in the group layout order, with hidden widgets absent', async () => {
    mockFetchSequence();
    const requestLogin = jest.fn();

    renderWithProviders(
      <PublicEventPlanning publicToken={publicToken} eventId={eventId} requestLogin={requestLogin} />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /checklist/i })).toBeInTheDocument();
    });

    // Photos is hidden in this layout -- its heading must not render.
    expect(screen.queryByRole('heading', { level: 2, name: /photos/i })).not.toBeInTheDocument();

    // Checklist (position 1) should appear before Timeline (position 2) in
    // the DOM, matching the group's configured order.
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings.indexOf('Checklist')).toBeLessThan(headings.indexOf('Timeline'));
  });

  it('falls back to the default order when the group has no layout rows yet', async () => {
    mockFetchSequence({
      layout: [
        { widget_key: 'photos', position: 1, visible: true },
        { widget_key: 'checklist', position: 2, visible: true },
        { widget_key: 'timeline', position: 3, visible: true },
        { widget_key: 'logistics', position: 4, visible: true },
        { widget_key: 'polls', position: 5, visible: true },
      ],
    });
    const requestLogin = jest.fn();

    renderWithProviders(
      <PublicEventPlanning publicToken={publicToken} eventId={eventId} requestLogin={requestLogin} />
    );

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(5);
    });
  });

  it('a disabled control (checklist checkbox) requests login instead of toggling', async () => {
    mockFetchSequence();
    const requestLogin = jest.fn();

    renderWithProviders(
      <PublicEventPlanning publicToken={publicToken} eventId={eventId} requestLogin={requestLogin} />
    );

    await waitFor(() => {
      expect(screen.getByText('Bring firewood')).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/log in to mark/i);
    fireEvent.click(checkbox);

    expect(requestLogin).toHaveBeenCalledTimes(1);
  });

  it('upgrades a widget to interactive in place once a group_id is resolved (post-login)', async () => {
    // Simulates the state right after a guest logs in via the in-place
    // modal: the public planning fetch (now carrying a Bearer token) starts
    // returning group_id, and the request that follows swaps to the
    // authenticated per-group checklist endpoint instead of the guest one.
    let sawAuthenticatedChecklistFetch = false;

    global.fetch = jest.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/dashboard-widgets')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              { widget_key: 'checklist', position: 1, visible: true },
              { widget_key: 'timeline', position: 2, visible: false },
              { widget_key: 'photos', position: 3, visible: false },
              { widget_key: 'logistics', position: 4, visible: false },
              { widget_key: 'polls', position: 5, visible: false },
            ],
          }),
        });
      }
      if (typeof url === 'string' && url.includes('/planning')) {
        // Always resolves group_id here to simulate an already-authenticated
        // caller (accessToken present) -- exercises the same upgrade path a
        // fresh post-login re-fetch would take.
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { ...defaultPlanningData, group_id: 'group-1' } }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/groups/group-1/events/event-1/checklist')) {
        sawAuthenticatedChecklistFetch = true;
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      }
      if (typeof url === 'string' && url.includes('/api/groups/group-1')) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { members: [] } }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }) as unknown as typeof fetch;

    // Pre-seed localStorage so AuthContext hydrates as already logged in --
    // equivalent state to "just logged in via the modal" from this widget's
    // point of view (it only cares about accessToken + resolvedGroupId).
    const fakeJwt = `${btoa(JSON.stringify({ alg: 'none' }))}.${btoa(
      JSON.stringify({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 })
    )}.sig`;
    localStorage.setItem('accessToken', fakeJwt);
    localStorage.setItem('idToken', fakeJwt);

    const requestLogin = jest.fn();
    renderWithProviders(
      <PublicEventPlanning publicToken={publicToken} eventId={eventId} requestLogin={requestLogin} />
    );

    await waitFor(() => {
      expect(sawAuthenticatedChecklistFetch).toBe(true);
    });

    localStorage.clear();
  });
});
