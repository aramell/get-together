import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import SoftCalendar from '@/components/groups/SoftCalendar';

// Mock the MarkAvailabilityModal
jest.mock('@/components/groups/MarkAvailabilityModal', () => {
  return function MockModal({ isOpen, onClose, onSuccess }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-mark-availability-modal">
        <button onClick={() => onSuccess()}>Submit</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

// Mock fetch globally
global.fetch = jest.fn();

describe('SoftCalendar', () => {
  const mockGroupId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 'avail-1',
            user_id: 'user-1',
            user_name: 'John Doe',
            user_email: 'john@example.com',
            group_id: mockGroupId,
            start_time: new Date().toISOString().split('T')[0] + 'T10:00:00Z',
            end_time: new Date().toISOString().split('T')[0] + 'T11:00:00Z',
            status: 'free',
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        count: 1,
      }),
    });
  });

  it('should render calendar with month header', async () => {
    render(
      <ChakraProvider>
        <SoftCalendar groupId={mockGroupId} isGroupMember={true} />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/\d+\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/)).toBeInTheDocument();
    });
  });

  it('should render "Mark Your Availability" button for group members', async () => {
    render(
      <ChakraProvider>
        <SoftCalendar groupId={mockGroupId} isGroupMember={true} />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Mark Your Availability')).toBeInTheDocument();
    });
  });

  it('should not render "Mark Your Availability" button for non-members', async () => {
    render(
      <ChakraProvider>
        <SoftCalendar groupId={mockGroupId} isGroupMember={false} />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Mark Your Availability')).not.toBeInTheDocument();
    });
  });

  it('should open mark availability modal on button click', async () => {
    render(
      <ChakraProvider>
        <SoftCalendar groupId={mockGroupId} isGroupMember={true} />
      </ChakraProvider>
    );

    const button = await screen.findByText('Mark Your Availability');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('mock-mark-availability-modal')).toBeInTheDocument();
    });
  });

  it('should fetch availabilities on mount', async () => {
    render(
      <ChakraProvider>
        <SoftCalendar groupId={mockGroupId} isGroupMember={true} />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/groups/${mockGroupId}/availabilities`)
      );
    });
  });

  it('should display loading spinner initially', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise(() => {
          /* Never resolves to keep loading state */
        })
    );

    render(
      <ChakraProvider>
        <SoftCalendar groupId={mockGroupId} isGroupMember={true} />
      </ChakraProvider>
    );

    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Failed to fetch availabilities',
      }),
    });

    render(
      <ChakraProvider>
        <SoftCalendar groupId={mockGroupId} isGroupMember={true} />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch availabilities/i)).toBeInTheDocument();
    });
  });

  it('should navigate to previous month', async () => {
    render(
      <ChakraProvider>
        <SoftCalendar groupId={mockGroupId} isGroupMember={true} />
      </ChakraProvider>
    );

    const prevButton = await screen.findByText('Previous');
    fireEvent.click(prevButton);

    // Should make a new fetch call with different date range
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should navigate to next month', async () => {
    render(
      <ChakraProvider>
        <SoftCalendar groupId={mockGroupId} isGroupMember={true} />
      </ChakraProvider>
    );

    const nextButton = await screen.findByText('Next');
    fireEvent.click(nextButton);

    // Should make a new fetch call with different date range
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should refresh availabilities after successful mark', async () => {
    render(
      <ChakraProvider>
        <SoftCalendar groupId={mockGroupId} isGroupMember={true} />
      </ChakraProvider>
    );

    const button = await screen.findByText('Mark Your Availability');
    fireEvent.click(button);

    const submitButton = await screen.findByText('Submit');
    fireEvent.click(submitButton);

    // Should fetch again after success
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
