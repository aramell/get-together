import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { ItemCommentSection } from '@/components/groups/ItemCommentSection';
import { useAuth } from '@/lib/contexts/AuthContext';

jest.mock('@/lib/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const FETCH_URL = '/api/groups/g/events/e/checklist/i/comments';

const mine = {
  id: 'c1',
  content: 'My comment',
  created_by: 'user-1',
  created_at: new Date().toISOString(),
  creator: { display_name: 'Alice' },
};
const theirs = {
  id: 'c2',
  content: 'Their comment',
  created_by: 'user-2',
  created_at: new Date().toISOString(),
  creator: { display_name: 'Bob' },
};

function renderSection(props: Partial<React.ComponentProps<typeof ItemCommentSection>> = {}) {
  return render(
    <ChakraProvider>
      <ItemCommentSection fetchCommentsUrl={FETCH_URL} addCommentUrl={FETCH_URL} {...props} />
    </ChakraProvider>
  );
}

function mockFetch(handler: (url: string, init?: RequestInit) => any) {
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const { ok = true, body } = handler(url, init);
    return { ok, json: async () => body } as Response;
  }) as unknown as typeof fetch;
}

describe('ItemCommentSection', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ userId: 'user-1', accessToken: 'tok' });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('shows the empty state ready for a first comment', async () => {
    mockFetch(() => ({ body: { success: true, data: [] } }));
    renderSection();
    await waitFor(() => expect(screen.getByText(/No comments yet/)).toBeInTheDocument());
    expect(screen.getByLabelText('Comment input')).toBeEnabled();
  });

  it('posts a comment and shows it immediately, reporting the new count', async () => {
    const onCountChange = jest.fn();
    mockFetch((_url, init) =>
      init?.method === 'POST'
        ? { body: { success: true, data: mine } }
        : { body: { success: true, data: [] } }
    );
    renderSection({ onCountChange });
    await waitFor(() => screen.getByText(/No comments yet/));

    fireEvent.change(screen.getByLabelText('Comment input'), { target: { value: 'My comment' } });
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));

    await waitFor(() => expect(screen.getByText('My comment')).toBeInTheDocument());
    expect(onCountChange).toHaveBeenLastCalledWith(1);
    const post = (global.fetch as jest.Mock).mock.calls.find((c) => c[1]?.method === 'POST');
    expect(post[1].headers.Authorization).toBe('Bearer tok');
  });

  it('shows an error toast when posting fails', async () => {
    mockFetch((_url, init) =>
      init?.method === 'POST'
        ? { ok: false, body: { success: false, error: 'Boom failure' } }
        : { body: { success: true, data: [] } }
    );
    renderSection();
    await waitFor(() => screen.getByText(/No comments yet/));
    fireEvent.change(screen.getByLabelText('Comment input'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));
    await waitFor(() => expect(screen.getAllByText('Boom failure').length).toBeGreaterThan(0));
  });

  it('polls every 5 seconds and picks up new comments', async () => {
    jest.useFakeTimers();
    let data: any[] = [];
    mockFetch(() => ({ body: { success: true, data } }));
    renderSection();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText(/No comments yet/)).toBeInTheDocument();

    data = [theirs];
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await waitFor(() => expect(screen.getByText('Their comment')).toBeInTheDocument());
  });

  it('shows edit/delete only for own comments for a plain member', async () => {
    mockFetch(() => ({ body: { success: true, data: [mine, theirs] } }));
    renderSection({ userRole: 'member' });
    await waitFor(() => screen.getByText('Their comment'));
    expect(screen.getAllByRole('button', { name: /edit comment/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /delete this comment/i })).toHaveLength(1);
  });

  it('shows edit/delete on every comment for an admin', async () => {
    mockFetch(() => ({ body: { success: true, data: [mine, theirs] } }));
    renderSection({ userRole: 'admin' });
    await waitFor(() => screen.getByText('Their comment'));
    expect(screen.getAllByRole('button', { name: /edit comment/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /delete this comment/i })).toHaveLength(2);
  });

  it('deletes a comment after confirmation', async () => {
    mockFetch((_url, init) =>
      init?.method === 'DELETE'
        ? { body: { success: true } }
        : { body: { success: true, data: [mine] } }
    );
    renderSection({ userRole: 'member' });
    await waitFor(() => screen.getByText('My comment'));

    fireEvent.click(screen.getByRole('button', { name: /delete this comment/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(screen.queryByText('My comment')).not.toBeInTheDocument());
    const del = (global.fetch as jest.Mock).mock.calls.find((c) => c[1]?.method === 'DELETE');
    expect(del[0]).toBe(`${FETCH_URL}/c1`);
  });

  it('shows an error toast when delete fails and keeps the comment', async () => {
    mockFetch((_url, init) =>
      init?.method === 'DELETE'
        ? { ok: false, body: { success: false, error: 'Cannot delete' } }
        : { body: { success: true, data: [mine] } }
    );
    renderSection({ userRole: 'member' });
    await waitFor(() => screen.getByText('My comment'));
    fireEvent.click(screen.getByRole('button', { name: /delete this comment/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(screen.getAllByText('Cannot delete').length).toBeGreaterThan(0));
    expect(screen.getByText('My comment')).toBeInTheDocument();
  });

  it('edits a comment via PATCH and reflects it immediately', async () => {
    mockFetch((_url, init) =>
      init?.method === 'PATCH'
        ? { body: { success: true, data: { id: 'c1', content: 'Edited text', edited_at: new Date().toISOString(), updated_count: 1 } } }
        : { body: { success: true, data: [mine] } }
    );
    renderSection({ userRole: 'member' });
    await waitFor(() => screen.getByText('My comment'));

    fireEvent.click(screen.getByRole('button', { name: /edit comment/i }));
    const textarea = await screen.findByDisplayValue('My comment');
    fireEvent.change(textarea, { target: { value: 'Edited text' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByText('Edited text')).toBeInTheDocument());
    const patch = (global.fetch as jest.Mock).mock.calls.find((c) => c[1]?.method === 'PATCH');
    expect(patch[0]).toBe(`${FETCH_URL}/c1`);
  });

  it('read-only mode hides the input and edit/delete, and prompts login', async () => {
    const onRequestLogin = jest.fn();
    mockFetch(() => ({ body: { success: true, data: [theirs] } }));
    renderSection({ readOnly: true, userRole: null, onRequestLogin });
    await waitFor(() => screen.getByText('Their comment'));

    expect(screen.queryByLabelText('Comment input')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit comment/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /log in to comment/i }));
    expect(onRequestLogin).toHaveBeenCalled();
  });
});
