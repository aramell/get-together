import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { SocialCirclesSection } from '@/components/circles/SocialCirclesSection';

const ChakraWrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider>{children}</ChakraProvider>
);

describe('SocialCirclesSection (Story 10.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it('shows the Create Circle button (AC1)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: [] }),
    });

    render(<SocialCirclesSection />, { wrapper: ChakraWrapper });

    expect(screen.getByRole('button', { name: /create circle/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText('No circles yet. Create one to bulk-invite your friends.')
      ).toBeInTheDocument();
    });
  });

  it('shows a count badge that updates with the circle list (Story 10.3, AC7)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        data: [{ id: 'circle-1', name: 'Weekend Crew', contactCount: 3, createdAt: '2026-06-30T10:00:00Z' }],
      }),
    });

    render(<SocialCirclesSection />, { wrapper: ChakraWrapper });

    await waitFor(() => {
      expect(screen.getByText('1 circle')).toBeInTheDocument();
    });
  });

  it('lists existing circles', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        data: [{ id: 'circle-1', name: 'Weekend Crew', contactCount: 3, createdAt: '2026-06-30T10:00:00Z' }],
      }),
    });

    render(<SocialCirclesSection />, { wrapper: ChakraWrapper });

    await waitFor(() => {
      expect(screen.getByText('Weekend Crew')).toBeInTheDocument();
    });
    expect(screen.getByText('3 contacts')).toBeInTheDocument();
  });

  it('adds a newly created circle to the list immediately (AC3)', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          json: async () => ({
            success: true,
            data: { id: 'circle-2', name: 'New Circle', contactCount: 0, createdAt: '2026-06-30T11:00:00Z' },
          }),
        });
      }
      return Promise.resolve({ json: async () => ({ success: true, data: [] }) });
    });

    const user = userEvent.setup();
    render(<SocialCirclesSection />, { wrapper: ChakraWrapper });

    await waitFor(() => {
      expect(
        screen.getByText('No circles yet. Create one to bulk-invite your friends.')
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create circle/i }));
    await user.type(screen.getByLabelText('Circle name'), 'New Circle');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('circles-list')).toHaveTextContent('New Circle');
    });
  });

  it('opens the circle detail modal when a circle is clicked (Story 10.3, AC3)', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/circles') {
        return Promise.resolve({
          json: async () => ({
            success: true,
            data: [{ id: 'circle-1', name: 'Weekend Crew', contactCount: 2, createdAt: '2026-06-30T10:00:00Z' }],
          }),
        });
      }
      return Promise.resolve({
        json: async () => ({
          success: true,
          data: {
            id: 'circle-1',
            name: 'Weekend Crew',
            contacts: [],
            createdAt: '2026-06-30T10:00:00Z',
            updatedAt: '2026-06-30T10:00:00Z',
          },
        }),
      });
    });

    const user = userEvent.setup();
    render(<SocialCirclesSection />, { wrapper: ChakraWrapper });

    await waitFor(() => {
      expect(screen.getByText('Weekend Crew')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Weekend Crew, 2 contacts'));

    expect(await screen.findByRole('button', { name: 'Edit Circle Name' })).toBeInTheDocument();
  });
});
