import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { ContactList } from '@/components/circles/ContactList';

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('ContactList (Story 10.2)', () => {
  const contacts = [
    { id: 'contact-1', type: 'phone' as const, displayName: '+1 555 ***-1234' },
    { id: 'contact-2', type: 'user' as const, displayName: 'Jane Doe' },
  ];

  const defaultProps = {
    circleId: 'circle-1',
    contacts,
    onContactRemoved: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it('renders each contact with a type indicator (AC1, AC2)', () => {
    renderWithChakra(<ContactList {...defaultProps} />);

    expect(screen.getByText('+1 555 ***-1234')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('App user')).toBeInTheDocument();
  });

  it('shows an empty state with no contacts', () => {
    renderWithChakra(<ContactList {...defaultProps} contacts={[]} />);

    expect(screen.getByText('No contacts in this circle yet.')).toBeInTheDocument();
  });

  it('has an accessible remove button per contact (AC8)', () => {
    renderWithChakra(<ContactList {...defaultProps} />);

    expect(screen.getByLabelText('Remove +1 555 ***-1234 from circle')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Jane Doe from circle')).toBeInTheDocument();
  });

  it('shows a confirmation dialog before removing (AC6)', async () => {
    const user = userEvent.setup();
    renderWithChakra(<ContactList {...defaultProps} />);

    await user.click(screen.getByLabelText('Remove Jane Doe from circle'));

    expect(screen.getByText('Remove Contact')).toBeInTheDocument();
    expect(screen.getByText('Remove Jane Doe from this circle?')).toBeInTheDocument();
  });

  it('removes the contact on confirm and calls onContactRemoved (AC6)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, message: 'Contact removed' }),
    });

    renderWithChakra(<ContactList {...defaultProps} />);

    await user.click(screen.getByLabelText('Remove Jane Doe from circle'));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(defaultProps.onContactRemoved).toHaveBeenCalledWith('contact-2');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/circles/circle-1/contacts/contact-2', {
      method: 'DELETE',
    });
  });

  it('does not remove the contact on cancel', async () => {
    const user = userEvent.setup();
    renderWithChakra(<ContactList {...defaultProps} />);

    await user.click(screen.getByLabelText('Remove Jane Doe from circle'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(defaultProps.onContactRemoved).not.toHaveBeenCalled();
  });
});
