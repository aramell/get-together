import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MagicLinkLandingContent from '@/components/auth/MagicLinkLandingContent';

const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

describe('MagicLinkLandingContent Component (AC8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    global.fetch = jest.fn();
  });

  it('shows an accessible loading state while the API call is in flight', () => {
    mockSearchParams = new URLSearchParams({ t: 'raw-token' });
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<MagicLinkLandingContent />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText(/signing you in/i)).toBeInTheDocument();
  });

  it('shows an error and does not call the API when the token is missing', async () => {
    render(<MagicLinkLandingContent />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('posts the token and redirects to the returned path on success', async () => {
    mockSearchParams = new URLSearchParams({ t: 'raw-token' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, redirectPath: '/groups/group-1' }),
    });

    render(<MagicLinkLandingContent />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/groups/group-1');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/magic',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'raw-token' }),
      })
    );
  });

  it('redirects to the magic link error page with the reason and token on a 410 (Story 9.3)', async () => {
    mockSearchParams = new URLSearchParams({ t: 'raw-token' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 410,
      json: async () => ({ success: false, reason: 'expired' }),
    });

    render(<MagicLinkLandingContent />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/magic/error?reason=expired&t=raw-token');
    });
  });

  it('carries target context through to the error page when present on the 410 response', async () => {
    mockSearchParams = new URLSearchParams({ t: 'raw-token' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 410,
      json: async () => ({ success: false, reason: 'already_used', targetType: 'group', targetId: 'group-1' }),
    });

    render(<MagicLinkLandingContent />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/auth/magic/error?reason=already_used&targetType=group&targetId=group-1&t=raw-token'
      );
    });
  });

  it('shows an error message for an unexpected server failure', async () => {
    mockSearchParams = new URLSearchParams({ t: 'raw-token' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ success: false, message: 'Server error' }),
    });

    render(<MagicLinkLandingContent />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
