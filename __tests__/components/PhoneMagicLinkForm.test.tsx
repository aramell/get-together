import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneMagicLinkForm from '@/components/auth/PhoneMagicLinkForm';

describe('PhoneMagicLinkForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders a phone number input, a country code selector, and a submit button (AC1)', () => {
    render(<PhoneMagicLinkForm />);

    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/country code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
  });

  it('renders a back to login link', () => {
    render(<PhoneMagicLinkForm />);

    expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
  });

  it('disables the submit button until a valid number is entered (AC1)', async () => {
    const user = userEvent.setup();
    render(<PhoneMagicLinkForm />);

    const submitButton = screen.getByRole('button', { name: /send magic link/i });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText(/phone number/i), '5550001234');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('shows a validation error for a too-short number (AC2)', async () => {
    const user = userEvent.setup();
    render(<PhoneMagicLinkForm />);

    await user.type(screen.getByLabelText(/phone number/i), 'abc');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/valid phone number/i)).toBeInTheDocument();
    });
  });

  it('the country code selector is keyboard accessible (AC7)', async () => {
    const user = userEvent.setup();
    render(<PhoneMagicLinkForm />);

    await user.tab();
    expect(screen.getByLabelText(/country code/i)).toHaveFocus();
  });

  it('announces errors via aria-live', () => {
    render(<PhoneMagicLinkForm />);

    const alertRegion = screen.getByRole('alert');
    expect(alertRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('submits the combined E.164 number and shows the success state (AC3)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Check your texts — we sent a link to +15550001234' }),
    });

    render(<PhoneMagicLinkForm />);

    await user.type(screen.getByLabelText(/phone number/i), '5550001234');
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your texts/i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/sms/request',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ phoneNumber: '+15550001234' }),
      })
    );
  });

  it('shows a rate limit message on 429', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ success: false, message: 'Too many requests.', errorCode: 'RATE_LIMITED' }),
    });

    render(<PhoneMagicLinkForm />);

    await user.type(screen.getByLabelText(/phone number/i), '5550001234');
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });

  it('shows a loading state during submission', async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: unknown) => void = () => {};
    (global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    render(<PhoneMagicLinkForm />);

    await user.type(screen.getByLabelText(/phone number/i), '5550001234');
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    const submitButton = screen.getByRole('button', { name: /send magic link/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/sending/i);

    resolveFetch({ ok: true, json: async () => ({ success: true, message: 'sent' }) });
  });
});
