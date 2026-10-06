import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { ChecklistCommentPopover } from '@/components/groups/ChecklistCommentPopover';
import { useAuth } from '@/lib/contexts/AuthContext';

jest.mock('@/lib/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const URL_ = '/api/groups/g/events/e/checklist/i1/comments';

const comments = [
  { id: 'c1', content: 'First one', created_by: 'u2', created_at: new Date().toISOString(), creator: { display_name: 'Bob' } },
  { id: 'c2', content: 'Latest one', created_by: 'u3', created_at: new Date().toISOString(), creator: { display_name: 'Cy' } },
];

function mockComments(data: any[]) {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ success: true, data }) })) as unknown as typeof fetch;
}

function renderPopover(props: Partial<React.ComponentProps<typeof ChecklistCommentPopover>> = {}) {
  return render(
    <ChakraProvider>
      <ChecklistCommentPopover
        itemId="i1"
        itemType="checklist"
        itemLabel="Tent"
        fetchCommentsUrl={URL_}
        addCommentUrl={URL_}
        {...props}
      />
    </ChakraProvider>
  );
}

describe('ChecklistCommentPopover', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ userId: 'u1', accessToken: 'tok' });
  });
  afterEach(() => jest.clearAllMocks());

  it('renders the icon with no badge when there are zero comments', () => {
    mockComments([]);
    renderPopover({ commentCount: 0 });
    expect(screen.getByRole('button', { name: /comments on "tent" \(none yet\)/i })).toBeInTheDocument();
    expect(screen.queryByTestId('checklist-comment-count-i1')).not.toBeInTheDocument();
  });

  it('shows the count badge once there is at least one comment', () => {
    mockComments(comments);
    renderPopover({ commentCount: 2 });
    expect(screen.getByTestId('checklist-comment-count-i1')).toHaveTextContent('2');
  });

  it('opens an empty-state preview on click and leads into the thread to post the first comment', async () => {
    mockComments([]);
    renderPopover({ commentCount: 0 });
    fireEvent.click(screen.getByTestId('checklist-comment-trigger-i1'));

    expect(await screen.findByText('No comments yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add a comment/i }));

    expect(await screen.findByLabelText('Comment input')).toBeEnabled();
  });

  it('opens the preview on keyboard focus (not hover alone) with the most recent comment', async () => {
    mockComments(comments);
    renderPopover({ commentCount: 2 });
    fireEvent.focus(screen.getByTestId('checklist-comment-trigger-i1'));

    expect(await screen.findByText('Latest one')).toBeInTheDocument();
    expect(screen.queryByText('First one')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view all \(2\)/i })).toBeInTheDocument();
  });

  it('closes the preview on Escape', async () => {
    mockComments(comments);
    renderPopover({ commentCount: 2 });
    const trigger = screen.getByTestId('checklist-comment-trigger-i1');
    fireEvent.focus(trigger);
    await screen.findByText('Latest one');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
  });

  it('closes the preview on an outside click', async () => {
    mockComments(comments);
    renderPopover({ commentCount: 2 });
    const trigger = screen.getByTestId('checklist-comment-trigger-i1');
    fireEvent.click(trigger);
    await screen.findByText('Latest one');

    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
  });

  it('closes the modal on Escape and returns focus to the trigger without re-opening the preview', async () => {
    mockComments(comments);
    renderPopover({ commentCount: 2 });
    const trigger = screen.getByTestId('checklist-comment-trigger-i1');
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: /view all/i }));
    const dialog = await screen.findByRole('dialog', { name: /comments: tent/i });

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Comments: Tent')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('guest: icon visible, opens a read-only thread, adding prompts login', async () => {
    mockComments(comments);
    const onRequestLogin = jest.fn();
    renderPopover({ commentCount: 2, isGuest: true, onRequestLogin });

    fireEvent.click(screen.getByTestId('checklist-comment-trigger-i1'));
    // Clicking the icon must open the preview, not fire the login prompt.
    expect(await screen.findByText('Latest one')).toBeInTheDocument();
    expect(onRequestLogin).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /view all/i }));
    expect(await screen.findByText('First one')).toBeInTheDocument();
    expect(screen.queryByLabelText('Comment input')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /log in to comment/i }));
    expect(onRequestLogin).toHaveBeenCalled();
  });

  it('guest with zero comments still sees the icon and can open an empty read-only view', async () => {
    mockComments([]);
    renderPopover({ commentCount: 0, isGuest: true });
    fireEvent.click(screen.getByTestId('checklist-comment-trigger-i1'));
    expect(await screen.findByText('No comments yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('checklist-comment-count-i1')).not.toBeInTheDocument();
  });
});
