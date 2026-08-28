/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import SoftCalendar from '@/components/groups/SoftCalendar';

jest.mock('@/lib/contexts/AuthContext', () => ({
  ...jest.requireActual('@/lib/contexts/AuthContext'),
  useAuth: jest.fn(() => ({
    userId: 'user-1',
    accessToken: 'test-token',
    isAuthenticated: true,
  })),
}));

global.fetch = jest.fn();

jest.mock('@/components/groups/MarkAvailabilityModal', () => {
  return function MockMarkAvailabilityModal() {
    return <div data-testid="mark-availability-modal">Modal</div>;
  };
});

const renderWithChakra = (component: React.ReactElement) => render(<ChakraProvider>{component}</ChakraProvider>);

// Fixed "now" at noon UTC to avoid local-timezone date-boundary flakiness.
const FIXED_NOW = new Date('2026-08-27T12:00:00.000Z');
const TODAY = '2026-08-27';

describe('SoftCalendar merged availability display (Story 3.6, AC2)', () => {
  const groupId = 'group-1';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows Google-busy over an overlapping manual-free entry when merged_availability is present', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          groupId,
          members: [
            {
              user_id: 'user-1',
              user_name: 'Alice Johnson',
              availabilities: [
                {
                  id: 'avail-1',
                  user_id: 'user-1',
                  group_id: groupId,
                  start_time: `${TODAY}T09:00:00Z`,
                  end_time: `${TODAY}T17:00:00Z`,
                  status: 'free',
                  version: 1,
                  created_at: `${TODAY}T08:00:00Z`,
                  updated_at: `${TODAY}T08:00:00Z`,
                },
              ],
              google_busy_blocks: [{ start_time: `${TODAY}T12:00:00Z`, end_time: `${TODAY}T13:00:00Z` }],
              merged_availability: [
                { start_time: `${TODAY}T09:00:00Z`, end_time: `${TODAY}T12:00:00Z`, status: 'free', source: 'manual' },
                { start_time: `${TODAY}T12:00:00Z`, end_time: `${TODAY}T13:00:00Z`, status: 'busy', source: 'google' },
                { start_time: `${TODAY}T13:00:00Z`, end_time: `${TODAY}T17:00:00Z`, status: 'free', source: 'manual' },
              ],
            },
          ],
        },
      }),
    });

    renderWithChakra(<SoftCalendar groupId={groupId} isGroupMember={false} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Today's merged_availability includes a Google-busy segment, so the day cell should
    // reflect "busy" for the whole day even though part of the day is manually "free".
    expect(screen.getByLabelText(/Alice Johnson, .*busy/i)).toBeInTheDocument();
  });

  it('falls back to the raw manual status when merged_availability is absent (no Google connection)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          groupId,
          members: [
            {
              user_id: 'user-1',
              user_name: 'Alice Johnson',
              availabilities: [
                {
                  id: 'avail-1',
                  user_id: 'user-1',
                  group_id: groupId,
                  start_time: `${TODAY}T09:00:00Z`,
                  end_time: `${TODAY}T17:00:00Z`,
                  status: 'free',
                  version: 1,
                  created_at: `${TODAY}T08:00:00Z`,
                  updated_at: `${TODAY}T08:00:00Z`,
                },
              ],
              // no google_busy_blocks / merged_availability fields at all
            },
          ],
        },
      }),
    });

    renderWithChakra(<SoftCalendar groupId={groupId} isGroupMember={false} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Alice Johnson, .*available/i)).toBeInTheDocument();
  });
});
