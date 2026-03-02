import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

jest.mock('@/lib/services/authService', () => ({
  forgotPassword: jest.fn(),
}));

describe('ForgotPasswordForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render forgot password form with email field', () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset/i })).toBeInTheDocument();
  });

  it('should render back to login link', () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
  });

  it('should disable submit button until form is valid', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    const submitButton = screen.getByRole('button', { name: /send reset/i });

    // Initially disabled
    expect(submitButton).toBeDisabled();

    // Fill in email
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should have accessible labels and ARIA attributes', () => {
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText(/email/i);

    // Tab to email input
    await user.tab();
    expect(emailInput).toHaveFocus();

    // Fill email
    await user.type(emailInput, 'user@example.com');

    // Tab to submit button
    await user.tab();
    const submitButton = screen.getByRole('button', { name: /send reset/i });
    expect(submitButton).toHaveFocus();
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');

    const submitButton = screen.getByRole('button', { name: /send reset/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should display success message after submission', async () => {
    const user = userEvent.setup();
    const { forgotPassword } = require('@/lib/services/authService');
    forgotPassword.mockResolvedValueOnce({
      success: true,
      message: 'Reset code sent',
    });

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset/i }));

    await waitFor(() => {
      expect(screen.getByText(/check.*email/i)).toBeInTheDocument();
    });
  });
});
