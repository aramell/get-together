import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventDetail } from '@/components/groups/EventDetail';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { getGroupDetails } from '@/lib/services/groupService';

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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByText('Team Lunch')).toBeInTheDocument();
        expect(screen.getByText("Let's grab lunch together")).toBeInTheDocument();
      });
    });

    test('displays formatted date and time', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByText(/March 20, 2026/)).toBeInTheDocument();
      });
    });

    test('displays RSVP momentum counts', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByText(/3 in/)).toBeInTheDocument();
        expect(screen.getByText(/1 maybe/)).toBeInTheDocument();
        expect(screen.getByText(/0 out/)).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Event Button - Visibility', () => {
    test('shows Cancel Event button for event creator', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

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

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        const cancelButton = screen.queryByRole('button', { name: /cancel event/i });
        expect(cancelButton).not.toBeInTheDocument();
      });
    });
  });

  describe('Confirmation Modal', () => {
    test('opens confirmation modal when Cancel button clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel event/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/confirm cancellation/i)).toBeInTheDocument();
      });
    });

    test('confirms cancellation and calls delete API', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockEvent }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: 'Event not found' }),
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Event not found/)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    test('renders Details and Planning tabs, with Details selected by default', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        const detailsTab = screen.getByRole('tab', { name: /details/i });
        const planningTab = screen.getByRole('tab', { name: /planning/i });
        expect(detailsTab).toBeInTheDocument();
        expect(planningTab).toBeInTheDocument();
        expect(detailsTab).toHaveAttribute('aria-selected', 'true');
        expect(planningTab).toHaveAttribute('aria-selected', 'false');
      });

      // Existing Details content still renders unscoped, by default
      expect(screen.getByText('Team Lunch')).toBeInTheDocument();
    });

    test('switching to Planning tab shows its sections and fires their fetches (Stories 12.2-12.6)', async () => {
      // Previously asserted an exact "+3" fetch count, hardcoded when only
      // Checklist+Photos existed. Every later Planning-tab section (Timeline,
      // Logistics, Polls) added its own mount-time fetch and broke that
      // constant — asserts the structural property this test actually cares
      // about instead (fetches happened) rather than a number that goes
      // stale every time a section is added. (A stronger "no refetch on
      // switching back and forth" assertion was tried here but several
      // Planning sections poll on independent 5s real-timer intervals,
      // which made that assertion flaky depending on wall-clock timing
      // during the test's awaits — not something this test can reliably
      // control without fake timers across every polling child.)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockEvent }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /planning/i })).toBeInTheDocument();
      });

      const fetchCallsBeforeSwitch = (global.fetch as jest.Mock).mock.calls.length;

      fireEvent.click(screen.getByRole('tab', { name: /planning/i }));

      await waitFor(() => {
        expect(screen.getByText('Checklist')).toBeInTheDocument();
        expect(screen.getByText('Photos')).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: /planning/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /details/i })).toHaveAttribute('aria-selected', 'false');

      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(fetchCallsBeforeSwitch);
    });

    test('switching from Planning back to Details does not remount or refetch Details content', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockEvent }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /planning/i })).toBeInTheDocument();
      });

      const isDetailsFetchCall = (call: any[]) =>
        typeof call[0] === 'string' && /\/events\/event-1\/?$/.test(call[0].split('?')[0]);
      const detailsFetchCallsBeforeSwitch = (global.fetch as jest.Mock).mock.calls.filter(isDetailsFetchCall).length;

      fireEvent.click(screen.getByRole('tab', { name: /planning/i }));
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /planning/i })).toHaveAttribute('aria-selected', 'true');
      });

      fireEvent.click(screen.getByRole('tab', { name: /details/i }));
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /details/i })).toHaveAttribute('aria-selected', 'true');
      });

      // Details content (event title/date/momentum) is still present without
      // a fresh fetch of the event itself — the panel stayed mounted.
      expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
      const detailsFetchCallsAfterSwitchBack = (global.fetch as jest.Mock).mock.calls.filter(isDetailsFetchCall).length;
      expect(detailsFetchCallsAfterSwitchBack).toBe(detailsFetchCallsBeforeSwitch);
    });

    test('keyboard: arrow key moves selection between tabs', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      let detailsTab: HTMLElement;
      await waitFor(() => {
        detailsTab = screen.getByRole('tab', { name: /details/i });
      });

      detailsTab!.focus();
      expect(detailsTab!).toHaveFocus();

      fireEvent.keyDown(detailsTab!, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /planning/i })).toHaveAttribute('aria-selected', 'true');
      });
    });

    test('does not render tab chrome during loading or error states', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      expect(screen.queryByRole('tab', { name: /details/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: /planning/i })).not.toBeInTheDocument();
    });
  });

  describe('Planning Style Variant (Story 4.7)', () => {
    test('shows full-prominence momentum display when group planning_style is proposals-first', async () => {
      (getGroupDetails as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { group: { planning_style: 'proposals-first' }, members: [], currentUserRole: 'member' },
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel event/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper button roles and labels', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel event/i });
        expect(cancelButton).toHaveAccessibleName();
      });
    });

    test('confirmation modal has proper focus management', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvent }),
      });

      renderWithChakra(<EventDetail groupId="group-1" eventId="event-1" />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel event/i }));
      });

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        expect(confirmButton).toBeVisible();
      });
    });
  });
});
