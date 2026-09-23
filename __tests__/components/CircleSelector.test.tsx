import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { CircleSelector } from '@/components/circles/CircleSelector';

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('CircleSelector (Story 10.4)', () => {
  const onSelectionChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it('shows a non-blocking empty state when the user has no circles (AC1)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    });

    renderWithChakra(<CircleSelector onSelectionChange={onSelectionChange} />);

    expect(
      await screen.findByText('No circles yet — create one in your profile')
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Invite a circle (optional)')).not.toBeInTheDocument();
  });

  it('lists circles with contact counts (AC1)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: [{ id: 'circle-1', name: 'Weekend Crew', contactCount: 6 }],
      }),
    });

    renderWithChakra(<CircleSelector onSelectionChange={onSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Weekend Crew (6 contacts)')).toBeInTheDocument();
    });
  });

  it('shows a contact preview with the invite count after selecting a circle (AC2)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [{ id: 'circle-1', name: 'Weekend Crew', contactCount: 2 }],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            id: 'circle-1',
            name: 'Weekend Crew',
            contacts: [
              { id: 'contact-1', type: 'phone', displayName: '+1 555 ***-1234' },
              { id: 'contact-2', type: 'user', displayName: 'Jane Doe' },
            ],
          },
        }),
      });

    renderWithChakra(<CircleSelector onSelectionChange={onSelectionChange} />);

    await screen.findByText('Weekend Crew (2 contacts)');
    await user.selectOptions(screen.getByLabelText('Invite a circle (optional)'), 'circle-1');

    expect(await screen.findByText('Inviting 2 contacts from Weekend Crew')).toBeInTheDocument();
    expect(screen.getByText('+1 555 ***-1234')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(onSelectionChange).toHaveBeenCalledWith('circle-1', []);
  });

  it('excludes a deselected contact from the invite count and reports it (AC2, AC9)', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [{ id: 'circle-1', name: 'Weekend Crew', contactCount: 2 }],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            id: 'circle-1',
            name: 'Weekend Crew',
            contacts: [
              { id: 'contact-1', type: 'phone', displayName: '+1 555 ***-1234' },
              { id: 'contact-2', type: 'user', displayName: 'Jane Doe' },
            ],
          },
        }),
      });

    renderWithChakra(<CircleSelector onSelectionChange={onSelectionChange} />);

    await screen.findByText('Weekend Crew (2 contacts)');
    await user.selectOptions(screen.getByLabelText('Invite a circle (optional)'), 'circle-1');
    await screen.findByText('Inviting 2 contacts from Weekend Crew');

    await user.click(screen.getByLabelText('Remove Jane Doe from invite list'));

    expect(await screen.findByText('Inviting 1 contact from Weekend Crew')).toBeInTheDocument();
    expect(onSelectionChange).toHaveBeenLastCalledWith('circle-1', ['contact-2']);
  });
});
