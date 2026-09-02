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

  it('redirects to the phone request page with an error flag on a 410 (used/expired)', async () => {
    mockSearchParams = new URLSearchParams({ t: 'raw-token' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 410,
      json: async () => ({ success: false, errorCode: 'INVALID_OR_EXPIRED_TOKEN' }),
    });

    render(<MagicLinkLandingContent />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/phone?error=expired');
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
