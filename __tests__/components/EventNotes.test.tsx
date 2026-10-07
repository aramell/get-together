import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventNotes } from '@/components/groups/EventNotes';
import { useAuth } from '@/lib/contexts/AuthContext';

jest.mock('@/lib/contexts/AuthContext', () => ({
  ...jest.requireActual('@/lib/contexts/AuthContext'),
  useAuth: jest.fn(),
}));

const notes = [
  { id: 'n1', created_by: 'user-1', title: 'Venue site', url: 'https://venue.example.com', body: 'Gate code 1234' },
  { id: 'n2', created_by: 'user-2', title: 'Parking', url: null, body: null },
];

function mockFetch(role: 'admin' | 'member', list: any[] = notes) {
  global.fetch = jest.fn((url: string, init?: any) => {
    if (init?.method === 'POST') {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { id: 'n3', created_by: 'user-1', title: 'New', url: null, body: null } }) });
    }
    if (String(url).endsWith('/notes')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: list }) });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true, data: { members: [{ user_id: 'user-1', role }] } }),
    });
  }) as unknown as typeof fetch;
}

const renderIt = (props: any) =>
  render(
    <ChakraProvider>
      <EventNotes eventId="event-1" {...props} />
    </ChakraProvider>
  );

describe('EventNotes', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ userId: 'user-1', accessToken: 'tok' });
  });

  it('member sees entries, a safe external link, and manage controls only on own notes', async () => {
    mockFetch('member');
    renderIt({ groupId: 'group-1' });
    expect(await screen.findByRole('heading', { level: 2, name: 'Notes & Links' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'https://venue.example.com' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(screen.getAllByLabelText(/^Edit note:/)).toHaveLength(1);
    expect(screen.getByLabelText('New note title')).toBeInTheDocument();
  });

  it('admin can manage every entry', async () => {
    mockFetch('admin');
    renderIt({ groupId: 'group-1' });
    await screen.findByText('Parking');
    await waitFor(() => expect(screen.getAllByLabelText(/^Delete note:/)).toHaveLength(2));
  });

  it('does not render a javascript: url as a link', async () => {
    mockFetch('member', [{ id: 'n1', created_by: 'user-2', title: 'Bad', url: 'javascript:alert(1)', body: null }]);
    renderIt({ groupId: 'group-1' });
    await screen.findByText('Bad');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('adds an entry and disables Add for an invalid URL', async () => {
    mockFetch('member');
    renderIt({ groupId: 'group-1' });
    await screen.findByText('Venue site');
    fireEvent.change(screen.getByLabelText('New note title'), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText('New note link (optional)'), { target: { value: 'javascript:1' } });
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('New note link (optional)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('New')).toBeInTheDocument();
  });

  it('edits an entry via PATCH and updates the list', async () => {
    mockFetch('member');
    renderIt({ groupId: 'group-1' });
    await screen.findByText('Venue site');
    fireEvent.click(screen.getByLabelText(/^Edit note:/));
    fireEvent.change(screen.getByLabelText('Edit note title'), { target: { value: 'Renamed' } });
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, data: { ...notes[0], title: 'Renamed' } }) })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Renamed')).toBeInTheDocument();
    const call = (global.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(call[0]).toBe('/api/groups/group-1/events/event-1/notes/n1');
    expect(screen.queryByText('Venue site')).not.toBeInTheDocument();
  });

  it('deletes an entry via DELETE and removes the row', async () => {
    mockFetch('member');
    renderIt({ groupId: 'group-1' });
    await screen.findByText('Venue site');
    (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({ ok: true, json: async () => ({ success: true }) }));
    fireEvent.click(screen.getByLabelText(/^Delete note:/));
    await waitFor(() => expect(screen.queryByText('Venue site')).not.toBeInTheDocument());
    const call = (global.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'DELETE');
    expect(call[0]).toBe('/api/groups/group-1/events/event-1/notes/n1');
  });

  it('restores the row when DELETE fails', async () => {
    mockFetch('member');
    renderIt({ groupId: 'group-1' });
    await screen.findByText('Venue site');
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: false, json: async () => ({ success: false, error: 'nope' }) })
    );
    fireEvent.click(screen.getByLabelText(/^Delete note:/));
    await waitFor(() => expect(screen.getByText('Venue site')).toBeInTheDocument());
  });

  it('shows empty state with the add form for members', async () => {
    mockFetch('member', []);
    renderIt({ groupId: 'group-1' });
    expect(await screen.findByText('No notes or links yet.')).toBeInTheDocument();
    expect(screen.getByLabelText('New note title')).toBeInTheDocument();
  });

  it('guest view is read-only: links shown, no add/edit controls, uses the public endpoint', async () => {
    (useAuth as jest.Mock).mockReturnValue({ userId: null, accessToken: null });
    mockFetch('member');
    renderIt({ publicToken: 'a'.repeat(64) });
    expect(await screen.findByRole('link', { name: 'https://venue.example.com' })).toBeInTheDocument();
    expect(screen.queryByLabelText('New note title')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Edit note:/)).not.toBeInTheDocument();
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(`/api/events/public/${'a'.repeat(64)}/notes`);
  });
});
