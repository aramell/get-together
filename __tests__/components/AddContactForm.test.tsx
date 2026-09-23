import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { AddContactForm } from '@/components/circles/AddContactForm';

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('AddContactForm (Story 10.2)', () => {
  const defaultProps = {
    circleId: 'circle-1',
    onContactAdded: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it('defaults to phone-number mode (AC1)', () => {
    renderWithChakra(<AddContactForm {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Phone number' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Phone number')).toBeInTheDocument();
  });

  it('switches to username mode (AC2)', async () => {
    const user = userEvent.setup();
    renderWithChakra(<AddContactForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'App username' }));

    expect(screen.getByRole('button', { name: 'App username' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('App username')).toBeInTheDocument();
  });

  it('submits a phone contact and calls onContactAdded (AC1)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        data: { id: 'contact-1', type: 'phone', displayName: '+1 555 ***-1234' },
      }),
    });

    renderWithChakra(<AddContactForm {...defaultProps} />);

    await user.type(screen.getByLabelText('Phone number'), '+15550001234');
    await user.click(screen.getByRole('button', { name: /add contact/i }));

    await waitFor(() => {
      expect(defaultProps.onContactAdded).toHaveBeenCalledWith({
        id: 'contact-1',
        type: 'phone',
        displayName: '+1 555 ***-1234',
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/circles/circle-1/contacts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'phone', value: '+15550001234' }),
      })
    );
  });

  it('submits a username contact (AC2)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        data: { id: 'contact-2', type: 'user', displayName: 'Jane Doe' },
      }),
    });

    renderWithChakra(<AddContactForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'App username' }));
    await user.type(screen.getByLabelText('App username'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /add contact/i }));

    await waitFor(() => {
      expect(defaultProps.onContactAdded).toHaveBeenCalledWith({
        id: 'contact-2',
        type: 'user',
        displayName: 'Jane Doe',
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/circles/circle-1/contacts',
      expect.objectContaining({
        body: JSON.stringify({ type: 'user', value: 'jane@example.com' }),
      })
    );
  });

  it('shows the server validation error for an invalid phone number (AC3)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: false,
        message: 'Please enter a valid phone number including country code (e.g., +1 555 000 1234)',
      }),
    });

    renderWithChakra(<AddContactForm {...defaultProps} />);

    await user.type(screen.getByLabelText('Phone number'), '555');
    await user.click(screen.getByRole('button', { name: /add contact/i }));

    expect(
      await screen.findByText(
        'Please enter a valid phone number including country code (e.g., +1 555 000 1234)'
      )
    ).toBeInTheDocument();
    expect(defaultProps.onContactAdded).not.toHaveBeenCalled();
  });

  it('shows the not-found error for a username with no match (AC4)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: false,
        message: 'No user found with that name or email. You can still add them by phone number.',
      }),
    });

    renderWithChakra(<AddContactForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'App username' }));
    await user.type(screen.getByLabelText('App username'), 'nobody@example.com');
    await user.click(screen.getByRole('button', { name: /add contact/i }));

    expect(
      await screen.findByText(
        'No user found with that name or email. You can still add them by phone number.'
      )
    ).toBeInTheDocument();
  });

  it('shows the duplicate-contact error (AC5)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: false,
        message: 'This contact is already in this circle',
      }),
    });

    renderWithChakra(<AddContactForm {...defaultProps} />);

    await user.type(screen.getByLabelText('Phone number'), '+15550001234');
    await user.click(screen.getByRole('button', { name: /add contact/i }));

    expect(await screen.findByText('This contact is already in this circle')).toBeInTheDocument();
  });

  it('disables the submit button until a value is entered', () => {
    renderWithChakra(<AddContactForm {...defaultProps} />);

    expect(screen.getByRole('button', { name: /add contact/i })).toBeDisabled();
  });
});
