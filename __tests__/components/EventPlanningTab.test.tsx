import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventPlanningTab } from '@/components/groups/EventPlanningTab';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { defaultWidgetLayout } from '@/lib/utils/dashboardWidgets';

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

// Isolate EventPlanningTab's own composition/ordering logic from each real
// widget's fetch/polling behavior — those are covered by their own tests.
// Each stub renders its received eventId/groupId as data attributes so a
// prop-wiring bug (e.g. swapped ids) fails a test, not just the visual
// order/visibility checks the stubs otherwise support.
type StubProps = { eventId: string; groupId: string };
jest.mock('@/components/groups/EventPhotoGrid', () => ({
  EventPhotoGrid: ({ eventId, groupId }: StubProps) => (
    <div data-testid="widget-photos" data-event-id={eventId} data-group-id={groupId}>
      Photos widget
    </div>
  ),
}));
jest.mock('@/components/groups/EventChecklist', () => ({
  EventChecklist: ({ eventId, groupId }: StubProps) => (
    <div data-testid="widget-checklist" data-event-id={eventId} data-group-id={groupId}>
      Checklist widget
    </div>
  ),
}));
jest.mock('@/components/groups/EventTimeline', () => ({
  EventTimeline: ({ eventId, groupId }: StubProps) => (
    <div data-testid="widget-timeline" data-event-id={eventId} data-group-id={groupId}>
      Timeline widget
    </div>
  ),
}));
jest.mock('@/components/groups/EventLogistics', () => ({
  EventLogistics: ({ eventId, groupId }: StubProps) => (
    <div data-testid="widget-logistics" data-event-id={eventId} data-group-id={groupId}>
      Logistics widget
    </div>
  ),
}));
jest.mock('@/components/groups/EventPolls', () => ({
  EventPolls: ({ eventId, groupId }: StubProps) => (
    <div data-testid="widget-polls" data-event-id={eventId} data-group-id={groupId}>
      Polls widget
    </div>
  ),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider>
      <AuthProvider>{component}</AuthProvider>
    </ChakraProvider>
  );
};

function mockLayoutFetch(data: any) {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: async () => ({ success: true, data }) })
  ) as unknown as typeof fetch;
}

describe('EventPlanningTab', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders all 5 widgets in the default order when the group has no rows yet', async () => {
    mockLayoutFetch(defaultWidgetLayout());
    renderWithProviders(<EventPlanningTab eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('widget-photos')).toBeInTheDocument();
    });

    const testIds = ['widget-photos', 'widget-checklist', 'widget-timeline', 'widget-logistics', 'widget-polls'];
    // Assert DOM order matches the default configured order.
    const elements = testIds.map((id) => screen.getByTestId(id));
    for (let i = 0; i < elements.length - 1; i++) {
      // DOCUMENT_POSITION_FOLLOWING (4) means elements[i+1] comes after elements[i]
      expect(elements[i].compareDocumentPosition(elements[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    // Every widget receives the correct eventId/groupId — catches a
    // prop-wiring bug (e.g. swapped ids) that DOM-order checks alone would miss.
    elements.forEach((el) => {
      expect(el).toHaveAttribute('data-event-id', 'event-1');
      expect(el).toHaveAttribute('data-group-id', 'group-1');
    });
  });

  it('does not render a hidden widget at all', async () => {
    const layout = defaultWidgetLayout().map((w) => (w.widget_key === 'polls' ? { ...w, visible: false } : w));
    mockLayoutFetch(layout);
    renderWithProviders(<EventPlanningTab eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('widget-photos')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('widget-polls')).not.toBeInTheDocument();
  });

  it('renders widgets in the group-configured order, not the fixed source order', async () => {
    const layout = [
      { widget_key: 'polls', position: 1, visible: true },
      { widget_key: 'photos', position: 2, visible: true },
      { widget_key: 'checklist', position: 3, visible: true },
      { widget_key: 'timeline', position: 4, visible: true },
      { widget_key: 'logistics', position: 5, visible: true },
    ];
    mockLayoutFetch(layout);
    renderWithProviders(<EventPlanningTab eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('widget-polls')).toBeInTheDocument();
    });

    const polls = screen.getByTestId('widget-polls');
    const photos = screen.getByTestId('widget-photos');
    expect(polls.compareDocumentPosition(photos) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('toggles the widget customizer via the "Customize dashboard layout" button', async () => {
    mockLayoutFetch(defaultWidgetLayout());
    renderWithProviders(<EventPlanningTab eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('widget-photos')).toBeInTheDocument();
    });

    expect(screen.queryByText('Customize dashboard layout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Customize dashboard layout'));

    expect(screen.getByText('Customize dashboard layout')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Done customizing dashboard layout'));

    expect(screen.queryByText('Customize dashboard layout')).not.toBeInTheDocument();
  });

  it('polls the layout every 5 seconds and picks up another member\'s hide within one poll cycle', async () => {
    jest.useFakeTimers();

    let callCount = 0;
    global.fetch = jest.fn((url: string) => {
      // AuthProvider (real, unmocked) also fetches /api/auth/me on mount —
      // only count/serve dashboard-widgets requests here.
      if (typeof url !== 'string' || !url.includes('/dashboard-widgets')) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: null }) });
      }
      callCount += 1;
      // First (mount) fetch: all 5 visible. Every fetch after that (the 5s
      // poll) reflects another member having hidden Polls server-side.
      const data =
        callCount === 1
          ? defaultWidgetLayout()
          : defaultWidgetLayout().map((w) => (w.widget_key === 'polls' ? { ...w, visible: false } : w));
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data }) });
    }) as unknown as typeof fetch;

    renderWithProviders(<EventPlanningTab eventId="event-1" groupId="group-1" />);

    // Initial (mount) fetch
    await act(async () => {
      await Promise.resolve();
    });
    expect(callCount).toBe(1);
    expect(screen.getByTestId('widget-polls')).toBeInTheDocument();

    // One poll tick (~5s) later, a second GET fires and the now-hidden
    // widget disappears — no page refresh, no action from this viewer.
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(callCount).toBe(2);
    expect(screen.queryByTestId('widget-polls')).not.toBeInTheDocument();
  });
});
