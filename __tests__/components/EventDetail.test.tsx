import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventDetail } from '@/components/groups/EventDetail';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { getGroupDetails } from '@/lib/services/groupService';
import { defaultWidgetLayout } from '@/lib/utils/dashboardWidgets';

// Mock the fetch API
global.fetch = jest.fn();

// Mock router (App Router — AuthContext calls useRouter()/usePathname() from next/navigation)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/groups/test-group-id/events/test-event-id',
}));

// Mock useAuth from AuthContext
jest.mock('@/lib/contexts/AuthContext', () => ({
  ...jest.requireActual('@/lib/contexts/AuthContext'),
  useAuth: jest.fn(() => ({
    userId: 'user-1',
    isAuthenticated: true,
    isLoading: false,
    accessToken: 'test-token',
    idToken: 'test-id-token',
    logout: jest.fn(),
    checkTokenExpiration: jest.fn(),
    isTokenExpired: jest.fn(),
  })),
}));

// Mock groupService.getGroupDetails (drives userRole + planning_style, Story 4.7)
jest.mock('@/lib/services/groupService', () => ({
  getGroupDetails: jest.fn().mockResolvedValue({
    success: true,
    data: { group: { planning_style: 'proposals-first' }, members: [], currentUserRole: 'member' },
  }),
}));

const mockEvent = {
  id: 'event-1',
  group_id: 'group-1',
  created_by: 'user-1',
  title: 'Team Lunch',
  description: 'Let\'s grab lunch together',
  location: 'The Rooftop Cafe',
  date: '2026-03-20T12:00:00Z',
  threshold: 5,
  status: 'proposal' as const,
  momentum: {
    in: 3,
    maybe: 1,
    out: 0,
  },
  created_at: '2026-03-16T10:00:00Z',
  updated_at: '2026-03-16T10:00:00Z',
};

/**
 * The merged view (Story 13.1) mounts the event header AND all 5 dashboard
 * widgets simultaneously (no more lazy Planning tab), so a single
 * `mockResolvedValueOnce` for the event fetch is no longer enough — every
 * widget (Photos/Checklist/Timeline/Logistics/Polls), the comments section,
 * and the group-role lookup all fire their own independent fetches on
 * mount. This helper resolves the event-detail GET with the given payload
 * and any other request with an empty-list success response, with an
 * optional per-test override (e.g. for the DELETE/cancel call or a fetch
 * failure) matched by URL/method.
 */
const mockFetchWith = (
  event: unknown,
  override?: (url: string, init?: RequestInit) => { ok: boolean; json: () => Promise<any> } | undefined
) => {
  (global.fetch as jest.Mock).mockImplementation(async (input: unknown, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : String(input);
    const method = init?.method || 'GET';

    if (override) {
      const overridden = override(url, init);
      if (overridden) return overridden;
    }

    if (method === 'GET' && /\/events\/event-1(\?.*)?$/.test(url.split('?')[0])) {
      return { ok: true, json: async () => ({ success: true, data: event }) };
    }

    // Story 13.4: the real GET /dashboard-widgets endpoint always returns
    // all 5 widgets (defaulting server-side when a group has no rows yet) --
    // never an empty array, unlike the generic list fallback below.
    if (method === 'GET' && /\/dashboard-widgets(\?.*)?$/.test(url.split('?')[0])) {
      return { ok: true, json: async () => ({ success: true, data: defaultWidgetLayout() }) };
    }

    return { ok: true, json: async () => ({ success: true, data: [] }) };
  });
};

const renderWithChakra = (component: React.ReactElement) => {
  return render(
    <ChakraProvider>
      <AuthProvider>
        {component}
      </AuthProvider>
    </ChakraProvider>
  );
};

describe('EventDetail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Event Display', () => {
    test('renders event title, date, and description', async () => {
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByText('Team Lunch')).toBeInTheDocument();
        expect(screen.getByText("Let's grab lunch together")).toBeInTheDocument();
      });
    });

    test('displays formatted date and time', async () => {
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByText(/March 20, 2026/)).toBeInTheDocument();
      });
    });

    test('displays RSVP momentum counts', async () => {
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByText(/3 in/)).toBeInTheDocument();
        expect(screen.getByText(/1 maybe/)).toBeInTheDocument();
        expect(screen.getByText(/0 out/)).toBeInTheDocument();
      });
    });

    test('displays the event location', async () => {
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByText('The Rooftop Cafe')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Event Button - Visibility', () => {
    test('shows Cancel Event button for event creator', async () => {
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel event/i });
        expect(cancelButton).toBeInTheDocument();
      });
    });

    test('hides Cancel Event button for non-creator', async () => {
      // Mock useAuth to return a different userId
      const { useAuth } = require('@/lib/contexts/AuthContext');
      useAuth.mockReturnValueOnce({
        userId: 'different-user',
        isAuthenticated: true,
        isLoading: false,
        accessToken: 'test-token',
        idToken: 'test-id-token',
        logout: jest.fn(),
        checkTokenExpiration: jest.fn(),
        isTokenExpired: jest.fn(),
      });

      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        const cancelButton = screen.queryByRole('button', { name: /cancel event/i });
        expect(cancelButton).not.toBeInTheDocument();
      });
    });
  });

  describe('Confirmation Modal', () => {
    test('opens confirmation modal when Cancel button clicked', async () => {
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel event/i });
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });

    test('shows confirmation text in modal', async () => {
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel event/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/confirm cancellation/i)).toBeInTheDocument();
      });
    });

    test('confirms cancellation and calls delete API', async () => {
      mockFetchWith(mockEvent, (url, init) => {
        if ((init?.method || 'GET') === 'DELETE' && /\/events\/event-1$/.test(url.split('?')[0])) {
          return { ok: true, json: async () => ({ success: true }) };
        }
        return undefined;
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel event/i }));
      });

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/groups/group-1/events/event-1'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });

  describe('Loading and Error States', () => {
    test('shows loading state while fetching event', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      expect(screen.getByText('Loading event...')).toBeInTheDocument();
    });

    test('shows error message on fetch failure', async () => {
      mockFetchWith(mockEvent, (url, init) => {
        if ((init?.method || 'GET') === 'GET' && /\/events\/event-1$/.test(url.split('?')[0])) {
          return { ok: false, json: async () => ({ success: false, message: 'Event not found' }) };
        }
        return undefined;
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Event not found/)).toBeInTheDocument();
      });
    });
  });

  describe('Merged, tab-less structure (Story 13.1)', () => {
    test('renders event details and all 5 dashboard widgets in one continuous view, with no tab control present', async () => {
      mockFetchWith(mockEvent);

      const { container } = renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByText('Team Lunch')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Photos')).toBeInTheDocument();
        expect(screen.getByText('Checklist')).toBeInTheDocument();
        expect(screen.getByText('Timeline')).toBeInTheDocument();
        expect(screen.getByText('Logistics')).toBeInTheDocument();
        expect(screen.getByText('Polls')).toBeInTheDocument();
      });

      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

      // Widget order matches EventPlanningTab's existing order — Photos,
      // Checklist, Timeline, Logistics, Polls — unchanged by the merge.
      const text = container.textContent || '';
      const order = ['Photos', 'Checklist', 'Timeline', 'Logistics', 'Polls'].map((label) => text.indexOf(label));
      expect(order.every((index) => index >= 0)).toBe(true);
      expect(order).toEqual([...order].sort((a, b) => a - b));
    });

    test('does not render a tab control during loading or error states', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });
  });

  describe('Planning Style Variant (Story 4.7)', () => {
    test('shows full-prominence momentum display when group planning_style is proposals-first', async () => {
      (getGroupDetails as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { group: { planning_style: 'proposals-first' }, members: [], currentUserRole: 'member' },
      });
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByText(/RSVPs: 3 in, 1 maybe, 0 out/)).toBeInTheDocument();
      });
      expect(screen.queryByTestId('momentum-deemphasized')).not.toBeInTheDocument();
    });

    test('shows de-emphasized momentum display when group planning_style is availability-first (AC2)', async () => {
      (getGroupDetails as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { group: { planning_style: 'availability-first' }, members: [], currentUserRole: 'member' },
      });
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('momentum-deemphasized')).toHaveTextContent('3 in, 1 maybe, 0 out');
      });
      // Full-prominence box gone
      expect(screen.queryByText(/RSVPs: 3 in, 1 maybe, 0 out/)).not.toBeInTheDocument();
    });

    test('Cancel Event button remains available and unaffected in the de-emphasized variant (AC4)', async () => {
      (getGroupDetails as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { group: { planning_style: 'availability-first' }, members: [], currentUserRole: 'member' },
      });
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel event/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper button roles and labels', async () => {
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel event/i });
        expect(cancelButton).toHaveAccessibleName();
      });
    });

    test('confirmation modal has proper focus management', async () => {
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel event/i }));
      });

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        expect(confirmButton).toBeVisible();
      });
    });

    test('renders a single h1 heading for the event title', async () => {
      mockFetchWith(mockEvent);

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Team Lunch' })).toBeInTheDocument();
      });
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });
  });
});
