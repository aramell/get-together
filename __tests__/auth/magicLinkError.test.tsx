import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MagicLinkErrorContent from '@/components/auth/MagicLinkErrorContent';

const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

describe('MagicLinkErrorContent Component (Story 9.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    global.fetch = jest.fn();
  });

  it('shows the expired message as the page h1 (AC1, AC7)', () => {
    mockSearchParams = new URLSearchParams({ reason: 'expired', t: 'raw-token' });

    render(<MagicLinkErrorContent />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('This link has expired. Links are valid for 15 minutes.');
  });

  it('shows the already-used message as the page h1 (AC2, AC7)', () => {
    mockSearchParams = new URLSearchParams({ reason: 'already_used', t: 'raw-token' });

    render(<MagicLinkErrorContent />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('This link has already been used. Request a new one below.');
  });

  it('shows the invalid-link message as the page h1 when reason is invalid or missing (AC6, AC7)', () => {
    mockSearchParams = new URLSearchParams({ reason: 'invalid' });

    render(<MagicLinkErrorContent />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('This link is invalid. Please request a new one.');
  });

  it('renders the "Send me a new link" button, keyboard accessible (AC1, AC2, AC6, AC7)', () => {
    mockSearchParams = new URLSearchParams({ reason: 'expired' });

    render(<MagicLinkErrorContent />);

    expect(screen.getByRole('button', { name: /send me a new link/i })).toBeInTheDocument();
  });

  it('always prompts for a phone number rather than pre-filling one (AC1)', () => {
    mockSearchParams = new URLSearchParams({ reason: 'expired' });

    render(<MagicLinkErrorContent />);

    expect(screen.getByLabelText(/phone number/i)).toHaveValue('');
  });

  it('submits phoneNumber and originalToken to the rerequest endpoint, letting the server recover target context (AC3, AC4)', async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams({
      reason: 'expired',
      t: 'raw-token',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'New link sent! Check your texts.' }),
    });

    render(<MagicLinkErrorContent />);

    await user.type(screen.getByLabelText(/phone number/i), '5550001234');
    await user.click(screen.getByRole('button', { name: /send me a new link/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/sms/rerequest',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: '+15550001234',
            originalToken: 'raw-token',
          }),
        })
      );
    });
  });

  it('never sends URL-supplied targetType/targetId to the rerequest endpoint (access control)', async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams({
      reason: 'already_used',
      t: 'raw-token',
      targetType: 'group',
      targetId: 'some-group-id',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'New link sent! Check your texts.' }),
    });

    render(<MagicLinkErrorContent />);

    await user.type(screen.getByLabelText(/phone number/i), '5550001234');
    await user.click(screen.getByRole('button', { name: /send me a new link/i }));

    await waitFor(() => {
      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      const sentBody = JSON.parse(options.body);
      expect(sentBody).not.toHaveProperty('targetType');
      expect(sentBody).not.toHaveProperty('targetId');
    });
  });

  it('shows the success status via aria-live after a successful re-request (AC3, AC7)', async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams({ reason: 'expired' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'New link sent! Check your texts.' }),
    });

    render(<MagicLinkErrorContent />);

    await user.type(screen.getByLabelText(/phone number/i), '5550001234');
    await user.click(screen.getByRole('button', { name: /send me a new link/i }));

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveTextContent('New link sent! Check your texts.');
    });
  });

  it('shows a rate limit message on 429 (AC5)', async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams({ reason: 'expired' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ success: false, errorCode: 'RATE_LIMITED' }),
    });

    render(<MagicLinkErrorContent />);

    await user.type(screen.getByLabelText(/phone number/i), '5550001234');
    await user.click(screen.getByRole('button', { name: /send me a new link/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });
});
