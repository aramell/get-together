import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventTypePicker } from '@/components/groups/EventTypePicker';
import { DefaultEventTypeSetting } from '@/components/groups/DefaultEventTypeSetting';
import { CreateEventModal } from '@/components/groups/CreateEventModal';

jest.mock('@/lib/services/groupService', () => ({ updateGroupSettings: jest.fn() }));
jest.mock('@/components/circles/CircleSelector', () => ({ CircleSelector: () => null }));

const { updateGroupSettings } = require('@/lib/services/groupService');
const wrap = (ui: React.ReactElement) => render(<ChakraProvider>{ui}</ChakraProvider>);

describe('EventTypePicker', () => {
  it('shows every type and previews the selected one', () => {
    wrap(<EventTypePicker value="dinner" onChange={() => {}} />);
    ['Trip', 'Dinner', 'Game night', 'Practice'].forEach((l) =>
      expect(screen.getByRole('radio', { name: l })).toBeInTheDocument()
    );
    expect(screen.getByRole('radio', { name: 'Dinner' })).toBeChecked();
    const preview = screen.getByTestId('event-type-preview');
    expect(preview).toHaveTextContent('Widgets: Who brings what, To do, Polls, Photos');
    expect(preview).toHaveTextContent('Dishes, Drinks');
    expect(preview).toHaveTextContent('Confirm dietary needs');
  });

  it('reports a change', () => {
    const onChange = jest.fn();
    wrap(<EventTypePicker value="trip" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Practice' }));
    expect(onChange).toHaveBeenCalledWith('practice');
  });
});

describe('CreateEventModal event type', () => {
  const props = { isOpen: true, onClose: jest.fn(), groupId: 'g1', onSuccess: jest.fn() };

  it('preselects Trip without a group default', () => {
    wrap(<CreateEventModal {...props} />);
    expect(screen.getByRole('radio', { name: 'Trip' })).toBeChecked();
  });

  it('preselects the group default', () => {
    wrap(<CreateEventModal {...props} defaultEventType="game_night" />);
    expect(screen.getByRole('radio', { name: 'Game night' })).toBeChecked();
  });

  it('falls back to Trip for an unknown default', () => {
    wrap(<CreateEventModal {...props} defaultEventType="rave" />);
    expect(screen.getByRole('radio', { name: 'Trip' })).toBeChecked();
  });

  describe('submit', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    async function submitWith(ui: React.ReactElement, pick?: string) {
      const fetchMock = jest.fn(() =>
        Promise.resolve({ ok: true, json: async () => ({ success: true, data: { event: { id: 'e1' } } }) })
      );
      global.fetch = fetchMock as unknown as typeof fetch;
      wrap(ui);
      if (pick) fireEvent.click(screen.getByRole('radio', { name: pick }));
      fireEvent.change(screen.getByLabelText('Event Title *'), { target: { value: 'Pizza Night' } });
      fireEvent.change(screen.getByLabelText('Date & Time *'), { target: { value: '2999-04-20T19:00' } });
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      return { url, body: JSON.parse(init.body as string) };
    }

    it('sends the type picked in the modal', async () => {
      const { url, body } = await submitWith(<CreateEventModal {...props} />, 'Dinner');
      expect(url).toBe('/api/groups/g1/events');
      expect(body.event_type).toBe('dinner');
    });

    it('sends the group default when the pick is unchanged', async () => {
      const { body } = await submitWith(<CreateEventModal {...props} defaultEventType="game_night" />);
      expect(body.event_type).toBe('game_night');
    });
  });
});

describe('DefaultEventTypeSetting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateGroupSettings.mockResolvedValue({ success: true });
  });

  it('saves a chosen type', async () => {
    const onChanged = jest.fn();
    wrap(<DefaultEventTypeSetting groupId="g1" defaultEventType={null} onChanged={onChanged} />);
    fireEvent.change(screen.getByLabelText('Default event type'), { target: { value: 'dinner' } });
    await waitFor(() => expect(updateGroupSettings).toHaveBeenCalledWith('g1', { default_event_type: 'dinner' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith('dinner'));
  });

  it('clears the default with null', async () => {
    wrap(<DefaultEventTypeSetting groupId="g1" defaultEventType="dinner" />);
    expect(screen.getByLabelText('Default event type')).toHaveValue('dinner');
    fireEvent.change(screen.getByLabelText('Default event type'), { target: { value: '' } });
    await waitFor(() => expect(updateGroupSettings).toHaveBeenCalledWith('g1', { default_event_type: null }));
  });

  it('reverts when the save fails', async () => {
    updateGroupSettings.mockResolvedValue({ success: false, error: 'nope' });
    wrap(<DefaultEventTypeSetting groupId="g1" defaultEventType={null} />);
    fireEvent.change(screen.getByLabelText('Default event type'), { target: { value: 'practice' } });
    await waitFor(() => expect(screen.getByLabelText('Default event type')).toHaveValue(''));
  });
});
