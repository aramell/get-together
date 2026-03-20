/**
 * Tests for PaginationControls Component - Story 6.3 Task 3.1
 * Covers: AC5 (pagination), navigation, edge cases
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaginationControls } from '../PaginationControls';

describe('PaginationControls Component', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Navigation (AC5)', () => {
    it('should render previous and next buttons', () => {
      render(
        <PaginationControls
          currentPage={1}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('should show page indicator with correct format (AC5)', () => {
      render(
        <PaginationControls
          currentPage={2}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      // Should show: "Page 2 of 5 (21-40 of 100 comments)"
      expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
      expect(screen.getByText(/21-40 of 100/i)).toBeInTheDocument();
    });

    it('should calculate correct item range for current page', () => {
      render(
        <PaginationControls
          currentPage={3}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      // Page 3: items 41-60
      expect(screen.getByText(/41-60 of 100/i)).toBeInTheDocument();
    });

    it('should handle last page with fewer items', () => {
      render(
        <PaginationControls
          currentPage={5}
          totalPages={5}
          totalCount={95}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      // Page 5: items 81-95 (not 81-100)
      expect(screen.getByText(/81-95 of 95/i)).toBeInTheDocument();
    });
  });

  describe('Next Button Behavior', () => {
    it('should call onPageChange with next page when next is clicked', async () => {
      const user = userEvent.setup();
      render(
        <PaginationControls
          currentPage={2}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });

    it('should disable next button on last page', () => {
      render(
        <PaginationControls
          currentPage={5}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('should enable next button when not on last page', () => {
      render(
        <PaginationControls
          currentPage={3}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('Previous Button Behavior', () => {
    it('should call onPageChange with previous page when previous is clicked', async () => {
      const user = userEvent.setup();
      render(
        <PaginationControls
          currentPage={3}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('should disable previous button on first page', () => {
      render(
        <PaginationControls
          currentPage={1}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('should enable previous button when not on first page', () => {
      render(
        <PaginationControls
          currentPage={2}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).not.toBeDisabled();
    });
  });

  describe('Direct Page Input', () => {
    it('should render page input field when multiple pages exist', () => {
      render(
        <PaginationControls
          currentPage={1}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByLabelText(/page number input/i)).toBeInTheDocument();
    });

    it('should not render page input when only one page', () => {
      render(
        <PaginationControls
          currentPage={1}
          totalPages={1}
          totalCount={15}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.queryByLabelText(/page number input/i)).not.toBeInTheDocument();
    });

    it('should navigate to page on Enter key', async () => {
      const user = userEvent.setup();
      render(
        <PaginationControls
          currentPage={1}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText(/page number input/i) as HTMLInputElement;
      await user.clear(input);
      await user.type(input, '3');
      await user.keyboard('{Enter}');

      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });

    it('should navigate to page on blur', async () => {
      const user = userEvent.setup();
      render(
        <PaginationControls
          currentPage={1}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText(/page number input/i);
      await user.clear(input);
      await user.type(input, '4');
      await user.click(document.body); // Blur the input

      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    it('should reject invalid page numbers', async () => {
      const user = userEvent.setup();
      render(
        <PaginationControls
          currentPage={1}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText(/page number input/i) as HTMLInputElement;
      await user.clear(input);
      await user.type(input, '10'); // Beyond totalPages
      await user.keyboard('{Enter}');

      // Should not call onPageChange for invalid page
      expect(mockOnPageChange).not.toHaveBeenCalled();
      // Input should revert to current page
      expect(input.value).toBe('1');
    });

    it('should accept page 0 as invalid', async () => {
      const user = userEvent.setup();
      render(
        <PaginationControls
          currentPage={2}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText(/page number input/i) as HTMLInputElement;
      await user.clear(input);
      await user.type(input, '0');
      await user.keyboard('{Enter}');

      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('should sync input with currentPage prop changes', async () => {
      const { rerender } = render(
        <PaginationControls
          currentPage={1}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      const input = screen.getByLabelText(/page number input/i) as HTMLInputElement;
      expect(input.value).toBe('1');

      rerender(
        <PaginationControls
          currentPage={3}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      expect(input.value).toBe('3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single page correctly', () => {
      render(
        <PaginationControls
          currentPage={1}
          totalPages={1}
          totalCount={15}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument();
      expect(screen.getByText(/1-15 of 15/i)).toBeInTheDocument();
    });

    it('should handle zero comments', () => {
      render(
        <PaginationControls
          currentPage={1}
          totalPages={0}
          totalCount={0}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText(/page 1 of 0/i)).toBeInTheDocument();
    });

    it('should handle many pages', () => {
      render(
        <PaginationControls
          currentPage={50}
          totalPages={100}
          totalCount={2000}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText(/page 50 of 100/i)).toBeInTheDocument();
      expect(screen.getByText(/981-1000 of 2000/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-labels on buttons', () => {
      render(
        <PaginationControls
          currentPage={2}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByLabelText(/previous page/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/next page/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <PaginationControls
          currentPage={2}
          totalPages={5}
          totalCount={100}
          pageSize={20}
          onPageChange={mockOnPageChange}
        />
      );

      await user.tab();
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toHaveFocus();
    });
  });
});
