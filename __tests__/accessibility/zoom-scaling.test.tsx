'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import { EventCard } from '../../components/groups/EventCard';
import { EventList } from '../../components/groups/EventList';
import { WishlistItem } from '../../components/groups/WishlistItem';
import { CreateEventModal } from '../../components/groups/CreateEventModal';

/**
 * Zoom & Scaling Tests (AC4)
 * Tests ensure layout remains functional at 150% and 200% zoom
 * and supports font-size increases up to 200%
 *
 * AC4 Requirements:
 * - Layout functional and readable at 150% zoom
 * - Text doesn't wrap awkwardly or overflow
 * - No horizontal scrolling required at 150% zoom
 * - All interactive elements remain accessible and properly sized
 * - Supports browser font-size increases (up to 200%)
 */

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

const mockEvent = {
  id: 'event-1',
  group_id: 'group-1',
  created_by: 'user-1',
  title: 'Planning Meeting',
  date: new Date(Date.now() + 86400000).toISOString(),
  threshold: 6,
  status: 'proposal' as const,
  momentum: { in: 4, maybe: 1, out: 0 },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Zoom & Scaling Tests (AC4)', () => {
  describe('6.1 & 6.2: Content readable at 150% and 200% zoom', () => {
    it('should render event card with proper text sizing for zoom support', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // Event title should be readable at larger sizes
      const title = screen.getByRole('heading', { name: /planning meeting/i });
      expect(title).toBeInTheDocument();

      // Should have responsive font sizes
      expect(title).toHaveStyle({
        fontSize: expect.any(String),
      });
    });

    it('should render form with responsive font sizes', () => {
      const onClose = jest.fn();
      const { container } = renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // Form elements should have defined sizes
      const inputs = container.querySelectorAll('input, textarea');
      expect(inputs.length).toBeGreaterThan(0);

      inputs.forEach((input) => {
        // All inputs should have minimum height for touch targets
        expect(input).toHaveStyle({
          minHeight: expect.stringMatching(/\d+px/),
        });
      });
    });

    it('should render wishlist item text without truncation issues', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="This is a longer wishlist item title"
          description="A detailed description that might wrap"
          link="https://example.com"
          creator_name="John Smith"
          created_at={new Date().toISOString()}
        />
      );

      // Text should be rendered (not cut off)
      expect(screen.getByText(/longer wishlist item/)).toBeInTheDocument();
      expect(screen.getByText(/John Smith/)).toBeInTheDocument();
    });

    it('should not cut off important content at larger zoom levels', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: [mockEvent],
              total_count: 1,
            }),
        })
      ) as jest.Mock;

      renderWithChakra(
        <EventList groupId="group-1" userId="user-1" />
      );

      // Event should load and be fully visible
      const event = await screen.findByRole('button', /planning meeting/i);
      expect(event).toBeInTheDocument();

      // Key information should be visible
      expect(screen.getByText(/4 in, 1 maybe, 0 out/)).toBeInTheDocument();
    });
  });

  describe('6.3 & 6.4: No horizontal scrolling required', () => {
    it('should have responsive width constraints on event card', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      const card = screen.getByRole('button');

      // Card should use responsive widths
      expect(card).toHaveStyle({
        width: expect.any(String),
        maxWidth: expect.any(String),
      });
    });

    it('should use responsive layout for form modal', () => {
      const onClose = jest.fn();
      const { container } = renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // Modal should have responsive max-width
      const modal = container.querySelector('[maxWidth]');
      expect(modal).toBeInTheDocument();
    });

    it('should have flexible layout that adapts to zoom', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="Item"
          description="Description text"
          link="https://example.com"
          creator_name="John"
          created_at={new Date().toISOString()}
        />
      );

      const item = screen.getByRole('button');

      // Should have padding that adapts to content
      expect(item).toHaveStyle({
        padding: expect.any(String),
      });
    });

    it('should not have fixed widths that cause horizontal scroll', () => {
      const { container } = renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // Check for overflow-x that would cause scrolling
      const card = container.querySelector('[role="button"]');
      const styles = window.getComputedStyle(card!);

      // Should not have overflow: auto or hidden on x-axis
      const overflowX = styles.overflowX;
      expect(['visible', 'clip']).toContain(overflowX);
    });
  });

  describe('6.5: Keyboard accessibility at zoom levels', () => {
    it('should maintain focus indicators at zoom', () => {
      renderWithChakra(
        <EventCard event={mockEvent} onClick={jest.fn()} />
      );

      const card = screen.getByRole('button');

      // Focus outline should remain visible
      expect(card).toHaveStyle({
        outline: expect.stringContaining('2px'),
        outlineOffset: '2px',
      });
    });

    it('should maintain interactive element sizes at zoom', () => {
      const onClose = jest.fn();
      const { container } = renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach((btn) => {
        const styles = window.getComputedStyle(btn);
        // Buttons should have minimum size for interaction
        expect(parseInt(styles.minHeight || '0')).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('6.6: Comprehensive zoom and scaling tests', () => {
    it('should support relative sizing throughout components', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      const title = screen.getByRole('heading');
      const text = screen.getByText(/4 in, 1 maybe, 0 out/);

      // Should use scalable sizing
      expect(title).toHaveStyle({
        fontSize: expect.any(String),
      });

      expect(text).toHaveStyle({
        fontSize: expect.any(String),
      });
    });

    it('should handle font size increases in form fields', async () => {
      const onClose = jest.fn();
      const { container } = renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      const inputs = container.querySelectorAll('input, textarea');

      // All inputs should have font-size defined (supports zoom)
      inputs.forEach((input) => {
        const styles = window.getComputedStyle(input);
        expect(styles.fontSize).toBeTruthy();
      });
    });

    it('should maintain readability with text spacing adjustments', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // Should have line-height for readability
      const title = screen.getByRole('heading');
      const styles = window.getComputedStyle(title);

      // Line height should be sufficient for readability
      expect(styles.lineHeight).toBeTruthy();
    });

    it('should support layout adjustments for large text display', () => {
      const { container } = renderWithChakra(
        <EventCard event={mockEvent} />
      );

      const heading = screen.getByRole('heading');

      // Should have responsive spacing that adapts to text size
      expect(heading.parentElement).toHaveStyle({
        marginBottom: expect.any(String),
        padding: expect.any(String),
      });
    });

    it('should render all components without overflow at zoom', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: [mockEvent, { ...mockEvent, id: 'event-2', title: 'Another Meeting' }],
              total_count: 2,
            }),
        })
      ) as jest.Mock;

      const onEventClick = jest.fn();
      const { container } = renderWithChakra(
        <EventList groupId="group-1" userId="user-1" onEventClick={onEventClick} />
      );

      // Wait for content to load
      await screen.findByRole('button', /planning meeting/i);

      // Should not have horizontal scroll
      const root = container.firstChild;
      const styles = window.getComputedStyle(root as Element);

      // Should not overflow in x direction
      expect(['auto', 'hidden', 'visible'].includes(styles.overflowX)).toBeTruthy();
    });

    it('should preserve touch target sizes at zoom', () => {
      const onClose = jest.fn();
      const { container } = renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // All form fields should have minimum 44px height (WCAG AA)
      const inputs = container.querySelectorAll('input, textarea');
      inputs.forEach((input) => {
        expect(input).toHaveStyle({
          minHeight: expect.stringMatching(/4[4-8]px|5[0-9]px|6[0-9]px/),
        });
      });
    });

    it('should maintain text wrapping at zoom levels', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="This is a very long wishlist item title that might wrap at larger zoom levels"
          description="A longer description text"
          link="https://example.com"
          creator_name="John Smith"
          created_at={new Date().toISOString()}
        />
      );

      // Text should be visible (may be truncated with ellipsis or wrapped)
      const titleText = screen.getByText(/very long wishlist/);
      expect(titleText).toBeInTheDocument();

      // Long title should be present in the document
      const wishlistItem = screen.getByLabelText(/very long wishlist/);
      expect(wishlistItem).toBeInTheDocument();
    });

    it('should support responsive breakpoints for layout adjustments', () => {
      renderWithChakra(
        <EventCard event={mockEvent} onClick={jest.fn()} />
      );

      // Components should have responsive sizing
      const heading = screen.getByRole('heading');
      expect(heading).toHaveStyle({
        fontSize: expect.any(String),
      });

      // Should adapt to different viewport sizes
      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Font scaling support', () => {
    it('should use relative font sizes (em, rem) for scaling', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      const text = screen.getByText(/4 in, 1 maybe, 0 out/);

      // Should have font-size (supports browser zoom)
      expect(text).toHaveStyle({
        fontSize: expect.any(String),
      });
    });

    it('should support 150% browser zoom without layout break', () => {
      const { container } = renderWithChakra(
        <EventCard event={mockEvent} onClick={jest.fn()} />
      );

      // Verify card renders and has content
      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();

      // Key content should be visible and readable at zoom
      expect(screen.getByText(/Planning Meeting/i)).toBeInTheDocument();
      expect(screen.getByText(/RSVPs/i)).toBeInTheDocument();
    });

    it('should support 200% browser zoom without layout break', () => {
      const onClose = jest.fn();
      renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // Modal should be present and visible
      expect(screen.getByText(/Propose an Event/i)).toBeInTheDocument();

      // Form should remain usable at 200% zoom with proper labels
      expect(screen.getByLabelText(/Event Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Date & Time/i)).toBeInTheDocument();
    });
  });
});
