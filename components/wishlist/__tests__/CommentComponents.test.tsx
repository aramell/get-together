/**
 * Test suite for wishlist comment components
 * - CommentForm.tsx
 * - CommentItem.tsx
 * - CommentSection.tsx
 *
 * Tests cover AC1-AC7 from Story 6-2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentForm } from '../CommentForm';
import { CommentItem } from '../CommentItem';
import { CommentSection } from '../CommentSection';

// Mock fetch
global.fetch = vi.fn();

const mockGroupId = '550e8400-e29b-41d4-a716-446655440001';
const mockItemId = '550e8400-e29b-41d4-a716-446655440002';

describe('CommentForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering (AC1)', () => {
    it('should render input field with placeholder "Add a comment..."', () => {
      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const input = screen.getByPlaceholderText('Add a comment...');
      expect(input).toBeInTheDocument();
    });

    it('should render Post button', () => {
      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const button = screen.getByRole('button', { name: /post/i });
      expect(button).toBeInTheDocument();
    });

    it('should have form with correct structure', () => {
      const mockOnCommentPosted = vi.fn();
      const { container } = render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Input Validation (AC4, AC6)', () => {
    it('should disable Post button when input is empty', () => {
      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const button = screen.getByRole('button', { name: /post/i });
      expect(button).toBeDisabled();
    });

    it('should enable Post button when input has text', async () => {
      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const input = screen.getByPlaceholderText('Add a comment...') as HTMLInputElement;
      await userEvent.type(input, 'Hello world');

      const button = screen.getByRole('button', { name: /post/i });
      expect(button).not.toBeDisabled();
    });

    it('should reject whitespace-only input', async () => {
      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const input = screen.getByPlaceholderText('Add a comment...') as HTMLInputElement;
      await userEvent.type(input, '   ');

      const button = screen.getByRole('button', { name: /post/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Form Submission (AC2)', () => {
    it('should send POST request with comment content', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Comment posted',
          data: { id: '1' },
        }),
      });
      global.fetch = mockFetch;

      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const input = screen.getByPlaceholderText('Add a comment...') as HTMLInputElement;
      await userEvent.type(input, 'Great idea!');

      const button = screen.getByRole('button', { name: /post/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/groups/${mockGroupId}/wishlist/${mockItemId}/comments`),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Great idea!'),
          })
        );
      });
    });

    it('should clear input after successful submission', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Comment posted',
        }),
      });
      global.fetch = mockFetch;

      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const input = screen.getByPlaceholderText('Add a comment...') as HTMLInputElement;
      await userEvent.type(input, 'Great idea!');

      const button = screen.getByRole('button', { name: /post/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe('');
      });
    });

    it('should call onCommentPosted callback after success', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Comment posted',
        }),
      });
      global.fetch = mockFetch;

      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const input = screen.getByPlaceholderText('Add a comment...') as HTMLInputElement;
      await userEvent.type(input, 'Great idea!');

      const button = screen.getByRole('button', { name: /post/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockOnCommentPosted).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(
        new Error('Network error')
      );
      global.fetch = mockFetch;

      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const input = screen.getByPlaceholderText('Add a comment...') as HTMLInputElement;
      await userEvent.type(input, 'Great idea!');

      const button = screen.getByRole('button', { name: /post/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should preserve input on error', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(
        new Error('API error')
      );
      global.fetch = mockFetch;

      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const input = screen.getByPlaceholderText('Add a comment...') as HTMLInputElement;
      await userEvent.type(input, 'My comment');

      const button = screen.getByRole('button', { name: /post/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe('My comment');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on input', () => {
      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const input = screen.getByLabelText('Comment input');
      expect(input).toBeInTheDocument();
    });

    it('should have accessible button name', () => {
      const mockOnCommentPosted = vi.fn();
      render(
        <CommentForm
          groupId={mockGroupId}
          itemId={mockItemId}
          onCommentPosted={mockOnCommentPosted}
        />
      );

      const button = screen.getByRole('button', { name: /post/i });
      expect(button).toBeInTheDocument();
    });
  });
});

describe('CommentItem Component', () => {
  const mockComment = {
    id: '1',
    content: 'Great idea!',
    authorName: 'Alice',
    authorAvatar: null,
    createdAt: '2026-03-18T10:00:00Z',
  };

  describe('Rendering (AC5)', () => {
    it('should display author name', () => {
      render(<CommentItem {...mockComment} />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should display comment content', () => {
      render(<CommentItem {...mockComment} />);
      expect(screen.getByText('Great idea!')).toBeInTheDocument();
    });

    it('should display relative timestamp', () => {
      render(<CommentItem {...mockComment} />);
      // formatDistanceToNow will return something like "less than a minute ago"
      const timeElement = screen.getByText(/ago$/);
      expect(timeElement).toBeInTheDocument();
    });

    it('should render as article element for semantics', () => {
      const { container } = render(<CommentItem {...mockComment} />);
      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      const { container } = render(<CommentItem {...mockComment} />);
      const article = container.querySelector('article');
      expect(article).toHaveAttribute('aria-label', expect.stringContaining('Alice'));
    });

    it('should have time element with datetime attribute', () => {
      const { container } = render(<CommentItem {...mockComment} />);
      const time = container.querySelector('time');
      expect(time).toHaveAttribute('dateTime');
    });
  });
});

describe('CommentSection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering (AC1)', () => {
    it('should render comment count label', () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { comments: [], totalCount: 0 },
        }),
      });
      global.fetch = mockFetch;

      render(<CommentSection groupId={mockGroupId} itemId={mockItemId} />);

      // Wait for initial fetch
      expect(screen.getByText(/comments/i)).toBeInTheDocument();
    });

    it('should render CommentForm', () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { comments: [], totalCount: 0 },
        }),
      });
      global.fetch = mockFetch;

      render(<CommentSection groupId={mockGroupId} itemId={mockItemId} />);

      const input = screen.getByPlaceholderText('Add a comment...');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Comment List (AC3, AC4)', () => {
    it('should display comments in chronological order', async () => {
      const mockComments = [
        { id: '1', content: 'First', created_by: 'user1', created_at: '2026-03-18T10:00:00Z' },
        { id: '2', content: 'Second', created_by: 'user2', created_at: '2026-03-18T10:05:00Z' },
      ];

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { comments: mockComments, totalCount: 2, hasMore: false },
        }),
      });
      global.fetch = mockFetch;

      render(<CommentSection groupId={mockGroupId} itemId={mockItemId} />);

      await waitFor(() => {
        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
      });
    });

    it('should display comment count', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { comments: [], totalCount: 5, hasMore: false },
        }),
      });
      global.fetch = mockFetch;

      render(<CommentSection groupId={mockGroupId} itemId={mockItemId} />);

      await waitFor(() => {
        expect(screen.getByText(/comments \(5\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      const mockFetch = vi.fn().mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );
      global.fetch = mockFetch;

      render(<CommentSection groupId={mockGroupId} itemId={mockItemId} />);

      // Spinner should be visible
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state message when no comments', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { comments: [], totalCount: 0, hasMore: false },
        }),
      });
      global.fetch = mockFetch;

      render(<CommentSection groupId={mockGroupId} itemId={mockItemId} />);

      await waitFor(() => {
        expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Polling (AC2)', () => {
    it('should fetch comments on mount', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { comments: [], totalCount: 0 },
        }),
      });
      global.fetch = mockFetch;

      render(<CommentSection groupId={mockGroupId} itemId={mockItemId} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/groups/${mockGroupId}/wishlist/${mockItemId}/comments`),
          expect.any(Object)
        );
      });
    });

    it('should set up polling interval every 5 seconds', () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { comments: [], totalCount: 0 },
        }),
      });
      global.fetch = mockFetch;

      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      render(<CommentSection groupId={mockGroupId} itemId={mockItemId} />);

      // setInterval should be called with 5000ms
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

      setIntervalSpy.mockRestore();
    });
  });
});
