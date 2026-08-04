import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventPlanningTab } from '@/components/groups/EventPlanningTab';
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

describe('EventPlanningTab Component', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the checklist and photos sections, passing eventId/groupId through to both', async () => {
    renderWithProviders(<EventPlanningTab eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByText('Checklist')).toBeInTheDocument();
      expect(screen.getByText('Photos')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/groups/group-1/events/event-1/checklist'),
      expect.anything()
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/groups/group-1/events/event-1/photos'),
      expect.anything()
    );
  });

  it('renders all five Planning-tab sections together without conflict (Epic 12 combined check)', async () => {
    renderWithProviders(<EventPlanningTab eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByText('Photos')).toBeInTheDocument();
      expect(screen.getByText('Checklist')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.getByText('Logistics')).toBeInTheDocument();
      expect(screen.getByText('Polls')).toBeInTheDocument();
    });

    // Each section fetches its own event-scoped data independently — no
    // section should be missing or throw due to another section's presence.
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/groups/group-1/events/event-1/logistics'),
      expect.anything()
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/groups/group-1/events/event-1/polls'),
      expect.anything()
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/groups/group-1/events/event-1/timeline'),
      expect.anything()
    );
  });
});
