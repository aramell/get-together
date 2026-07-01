/**
 * PUBLIC RSVP FORM TESTS
 * Testing email input, RSVP status selection, and form submission
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PublicRsvpForm } from '@/components/groups/PublicRsvpForm';
import { ChakraProvider } from '@chakra-ui/react';

const mockToken = 'test-public-token-12345';
const mockEventTitle = 'Weekend Hiking Trip';

// Mock fetch
global.fetch = jest.fn();

const renderComponent = (props = {}) => {
  return render(
    <ChakraProvider>
      <PublicRsvpForm
        publicToken={mockToken}
        eventTitle={mockEventTitle}
        {...props}
      />
    </ChakraProvider>
  );
};

describe('PublicRsvpForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders email input field', () => {
      renderComponent();
      const emailInput = screen.getByLabelText(/Email Address/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('renders optional name input field', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Name \(optional\)/i);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).not.toHaveAttribute('required');
    });

    it('renders three RSVP status buttons', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /IN/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /MAYBE/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /OUT/i })).toBeInTheDocument();
    });

    it('renders submit button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Submit RSVP/i })).toBeInTheDocument();
    });

    it('has form element with proper structure', () => {
      renderComponent();
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Email Validation', () => {
    it('validates email format on blur', async () => {
      renderComponent();
      const emailInput = screen.getByLabelText(/Email Address/i);

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.tab();

      expect(
        screen.getByText(/Please enter a valid email address/i)
      ).toBeInTheDocument();
    });

    it('clears email error when valid email provided', async () => {
      renderComponent();
      const emailInput = screen.getByLabelText(/Email Address/i);

      // Type invalid email
      await userEvent.type(emailInput, 'invalid');
      await userEvent.tab();
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();

      // Clear and type valid email
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.tab();

      expect(screen.queryByText(/Please enter a valid email address/i)).not.toBeInTheDocument();
    });

    it('requires email before submission', async () => {
      renderComponent();
      const submitButton = screen.getByRole('button', { name: /Submit RSVP/i });

      await userEvent.click(submitButton);

      expect(
        screen.getByText(/Email is required/i)
      ).toBeInTheDocument();
    });
  });

  describe('RSVP Status Selection', () => {
    it('selects IN status', async () => {
      renderComponent();
      const inButton = screen.getByRole('button', { name: /IN/i });

      await userEvent.click(inButton);

      expect(inButton).toHaveAttribute('aria-pressed', 'true');
      expect(inButton).toHaveClass('selected');
    });

    it('selects MAYBE status', async () => {
      renderComponent();
      const maybeButton = screen.getByRole('button', { name: /MAYBE/i });

      await userEvent.click(maybeButton);

      expect(maybeButton).toHaveAttribute('aria-pressed', 'true');
      expect(maybeButton).toHaveClass('selected');
    });

    it('selects OUT status', async () => {
      renderComponent();
      const outButton = screen.getByRole('button', { name: /OUT/i });

      await userEvent.click(outButton);

      expect(outButton).toHaveAttribute('aria-pressed', 'true');
      expect(outButton).toHaveClass('selected');
    });

    it('allows changing selected status', async () => {
      renderComponent();
      const inButton = screen.getByRole('button', { name: /IN/i });
      const maybeButton = screen.getByRole('button', { name: /MAYBE/i });

      await userEvent.click(inButton);
      expect(inButton).toHaveClass('selected');

      await userEvent.click(maybeButton);
      expect(maybeButton).toHaveClass('selected');
      expect(inButton).not.toHaveClass('selected');
    });

    it('requires status before submission', async () => {
      renderComponent();
      const emailInput = screen.getByLabelText(/Email Address/i);
      const submitButton = screen.getByRole('button', { name: /Submit RSVP/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      expect(
        screen.getByText(/Please select an RSVP status/i)
      ).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with email and status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            status: 'in',
            momentum: { in: 4, maybe: 2, out: 1 },
          },
          message: '4 people are IN.',
        }),
      });

      renderComponent();
      const emailInput = screen.getByLabelText(/Email Address/i);
      const inButton = screen.getByRole('button', { name: /IN/i });
      const submitButton = screen.getByRole('button', { name: /Submit RSVP/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(inButton);
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/events/public/${mockToken}`,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@example.com',
              name: '',
              status: 'in',
            }),
          })
        );
      });
    });

    it('shows success message after submission', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { momentum: { in: 4, maybe: 2, out: 1 } },
          message: '4 people are IN.',
        }),
      });

      renderComponent();
      const emailInput = screen.getByLabelText(/Email Address/i);
      const inButton = screen.getByRole('button', { name: /IN/i });
      const submitButton = screen.getByRole('button', { name: /Submit RSVP/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(inButton);
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Thanks! You're marked as IN/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error message on submission failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Validation failed' }),
      });

      renderComponent();
      const emailInput = screen.getByLabelText(/Email Address/i);
      const inButton = screen.getByRole('button', { name: /IN/i });
      const submitButton = screen.getByRole('button', { name: /Submit RSVP/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(inButton);
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Validation failed/i)).toBeInTheDocument();
      });
    });

    it('disables button during submission', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                }),
              500
            )
          )
      );

      renderComponent();
      const emailInput = screen.getByLabelText(/Email Address/i);
      const inButton = screen.getByRole('button', { name: /IN/i });
      const submitButton = screen.getByRole('button', { name: /Submit RSVP/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(inButton);
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/Submitting/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderComponent();

      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
      expect(
        screen.getByRole('group', { name: /Select your RSVP status/i })
      ).toBeInTheDocument();
    });

    it('announces errors with aria-live', async () => {
      renderComponent();
      const submitButton = screen.getByRole('button', { name: /Submit RSVP/i });

      await userEvent.click(submitButton);

      const alertRegion = screen.getByRole('alert');
      expect(alertRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('announces success with aria-live', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { momentum: { in: 4, maybe: 2, out: 1 } },
        }),
      });

      renderComponent();
      const emailInput = screen.getByLabelText(/Email Address/i);
      const inButton = screen.getByRole('button', { name: /IN/i });
      const submitButton = screen.getByRole('button', { name: /Submit RSVP/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(inButton);
      await userEvent.click(submitButton);

      await waitFor(() => {
        const statusRegion = screen.getByRole('status');
        expect(statusRegion).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('supports keyboard navigation', async () => {
      renderComponent();
      const emailInput = screen.getByLabelText(/Email Address/i);

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      await userEvent.tab();
      // Focus should move to next focusable element (name input or button)
      expect(document.activeElement).not.toBe(emailInput);
    });
  });
});
