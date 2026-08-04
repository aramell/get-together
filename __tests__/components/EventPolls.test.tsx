import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventPolls } from '@/components/groups/EventPolls';
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

const mockPolls = [
  {
    id: 'poll-1',
    created_by: 'other-user',
    question: 'Pizza or tacos?',
    options: [
      { id: 'opt-1', label: 'Pizza', display_order: 0, vote_count: 3 },
      { id: 'opt-2', label: 'Tacos', display_order: 1, vote_count: 1 },
    ],
    total_votes: 4,
    user_vote: 'opt-1',
  },
];

function mockFetchSequence(pollsResponse = mockPolls, currentUserRole: 'admin' | 'member' = 'admin') {
  global.fetch = jest.fn((url: string) => {
    if (typeof url === 'string' && url.includes('/polls')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: pollsResponse }) });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true, data: { members: [], currentUserRole } }),
    });
  }) as unknown as typeof fetch;
}

describe('EventPolls Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders polls with vote bars', async () => {
    mockFetchSequence();
    renderWithProviders(<EventPolls eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pizza or tacos?')).toBeInTheDocument();
      expect(screen.getByText('Pizza')).toBeInTheDocument();
      expect(screen.getByText('Tacos')).toBeInTheDocument();
      expect(screen.getByText('3 (75%)')).toBeInTheDocument();
      expect(screen.getByText('1 (25%)')).toBeInTheDocument();
    });
  });

  it('visually distinguishes the option the current user voted for', async () => {
    mockFetchSequence();
    renderWithProviders(<EventPolls eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Pizza or tacos?')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /^selected$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^vote$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove my vote/i })).toBeInTheDocument();
  });

  it('casts a vote via POST to the vote endpoint', async () => {
    mockFetchSequence([{ ...mockPolls[0], user_vote: null, options: [
      { id: 'opt-1', label: 'Pizza', display_order: 0, vote_count: 3 },
      { id: 'opt-2', label: 'Tacos', display_order: 1, vote_count: 1 },
    ] }]);
    renderWithProviders(<EventPolls eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Pizza or tacos?')).toBeInTheDocument());

    let postCalled = false;
    (global.fetch as jest.Mock).mockImplementationOnce((url: string, options: any) => {
      expect(url).toContain('/polls/poll-1/vote');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ option_id: 'opt-2' });
      postCalled = true;
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { option_id: 'opt-2' } }) });
    });
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ ...mockPolls[0], user_vote: 'opt-2', options: [
            { id: 'opt-1', label: 'Pizza', display_order: 0, vote_count: 3 },
            { id: 'opt-2', label: 'Tacos', display_order: 1, vote_count: 2 },
          ] }],
        }),
      })
    );

    const voteButtons = screen.getAllByRole('button', { name: /^vote$/i });
    fireEvent.click(voteButtons[voteButtons.length - 1]); // Tacos "Vote" button

    await waitFor(() => expect(postCalled).toBe(true));
  });

  it('removes a vote via DELETE to the vote endpoint', async () => {
    mockFetchSequence();
    renderWithProviders(<EventPolls eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Pizza or tacos?')).toBeInTheDocument());

    let deleteCalled = false;
    (global.fetch as jest.Mock).mockImplementationOnce((url: string, options: any) => {
      expect(url).toContain('/polls/poll-1/vote');
      expect(options.method).toBe('DELETE');
      deleteCalled = true;
      return Promise.resolve({ ok: true, json: async () => ({ success: true, message: 'Vote removed' }) });
    });

    fireEvent.click(screen.getByRole('button', { name: /remove my vote/i }));

    await waitFor(() => expect(deleteCalled).toBe(true));
    await waitFor(() => expect(screen.queryByText(/remove my vote/i)).not.toBeInTheDocument());
  });

  it('shows delete control for the poll creator or an admin', async () => {
    mockFetchSequence(mockPolls, 'admin');
    renderWithProviders(<EventPolls eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Pizza or tacos?')).toBeInTheDocument());
    // user-1 is admin per mocked currentUserRole, so delete control shows even though
    // the poll was created by 'other-user'.
    expect(screen.getByLabelText('Delete poll')).toBeInTheDocument();
  });

  it('hides delete control for a non-creator, non-admin', async () => {
    mockFetchSequence(mockPolls, 'member');
    renderWithProviders(<EventPolls eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Pizza or tacos?')).toBeInTheDocument());
    expect(screen.queryByLabelText('Delete poll')).not.toBeInTheDocument();
  });

  it('deletes a poll and removes it from the list', async () => {
    mockFetchSequence();
    renderWithProviders(<EventPolls eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('Pizza or tacos?')).toBeInTheDocument());

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, message: 'deleted' }) })
    );

    fireEvent.click(screen.getByLabelText('Delete poll'));

    await waitFor(() => {
      expect(screen.queryByText('Pizza or tacos?')).not.toBeInTheDocument();
    });
  });

  it('disables Create Poll until a question and 2 options are filled', async () => {
    mockFetchSequence([]);
    renderWithProviders(<EventPolls eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('No polls yet.')).toBeInTheDocument());

    const createButton = screen.getByRole('button', { name: /create poll/i });
    expect(createButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('New poll question'), { target: { value: 'Best time?' } });
    fireEvent.change(screen.getByLabelText('Poll option 1'), { target: { value: 'Morning' } });
    fireEvent.change(screen.getByLabelText('Poll option 2'), { target: { value: 'Evening' } });

    expect(createButton).not.toBeDisabled();
  });

  it('creates a new poll with dynamically added options', async () => {
    mockFetchSequence([]);
    renderWithProviders(<EventPolls eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('No polls yet.')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /add option/i }));
    expect(screen.getByLabelText('Poll option 3')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('New poll question'), { target: { value: 'Best time?' } });
    fireEvent.change(screen.getByLabelText('Poll option 1'), { target: { value: 'Morning' } });
    fireEvent.change(screen.getByLabelText('Poll option 2'), { target: { value: 'Evening' } });
    fireEvent.change(screen.getByLabelText('Poll option 3'), { target: { value: 'Night' } });

    const newPoll = {
      id: 'poll-2', created_by: 'user-1', question: 'Best time?',
      options: [
        { id: 'o1', label: 'Morning', display_order: 0, vote_count: 0 },
        { id: 'o2', label: 'Evening', display_order: 1, vote_count: 0 },
        { id: 'o3', label: 'Night', display_order: 2, vote_count: 0 },
      ],
      total_votes: 0, user_vote: null,
    };
    (global.fetch as jest.Mock).mockImplementationOnce((url: string, options: any) => {
      expect(JSON.parse(options.body)).toEqual({
        question: 'Best time?',
        options: ['Morning', 'Evening', 'Night'],
      });
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: newPoll }) });
    });

    fireEvent.click(screen.getByRole('button', { name: /create poll/i }));

    await waitFor(() => {
      expect(screen.getByText('Best time?')).toBeInTheDocument();
    });
  });

  it('polls every 5 seconds and does not stack overlapping requests when a response is slow', async () => {
    jest.useFakeTimers();

    let resolveSlowFetch: (value: any) => void = () => {};
    let pollsCallCount = 0;

    global.fetch = jest.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/polls')) {
        pollsCallCount += 1;
        if (pollsCallCount === 1) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: mockPolls }) });
        }
        return new Promise((resolve) => {
          resolveSlowFetch = resolve;
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: { members: [], currentUserRole: 'admin' } }),
      });
    }) as unknown as typeof fetch;

    renderWithProviders(<EventPolls eventId="event-1" groupId="group-1" />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(pollsCallCount).toBe(1);

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(pollsCallCount).toBe(2);

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(pollsCallCount).toBe(2); // in-flight guard blocked a third call

    await act(async () => {
      resolveSlowFetch({ ok: true, json: async () => ({ success: true, data: mockPolls }) });
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(pollsCallCount).toBe(3);
  });
});
