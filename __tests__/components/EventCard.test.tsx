import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock Chakra UI components
jest.mock('@chakra-ui/react', () => ({
  Box: ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>,
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardBody: ({ children }: any) => <div data-testid="card-body">{children}</div>,
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
  HStack: ({ children, ...props }: any) => <div data-testid="hstack" {...props}>{children}</div>,
  VStack: ({ children, ...props }: any) => <div data-testid="vstack" {...props}>{children}</div>,
  Heading: ({ children, ...props }: any) => <h2 data-testid="heading" {...props}>{children}</h2>,
  Text: ({ children, ...props }: any) => <p data-testid="text" {...props}>{children}</p>,
  Progress: ({ value, max, ...props }: any) => <div data-testid="progress" data-value={value} data-max={max} {...props} />,
}));

// Import component after mocking
const EventCard = require('@/components/groups/EventCard').EventCard;

describe('EventCard Component', () => {
  const mockEvent = {
    id: '770e8400-e29b-41d4-a716-446655440002',
    group_id: '550e8400-e29b-41d4-a716-446655440000',
    created_by: '660e8400-e29b-41d4-a716-446655440001',
    title: 'Pizza Night',
    date: '2026-04-20T19:00:00Z',
    threshold: 5,
    status: 'proposal',
    momentum: { in: 3, maybe: 1, out: 0 },
    created_at: '2026-03-16T10:00:00Z',
    updated_at: '2026-03-16T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Information Display', () => {
    it('should display event title', () => {
      render(<EventCard event={mockEvent} userRsvpStatus={null} />);

      expect(screen.getByText('Pizza Night')).toBeInTheDocument();
    });

    it('should display event date and time in readable format', () => {
      render(<EventCard event={mockEvent} userRsvpStatus={null} />);

      const dateText = screen.getByText(/April 20, 2026/);
      expect(dateText).toBeInTheDocument();
    });

    it('should display momentum counter with correct format', () => {
      render(<EventCard event={mockEvent} userRsvpStatus={null} />);

      const momentumText = screen.getByText(/3 in, 1 maybe, 0 out/);
      expect(momentumText).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('should display "Proposed" badge with yellow color for proposal status', () => {
      const proposalEvent = { ...mockEvent, status: 'proposal' };
      render(<EventCard event={proposalEvent} userRsvpStatus={null} />);

      const badge = screen.getAllByTestId('badge')[0];
      expect(badge).toHaveTextContent('Proposed');
      expect(badge).toHaveAttribute('colorScheme', 'yellow');
    });

    it('should display "Confirmed" badge with green color for confirmed status', () => {
      const confirmedEvent = { ...mockEvent, status: 'confirmed' };
      render(<EventCard event={confirmedEvent} userRsvpStatus={null} />);

      const badge = screen.getAllByTestId('badge')[0];
      expect(badge).toHaveTextContent('Confirmed');
      expect(badge).toHaveAttribute('colorScheme', 'green');
    });
  });

  describe('Threshold Progress', () => {
    it('should display threshold progress when threshold is set', () => {
      render(<EventCard event={mockEvent} userRsvpStatus={null} />);

      const progress = screen.getByTestId('progress');
      expect(progress).toBeInTheDocument();
      expect(progress).toHaveAttribute('data-value', '3');
      expect(progress).toHaveAttribute('data-max', '5');
    });

    it('should display "3/5" text when threshold is set', () => {
      render(<EventCard event={mockEvent} userRsvpStatus={null} />);

      expect(screen.getByText('3/5')).toBeInTheDocument();
    });

    it('should not display threshold progress when threshold is null', () => {
      const noThresholdEvent = { ...mockEvent, threshold: null };
      render(<EventCard event={noThresholdEvent} userRsvpStatus={null} />);

      const progress = screen.queryByTestId('progress');
      expect(progress).not.toBeInTheDocument();
    });
  });

  describe('User RSVP Status Display', () => {
    it('should highlight user RSVP status when user has responded "in"', () => {
      render(<EventCard event={mockEvent} userRsvpStatus="in" />);

      const rsvpSection = screen.getByText(/Your RSVP: In/);
      expect(rsvpSection).toBeInTheDocument();
    });

    it('should highlight user RSVP status when user has responded "maybe"', () => {
      render(<EventCard event={mockEvent} userRsvpStatus="maybe" />);

      const rsvpSection = screen.getByText(/Your RSVP: Maybe/);
      expect(rsvpSection).toBeInTheDocument();
    });

    it('should highlight user RSVP status when user has responded "out"', () => {
      render(<EventCard event={mockEvent} userRsvpStatus="out" />);

      const rsvpSection = screen.getByText(/Your RSVP: Out/);
      expect(rsvpSection).toBeInTheDocument();
    });

    it('should not display user RSVP section when user has not responded', () => {
      render(<EventCard event={mockEvent} userRsvpStatus={null} />);

      const rsvpSection = screen.queryByText(/Your RSVP:/);
      expect(rsvpSection).not.toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render with responsive spacing', () => {
      const { container } = render(<EventCard event={mockEvent} userRsvpStatus={null} />);

      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      // Chakra UI components will handle responsive styles
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<EventCard event={mockEvent} userRsvpStatus={null} />);

      const heading = screen.getByTestId('heading');
      expect(heading).toBeInTheDocument();
    });

    it('should provide descriptive text for momentum counter', () => {
      render(<EventCard event={mockEvent} userRsvpStatus={null} />);

      // Should have descriptive label visible
      expect(screen.getByText(/3 in, 1 maybe, 0 out/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle event with zero RSVPs', () => {
      const zeroRsvpEvent = {
        ...mockEvent,
        momentum: { in: 0, maybe: 0, out: 0 },
      };

      render(<EventCard event={zeroRsvpEvent} userRsvpStatus={null} />);

      expect(screen.getByText(/0 in, 0 maybe, 0 out/)).toBeInTheDocument();
    });

    it('should handle very long event titles gracefully', () => {
      const longTitleEvent = {
        ...mockEvent,
        title: 'A'.repeat(100),
      };

      render(<EventCard event={longTitleEvent} userRsvpStatus={null} />);

      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
    });

    it('should handle empty description', () => {
      const noDescriptionEvent = { ...mockEvent, description: null };

      render(<EventCard event={noDescriptionEvent} userRsvpStatus={null} />);

      // Should still render without errors
      expect(screen.getByText('Pizza Night')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-live="polite" on momentum counter for screen readers', () => {
      render(<EventCard event={mockEvent} userRsvpStatus={null} />);

      const momentumBox = screen.getByText(/RSVPs:/).closest('[aria-live]');
      expect(momentumBox).toHaveAttribute('aria-live', 'polite');
    });

    it('should be keyboard navigable when onClick handler is provided', () => {
      const mockOnClick = jest.fn();
      const container = render(
        <EventCard event={mockEvent} userRsvpStatus={null} onClick={mockOnClick} />
      );

      const card = container.container.querySelector('[data-testid="card"]');
      expect(card).toHaveAttribute('tabIndex', '0');
      expect(card).toHaveAttribute('role', 'button');
    });

    it('should trigger onClick on Enter key press', () => {
      const mockOnClick = jest.fn();
      const { container } = render(
        <EventCard event={mockEvent} userRsvpStatus={null} onClick={mockOnClick} />
      );

      const card = container.querySelector('[data-testid="card"]') as HTMLElement;
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });

      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should trigger onClick on Space key press', () => {
      const mockOnClick = jest.fn();
      const { container } = render(
        <EventCard event={mockEvent} userRsvpStatus={null} onClick={mockOnClick} />
      );

      const card = container.querySelector('[data-testid="card"]') as HTMLElement;
      fireEvent.keyDown(card, { key: ' ', code: 'Space' });

      expect(mockOnClick).toHaveBeenCalled();
    });

  });
});
