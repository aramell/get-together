import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { CalendarConnectionSetting } from '@/components/settings/CalendarConnectionSetting';

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/profile',
  useSearchParams: () => mockSearchParams,
}));

const ChakraWrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider>{children}</ChakraProvider>
);

describe('CalendarConnectionSetting Component (Story 3.5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (global as any).fetch = jest.fn();
  });

  it('shows a Connect button when not connected', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: { connected: false } }),
    });

    render(<CalendarConnectionSetting />, { wrapper: ChakraWrapper });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect google calendar/i })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('calendar-connected-state')).not.toBeInTheDocument();
  });

  it('shows the connected state with the account email when connected (AC3)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        data: { connected: true, connectedEmail: 'user@example.com', needsReauth: false },
      }),
    });

    render(<CalendarConnectionSetting />, { wrapper: ChakraWrapper });

    await waitFor(() => {
      expect(screen.getByTestId('calendar-connected-state')).toHaveTextContent('user@example.com');
    });
    expect(screen.queryByRole('button', { name: /connect google calendar/i })).not.toBeInTheDocument();
  });

  it('shows a success message after redirect with calendar_status=connected', async () => {
    mockSearchParams = new URLSearchParams('calendar_status=connected');
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: { connected: true, connectedEmail: 'user@example.com' } }),
    });

    render(<CalendarConnectionSetting />, { wrapper: ChakraWrapper });

    await waitFor(() => {
      expect(screen.getByText('Google Calendar connected')).toBeInTheDocument();
    });
    expect(mockReplace).toHaveBeenCalledWith('/profile');
  });

  it('shows a denial message after redirect with calendar_status=denied (AC4)', async () => {
    mockSearchParams = new URLSearchParams('calendar_status=denied');
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: { connected: false } }),
    });

    render(<CalendarConnectionSetting />, { wrapper: ChakraWrapper });

    await waitFor(() => {
      expect(screen.getByText('Calendar connection was not completed')).toBeInTheDocument();
    });
  });

  describe('Disconnect (Story 3.8)', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/calendar/google/status') {
          return Promise.resolve({
            json: async () => ({
              success: true,
              data: { connected: true, connectedEmail: 'user@example.com', needsReauth: false },
            }),
          });
        }
        return Promise.resolve({ json: async () => ({ success: true }) });
      });
    });

    it('shows a confirmation dialog before disconnecting (AC2)', async () => {
      render(<CalendarConnectionSetting />, { wrapper: ChakraWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /disconnect from google calendar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /disconnect from google calendar/i }));

      expect(screen.getByText(/this will delete your synced availability data/i)).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalledWith('/api/calendar/google/disconnect', expect.anything());
    });

    it('disconnects and reflects "Not Connected" after confirmation (AC1)', async () => {
      render(<CalendarConnectionSetting />, { wrapper: ChakraWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /disconnect from google calendar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /disconnect from google calendar/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm disconnect/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /connect google calendar/i })).toBeInTheDocument();
      });
      expect(screen.queryByTestId('calendar-connected-state')).not.toBeInTheDocument();
      expect(global.fetch).toHaveBeenCalledWith('/api/calendar/google/disconnect', { method: 'DELETE' });
    });

    it('does not disconnect when the dialog is cancelled', async () => {
      render(<CalendarConnectionSetting />, { wrapper: ChakraWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /disconnect from google calendar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /disconnect from google calendar/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel deletion/i }));

      expect(screen.getByTestId('calendar-connected-state')).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalledWith('/api/calendar/google/disconnect', expect.anything());
    });
  });
});
