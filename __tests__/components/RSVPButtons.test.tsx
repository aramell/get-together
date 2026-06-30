import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RSVPButtons } from '@/components/events/RSVPButtons';
import { useAuth } from '@/lib/contexts/AuthContext';
import { ChakraProvider } from '@chakra-ui/react';

// Mock the auth hook
jest.mock('@/lib/contexts/AuthContext');

// Mock fetch
global.fetch = jest.fn();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider>{children}</ChakraProvider>
);

describe('RSVPButtons Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true,
    });
  });

  describe('Rendering', () => {
    it('should render three RSVP buttons with correct labels', () => {
      render(
        <RSVPButtons eventId="event-123" groupId="group-123" />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText(/In/i)).toBeInTheDocument();
      expect(screen.getByText(/Maybe/i)).toBeInTheDocument();
      expect(screen.getByText(/Out/i)).toBeInTheDocument();
    });

    it('should render with 48px minimum height for accessibility', () => {
      const { container } = render(
        <RSVPButtons eventId="event-123" groupId="group-123" />,
        { wrapper: Wrapper }
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        const styles = window.getComputedStyle(button);
        expect(parseFloat(styles.minHeight)).toBeGreaterThanOrEqual(48);
      });
    });

    it('should highlight current RSVP status', () => {
      render(
        <RSVPButtons
          eventId="event-123"
          groupId="group-123"
          currentStatus="in"
        />,
        { wrapper: Wrapper }
      );

      const inButton = screen.getByText(/In/i) as HTMLButtonElement;
      expect(inButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('RSVP Submission', () => {
    it('should submit RSVP when button is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            status: 'in',
            momentumCount: { in: 2, maybe: 0, out: 0 },
          },
        }),
      });

      render(
        <RSVPButtons eventId="event-123" groupId="group-123" />,
        { wrapper: Wrapper }
      );

      const inButton = screen.getByLabelText(/Mark event as In/i);
      fireEvent.click(inButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/groups/group-123/events/event-123/rsvp',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'x-user-id': 'user-123',
            }),
          })
        );
      });
    });

    it('should show loading spinner during submission', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    data: { status: 'in' },
                  }),
                }),
              100
            )
          )
      );

      render(
        <RSVPButtons eventId="event-123" groupId="group-123" />,
        { wrapper: Wrapper }
      );

      const inButton = screen.getByLabelText(/Mark event as In/i);
      fireEvent.click(inButton);

      // Button should have loading state during request
      expect(inButton).toHaveAttribute('aria-busy', 'true');

      await waitFor(() => {
        expect(inButton).not.toHaveAttribute('aria-busy', 'true');
      });
    });

    it('should change RSVP status when clicking different button', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { status: 'maybe' },
        }),
      });

      render(
        <RSVPButtons eventId="event-123" groupId="group-123" currentStatus="in" />,
        { wrapper: Wrapper }
      );

      const maybeButton = screen.getByLabelText(/Mark event as Maybe/i);
      fireEvent.click(maybeButton);

      await waitFor(() => {
        expect(maybeButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should show error toast on failed RSVP', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          message: 'You are not a member of this group',
        }),
      });

      render(
        <RSVPButtons eventId="event-123" groupId="group-123" />,
        { wrapper: Wrapper }
      );

      const inButton = screen.getByLabelText(/Mark event as In/i);
      fireEvent.click(inButton);

      // Error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/not a member/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels for all buttons', () => {
      render(
        <RSVPButtons eventId="event-123" groupId="group-123" />,
        { wrapper: Wrapper }
      );

      expect(screen.getByLabelText(/Mark event as In/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Mark event as Maybe/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Mark event as Out/i)).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(
        <RSVPButtons eventId="event-123" groupId="group-123" />,
        { wrapper: Wrapper }
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveProperty('disabled', false);
      });
    });
  });

  describe('Authentication', () => {
    it('should show error when userId is not available', async () => {
      (useAuth as jest.Mock).mockReturnValueOnce({
        userId: null,
        isAuthenticated: false,
      });

      render(
        <RSVPButtons eventId="event-123" groupId="group-123" />,
        { wrapper: Wrapper }
      );

      const inButton = screen.getByLabelText(/Mark event as In/i);
      fireEvent.click(inButton);

      await waitFor(() => {
        expect(screen.getByText(/not authenticated/i)).toBeInTheDocument();
      });
    });
  });
});
