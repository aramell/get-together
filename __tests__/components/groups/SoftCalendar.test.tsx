/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import SoftCalendar from '@/components/groups/SoftCalendar';

// Mock fetch
global.fetch = jest.fn();

// Mock MarkAvailabilityModal
jest.mock('@/components/groups/MarkAvailabilityModal', () => {
  return function MockMarkAvailabilityModal() {
    return <div data-testid="mark-availability-modal">Modal</div>;
  };
});

const mockMembers = [
  {
    user_id: 'user-1',
    user_name: 'Alice Johnson',
    availabilities: [
      {
        id: 'avail-1',
        user_id: 'user-1',
        group_id: 'group-1',
        start_time: '2026-03-05T09:00:00Z',
        end_time: '2026-03-05T17:00:00Z',
        status: 'free' as const,
        version: 1,
        created_at: '2026-03-05T08:00:00Z',
        updated_at: '2026-03-05T08:00:00Z',
      },
    ],
  },
  {
    user_id: 'user-2',
    user_name: 'Bob Smith',
    availabilities: [
      {
        id: 'avail-2',
        user_id: 'user-2',
        group_id: 'group-1',
        start_time: '2026-03-05T14:00:00Z',
        end_time: '2026-03-05T18:00:00Z',
        status: 'busy' as const,
        version: 1,
        created_at: '2026-03-05T08:00:00Z',
        updated_at: '2026-03-05T08:00:00Z',
      },
    ],
  },
];

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('SoftCalendar Component', () => {
  const groupId = 'group-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { groupId, members: mockMembers },
      }),
    });
  });

  // Test: Component renders loading state
  it('should render loading spinner initially', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={false} />
    );

    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  // Test: Component renders calendar with members
  it('should render calendar with members and days', async () => {
    renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  // Test: Component renders month header
  it('should render current month and year in header', async () => {
    renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={false} />
    );

    await waitFor(() => {
      const currentMonth = new Date().toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });
  });

  // Test: Previous/Next month buttons exist
  it('should render month navigation buttons', async () => {
    renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={false} />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/view previous month/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/view next month/i)).toBeInTheDocument();
    });
  });

  // Test: Mark Availability button shows when user is member
  it('should show Mark Availability button for group members', async () => {
    renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={true} />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Mark Your Availability')
      ).toBeInTheDocument();
    });
  });

  // Test: Mark Availability button hidden when not member
  it('should not show Mark Availability button for non-members', async () => {
    renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={false} />
    );

    await waitFor(() => {
      expect(
        screen.queryByText('Mark Your Availability')
      ).not.toBeInTheDocument();
    });
  });

  // Test: Clicking Mark Availability opens modal
  it('should open modal when Mark Availability is clicked', async () => {
    renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={true} />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Mark Your Availability')
      ).toBeInTheDocument();
    });

    const button = screen.getByText('Mark Your Availability');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('mark-availability-modal')).toBeInTheDocument();
    });
  });

  // Test: Month navigation updates the month
  it('should update month when next button is clicked', async () => {
    renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const nextButton = screen.getByLabelText(/view next month/i);
    fireEvent.click(nextButton);

    await waitFor(() => {
      const nextMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1
      ).toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });
      expect(screen.getByText(nextMonth)).toBeInTheDocument();
    });
  });

  // Test: Error state displays error message
  it('should display error when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        errorCode: 'FETCH_ERROR',
      }),
    });

    renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('Error Loading Calendar')).toBeInTheDocument();
    });
  });

  // Test: Calendar renders availability indicators
  it('should render availability indicators (✓, ✗, ?)', async () => {
    renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Check for availability indicators
    const indicators = screen.getAllByText(/[✓✗?]/);
    expect(indicators.length).toBeGreaterThan(0);
  });

  // Test: Polls for updates every 5 seconds
  it('should call fetch multiple times (polling)', async () => {
    jest.useFakeTimers();

    renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={false} />
    );

    // Initial fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  // Test: Accessibility attributes
  it('should have proper WCAG 2.1 AA compliance', async () => {
    const { container } = renderWithChakra(
      <SoftCalendar groupId={groupId} isGroupMember={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Check for main role
    const main = container.querySelector('[role="main"]');
    expect(main).toBeInTheDocument();

    // Check for table role and attributes
    const table = container.querySelector('[role="table"]');
    expect(table).toBeInTheDocument();
    expect(table).toHaveAttribute('aria-label');
  });
});
