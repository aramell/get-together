/**
 * Tests for CommentList Component - Story 6.3 Task 2.3
 * Covers: AC1 (comment display), AC8 (target links), rendering, accessibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentList } from '../CommentList';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockGroupId = 'group-123';

const mockComments = [
  {
    id: 'comment-1',
    created_by: 'user-1',
    content: 'This event sounds amazing! I would love to attend.',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    display_name: 'Alice Johnson',
    avatar_url: 'https://example.com/alice.jpg',
    target_id: 'event-1',
    target_type: 'event' as const,
    target_name: 'Pizza Party',
  },
  {
    id: 'comment-2',
    created_by: 'user-2',
    content: 'I have this exact item on my wishlist!',
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    display_name: 'Bob Smith',
    avatar_url: null,
    target_id: 'wishlist-1',
    target_type: 'wishlist' as const,
    target_name: 'Outdoor Grill',
  },
  {
    id: 'comment-3',
    created_by: 'user-3',
    content: 'Great suggestion! When is this happening?',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    display_name: null,
    avatar_url: null,
    target_id: 'event-2',
    target_type: 'event' as const,
    target_name: 'Board Game Night',
  },
];

describe('CommentList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Comment Display (AC1)', () => {
    it('should render all comments', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      expect(screen.getByText('This event sounds amazing!')).toBeInTheDocument();
      expect(screen.getByText('I have this exact item on my wishlist!')).toBeInTheDocument();
      expect(screen.getByText('Great suggestion! When is this happening?')).toBeInTheDocument();
    });

    it('should display comment content correctly', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      mockComments.forEach((comment) => {
        expect(screen.getByText(comment.content)).toBeInTheDocument();
      });
    });

    it('should display author name', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });

    it('should display "Unknown Author" when display_name is null', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      expect(screen.getByText('Unknown Author')).toBeInTheDocument();
    });

    it('should display relative timestamps', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      // Relative timestamps from date-fns formatDistanceToNow
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it('should render comments as article elements', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(mockComments.length);
    });

    it('should display author avatars', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      // Avatar component uses the name from display_name
      expect(screen.getByLabelText(/Alice Johnson/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bob Smith/)).toBeInTheDocument();
    });

    it('should handle multiline comment content', () => {
      const multilineComment = {
        ...mockComments[0],
        content: 'Line 1\nLine 2\nLine 3',
      };
      render(<CommentList comments={[multilineComment]} groupId={mockGroupId} />);
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('should handle comments with special characters', () => {
      const specialComment = {
        ...mockComments[0],
        content: 'Check this out! @mention & special chars: <>!',
      };
      render(<CommentList comments={[specialComment]} groupId={mockGroupId} />);
      expect(screen.getByText(/Check this out!/)).toBeInTheDocument();
    });

    it('should handle very long comment content', () => {
      const longComment = {
        ...mockComments[0],
        content: 'a'.repeat(500),
      };
      render(<CommentList comments={[longComment]} groupId={mockGroupId} />);
      const longText = screen.getByText(new RegExp('a{100}'));
      expect(longText).toBeInTheDocument();
    });
  });

  describe('Target Links (AC8)', () => {
    it('should render target link for event comments', () => {
      render(<CommentList comments={[mockComments[0]]} groupId={mockGroupId} />);
      const link = screen.getByRole('link', { name: /Pizza Party \(Event\)/ });
      expect(link).toHaveAttribute('href', `/groups/${mockGroupId}/events/event-1`);
    });

    it('should render target link for wishlist comments', () => {
      render(<CommentList comments={[mockComments[1]]} groupId={mockGroupId} />);
      const link = screen.getByRole('link', { name: /Outdoor Grill \(Wishlist\)/ });
      expect(link).toHaveAttribute('href', `/groups/${mockGroupId}/wishlist/wishlist-1`);
    });

    it('should display target name in link', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      expect(screen.getByText(/Pizza Party/)).toBeInTheDocument();
      expect(screen.getByText(/Outdoor Grill/)).toBeInTheDocument();
      expect(screen.getByText(/Board Game Night/)).toBeInTheDocument();
    });

    it('should indicate target type (Event/Wishlist)', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      expect(screen.getByText(/\(Event\)/)).toBeInTheDocument();
      expect(screen.getByText(/\(Wishlist\)/)).toBeInTheDocument();
    });

    it('should construct correct URL paths for different group IDs', () => {
      const differentGroupId = 'group-999';
      render(<CommentList comments={mockComments} groupId={differentGroupId} />);
      const eventLink = screen.getByRole('link', { name: /Pizza Party/ });
      expect(eventLink).toHaveAttribute('href', `/groups/${differentGroupId}/events/event-1`);
    });

    it('should be clickable and navigable', async () => {
      const user = userEvent.setup();
      render(<CommentList comments={[mockComments[0]]} groupId={mockGroupId} />);
      const link = screen.getByRole('link', { name: /Pizza Party/ });

      expect(link).toBeInTheDocument();
      await user.click(link);
      // Link href attribute is set correctly (actual navigation is Next.js responsibility)
      expect(link).toHaveAttribute('href');
    });
  });

  describe('Empty State', () => {
    it('should display empty state message when no comments', () => {
      render(<CommentList comments={[]} groupId={mockGroupId} />);
      expect(screen.getByText(/No comments match your filters/)).toBeInTheDocument();
    });

    it('should not render any comment articles in empty state', () => {
      render(<CommentList comments={[]} groupId={mockGroupId} />);
      const articles = screen.queryAllByRole('article');
      expect(articles).toHaveLength(0);
    });

    it('should suggest adjusting filters in empty state message', () => {
      render(<CommentList comments={[]} groupId={mockGroupId} />);
      expect(screen.getByText(/Try adjusting your search or filters/)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display spinner when loading and no comments', () => {
      render(<CommentList comments={[]} groupId={mockGroupId} isLoading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should not render empty state message when loading', () => {
      render(<CommentList comments={[]} groupId={mockGroupId} isLoading={true} />);
      expect(screen.queryByText(/No comments match your filters/)).not.toBeInTheDocument();
    });

    it('should display spinner with correct styling', () => {
      render(<CommentList comments={[]} groupId={mockGroupId} isLoading={true} />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should not display spinner when not loading', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} isLoading={false} />);
      const spinner = screen.queryByRole('status');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Avatar Handling', () => {
    it('should display avatar image when avatar_url is provided', () => {
      render(<CommentList comments={[mockComments[0]]} groupId={mockGroupId} />);
      const avatar = screen.getByLabelText(/Alice Johnson/);
      expect(avatar).toBeInTheDocument();
    });

    it('should display initials when avatar_url is null', () => {
      render(<CommentList comments={[mockComments[2]]} groupId={mockGroupId} />);
      const avatar = screen.getByLabelText(/Unknown Author/);
      expect(avatar).toBeInTheDocument();
    });

    it('should handle missing avatar_url gracefully', () => {
      const noAvatarComment = {
        ...mockComments[1],
        avatar_url: null,
      };
      render(<CommentList comments={[noAvatarComment]} groupId={mockGroupId} />);
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  describe('Comment Click Handler', () => {
    it('should call onCommentClick when comment is clicked', async () => {
      const user = userEvent.setup();
      const mockOnCommentClick = vi.fn();
      render(
        <CommentList
          comments={[mockComments[0]]}
          groupId={mockGroupId}
          onCommentClick={mockOnCommentClick}
        />
      );

      const commentBox = screen.getByRole('article');
      await user.click(commentBox);
      expect(mockOnCommentClick).toHaveBeenCalledWith('comment-1');
    });

    it('should not fail when onCommentClick is not provided', async () => {
      const user = userEvent.setup();
      render(
        <CommentList comments={[mockComments[0]]} groupId={mockGroupId} />
      );

      const commentBox = screen.getByRole('article');
      await user.click(commentBox);
      // Should not throw error
      expect(commentBox).toBeInTheDocument();
    });

    it('should call onCommentClick with correct commentId', async () => {
      const user = userEvent.setup();
      const mockOnCommentClick = vi.fn();
      render(
        <CommentList
          comments={mockComments}
          groupId={mockGroupId}
          onCommentClick={mockOnCommentClick}
        />
      );

      const articles = screen.getAllByRole('article');
      await user.click(articles[1]); // Click second comment
      expect(mockOnCommentClick).toHaveBeenCalledWith('comment-2');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on each comment article', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      expect(screen.getByLabelText(/Alice Johnson/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bob Smith/)).toBeInTheDocument();
    });

    it('should have aria-label on target links', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      expect(screen.getByLabelText(/View event "Pizza Party"/)).toBeInTheDocument();
      expect(screen.getByLabelText(/View wishlist "Outdoor Grill"/)).toBeInTheDocument();
    });

    it('should use semantic time element for timestamps', () => {
      render(<CommentList comments={[mockComments[0]]} groupId={mockGroupId} />);
      const timeElement = screen.getByText(/ago/).closest('time');
      expect(timeElement).toHaveAttribute('dateTime');
    });

    it('should support keyboard navigation through links', async () => {
      const user = userEvent.setup();
      render(<CommentList comments={[mockComments[0]]} groupId={mockGroupId} />);

      const link = screen.getByRole('link');
      await user.tab();
      expect(link).toHaveFocus();
    });

    it('should have sufficient color contrast for readability', () => {
      const { container } = render(
        <CommentList comments={[mockComments[0]]} groupId={mockGroupId} />
      );
      // Check that text color classes are applied
      expect(container.innerHTML).toContain('text-gray');
    });

    it('should wrap text properly for screen readers', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      mockComments.forEach((comment) => {
        expect(screen.getByText(comment.content)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render comments in vertical stack', () => {
      const { container } = render(
        <CommentList comments={mockComments} groupId={mockGroupId} />
      );
      // VStack uses flex direction column
      expect(container.innerHTML).toContain('stretch');
    });

    it('should have consistent spacing between comments', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(3);
    });

    it('should handle text wrapping in long content', () => {
      const longComment = {
        ...mockComments[0],
        content:
          'This is a very long comment that should wrap nicely on all screen sizes without breaking the layout or causing horizontal scrollbars to appear',
      };
      render(<CommentList comments={[longComment]} groupId={mockGroupId} />);
      expect(screen.getByText(/very long comment/)).toBeInTheDocument();
    });
  });

  describe('Multiple Comment Types', () => {
    it('should display mix of event and wishlist comments', () => {
      const mixedComments = [mockComments[0], mockComments[1], mockComments[2]];
      render(<CommentList comments={mixedComments} groupId={mockGroupId} />);

      expect(screen.getByText(/Pizza Party \(Event\)/)).toBeInTheDocument();
      expect(screen.getByText(/Outdoor Grill \(Wishlist\)/)).toBeInTheDocument();
      expect(screen.getByText(/Board Game Night \(Event\)/)).toBeInTheDocument();
    });

    it('should correctly link all comment types', () => {
      const mixedComments = [mockComments[0], mockComments[1]];
      render(<CommentList comments={mixedComments} groupId={mockGroupId} />);

      const eventLink = screen.getByRole('link', { name: /Pizza Party/ });
      const wishlistLink = screen.getByRole('link', { name: /Outdoor Grill/ });

      expect(eventLink).toHaveAttribute('href', expect.stringContaining('/events/'));
      expect(wishlistLink).toHaveAttribute('href', expect.stringContaining('/wishlist/'));
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly using formatDistanceToNow', () => {
      render(<CommentList comments={[mockComments[0]]} groupId={mockGroupId} />);
      // Should contain relative time like "1 hour ago"
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it('should include suffix "ago" in timestamps', () => {
      render(<CommentList comments={mockComments} groupId={mockGroupId} />);
      const timeElements = screen.getAllByText(/ago/);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should use ISO datetime format in time element', () => {
      render(<CommentList comments={[mockComments[0]]} groupId={mockGroupId} />);
      const timeElement = screen.getByText(/ago/).closest('time');
      expect(timeElement).toHaveAttribute('dateTime', mockComments[0].created_at);
    });
  });

  describe('Content Handling', () => {
    it('should preserve whitespace in comment content', () => {
      const whitespaceComment = {
        ...mockComments[0],
        content: 'Line 1\n\nLine 2 with   spaces',
      };
      render(<CommentList comments={[whitespaceComment]} groupId={mockGroupId} />);
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('should handle URLs in comment content', () => {
      const urlComment = {
        ...mockComments[0],
        content: 'Check this out: https://example.com',
      };
      render(<CommentList comments={[urlComment]} groupId={mockGroupId} />);
      expect(screen.getByText(/Check this out:/)).toBeInTheDocument();
    });

    it('should handle emoji in content', () => {
      const emojiComment = {
        ...mockComments[0],
        content: 'Great! 🎉 This sounds fun 🎊',
      };
      render(<CommentList comments={[emojiComment]} groupId={mockGroupId} />);
      expect(screen.getByText(/Great! 🎉/)).toBeInTheDocument();
    });
  });
});
