import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CommentDeleteButton } from '../CommentDeleteButton';
import '@testing-library/jest-dom';

// Mock Chakra UI components
jest.mock('@chakra-ui/react', () => ({
  IconButton: ({ children, onClick, 'aria-label': ariaLabel, isDisabled, ...props }: any) => (
    <button onClick={onClick} aria-label={ariaLabel} disabled={isDisabled} {...props}>
      {children || 'Delete'}
    </button>
  ),
  Icon: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@chakra-ui/icons', () => ({
  DeleteIcon: () => <span data-testid="delete-icon">🗑️</span>,
}));

describe('CommentDeleteButton Component', () => {
  let mockOnClick: jest.Mock;

  beforeEach(() => {
    mockOnClick = jest.fn();
  });

  describe('Visibility', () => {
    it('should render when isVisible is true', () => {
      render(
        <CommentDeleteButton
          isVisible={true}
          onClick={mockOnClick}
          ariaLabel="Delete comment"
        />
      );

      expect(screen.getByRole('button', { name: 'Delete comment' })).toBeInTheDocument();
    });

    it('should not render when isVisible is false', () => {
      const { container } = render(
        <CommentDeleteButton
          isVisible={false}
          onClick={mockOnClick}
          ariaLabel="Delete comment"
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('should call onClick handler when clicked', () => {
      render(
        <CommentDeleteButton
          isVisible={true}
          onClick={mockOnClick}
          ariaLabel="Delete comment"
        />
      );

      const button = screen.getByRole('button', { name: 'Delete comment' });
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      render(
        <CommentDeleteButton
          isVisible={true}
          onClick={mockOnClick}
          isDisabled={true}
          ariaLabel="Delete comment"
        />
      );

      const button = screen.getByRole('button', { name: 'Delete comment' });
      expect(button).toBeDisabled();
      fireEvent.click(button);

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria-label', () => {
      render(
        <CommentDeleteButton
          isVisible={true}
          onClick={mockOnClick}
          ariaLabel="Delete this comment"
        />
      );

      const button = screen.getByRole('button', { name: 'Delete this comment' });
      expect(button).toHaveAttribute('aria-label', 'Delete this comment');
    });

    it('should use default aria-label if not provided', () => {
      render(
        <CommentDeleteButton
          isVisible={true}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button', { name: 'Delete this comment' });
      expect(button).toHaveAttribute('aria-label', 'Delete this comment');
    });
  });

  describe('Props Handling', () => {
    it('should handle disabled state correctly', () => {
      const { rerender } = render(
        <CommentDeleteButton
          isVisible={true}
          onClick={mockOnClick}
          isDisabled={false}
        />
      );

      let button = screen.getByRole('button');
      expect(button).not.toBeDisabled();

      rerender(
        <CommentDeleteButton
          isVisible={true}
          onClick={mockOnClick}
          isDisabled={true}
        />
      );

      button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should render delete icon', () => {
      render(
        <CommentDeleteButton
          isVisible={true}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByTestId('delete-icon')).toBeInTheDocument();
    });
  });
});
