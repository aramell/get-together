import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { CreateCircleModal } from '@/components/circles/CreateCircleModal';

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('CreateCircleModal (Story 10.1)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it('renders the form when open (AC1, AC2)', () => {
    renderWithChakra(<CreateCircleModal {...defaultProps} />);

    expect(screen.getByText('New Circle')).toBeInTheDocument();
    expect(screen.getByLabelText('Circle name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithChakra(<CreateCircleModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('New Circle')).not.toBeInTheDocument();
  });

  it('disables the Create button until a name is entered (AC2)', () => {
    renderWithChakra(<CreateCircleModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
  });

  it('submits the trimmed name and calls onSuccess (AC3)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        data: { id: 'circle-1', name: 'Weekend Crew', contactCount: 0, createdAt: '2026-06-30T10:00:00Z' },
      }),
    });

    renderWithChakra(<CreateCircleModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Circle name'), '  Weekend Crew  ');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith({
        id: 'circle-1',
        name: 'Weekend Crew',
        contactCount: 0,
        createdAt: '2026-06-30T10:00:00Z',
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/circles',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Weekend Crew' }),
      })
    );
  });

  it('caps input at 100 characters via the maxLength attribute (AC4)', async () => {
    const user = userEvent.setup();
    renderWithChakra(<CreateCircleModal {...defaultProps} />);

    const input = screen.getByLabelText('Circle name') as HTMLInputElement;
    await user.type(input, 'a'.repeat(101));

    expect(input.value).toHaveLength(100);
    expect(screen.getByText('100/100 characters')).toBeInTheDocument();
  });

  it('shows the server error message when creation fails', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: false, message: 'Circle name is required' }),
    });

    renderWithChakra(<CreateCircleModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Circle name'), 'x');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByText('Circle name is required')).toBeInTheDocument();
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });
});
