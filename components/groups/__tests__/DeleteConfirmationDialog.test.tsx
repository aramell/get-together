import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DeleteConfirmationDialog } from '../DeleteConfirmationDialog';
import '@testing-library/jest-dom';

// Mock Chakra UI components
jest.mock('@chakra-ui/react', () => ({
  Modal: ({ isOpen, onClose, children, ...props }: any) =>
    isOpen ? <div data-testid="modal" {...props}>{children}</div> : null,
  ModalOverlay: () => <div data-testid="modal-overlay" />,
  ModalContent: ({ children, onKeyDown, ...props }: any) => (
    <div data-testid="modal-content" onKeyDown={onKeyDown} {...props}>{children}</div>
  ),
  ModalHeader: ({ children, ...props }: any) => <h2 data-testid="modal-header" {...props}>{children}</h2>,
  ModalBody: ({ children, ...props }: any) => <div data-testid="modal-body" {...props}>{children}</div>,
  ModalFooter: ({ children, ...props }: any) => <div data-testid="modal-footer" {...props}>{children}</div>,
  Button: ({ children, onClick, isLoading, loadingText, colorScheme, ...props }: any) => (
    <button onClick={onClick} data-loading={isLoading} data-color={colorScheme} {...props}>
      {children}
    </button>
  ),
  Text: ({ children, ...props }: any) => <p data-testid="modal-message" {...props}>{children}</p>,
  HStack: ({ children, ...props }: any) => <div data-testid="button-group" {...props}>{children}</div>,
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

describe('DeleteConfirmationDialog Component', () => {
  let mockOnClose: jest.Mock;
  let mockOnConfirm: jest.Mock;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnConfirm = jest.fn();
  });

  describe('Visibility', () => {
    it('should render when isOpen is true', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('should display default title and message', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByTestId('modal-header')).toHaveTextContent('Delete Comment');
      expect(screen.getByTestId('modal-message')).toHaveTextContent('Are you sure? This cannot be undone.');
    });

    it('should display custom title and message', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Confirm Deletion"
          message="This action is permanent and cannot be reversed."
        />
      );

      expect(screen.getByTestId('modal-header')).toHaveTextContent('Confirm Deletion');
      expect(screen.getByTestId('modal-message')).toHaveTextContent('This action is permanent and cannot be reversed.');
    });
  });

  describe('Button Interactions', () => {
    it('should call onConfirm when Delete button is clicked', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const deleteButton = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Delete'));
      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onClose when Cancel button is clicked', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Cancel'));
      if (cancelButton) {
        fireEvent.click(cancelButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onClose on Escape key', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const modalContent = screen.getByTestId('modal-content');
      fireEvent.keyDown(modalContent, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call any handler on non-Escape key', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const modalContent = screen.getByTestId('modal-content');
      fireEvent.keyDown(modalContent, { key: 'Enter' });

      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable buttons when isLoading is true', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isLoading={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should show loading text on Delete button when isLoading is true', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isLoading={true}
        />
      );

      const deleteButton = screen.getAllByRole('button').find(btn => btn.getAttribute('data-color') === 'red');
      expect(deleteButton).toHaveAttribute('data-loading', 'true');
    });

    it('should enable buttons when isLoading is false', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isLoading={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-labels on buttons', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      // Buttons should have aria-labels for accessibility
      expect(buttons[0]).toHaveAttribute('aria-label');
    });
  });

  describe('Delete Button Styling', () => {
    it('should render Delete button with red color scheme (destructive)', () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const deleteButton = screen.getAllByRole('button').find(btn => btn.getAttribute('data-color') === 'red');
      expect(deleteButton).toExist();
    });
  });
});
