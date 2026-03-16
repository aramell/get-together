import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MomentumCounter } from '@/components/events/MomentumCounter';
import { ChakraProvider } from '@chakra-ui/react';

// Mock fetch
global.fetch = jest.fn();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider>{children}</ChakraProvider>
);

describe('MomentumCounter Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should display momentum counts in correct format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            in: 5,
            maybe: 2,
            out: 1,
            threshold: 5,
            thresholdMet: true,
          },
        }),
      });

      render(<MomentumCounter eventId="event-123" threshold={5} />, {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // 5 in
        expect(screen.getByText('2')).toBeInTheDocument(); // 2 maybe
        expect(screen.getByText('1')).toBeInTheDocument(); // 1 out
      });
    });

    it('should display progress bar showing confirmations progress', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            in: 3,
            maybe: 1,
            out: 0,
            threshold: 5,
            thresholdMet: false,
          },
        }),
      });

      render(<MomentumCounter eventId="event-123" threshold={5} />, {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(screen.getByText(/3 \/ 5/i)).toBeInTheDocument();
      });
    });

    it('should display "Confirmed" badge when event is confirmed', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            in: 5,
            maybe: 0,
            out: 0,
            threshold: 5,
            thresholdMet: true,
          },
        }),
      });

      render(<MomentumCounter eventId="event-123" threshold={5} isConfirmed={true} />, {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(screen.getByText(/Confirmed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should poll for momentum updates every 1 second', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { in: 2, maybe: 0, out: 0, threshold: 5, thresholdMet: false },
        }),
      });

      render(<MomentumCounter eventId="event-123" threshold={5} />, {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Advance time by 1 second
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should update display when momentum data changes', async () => {
      const fetchMock = global.fetch as jest.Mock;

      // First call: 2 in
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { in: 2, maybe: 0, out: 0, threshold: 5 },
        }),
      });

      const { rerender } = render(
        <MomentumCounter eventId="event-123" threshold={5} />,
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });

      // Second call: 3 in (simulating real-time update)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { in: 3, maybe: 0, out: 0, threshold: 5 },
        }),
      });

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });
  });

  describe('Threshold Auto-Confirmation', () => {
    it('should show success notification when threshold is reached', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            in: 5,
            maybe: 0,
            out: 0,
            threshold: 5,
            thresholdMet: true,
          },
        }),
      });

      const onConfirmation = jest.fn();

      render(
        <MomentumCounter
          eventId="event-123"
          threshold={5}
          onConfirmation={onConfirmation}
        />,
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(screen.getByText(/Event Confirmed/i)).toBeInTheDocument();
        expect(onConfirmation).toHaveBeenCalled();
      });
    });

    it('should not show celebration multiple times', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            in: 5,
            maybe: 0,
            out: 0,
            threshold: 5,
            thresholdMet: true,
          },
        }),
      });

      const onConfirmation = jest.fn();

      render(
        <MomentumCounter
          eventId="event-123"
          threshold={5}
          isConfirmed={true}
          onConfirmation={onConfirmation}
        />,
        { wrapper: Wrapper }
      );

      // Advance timers to trigger multiple polling cycles
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        // Should only be called once, not multiple times
        expect(onConfirmation).toHaveBeenCalledTimes(0); // Already confirmed, so shouldn't trigger
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<MomentumCounter eventId="event-123" threshold={5} />, {
        wrapper: Wrapper,
      });

      // Should not crash, just log error
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Error loading momentum:',
          expect.any(Error)
        );
      });
    });

    it('should handle failed API responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false }),
      });

      render(<MomentumCounter eventId="event-123" threshold={5} />, {
        wrapper: Wrapper,
      });

      // Should not crash, continue rendering default values
      await waitFor(() => {
        expect(screen.getByText('Momentum')).toBeInTheDocument();
      });
    });
  });

  describe('Visual States', () => {
    it('should have green styling when confirmed', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            in: 5,
            maybe: 0,
            out: 0,
            threshold: 5,
            thresholdMet: true,
          },
        }),
      });

      const { container } = render(
        <MomentumCounter eventId="event-123" threshold={5} isConfirmed={true} />,
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        const box = container.querySelector('[style*="background"]');
        expect(box).toHaveStyle('background-color: rgb(240, 253, 244)'); // green.50
      });
    });

    it('should show percentage progress towards threshold', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            in: 2,
            maybe: 0,
            out: 0,
            threshold: 5,
            thresholdMet: false,
          },
        }),
      });

      render(<MomentumCounter eventId="event-123" threshold={5} />, {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(screen.getByText(/40%/i)).toBeInTheDocument(); // 2/5 = 40%
      });
    });
  });
});
