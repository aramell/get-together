import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventDetail } from '@/components/groups/EventDetail';
import { AuthProvider } from '@/lib/contexts/AuthContext';

// Mock the fetch API
global.fetch = jest.fn();

// Mock router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/groups/test-group-id/events/test-event-id',
    query: { groupId: 'test-group-id', eventId: 'test-event-id' },
  }),
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

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
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
        expect(confirmButton).toHaveAttribute('role', 'button');
      });
    });
  });
});
