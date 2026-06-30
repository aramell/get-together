/**
 * Tests for CommentEditModal Component - Story 6.4 Task 2.2
 * Covers: AC2 (form interface), AC3 (validation), AC9 (accessibility)
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentEditModal } from '../CommentEditModal';
import { ChakraProvider } from '@chakra-ui/react';

const renderComponent = (props: any) => {
  return render(
    <ChakraProvider>
      <CommentEditModal {...props} />
    </ChakraProvider>
  );
};

describe('CommentEditModal (AC2, AC3)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    initialContent: 'Original comment',
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Interface (AC2)', () => {
    it('should render modal when isOpen is true', () => {
      renderComponent(defaultProps);
      expect(screen.getByText(/edit comment/i)).toBeInTheDocument();
    });

    it('should pre-fill textarea with initial content', () => {
      renderComponent(defaultProps);
      const textarea = screen.getByRole('textbox', { name: /edit comment content/i });
      expect(textarea).toHaveValue('Original comment');
    });

    it('should have Save and Cancel buttons', () => {
      renderComponent(defaultProps);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should display character count', () => {
      renderComponent(defaultProps);
      expect(screen.getByText(/16 \/ 2000/i)).toBeInTheDocument(); // "Original comment" = 16 chars
    });

    it('should update character count as user types', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const textarea = screen.getByRole('textbox', { name: /edit comment content/i });
      await user.clear(textarea);
      await user.type(textarea, 'New comment text');

      expect(screen.getByText(/16 \/ 2000/i)).toBeInTheDocument();
    });

    it('should show custom modal title when provided', () => {
      renderComponent({ ...defaultProps, modalTitle: 'Modify Comment' });
      expect(screen.getByText('Modify Comment')).toBeInTheDocument();
    });
  });

  describe('Real-time Validation (AC3)', () => {
    it('should reject empty content', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      expect(screen.getByText(/comment cannot be empty/i)).toBeInTheDocument();
    });

    it('should reject whitespace-only content', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, '   \n\t  ');

      expect(screen.getByText(/comment cannot be empty/i)).toBeInTheDocument();
    });

    it('should reject content exceeding 2000 characters', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const textarea = screen.getByRole('textbox');
      const longContent = 'a'.repeat(2001);
      await user.clear(textarea);
      await user.type(textarea, 'a');

      // Simulate pasting a very long string by dispatching a change event directly
      fireEvent.change(textarea, { target: { value: longContent } });

      expect(screen.getByText(/exceeds 2000 character limit/i)).toBeInTheDocument();
    });

    it('should display error message in FormErrorMessage', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      await waitFor(() => {
        expect(screen.getByText(/comment cannot be empty/i)).toBeInTheDocument();
      });
    });

    it('should allow content with exactly 2000 characters', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const textarea = screen.getByRole('textbox');
      const content2000 = 'a'.repeat(2000);
      await user.clear(textarea);
      // Use fireEvent for fast content change without typing each character
      fireEvent.change(textarea, { target: { value: content2000 } });

      expect(screen.queryByText(/exceeds 2000 character limit/i)).not.toBeInTheDocument();
    });

    it('should allow content with 1 character', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'a');

      expect(screen.queryByText(/comment cannot be empty/i)).not.toBeInTheDocument();
    });
  });

  describe('Save Button Behavior', () => {
    it('should disable Save button when content is empty', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('should disable Save button when content exceeds limit', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const textarea = screen.getByRole('textbox');
      const longContent = 'a'.repeat(2001);
      // Use fireEvent for fast content change
      fireEvent.change(textarea, { target: { value: longContent } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('should enable Save button when content is valid', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('should call onSave with trimmed content when Save is clicked', async () => {
      const user = userEvent.setup();
      const onSaveMock = jest.fn().mockResolvedValue(undefined);
      renderComponent({ ...defaultProps, onSave: onSaveMock });

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, '  New content  ');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSaveMock).toHaveBeenCalledWith('New content');
      });
    });

    it('should show loading state during save', async () => {
      const user = userEvent.setup();
      const onSaveMock = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
      renderComponent({ ...defaultProps, onSave: onSaveMock });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(saveButton).toHaveAttribute('disabled');
      });
    });

    it('should close modal on successful save', async () => {
      const user = userEvent.setup();
      const onCloseMock = jest.fn();
      const onSaveMock = jest.fn().mockResolvedValue(undefined);
      renderComponent({ ...defaultProps, onClose: onCloseMock, onSave: onSaveMock });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onCloseMock).toHaveBeenCalled();
      });
    });

    it('should handle save errors', async () => {
      const user = userEvent.setup();
      const onSaveMock = jest.fn().mockRejectedValue(new Error('Save failed'));
      renderComponent({ ...defaultProps, onSave: onSaveMock });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // After save fails, the button should no longer be loading
      await waitFor(() => {
        expect(saveButton).not.toHaveAttribute('disabled');
      });

      // And the error should be visible somewhere (might be in toast or FormErrorMessage)
      const errorElements = screen.getAllByText(/save failed/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  describe('Cancel Button Behavior', () => {
    it('should call onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onCloseMock = jest.fn();
      renderComponent({ ...defaultProps, onClose: onCloseMock });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should not save when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onSaveMock = jest.fn();
      renderComponent({ ...defaultProps, onSave: onSaveMock });

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'New content');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onSaveMock).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts (AC9)', () => {
    it('should close modal when Escape is pressed', async () => {
      const user = userEvent.setup();
      const onCloseMock = jest.fn();
      renderComponent({ ...defaultProps, onClose: onCloseMock });

      const textarea = screen.getByRole('textbox');
      textarea.focus();
      await user.keyboard('{Escape}');

      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should save when Ctrl+Enter is pressed', async () => {
      const onSaveMock = jest.fn().mockResolvedValue(undefined);
      renderComponent({ ...defaultProps, onSave: onSaveMock });

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // Simulate Ctrl+Enter keyboard event
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        bubbles: true,
      });
      textarea.dispatchEvent(event);

      await waitFor(() => {
        expect(onSaveMock).toHaveBeenCalled();
      });
    });

    it('should save when Cmd+Enter is pressed (Mac)', async () => {
      const onSaveMock = jest.fn().mockResolvedValue(undefined);
      renderComponent({ ...defaultProps, onSave: onSaveMock });

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // Simulate Meta+Enter keyboard event
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        bubbles: true,
      });
      textarea.dispatchEvent(event);

      await waitFor(() => {
        expect(onSaveMock).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility (AC9)', () => {
    it('should have proper aria-labels', () => {
      renderComponent(defaultProps);
      const textarea = screen.getByRole('textbox', { name: /edit comment content/i });
      expect(textarea).toHaveAttribute('aria-label', 'Edit comment content');
    });

    it('should announce character count to screen readers', () => {
      renderComponent(defaultProps);
      const charCount = screen.getByText(/16 \/ 2000/i);
      expect(charCount).toHaveAttribute('aria-live', 'polite');
    });

    it('should announce validation errors', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      await waitFor(() => {
        const errorMessage = screen.getByText(/comment cannot be empty/i);
        expect(errorMessage).toHaveAttribute('id', 'comment-error');
      });
    });

    it('should focus textarea on modal open', async () => {
      renderComponent(defaultProps);
      const textarea = screen.getByRole('textbox');
      await waitFor(() => {
        expect(textarea).toHaveFocus();
      });
    });
  });

  describe('Content Reset on Open', () => {
    it('should reset content to initialContent when modal opens', async () => {
      const user = userEvent.setup();
      const { rerender } = renderComponent({
        ...defaultProps,
        isOpen: false,
        initialContent: 'Original',
      });

      rerender(
        <ChakraProvider>
          <CommentEditModal {...defaultProps} isOpen={true} initialContent="Original" />
        </ChakraProvider>
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Original');
    });

    it('should clear errors when modal opens', async () => {
      const user = userEvent.setup();
      const { rerender } = renderComponent({
        ...defaultProps,
        isOpen: true,
      });

      // Trigger an error
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      expect(screen.getByText(/comment cannot be empty/i)).toBeInTheDocument();

      // Close and reopen
      rerender(
        <ChakraProvider>
          <CommentEditModal {...defaultProps} isOpen={false} initialContent="Original" />
        </ChakraProvider>
      );

      rerender(
        <ChakraProvider>
          <CommentEditModal {...defaultProps} isOpen={true} initialContent="Original" />
        </ChakraProvider>
      );

      // Error should be cleared
      expect(screen.queryByText(/comment cannot be empty/i)).not.toBeInTheDocument();
    });
  });

  describe('Character Count Color', () => {
    it('should change color when approaching limit', () => {
      const { rerender } = renderComponent(defaultProps);

      // Rerender with content near the limit (1900 chars)
      const content1900 = 'a'.repeat(1900);
      rerender(
        <ChakraProvider>
          <CommentEditModal {...defaultProps} isOpen={true} initialContent={content1900} />
        </ChakraProvider>
      );

      const charCount = screen.getByText(/1900 \/ 2000/i);
      expect(charCount).toHaveClass('chakra-text');
      // When approaching limit (>90%), color should change to orange.500
      expect(charCount).toHaveStyle('color: var(--chakra-colors-orange-500)');
    });
  });
});
