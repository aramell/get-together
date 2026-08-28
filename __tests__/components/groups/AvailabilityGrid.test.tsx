/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import AvailabilityGrid from '@/components/groups/AvailabilityGrid';

const renderWithChakra = (component: React.ReactElement) => render(<ChakraProvider>{component}</ChakraProvider>);

const DAYS = ['2026-09-01', '2026-09-02'];

describe('AvailabilityGrid (Story 3.7)', () => {
  it('renders a table with per-cell accessibility labels for free/busy/unknown', () => {
    renderWithChakra(
      <AvailabilityGrid
        days={DAYS}
        members={[
          { id: 'u1', name: 'You', isCurrentUser: true, availability: ['free', 'busy'] },
          { id: 'u2', name: 'Sarah', availability: ['free', 'unknown'] },
        ]}
        onSlotTap={jest.fn()}
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByLabelText(/You, .*free/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/You, .*busy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sarah, .*no data/i)).toBeInTheDocument();
  });

  it('highlights a day and fires onSlotTap when the free-member count meets the overlap threshold', () => {
    const onSlotTap = jest.fn();
    renderWithChakra(
      <AvailabilityGrid
        days={DAYS}
        members={[
          { id: 'u1', name: 'You', isCurrentUser: true, availability: ['free', 'busy'] },
          { id: 'u2', name: 'Sarah', availability: ['free', 'free'] },
        ]}
        overlapThreshold={2}
        onSlotTap={onSlotTap}
      />
    );

    const highlightedCell = screen.getByLabelText(/2 of 2 members free, tap to propose/i);
    fireEvent.click(highlightedCell);
    expect(onSlotTap).toHaveBeenCalledWith('2026-09-01');
  });

  it('shows the Google Calendar connect banner only when onConnectGoogleCalendar is provided, and dismisses it', () => {
    const onConnect = jest.fn();
    renderWithChakra(
      <AvailabilityGrid
        days={DAYS}
        members={[{ id: 'u1', name: 'You', isCurrentUser: true, availability: ['free', 'free'] }]}
        onSlotTap={jest.fn()}
        onConnectGoogleCalendar={onConnect}
      />
    );

    expect(screen.getByText(/Connect Google Calendar/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
    expect(onConnect).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/Dismiss Google Calendar connect prompt/i));
    expect(screen.queryByText(/Connect Google Calendar/i)).not.toBeInTheDocument();
  });

  it('omits the banner when onConnectGoogleCalendar is not provided (already connected)', () => {
    renderWithChakra(
      <AvailabilityGrid
        days={DAYS}
        members={[{ id: 'u1', name: 'You', isCurrentUser: true, availability: ['free', 'free'] }]}
        onSlotTap={jest.fn()}
      />
    );

    expect(screen.queryByText(/Connect Google Calendar/i)).not.toBeInTheDocument();
  });
});
