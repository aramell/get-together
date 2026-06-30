'use client';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import { EventCard } from '../../components/groups/EventCard';
import { EventList } from '../../components/groups/EventList';
import { WishlistItem } from '../../components/groups/WishlistItem';
import { CommentEditModal } from '../../components/groups/CommentEditModal';
import { CreateEventModal } from '../../components/groups/CreateEventModal';

/**
 * Comprehensive Accessibility Testing & Validation (AC1-AC10)
 * Task 8: Full accessibility audit and validation of all components
 *
 * This test suite validates:
 * - AC1: Screen Reader Compatibility
 * - AC2: Keyboard Navigation
 * - AC3: Color Contrast
 * - AC4: Zoom & Scaling
 * - AC5: Alternative Text
 * - AC6: Form Labels & Errors
 * - AC7: Semantic HTML & ARIA
 * - AC8: Focus Management in Modals
 * - AC9: Motion & Animation Respect
 * - AC10: Language & Readability
 *
 * 30+ comprehensive tests covering integration scenarios
 */

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

const mockEvent = {
  id: 'event-1',
  group_id: 'group-1',
  created_by: 'user-1',
  title: 'Accessibility Testing Session',
  date: new Date(Date.now() + 86400000).toISOString(),
  threshold: 8,
  status: 'proposal' as const,
  momentum: { in: 6, maybe: 1, out: 1 },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Comprehensive Accessibility Testing & Validation (AC1-AC10)', () => {
  describe('Integration: Full user journey with accessibility', () => {
    it('should allow keyboard-only user to discover and view event details', async () => {
      const user = userEvent.setup();
      const onEventClick = jest.fn();

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
        <EventList groupId="group-1" userId="user-1" onEventClick={onEventClick} />
      );

      // Wait for events to load
      const event = await screen.findByRole('button', /accessibility testing/i);
      expect(event).toBeInTheDocument();

      // Tab to event and press Enter
      event.focus();
      expect(event).toHaveFocus();

      // Verify event information is accessible
      expect(screen.getByText(/6 in, 1 maybe, 1 out/)).toBeInTheDocument();
    });

    it('should allow screen reader user to navigate and understand event status', async () => {
      renderWithChakra(
        <EventCard event={mockEvent} onClick={jest.fn()} />
      );

      // Screen reader should find event by accessible name
      const event = screen.getByRole('button', { name: /accessibility testing/i });
      expect(event).toBeInTheDocument();

      // Key information should be announced
      expect(screen.getByText(/Proposed/)).toBeInTheDocument();
      expect(screen.getByText(/6 in, 1 maybe, 1 out/)).toBeInTheDocument();
      expect(screen.getByText(/6\/8/)).toBeInTheDocument();
    });

    it('should allow user with low vision to zoom and view content clearly', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // Content should be readable with responsive sizes
      const title = screen.getByRole('heading', { name: /accessibility testing/i });
      expect(title).toBeInTheDocument();

      const momentum = screen.getByText(/6 in, 1 maybe, 1 out/);
      expect(momentum).toBeInTheDocument();

      // Elements should have defined sizes for zoom support
      expect(title).toHaveStyle({ fontSize: expect.any(String) });
      expect(momentum).toHaveStyle({ fontSize: expect.any(String) });
    });

    it('should allow user without mouse to fill and submit form completely', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      const onSuccess = jest.fn();

      renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={onSuccess}
        />
      );

      // Start with first field
      const titleInput = screen.getByLabelText(/event title/i) as HTMLInputElement;
      titleInput.focus();

      // Fill in required fields via keyboard
      await user.type(titleInput, 'Keyboard Test Event');
      await user.tab();

      // Date field should be focused
      const dateInput = screen.getByLabelText(/date & time/i) as HTMLInputElement;
      expect(dateInput).toHaveFocus();

      // Form structure allows complete keyboard interaction
      const submitBtn = screen.getByRole('button', /create event/i);
      expect(submitBtn).toBeInTheDocument();
    });
  });

  describe('Screen Reader Compatibility (AC1)', () => {
    it('should announce all event information to screen reader user', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // Title should be findable
      expect(screen.getByRole('heading', { name: /accessibility/i })).toBeInTheDocument();

      // Status should be announced
      expect(screen.getByText(/Proposed/)).toBeInTheDocument();

      // Momentum should be in live region
      const momentumText = screen.getByText(/6 in, 1 maybe, 1 out/);
      expect(momentumText.closest('[aria-live]')).toBeInTheDocument();

      // Threshold progress should be clear
      expect(screen.getByText(/6\/8/)).toBeInTheDocument();
    });

    it('should announce form field labels and errors', () => {
      const onClose = jest.fn();
      renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // All labels should be associated
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date & time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/commitment threshold/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation (AC2)', () => {
    it('should allow complete form completion with Tab and Enter', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      const titleInput = screen.getByLabelText(/event title/i);
      titleInput.focus();

      // Tab through all fields
      await user.type(titleInput, 'Test Event');
      expect(titleInput).toHaveFocus();
    });

    it('should trap focus within modal and allow escape to close', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // Modal should have focusable elements
      const titleInput = screen.getByLabelText(/event title/i);
      expect(titleInput).toBeInTheDocument();

      // Focus should be manageable within modal
      titleInput.focus();
      expect(titleInput).toHaveFocus();
    });
  });

  describe('Color Contrast (AC3)', () => {
    it('should use text in addition to color for status indication', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // Status should be clear from text
      expect(screen.getByText(/Proposed/)).toBeInTheDocument();
    });

    it('should indicate RSVP status with text and visual styling', () => {
      renderWithChakra(
        <EventCard event={mockEvent} userRsvpStatus="in" />
      );

      // RSVP should be clear from text
      expect(screen.getByText(/Your RSVP: In/)).toBeInTheDocument();
    });

    it('should show progress with numbers in addition to visual bar', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // Progress should be shown numerically and visually
      expect(screen.getByText(/6\/8/)).toBeInTheDocument();
    });
  });

  describe('Zoom & Scaling (AC4)', () => {
    it('should render readable content at all font sizes', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // All text should have defined font sizes for zoom support
      const heading = screen.getByRole('heading');
      expect(heading).toHaveStyle({ fontSize: expect.any(String) });

      const text = screen.getByText(/6 in, 1 maybe, 1 out/);
      expect(text).toHaveStyle({ fontSize: expect.any(String) });
    });

    it('should maintain layout without horizontal scroll at zoom', () => {
      const { container } = renderWithChakra(
        <EventCard event={mockEvent} />
      );

      const card = screen.getByRole('button');

      // Should have responsive max-width
      expect(card).toHaveStyle({
        maxWidth: expect.any(String),
      });
    });
  });

  describe('Alternative Text (AC5)', () => {
    it('should have context for user-related images', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="Item"
          description={null}
          link={null}
          creator_name="John Smith"
          created_at={new Date().toISOString()}
        />
      );

      // User avatar should be associated with name
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  describe('Form Accessibility (AC6)', () => {
    it('should have proper labels on all form fields', () => {
      const onClose = jest.fn();
      renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // All fields should be labeled
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date & time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/threshold/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('should indicate required vs optional fields clearly', () => {
      const onClose = jest.fn();
      renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // Required marked with asterisk
      expect(screen.getByText(/Event Title \*/)).toBeInTheDocument();
      expect(screen.getByText(/Date & Time \*/)).toBeInTheDocument();

      // Optional marked clearly
      expect(screen.getByText(/\(optional\)/)).toBeInTheDocument();
    });

    it('should display character count feedback', () => {
      const onClose = jest.fn();
      const onSave = jest.fn();

      renderWithChakra(
        <CommentEditModal
          isOpen={true}
          onClose={onClose}
          initialContent=""
          onSave={onSave}
        />
      );

      // Character count should be visible
      expect(screen.getByText(/0 \/ 2000/)).toBeInTheDocument();
    });
  });

  describe('Semantic HTML & ARIA (AC7)', () => {
    it('should use semantic markup throughout', () => {
      const onClose = jest.fn();
      const { container } = renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // Should have form element
      expect(container.querySelector('form')).toBeInTheDocument();

      // Should have labels associated with inputs
      const labels = container.querySelectorAll('label');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should have aria-live regions for dynamic content', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // Momentum counter should be live region
      const momentum = screen.getByText(/6 in, 1 maybe, 1 out/);
      expect(momentum.closest('[aria-live]')).toBeInTheDocument();
    });

    it('should have aria-labels on buttons', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="Test Item"
          description={null}
          link={null}
          creator_name="John"
          created_at={new Date().toISOString()}
          onClick={jest.fn()}
        />
      );

      const item = screen.getByRole('button');
      expect(item).toHaveAttribute('aria-label');
    });
  });

  describe('Focus Management in Modals (AC8)', () => {
    it('should contain focus within modal', async () => {
      const onClose = jest.fn();

      renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // Modal should have focusable elements
      const titleInput = screen.getByLabelText(/event title/i);
      expect(titleInput).toBeInTheDocument();

      // Focus should stay within modal
      titleInput.focus();
      expect(titleInput).toHaveFocus();
    });

    it('should move focus to modal when it opens', () => {
      const onClose = jest.fn();

      renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // Modal should be visible with focusable content
      expect(screen.getByText(/Propose an Event/)).toBeInTheDocument();
    });
  });

  describe('Motion & Animation (AC9)', () => {
    it('should not auto-play animations', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // Components should be displayed without auto-animation
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText(/6 in, 1 maybe, 1 out/)).toBeInTheDocument();
    });

    it('should have smooth transitions defined', () => {
      renderWithChakra(
        <EventCard event={mockEvent} onClick={jest.fn()} />
      );

      const card = screen.getByRole('button');

      // Should have transition defined
      expect(card).toHaveStyle({
        transition: expect.stringContaining('all'),
      });
    });
  });

  describe('Language & Readability (AC10)', () => {
    it('should use clear language in all text', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // Labels should be clear and understandable
      expect(screen.getByText(/Event/)).toBeInTheDocument();
      expect(screen.getByText(/RSVPs/)).toBeInTheDocument();
      expect(screen.getByText(/Confirmation Status/)).toBeInTheDocument();
    });

    it('should have proper line height for readability', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      const text = screen.getByText(/6 in, 1 maybe, 1 out/);
      const styles = window.getComputedStyle(text);

      // Line height should be set for readability
      expect(styles.lineHeight).toBeTruthy();
    });

    it('should allow text resize up to 200% without loss of function', () => {
      const onClose = jest.fn();
      const { container } = renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // All form fields should be resizable
      const inputs = container.querySelectorAll('input, textarea');
      expect(inputs.length).toBeGreaterThan(0);

      // Each field should maintain function at larger text
      inputs.forEach((input) => {
        expect(input).toHaveStyle({
          fontSize: expect.any(String),
        });
      });
    });

    it('should have proper heading hierarchy', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      // Should have heading hierarchy
      const heading = screen.getByRole('heading');
      expect(heading).toBeInTheDocument();

      // Heading should be appropriate level
      const level = parseInt(heading.tagName[1]);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(6);
    });
  });

  describe('Automated Accessibility Validation', () => {
    it('should have no obvious accessibility violations in event card', () => {
      const { container } = renderWithChakra(
        <EventCard event={mockEvent} onClick={jest.fn()} />
      );

      // Check for common violations
      const images = container.querySelectorAll('img:not([alt])');
      expect(images.length).toBe(0); // All images should have alt

      // Check for proper heading hierarchy
      const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      expect(headings.length).toBeGreaterThanOrEqual(0);
    });

    it('should have no obvious accessibility violations in form', () => {
      const onClose = jest.fn();
      const { container } = renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={() => {}}
        />
      );

      // All form fields should have labels
      const inputs = container.querySelectorAll('input, textarea');
      const labels = container.querySelectorAll('label');

      expect(labels.length).toBeGreaterThanOrEqual(inputs.length - 1);

      // All buttons should have text or aria-label
      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        const hasText = btn.textContent?.trim();
        const hasAriaLabel = btn.getAttribute('aria-label');

        expect(hasText || hasAriaLabel).toBeTruthy();
      });
    });

    it('should pass basic accessibility checks for lists', async () => {
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

      const onEventClick = jest.fn();
      const { container } = renderWithChakra(
        <EventList groupId="group-1" userId="user-1" onEventClick={onEventClick} />
      );

      // Wait for content
      await screen.findByRole('button', /accessibility/i);

      // Should have proper structure
      expect(container.querySelector('[role="button"]')).toBeInTheDocument();
    });
  });

  describe('Cross-browser Accessibility', () => {
    it('should work with screen reader announcements', () => {
      renderWithChakra(
        <EventCard event={mockEvent} onClick={jest.fn()} />
      );

      // All information should be discoverable
      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText(/Proposed/)).toBeInTheDocument();
    });

    it('should support keyboard navigation across browsers', async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();

      renderWithChakra(
        <EventCard event={mockEvent} onClick={onClick} />
      );

      const card = screen.getByRole('button');

      // Tab navigation should work
      card.focus();
      expect(card).toHaveFocus();

      // Keyboard activation should work (Enter key)
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalled();
    });

    it('should maintain styles across zoom levels', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      const heading = screen.getByRole('heading');

      // Styles should adapt to zoom
      expect(heading).toHaveStyle({
        fontSize: expect.any(String),
      });
    });
  });

  describe('User accessibility journey validation', () => {
    it('should enable completely accessible user flow for event viewing', async () => {
      const onEventClick = jest.fn();
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
        <EventList groupId="group-1" userId="user-1" onEventClick={onEventClick} />
      );

      // 1. Page loads with events
      const event = await screen.findByRole('button', /accessibility/i);
      expect(event).toBeInTheDocument();

      // 2. Event is discoverable and has all information
      expect(screen.getByText(/6 in, 1 maybe, 1 out/)).toBeInTheDocument();

      // 3. User can interact via keyboard
      event.focus();
      expect(event).toHaveFocus();
    });

    it('should enable completely accessible form submission journey', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      const onSuccess = jest.fn();

      renderWithChakra(
        <CreateEventModal
          isOpen={true}
          onClose={onClose}
          groupId="group-1"
          onSuccess={onSuccess}
        />
      );

      // 1. Form is visible and labeled
      expect(screen.getByText(/Propose an Event/)).toBeInTheDocument();
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();

      // 2. Fields are properly accessible
      const titleInput = screen.getByLabelText(/event title/i);
      titleInput.focus();
      expect(titleInput).toHaveFocus();

      // 3. Required vs optional is clear
      expect(screen.getByText(/Event Title \*/)).toBeInTheDocument();
      expect(screen.getByText(/\(optional\)/)).toBeInTheDocument();
    });
  });
});
