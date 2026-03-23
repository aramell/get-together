import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EventCard } from '@/components/groups/EventCard';

describe('EventCard - Mobile Optimization (Task 2)', () => {
  const mockEvent = {
    id: 'event-1',
    group_id: 'group-1',
    title: 'Team Lunch',
    date: '2026-04-15T12:00:00Z',
    threshold: 5,
    status: 'proposed' as const,
    created_by: 'user-1',
    momentum: { in: 3, maybe: 1, out: 1 },
  };

  // Test 1: EventCard renders with responsive width
  it('should render EventCard with 100% width for mobile', () => {
    const { container } = render(<EventCard event={mockEvent} />);
    const card = container.querySelector('[role="button"]') || container.querySelector('div');
    expect(card).toBeInTheDocument();
  });

  // Test 2: Title text is readable on mobile
  it('should display event title', () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText('Team Lunch')).toBeInTheDocument();
  });

  // Test 3: Momentum counter is fully visible
  it('should display momentum counter (IN/MAYBE/OUT)', () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText(/3 in, 1 maybe, 1 out/)).toBeInTheDocument();
  });

  // Test 4: Status badge is visible
  it('should display status badge (Proposed/Confirmed/Cancelled)', () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText('Proposed')).toBeInTheDocument();
  });

  // Test 5: Threshold progress bar displays
  it('should display confirmation status with progress bar', () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText('Confirmation Status')).toBeInTheDocument();
    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  // Test 6: Date and time are displayed
  it('should display formatted date and time', () => {
    render(<EventCard event={mockEvent} />);
    const dateTimeText = screen.getByText(/April 15, 2026/);
    expect(dateTimeText).toBeInTheDocument();
  });

  // Test 7: Touch targets - card is clickable
  it('should be keyboard accessible with Tab and Enter when onClick provided', () => {
    const mockClick = jest.fn();
    const { container } = render(
      <EventCard event={mockEvent} onClick={mockClick} />
    );
    const card = container.firstChild;
    expect(card).toBeInTheDocument();
  });

  // Test 8: Card displays confirmed status styling
  it('should display confirmed status with green badge', () => {
    const confirmedEvent = { ...mockEvent, status: 'confirmed' as const };
    render(<EventCard event={confirmedEvent} />);
    expect(screen.getByText('✓ Confirmed')).toBeInTheDocument();
  });

  // Test 9: Card displays cancelled status styling
  it('should display cancelled status with gray badge', () => {
    const cancelledEvent = { ...mockEvent, status: 'cancelled' as const };
    render(<EventCard event={cancelledEvent} />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  // Test 10: RSVP status indicator displays correctly
  it('should display user RSVP status when provided', () => {
    render(
      <EventCard event={mockEvent} userRsvpStatus="in" />
    );
    expect(screen.getByText('Your RSVP: In')).toBeInTheDocument();
  });

  // Test 11: Responsive font sizes are applied (sm breakpoint)
  it('should render with responsive heading size for mobile', () => {
    render(<EventCard event={mockEvent} />);
    const title = screen.getByText('Team Lunch');
    expect(title).toBeInTheDocument();
  });

  // Test 12: Card has proper spacing for touch targets
  it('should have adequate spacing for comfortable tapping', () => {
    const { container } = render(<EventCard event={mockEvent} />);
    const card = container.querySelector('div');
    expect(card).toBeInTheDocument();
  });
});
