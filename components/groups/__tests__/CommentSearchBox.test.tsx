/**
 * Tests for CommentSearchBox Component - Story 6.3 Task 4.1
 * Covers: AC4 (search functionality), debouncing, result count display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentSearchBox } from '../CommentSearchBox';

describe('CommentSearchBox Component', () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Search Input (AC4)', () => {
    it('should render search input field', () => {
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);
      expect(input).toBeInTheDocument();
    });

    it('should have placeholder text', () => {
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByPlaceholderText(/search comments by content/i);
      expect(input).toBeInTheDocument();
    });

    it('should update input value when user types', async () => {
      const user = userEvent.setup();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i) as HTMLInputElement;

      await user.type(input, 'pizza');
      expect(input.value).toBe('pizza');
    });

    it('should handle multiple character inputs', async () => {
      const user = userEvent.setup();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i) as HTMLInputElement;

      await user.type(input, 'test query with spaces');
      expect(input.value).toBe('test query with spaces');
    });

    it('should accept special characters in search', async () => {
      const user = userEvent.setup();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i) as HTMLInputElement;

      await user.type(input, '@john!');
      expect(input.value).toBe('@john!');
    });
  });

  describe('Search Debouncing (AC4)', () => {
    it('should debounce search input by 300ms', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      // Type rapidly
      await user.type(input, 'test');
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Advance time to trigger debounce
      vi.advanceTimersByTime(300);
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('test');
      });

      vi.useRealTimers();
    });

    it('should not call onSearch until debounce completes', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'p');
      vi.advanceTimersByTime(100);
      expect(mockOnSearch).not.toHaveBeenCalled();

      await user.type(input, 'i');
      vi.advanceTimersByTime(100);
      expect(mockOnSearch).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('pi');
      });

      vi.useRealTimers();
    });

    it('should reset debounce timer on new input', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'test');
      vi.advanceTimersByTime(200);
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Type more before debounce completes
      await user.type(input, ' query');
      vi.advanceTimersByTime(200);
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Complete the debounce
      vi.advanceTimersByTime(100);
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('test query');
      });

      vi.useRealTimers();
    });

    it('should handle rapid backspace deletions', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'pizza');
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith('pizza');

      mockOnSearch.mockClear();
      await user.clear(input);
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith(null);

      vi.useRealTimers();
    });
  });

  describe('Clear Button', () => {
    it('should not render clear button when input is empty', () => {
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const clearButton = screen.queryByRole('button', { name: /clear search/i });
      expect(clearButton).not.toBeInTheDocument();
    });

    it('should render clear button when input has text', async () => {
      const user = userEvent.setup();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'search term');
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear search input when clicked', async () => {
      const user = userEvent.setup();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i) as HTMLInputElement;

      await user.type(input, 'search term');
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);

      expect(input.value).toBe('');
    });

    it('should call onSearch with null after clearing', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'test');
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith('test');

      mockOnSearch.mockClear();
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith(null);

      vi.useRealTimers();
    });

    it('should hide clear button after clearing', async () => {
      const user = userEvent.setup();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'search');
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);

      const clearedButton = screen.queryByRole('button', { name: /clear search/i });
      expect(clearedButton).not.toBeInTheDocument();
    });
  });

  describe('Result Count Display (AC4)', () => {
    it('should display result count when search is active', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={12} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'pizza');
      vi.advanceTimersByTime(300);

      expect(screen.getByText(/Found.*12.*comment.*matching/i)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('should show singular "comment" for 1 result', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={1} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'test');
      vi.advanceTimersByTime(300);

      expect(screen.getByText(/Found.*1.*comment matching/i)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('should show plural "comments" for multiple results', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={5} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'test');
      vi.advanceTimersByTime(300);

      expect(screen.getByText(/Found.*5.*comments matching/i)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('should show zero results correctly', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'nonexistent');
      vi.advanceTimersByTime(300);

      expect(screen.getByText(/Found.*0.*comments matching/i)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('should display hint text when no search is active', () => {
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      expect(screen.getByText(/search by comment text, author name/i)).toBeInTheDocument();
    });

    it('should include search query in hint text', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={8} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'pizza party');
      vi.advanceTimersByTime(300);

      expect(screen.getByText(/pizza party/)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('should update result count when prop changes', async () => {
      const { rerender } = render(
        <CommentSearchBox onSearch={mockOnSearch} resultCount={5} />
      );

      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      const input = screen.getByLabelText(/search comments/i);
      await user.type(input, 'test');
      vi.advanceTimersByTime(300);

      // Update result count
      rerender(<CommentSearchBox onSearch={mockOnSearch} resultCount={10} />);
      expect(screen.getByText(/Found.*10.*comments/i)).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Whitespace Handling', () => {
    it('should trim leading whitespace from search query', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, '   test');
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith('test');

      vi.useRealTimers();
    });

    it('should trim trailing whitespace from search query', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'test   ');
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith('test');

      vi.useRealTimers();
    });

    it('should convert empty or whitespace-only input to null', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, '   ');
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith(null);

      vi.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on search input', () => {
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);
      expect(input).toHaveAttribute('aria-label');
    });

    it('should have aria-describedby pointing to hint text', () => {
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);
      expect(input).toHaveAttribute('aria-describedby', 'search-hint');
    });

    it('should have aria-label on clear button', async () => {
      const user = userEvent.setup();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, 'test');
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toHaveAttribute('aria-label', 'Clear search');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);

      await user.tab();
      const input = screen.getByLabelText(/search comments/i);
      expect(input).toHaveFocus();
    });

    it('should be operable with keyboard only', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);

      const input = screen.getByLabelText(/search comments/i);
      input.focus();
      await user.type(input, 'test');
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith('test');

      // Tab to clear button and activate with Enter
      await user.tab();
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toHaveFocus();
      await user.keyboard('{Enter}');
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith(null);

      vi.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long search queries', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      const longQuery = 'a'.repeat(500);
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, longQuery);
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith(longQuery);

      vi.useRealTimers();
    });

    it('should handle unicode characters in search', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      await user.type(input, '日本語 🎉');
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith('日本語 🎉');

      vi.useRealTimers();
    });

    it('should handle rapid successive searches', async () => {
      const user = userEvent.setup({ delay: null });
      vi.useFakeTimers();
      render(<CommentSearchBox onSearch={mockOnSearch} resultCount={0} />);
      const input = screen.getByLabelText(/search comments/i);

      // First search
      await user.type(input, 'pizza');
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith('pizza');

      mockOnSearch.mockClear();
      await user.clear(input);
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith(null);

      mockOnSearch.mockClear();
      await user.type(input, 'party');
      vi.advanceTimersByTime(300);
      expect(mockOnSearch).toHaveBeenCalledWith('party');

      vi.useRealTimers();
    });
  });
});
