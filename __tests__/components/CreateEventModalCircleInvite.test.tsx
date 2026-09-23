import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { CreateEventModal } from '@/components/groups/CreateEventModal';

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('CreateEventModal circle bulk-invite wiring (Story 10.5)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    groupId: 'group-123',
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText('Event Title *'), 'Pizza Night');
    await user.type(screen.getByLabelText('Date & Time *'), '2030-04-20T19:00');
  };

  it('renders the circle selector (AC1)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    });

    renderWithChakra(<CreateEventModal {...defaultProps} />);

    expect(await screen.findByLabelText('Invite a circle (optional)')).toBeInTheDocument();
  });

  it('submits the selected circleId and excludedContactIds with the event (AC2, AC3)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [{ id: 'circle-1', name: 'Weekend Crew', contactCount: 2 }],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            id: 'circle-1',
            name: 'Weekend Crew',
            contacts: [
              { id: 'contact-1', type: 'phone', displayName: '+1 555 ***-1234' },
              { id: 'contact-2', type: 'user', displayName: 'Jane Doe' },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          message: 'Event proposed successfully',
          data: { event: { id: 'event-1' }, rsvp: { id: 'rsvp-1', status: 'in' } },
          invitesSent: 1,
          invitesFailed: 0,
        }),
      });

    renderWithChakra(<CreateEventModal {...defaultProps} />);

    await fillRequiredFields(user);
    await screen.findByText('Weekend Crew (2 contacts)');
    await user.selectOptions(screen.getByLabelText('Invite a circle (optional)'), 'circle-1');
    await screen.findByText('Inviting 2 contacts from Weekend Crew');

    // Exclude one contact before submitting (AC2)
    await user.click(screen.getByLabelText('Remove Jane Doe from invite list'));
    await screen.findByText('Inviting 1 contact from Weekend Crew');

    await user.click(screen.getByRole('button', { name: /Create Event/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/groups/group-123/events',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"circleId":"circle-1"'),
        })
      );
    });

    const lastCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[2][1].body);
    expect(lastCallBody.excludedContactIds).toEqual(['contact-2']);
  });

  it('does not include circleId when no circle is selected (AC8)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          message: 'Event proposed successfully',
          data: { event: { id: 'event-1' }, rsvp: { id: 'rsvp-1', status: 'in' } },
        }),
      });

    renderWithChakra(<CreateEventModal {...defaultProps} />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /Create Event/i }));

    await waitFor(() => {
      const lastCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
      expect(lastCallBody.circleId).toBeUndefined();
      expect(lastCallBody.excludedContactIds).toBeUndefined();
    });
  });

  it('shows the invite summary in the success toast when invites were sent (AC7)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          message: 'Event proposed successfully',
          data: { event: { id: 'event-1' }, rsvp: { id: 'rsvp-1', status: 'in' } },
          invitesSent: 3,
          invitesFailed: 1,
        }),
      });

    renderWithChakra(<CreateEventModal {...defaultProps} />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /Create Event/i }));

    expect(
      await screen.findByText('Event proposed. 3 invites sent, 1 failed.')
    ).toBeInTheDocument();
  });
});
