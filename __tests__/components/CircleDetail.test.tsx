import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { CircleDetail } from '@/components/circles/CircleDetail';

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

const mockCircleDetail = {
  id: 'circle-1',
  name: 'Weekend Crew',
  contacts: [{ id: 'contact-1', type: 'user' as const, displayName: 'Jane Doe' }],
  createdAt: '2026-06-30T10:00:00Z',
  updatedAt: '2026-06-30T10:00:00Z',
};

describe('CircleDetail (Story 10.3)', () => {
  const defaultProps = {
    circleId: 'circle-1',
    isOpen: true,
    onClose: jest.fn(),
    onCircleUpdated: jest.fn(),
    onCircleDeleted: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (!opts || opts.method === undefined) {
        // GET on load
        return Promise.resolve({ json: async () => ({ success: true, data: mockCircleDetail }) });
      }
      return Promise.resolve({ json: async () => ({ success: true }) });
    });
  });

  it('shows the circle name as heading and its contacts (AC3)', async () => {
    renderWithChakra(<CircleDetail {...defaultProps} />);

    expect(await screen.findByText('Weekend Crew')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Contact' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Circle Name' })).toBeInTheDocument();
  });

  it('does not fetch when closed', () => {
    renderWithChakra(<CircleDetail {...defaultProps} isOpen={false} />);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('edits the circle name (AC4)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'PATCH') {
        return Promise.resolve({
          json: async () => ({
            success: true,
            message: 'Circle name updated',
            data: { id: 'circle-1', name: 'Trivia Night Crew', updatedAt: '2026-07-01T09:00:00Z' },
          }),
        });
      }
      return Promise.resolve({ json: async () => ({ success: true, data: mockCircleDetail }) });
    });

    renderWithChakra(<CircleDetail {...defaultProps} />);

    await screen.findByText('Weekend Crew');
    await user.click(screen.getByRole('button', { name: 'Edit Circle Name' }));

    const input = screen.getByLabelText('Circle name');
    await user.clear(input);
    await user.type(input, 'Trivia Night Crew');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(defaultProps.onCircleUpdated).toHaveBeenCalledWith({
        id: 'circle-1',
        name: 'Trivia Night Crew',
        updatedAt: '2026-07-01T09:00:00Z',
      });
    });

    expect(await screen.findByText('Trivia Night Crew')).toBeInTheDocument();
  });

  it('shows a validation error for an empty name (AC4)', async () => {
    const user = userEvent.setup();
    renderWithChakra(<CircleDetail {...defaultProps} />);

    await screen.findByText('Weekend Crew');
    await user.click(screen.getByRole('button', { name: 'Edit Circle Name' }));

    const input = screen.getByLabelText('Circle name');
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Circle name is required')).toBeInTheDocument();
  });

  it('reveals the AddContactForm when Add Contact is clicked', async () => {
    const user = userEvent.setup();
    renderWithChakra(<CircleDetail {...defaultProps} />);

    await screen.findByText('Weekend Crew');
    await user.click(screen.getByRole('button', { name: 'Add Contact' }));

    expect(screen.getByRole('button', { name: 'Phone number' })).toBeInTheDocument();
  });

  it('shows a delete confirmation with the exact circle name (AC5)', async () => {
    const user = userEvent.setup();
    renderWithChakra(<CircleDetail {...defaultProps} />);

    await screen.findByText('Weekend Crew');
    await user.click(screen.getByLabelText('Delete circle Weekend Crew'));

    expect(
      await screen.findByText(
        'Delete Weekend Crew? This will not affect any existing group or event memberships.'
      )
    ).toBeInTheDocument();
  });

  it('deletes the circle on confirm and calls onCircleDeleted (AC5)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'DELETE') {
        return Promise.resolve({ json: async () => ({ success: true, message: 'Circle deleted' }) });
      }
      return Promise.resolve({ json: async () => ({ success: true, data: mockCircleDetail }) });
    });

    renderWithChakra(<CircleDetail {...defaultProps} />);

    await screen.findByText('Weekend Crew');
    await user.click(screen.getByLabelText('Delete circle Weekend Crew'));
    await user.click(await screen.findByRole('button', { name: 'Delete Circle' }));

    await waitFor(() => {
      expect(defaultProps.onCircleDeleted).toHaveBeenCalledWith('circle-1');
    });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('has an accessible delete button (AC8)', async () => {
    renderWithChakra(<CircleDetail {...defaultProps} />);

    expect(await screen.findByLabelText('Delete circle Weekend Crew')).toBeInTheDocument();
  });
});
