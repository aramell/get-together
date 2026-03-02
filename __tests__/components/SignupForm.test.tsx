import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import SignupForm from '@/components/auth/SignupForm';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock fetch
global.fetch = jest.fn();

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('SignupForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render signup form with all fields', () => {
    renderWithChakra(<SignupForm />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderWithChakra(<SignupForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for password too short', async () => {
    const user = userEvent.setup();
    renderWithChakra(<SignupForm />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'short');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();
    });
  });

  it('should show error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderWithChakra(<SignupForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password124');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should enable submit button with valid form data', async () => {
    const user = userEvent.setup();
    renderWithChakra(<SignupForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should call signup API on form submission', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Signup successful! Check your email to verify your account.',
        userId: 'test-user-id',
      }),
    });

    renderWithChakra(<SignupForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123',
        }),
      });
    });
  });

  it('should display success message on successful signup', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Signup successful! Check your email to verify your account.',
        userId: 'test-user-id',
      }),
    });

    renderWithChakra(<SignupForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/signup successful/i)).toBeInTheDocument();
    });
  });

  it('should display error message on signup failure', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        message: 'This email is already registered',
        errorCode: 'EMAIL_EXISTS',
      }),
    });

    renderWithChakra(<SignupForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/this email is already registered/i)).toBeInTheDocument();
    });
  });

  it('should call onSuccess callback with email', async () => {
    const user = userEvent.setup();
    const onSuccessMock = jest.fn();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Signup successful! Check your email to verify your account.',
        userId: 'test-user-id',
      }),
    });

    renderWithChakra(<SignupForm onSuccess={onSuccessMock} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalledWith('user@example.com');
    });
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    renderWithChakra(<SignupForm />);

    const emailInput = screen.getByLabelText(/email address/i);

    // Tab to email input and check it's focused
    emailInput.focus();
    expect(emailInput).toHaveFocus();

    // Tab through form fields
    await user.tab();
    expect(screen.getByLabelText(/^password$/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/confirm password/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /sign up/i })).toHaveFocus();
  });
});
