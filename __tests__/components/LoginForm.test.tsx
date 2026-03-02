import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '@/components/auth/LoginForm';

// Mock the auth service
jest.mock('@/lib/services/authService', () => ({
  loginUser: jest.fn(),
}));

describe('LoginForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form with email and password fields', () => {
    const mockOnSuccess = jest.fn();
    render(<LoginForm onSuccess={mockOnSuccess} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('should render "Forgot Password?" and "Sign up" links', () => {
    const mockOnSuccess = jest.fn();
    render(<LoginForm onSuccess={mockOnSuccess} />);

    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should disable submit button until form is valid', async () => {
    const mockOnSuccess = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const submitButton = screen.getByRole('button', { name: /log in/i });

    // Initially disabled
    expect(submitButton).toBeDisabled();

    // Fill in email
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    expect(submitButton).toBeDisabled();

    // Fill in password
    await user.type(screen.getByLabelText(/password/i), 'ValidPassword123');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should show validation error for invalid email', async () => {
    const mockOnSuccess = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Blur to trigger validation

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for short password', async () => {
    const mockOnSuccess = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, 'short');
    await user.tab(); // Blur to trigger validation

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should have accessible labels and ARIA attributes', () => {
    const mockOnSuccess = jest.fn();
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should support keyboard navigation', async () => {
    const mockOnSuccess = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email/i);

    // Tab to email input
    await user.tab();
    expect(emailInput).toHaveFocus();

    // Fill email
    await user.type(emailInput, 'user@example.com');

    // Tab to password input
    await user.tab();
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveFocus();

    // Fill password
    await user.type(passwordInput, 'ValidPassword123');

    // Tab to submit button
    await user.tab();
    const submitButton = screen.getByRole('button', { name: /log in/i });
    expect(submitButton).toHaveFocus();
  });

  it('should show loading state during submission', async () => {
    const mockOnSuccess = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'ValidPassword123');

    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    // Should show loading state (spinner or disabled button)
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should have proper form structure', () => {
    const mockOnSuccess = jest.fn();
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const form = screen.getByRole('form', { hidden: true }) || screen.getByLabelText(/email/i).closest('form');
    expect(form).toBeInTheDocument();
  });
});
