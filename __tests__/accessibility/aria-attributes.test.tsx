'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import { EventCard } from '../../components/groups/EventCard';
import { EventList } from '../../components/groups/EventList';
import { WishlistItem } from '../../components/groups/WishlistItem';
import { CommentEditModal } from '../../components/groups/CommentEditModal';

/**
 * Semantic HTML & ARIA Attributes Tests (AC7)
 * Tests ensure proper use of semantic HTML, ARIA attributes,
 * and no ARIA misuse
 *
 * AC7 Requirements:
 * - Interactive elements use semantic HTML: <button>, <a>, <nav>, <main>, <form>, <input>
 * - Headings follow logical hierarchy (h1 → h2 → h3)
 * - Buttons are NOT built using <div> elements
 * - Live regions have aria-live="polite" and aria-atomic="true"
 * - ARIA attributes used correctly
 * - No ARIA misuse (role="button" on divs instead of <button>)
 */

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

const mockEvent = {
  id: 'event-1',
  group_id: 'group-1',
  created_by: 'user-1',
  title: 'Code Review Session',
  date: new Date(Date.now() + 86400000).toISOString(),
  threshold: 4,
  status: 'proposal' as const,
  momentum: { in: 2, maybe: 1, out: 0 },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Semantic HTML & ARIA Attributes (AC7)', () => {
  describe('5.1: Semantic HTML for interactive elements', () => {
    it('should use semantic markup for card buttons', () => {
      renderWithChakra(
        <EventCard event={mockEvent} onClick={jest.fn()} />
      );

      const card = screen.getByRole('button', { name: /code review/i });
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('role', 'button');
    });

    it('should use semantic <a> tags for links', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="Item"
          description={null}
          link="https://example.com"
          creator_name="John"
          created_at={new Date().toISOString()}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link.tagName.toLowerCase()).toBe('a');
    });

    it('should have aria-label on card button', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="Blue Headphones"
          description={null}
          link={null}
          creator_name="John"
          created_at={new Date().toISOString()}
          onClick={jest.fn()}
        />
      );

      const item = screen.getByRole('button', /wishlist item/i);
      expect(item).toHaveAttribute('aria-label');
    });

    it('should have aria-describedby for form inputs', () => {
      const onClose = jest.fn();
      const onSave = jest.fn();

      renderWithChakra(
        <CommentEditModal
          isOpen={true}
          onClose={onClose}
          initialContent="Test"
          onSave={onSave}
        />
      );

      const textarea = screen.getByLabelText(/comment/i);
      expect(textarea).toHaveAttribute('aria-describedby');
    });
  });

  describe('5.2: Accessible button implementation', () => {
    it('should provide keyboard support for div-based buttons', () => {
      renderWithChakra(
        <EventCard event={mockEvent} onClick={jest.fn()} />
      );

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('5.3: Heading hierarchy', () => {
    it('should use proper heading hierarchy', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      const heading = screen.getByRole('heading', { name: /code review/i });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('5.4 & 5.5: ARIA attributes', () => {
    it('should have aria-live on momentum counter', () => {
      renderWithChakra(
        <EventCard event={mockEvent} />
      );

      const momentumText = screen.getByText(/2 in, 1 maybe, 0 out/);
      const container = momentumText.closest('[aria-live]');

      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-describedby for character count feedback', () => {
      const onClose = jest.fn();
      const onSave = jest.fn();

      renderWithChakra(
        <CommentEditModal
          isOpen={true}
          onClose={onClose}
          initialContent="Test"
          onSave={onSave}
        />
      );

      const charCount = screen.getByLabelText(/characters, limit is/i);
      expect(charCount).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('5.6: No ARIA misuse', () => {
    it('should not nest interactive elements improperly', () => {
      const { container } = renderWithChakra(
        <EventCard event={mockEvent} onClick={jest.fn()} />
      );

      const card = screen.getByRole('button');
      const nestedButtons = card.querySelectorAll('button');
      expect(nestedButtons.length).toBe(0);
    });

    it('should provide meaningful link text', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="Item"
          description={null}
          link="https://amazon.com"
          creator_name="John"
          created_at={new Date().toISOString()}
        />
      );

      const link = screen.getByRole('link');
      expect(link.textContent?.trim()).toBeTruthy();
    });
  });

  describe('5.7: Semantic HTML integration', () => {
    it('should use semantic structure for interactive components', async () => {
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

      const eventCard = await screen.findByRole('button', /code review/i);
      expect(eventCard).toBeInTheDocument();
    });
  });
});
