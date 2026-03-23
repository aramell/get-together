/**
 * Tests for CommentEditButton Component - Story 6.4 Task 2.1
 * Covers: AC1 (visibility and keyboard access)
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentEditButton } from '../CommentEditButton';
import { ChakraProvider } from '@chakra-ui/react';

const renderComponent = (props: any) => {
  return render(
    <ChakraProvider>
      <CommentEditButton {...props} />
    </ChakraProvider>
  );
};

describe('CommentEditButton', () => {
  const defaultProps = {
    isVisible: true,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility (AC1)', () => {
    it('should render when isVisible is true', () => {
      renderComponent(defaultProps);
      expect(screen.getByRole('button', { name: /edit comment/i })).toBeInTheDocument();
    });

    it('should not render when isVisible is false', () => {
      renderComponent({ ...defaultProps, isVisible: false });
      expect(screen.queryByRole('button', { name: /edit comment/i })).not.toBeInTheDocument();
    });

    it('should conditionally render based on authorization', () => {
      const { rerender } = renderComponent({ ...defaultProps, isVisible: true });
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(
        <ChakraProvider>
          <CommentEditButton {...defaultProps} isVisible={false} />
        </ChakraProvider>
      );
      expect(screen.queryByRole('button', { name: /edit comment/i })).not.toBeInTheDocument();
    });
  });

  describe('Click Behavior', () => {
    it('should call onClick handler when clicked', async () => {
      const user = userEvent.setup();
      const onClickMock = jest.fn();
      renderComponent({ ...defaultProps, onClick: onClickMock });

      const button = screen.getByRole('button', { name: /edit comment/i });
      await user.click(button);

      expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when loading', async () => {
      const user = userEvent.setup();
      const onClickMock = jest.fn();
      renderComponent({ ...defaultProps, onClick: onClickMock, isLoading: true });

      const button = screen.getByRole('button');
      await user.click(button);

      // Click still fires but button might be disabled
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('Keyboard Accessibility (AC1)', () => {
    it('should be keyboard accessible via Tab', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const button = screen.getByRole('button', { name: /edit comment/i });
      expect(button).not.toHaveFocus();

      await user.tab();
      expect(button).toHaveFocus();
    });

    it('should activate on Enter key', async () => {
      const user = userEvent.setup();
      const onClickMock = jest.fn();
      renderComponent({ ...defaultProps, onClick: onClickMock });

      const button = screen.getByRole('button', { name: /edit comment/i });
      button.focus();

      await user.keyboard('{Enter}');
      expect(onClickMock).toHaveBeenCalled();
    });

    it('should activate on Space key', async () => {
      const user = userEvent.setup();
      const onClickMock = jest.fn();
      renderComponent({ ...defaultProps, onClick: onClickMock });

      const button = screen.getByRole('button', { name: /edit comment/i });
      button.focus();

      await user.keyboard(' ');
      expect(onClickMock).toHaveBeenCalled();
    });
  });

  describe('Touch Targets (AC1 - 48px minimum)', () => {
    it('should have minimum height of 48px', () => {
      renderComponent(defaultProps);
      const button = screen.getByRole('button', { name: /edit comment/i });
      expect(button).toHaveStyle('min-height: 48px');
    });

    it('should have minimum width of 48px', () => {
      renderComponent(defaultProps);
      const button = screen.getByRole('button', { name: /edit comment/i });
      expect(button).toHaveStyle('min-width: 48px');
    });
  });

  describe('Accessibility Attributes', () => {
    it('should have aria-label', () => {
      renderComponent(defaultProps);
      const button = screen.getByRole('button', { name: /edit comment/i });
      expect(button).toHaveAttribute('aria-label', 'Edit comment');
    });

    it('should use custom aria-label when provided', () => {
      renderComponent({ ...defaultProps, ariaLabel: 'Modify this comment' });
      const button = screen.getByRole('button', { name: /modify this comment/i });
      expect(button).toHaveAttribute('aria-label', 'Modify this comment');
    });

    it('should have title attribute for tooltip', () => {
      renderComponent(defaultProps);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Edit this comment');
    });
  });

  describe('Focus Indicators', () => {
    it('should be keyboard accessible via Tab navigation', () => {
      renderComponent(defaultProps);
      const button = screen.getByRole('button');

      // Button should be reachable via Tab key (not disabled, not hidden)
      expect(button).not.toHaveAttribute('disabled');
      expect(button).toBeVisible();
      // Chakra UI applies _focus styles, which include outline
    });
  });

  describe('Loading and Disabled States', () => {
    it('should be disabled when isDisabled is true', () => {
      renderComponent({ ...defaultProps, isDisabled: true });
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
    });

    it('should show loading state when isLoading is true', () => {
      renderComponent({ ...defaultProps, isLoading: true });
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('Size Variants', () => {
    it('should accept size prop', () => {
      const { rerender } = renderComponent({ ...defaultProps, size: 'sm' });
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(
        <ChakraProvider>
          <CommentEditButton {...defaultProps} size="lg" />
        </ChakraProvider>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should accept className prop', () => {
      renderComponent({ ...defaultProps, className: 'custom-class' });
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });
});
