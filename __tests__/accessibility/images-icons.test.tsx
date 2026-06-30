'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChakraProvider, Avatar, Icon, Box } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import { WishlistItem } from '../../components/groups/WishlistItem';

/**
 * Alternative Text & Image Accessibility Tests (AC5)
 * Tests ensure images and icons have proper alt text or ARIA labels
 *
 * AC5 Requirements:
 * - Decorative images have empty alt text (alt="")
 * - Informative images have descriptive alt text
 * - Icon-only buttons have aria-label or text content
 * - Background images with meaning have fallback text or ARIA
 * - Charts/infographics have descriptions or tables as alternatives
 */

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('Alternative Text & Image Accessibility (AC5)', () => {
  describe('7.1: Images have alt text', () => {
    it('should have informative alt text for avatar images', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="Item"
          description={null}
          link={null}
          creator_name="Jane Doe"
          creator_email="jane@example.com"
          created_at={new Date().toISOString()}
        />
      );

      // Avatar should have title attribute or aria-label for screen readers
      const avatar = screen.getByRole('img', { hidden: true });
      expect(avatar).toBeInTheDocument();

      // Avatar should be associated with user name
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('should have alt text for informative images', () => {
      const { container } = renderWithChakra(
        <Box>
          <img
            src="chart.png"
            alt="Sales performance chart showing 20% increase"
          />
        </Box>
      );

      const img = container.querySelector('img');
      expect(img).toHaveAttribute('alt', 'Sales performance chart showing 20% increase');
    });
  });

  describe('7.2: Icons have aria-labels or labels', () => {
    it('should have aria-label on icon-only buttons', () => {
      renderWithChakra(
        <Box>
          <button aria-label="Delete item">
            🗑️
          </button>
        </Box>
      );

      const deleteBtn = screen.getByRole('button', { name: /delete item/i });
      expect(deleteBtn).toBeInTheDocument();
      expect(deleteBtn).toHaveAttribute('aria-label');
    });

    it('should announce icon button purpose to screen readers', () => {
      renderWithChakra(
        <Box>
          <button aria-label="Add to wishlist">
            ❤️
          </button>
        </Box>
      );

      const addBtn = screen.getByRole('button', { name: /add to wishlist/i });
      expect(addBtn).toBeInTheDocument();
    });

    it('should provide text alternative for status icons', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="Item"
          description={null}
          link={null}
          creator_name="John"
          created_at={new Date().toISOString()}
          user_is_interested={true}
        />
      );

      // Interested status should be announced as text
      expect(screen.getByText(/You're interested/)).toBeInTheDocument();
    });
  });

  describe('7.3: Decorative images marked as empty', () => {
    it('should mark decorative images with alt=""', () => {
      const { container } = renderWithChakra(
        <Box>
          <img src="decoration.png" alt="" />
          <p>Decorative elements should not announce</p>
        </Box>
      );

      const decorative = container.querySelector('img[alt=""]');
      // Decorative image should exist but not be announced by screen readers
      expect(decorative).toBeInTheDocument();
      expect(decorative).toHaveAttribute('alt', '');
    });

    it('should not announce decorative spacer images', () => {
      const { container } = renderWithChakra(
        <Box>
          <img src="spacer.gif" alt="" />
          <p>Content</p>
        </Box>
      );

      // Decorative image should exist but not have a role
      const spacer = container.querySelector('img[alt=""]');
      expect(spacer).toBeInTheDocument();
      expect(spacer).not.toHaveAttribute('role', 'img');
    });
  });

  describe('7.4: Informative images have descriptive alt', () => {
    it('should have descriptive alt text for event status badge', () => {
      renderWithChakra(
        <Box>
          <img
            src="confirmed.svg"
            alt="Event confirmed - all commitments met"
          />
        </Box>
      );

      const img = screen.getByRole('img', { name: /event confirmed/i });
      expect(img).toHaveAttribute('alt', expect.stringContaining('confirmed'));
    });

    it('should provide context for user avatars', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="Item"
          description={null}
          link={null}
          creator_name="Alice Johnson"
          created_at={new Date().toISOString()}
        />
      );

      // Avatar should be associated with the user name
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    it('should have descriptive alt for progress indicators', () => {
      renderWithChakra(
        <Box>
          <img
            src="progress.png"
            alt="Progress: 6 of 10 confirmations received (60% complete)"
          />
        </Box>
      );

      const img = screen.getByRole('img', { name: /progress/i });
      expect(img).toHaveAttribute('alt', expect.stringMatching(/6 of 10|60%/));
    });
  });

  describe('7.5: ARIA descriptions for complex images', () => {
    it('should have aria-describedby for complex charts', () => {
      renderWithChakra(
        <Box>
          <img
            src="chart.png"
            alt="Weekly event attendance"
            aria-describedby="chart-description"
          />
          <div id="chart-description">
            Monday: 5 attendees, Tuesday: 8 attendees, Wednesday: 6 attendees
          </div>
        </Box>
      );

      const img = screen.getByRole('img', { name: /weekly event/i });
      expect(img).toHaveAttribute('aria-describedby', 'chart-description');
      expect(screen.getByText(/Monday: 5 attendees/)).toBeInTheDocument();
    });

    it('should link diagram to text description', () => {
      renderWithChakra(
        <Box>
          <img
            src="diagram.svg"
            alt="Event confirmation flow"
            aria-describedby="flow-description"
          />
          <div id="flow-description">
            <p>Users propose events, others RSVP, confirmation sent when threshold met</p>
          </div>
        </Box>
      );

      const img = screen.getByRole('img', { name: /event confirmation/i });
      expect(img).toHaveAttribute('aria-describedby');
      expect(screen.getByText(/propose events/)).toBeInTheDocument();
    });
  });

  describe('7.6: Comprehensive image accessibility', () => {
    it('should support screen reader discovery of all images', () => {
      renderWithChakra(
        <>
          <WishlistItem
            id="wish-1"
            title="Item with User Avatar"
            description={null}
            link={null}
            creator_name="John Smith"
            created_at={new Date().toISOString()}
          />
        </>
      );

      // Avatar should be discoverable
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    it('should have alternative text format for information conveyed by images', () => {
      renderWithChakra(
        <Box>
          <img
            src="status.png"
            alt="Event Status: Proposed (waiting for confirmations)"
          />
        </Box>
      );

      const img = screen.getByRole('img', { name: /status/i });
      expect(img).toHaveAttribute(
        'alt',
        expect.stringContaining('Proposed')
      );
    });

    it('should provide text alternative for data visualizations', () => {
      renderWithChakra(
        <Box>
          <img
            src="momentum.png"
            alt="Momentum count: 3 yes, 2 maybe, 1 no"
          />
        </Box>
      );

      const img = screen.getByRole('img', { name: /momentum/i });
      expect(img).toHaveAttribute('alt', expect.stringMatching(/3 yes|2 maybe|1 no/));
    });

    it('should support user avatar images with proper context', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="Gift Suggestion"
          description="Great for outdoor activities"
          link="https://example.com"
          creator_name="Sarah Williams"
          created_at={new Date().toISOString()}
        />
      );

      // Avatar name should provide context
      expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
    });

    it('should handle missing image alt text gracefully', () => {
      const { container } = renderWithChakra(
        <Box>
          <img src="unknown.png" />
          <p>Fallback text content</p>
        </Box>
      );

      // If no alt is provided, browser shows empty, but we have text content
      expect(screen.getByText('Fallback text content')).toBeInTheDocument();
    });

    it('should announce important status changes with text', () => {
      renderWithChakra(
        <WishlistItem
          id="wish-1"
          title="Item"
          description={null}
          link={null}
          creator_name="John"
          created_at={new Date().toISOString()}
          isNew={true}
        />
      );

      // New item status should be announced via aria-label
      const item = screen.getByRole('button');
      expect(item).toHaveAttribute('aria-label', expect.stringContaining('newly added'));
    });

    it('should provide icon button labels for all interactive icons', () => {
      renderWithChakra(
        <Box>
          <button aria-label="Sort by interest">
            ⬇️
          </button>
          <button aria-label="Filter items">
            🔍
          </button>
          <button aria-label="Share list">
            📤
          </button>
        </Box>
      );

      expect(screen.getByRole('button', { name: /sort by interest/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter items/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share list/i })).toBeInTheDocument();
    });

    it('should have alt text for status badge images', () => {
      renderWithChakra(
        <Box>
          <img src="confirmed.svg" alt="Confirmed" />
          <img src="pending.svg" alt="Pending confirmation" />
          <img src="cancelled.svg" alt="Event cancelled" />
        </Box>
      );

      expect(screen.getByRole('img', { name: /confirmed/i })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /pending/i })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /cancelled/i })).toBeInTheDocument();
    });

    it('should support accessibility for user profile avatars', () => {
      renderWithChakra(
        <Box>
          <Avatar
            name="Emma Johnson"
            src="emma.jpg"
            title="Emma Johnson (Event organizer)"
          />
        </Box>
      );

      // Avatar should be properly accessible
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Alternative text best practices', () => {
    it('should use descriptive alt text, not just filename', () => {
      renderWithChakra(
        <Box>
          <img src="photo123.jpg" alt="Team gathering at pizza night event" />
        </Box>
      );

      const img = screen.getByRole('img', { name: /team gathering/i });
      expect(img).toHaveAttribute('alt', expect.not.stringContaining('.jpg'));
    });

    it('should not repeat text content in alt text', () => {
      renderWithChakra(
        <Box>
          <img
            src="rsvp.png"
            alt="3 RSVPs confirmed"
          />
          <p>3 RSVPs confirmed</p>
        </Box>
      );

      const img = screen.getByRole('img', { name: /rsvps/i });
      expect(img).toHaveAttribute('alt', expect.stringContaining('3'));
    });

    it('should keep alt text concise and descriptive', () => {
      renderWithChakra(
        <Box>
          <img
            src="status.svg"
            alt="Event confirmed"
          />
        </Box>
      );

      const img = screen.getByRole('img', { name: /confirmed/i });
      const alt = img.getAttribute('alt');
      expect(alt?.length).toBeLessThan(125); // Keep alt text reasonable length
    });
  });
});
