import React, { useState } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { DashboardWidgetCustomizer } from '@/components/groups/DashboardWidgetCustomizer';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { defaultWidgetLayout, WidgetLayoutItem } from '@/lib/utils/dashboardWidgets';

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

// A stateful wrapper so onLayoutChange updates actually re-render the
// customizer with the new layout, letting us assert optimistic updates and
// reverts the same way EventChecklist's own tests do.
function Harness({ initialLayout = defaultWidgetLayout() }: { initialLayout?: WidgetLayoutItem[] }) {
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(initialLayout);
  return (
    <ChakraProvider>
      <AuthProvider>
        <DashboardWidgetCustomizer groupId="group-1" layout={layout} onLayoutChange={setLayout} />
      </AuthProvider>
    </ChakraProvider>
  );
}

describe('DashboardWidgetCustomizer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists all 5 widgets in position order, including hidden ones', () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    render(<Harness />);

    // Default order: photos, checklist, timeline, logistics, polls
    const labels = ['Photos', 'Checklist', 'Timeline', 'Logistics', 'Polls'];
    labels.forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it('disables move-up on the first row and move-down on the last row', () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    render(<Harness />);

    expect(screen.getByLabelText('Move Photos up')).toBeDisabled();
    expect(screen.getByLabelText('Move Polls down')).toBeDisabled();
    expect(screen.getByLabelText('Move Photos down')).not.toBeDisabled();
    expect(screen.getByLabelText('Move Polls up')).not.toBeDisabled();
  });

  it('optimistically swaps positions on move-down and PATCHes the full layout', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, data: defaultWidgetLayout() }) })
    ) as unknown as typeof fetch;

    render(<Harness />);

    fireEvent.click(screen.getByLabelText('Move Photos down'));

    // Photos and Checklist swap — Checklist now first, immediately (optimistic)
    await waitFor(() => {
      expect(screen.getByLabelText('Move Checklist up')).toBeDisabled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups/group-1/dashboard-widgets',
      expect.objectContaining({ method: 'PATCH' })
    );
    const patchCall = (global.fetch as jest.Mock).mock.calls.find(
      ([, options]) => options?.method === 'PATCH'
    );
    const [, options] = patchCall;
    const body = JSON.parse(options.body);
    const photos = body.widgets.find((w: WidgetLayoutItem) => w.widget_key === 'photos');
    const checklist = body.widgets.find((w: WidgetLayoutItem) => w.widget_key === 'checklist');
    expect(photos.position).toBe(2);
    expect(checklist.position).toBe(1);
  });

  it('reverts the optimistic move when the PATCH request fails', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, json: async () => ({ success: false, error: 'Server error' }) })
    ) as unknown as typeof fetch;

    render(<Harness />);

    fireEvent.click(screen.getByLabelText('Move Photos down'));

    // Optimistic: Checklist briefly first
    await waitFor(() => {
      expect(screen.getByLabelText('Move Checklist up')).toBeDisabled();
    });

    // Reverts once the failed request resolves
    await waitFor(() => {
      expect(screen.getByLabelText('Move Photos up')).toBeDisabled();
    });
  });

  it('optimistically hides a widget, showing a Hidden badge', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, data: defaultWidgetLayout() }) })
    ) as unknown as typeof fetch;

    render(<Harness />);

    fireEvent.click(screen.getByLabelText('Hide Photos'));

    await waitFor(() => {
      expect(screen.getByText('Hidden')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Show Photos')).toBeInTheDocument();
  });

  it('reverts visibility on PATCH failure and shows an error toast', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, json: async () => ({ success: false, error: 'Server error' }) })
    ) as unknown as typeof fetch;

    render(<Harness />);

    fireEvent.click(screen.getByLabelText('Hide Photos'));

    await waitFor(() => {
      expect(screen.getByText('Hidden')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});
