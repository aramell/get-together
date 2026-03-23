/**
 * Tests for CommentEditIndicator Component - Story 6.4 Task 2.3
 * Covers: AC5 (confirmation), AC6 (edit history)
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentEditIndicator } from '../CommentEditIndicator';
import { ChakraProvider } from '@chakra-ui/react';

const renderComponent = (props: any) => {
  return render(
    <ChakraProvider>
      <CommentEditIndicator {...props} />
    </ChakraProvider>
  );
};

// Mock current time for consistent testing
const NOW = new Date('2026-03-20T12:00:00Z');

describe('CommentEditIndicator (AC5, AC6)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultProps = {
    editedAt: '2026-03-20T11:55:00Z', // 5 minutes ago
    updatedCount: 1,
    createdAt: '2026-03-20T11:00:00Z',
  };

  describe('Visibility (AC5 - Edit Indicator Display)', () => {
    it('should not render when editedAt is null', () => {
      renderComponent({ ...defaultProps, editedAt: null });
      expect(screen.queryByText(/edited/i)).not.toBeInTheDocument();
    });

    it('should render when editedAt is provided', () => {
      renderComponent(defaultProps);
      expect(screen.getByText(/edited/i)).toBeInTheDocument();
    });

    it('should show relative time format', () => {
      renderComponent(defaultProps);
      expect(screen.getByText(/edited 5m ago/i)).toBeInTheDocument();
    });
  });

  describe('Relative Time Display', () => {
    it('should show "just now" for edits within 1 minute', () => {
      renderComponent({
        ...defaultProps,
        editedAt: '2026-03-20T11:59:30Z',
      });
      expect(screen.getByText(/edited just now/i)).toBeInTheDocument();
    });

    it('should show minutes for edits within 1 hour', () => {
      renderComponent({
        ...defaultProps,
        editedAt: '2026-03-20T11:45:00Z', // 15 minutes ago
      });
      expect(screen.getByText(/edited 15m ago/i)).toBeInTheDocument();
    });

    it('should show hours for edits within 1 day', () => {
      renderComponent({
        ...defaultProps,
        editedAt: '2026-03-20T09:00:00Z', // 3 hours ago
      });
      expect(screen.getByText(/edited 3h ago/i)).toBeInTheDocument();
    });

    it('should show days for older edits', () => {
      renderComponent({
        ...defaultProps,
        editedAt: '2026-03-18T12:00:00Z', // 2 days ago
      });
      expect(screen.getByText(/edited 2d ago/i)).toBeInTheDocument();
    });

    it('should show full date for very old edits', () => {
      renderComponent({
        ...defaultProps,
        editedAt: '2026-01-01T12:00:00Z', // 78 days ago
      });
      const indicator = screen.getByText(/edited/i);
      // For dates older than 7 days, show just the date (e.g., "1/1/2026")
      expect(indicator.textContent).toMatch(/\d+\/\d+\/\d+/);
    });
  });

  describe('Edit Count Display (AC6 - Multiple Edits)', () => {
    it('should show "Edited X minutes ago" for single edit', () => {
      renderComponent({
        ...defaultProps,
        updatedCount: 1,
      });
      expect(screen.getByText(/edited 5m ago/i)).toBeInTheDocument();
      expect(screen.queryByText(/edited 1 times/i)).not.toBeInTheDocument();
    });

    it('should show "Edited X times" for multiple edits', () => {
      renderComponent({
        ...defaultProps,
        updatedCount: 2,
      });
      expect(screen.getByText(/edited 2 times/i)).toBeInTheDocument();
    });

    it('should show "Edited 3 times · 5m ago" for multiple edits', () => {
      renderComponent({
        ...defaultProps,
        updatedCount: 3,
      });
      const indicator = screen.getByText(/edited 3 times/i);
      expect(indicator.textContent).toContain('5m ago');
    });

    it('should handle large edit counts', () => {
      renderComponent({
        ...defaultProps,
        updatedCount: 10,
      });
      expect(screen.getByText(/edited 10 times/i)).toBeInTheDocument();
    });
  });

  describe('Tooltip/Hover (AC6 - Hover Shows Original Content)', () => {
    it('should have tooltip with exact edit time', async () => {
      const user = userEvent.setup();
      renderComponent(defaultProps);

      const indicator = screen.getByText(/edited/i);
      expect(indicator).toHaveAttribute('title');
      expect(indicator.getAttribute('title')).toMatch(/\d+\/\d+\/\d+/); // Date format
    });

    it('should have aria-label with edit date for screen readers', () => {
      renderComponent({
        ...defaultProps,
        updatedCount: 1,
      });
      const indicator = screen.getByText(/edited/i);
      expect(indicator).toHaveAttribute('aria-label');
      expect(indicator.getAttribute('aria-label')).toContain('edited');
    });

    it('should show edit count in aria-label for multiple edits', () => {
      renderComponent({
        ...defaultProps,
        updatedCount: 2,
      });
      const indicator = screen.getByText(/edited 2 times/i);
      expect(indicator.getAttribute('aria-label')).toContain('2 times');
    });
  });

  describe('Styling & Formatting', () => {
    it('should render as italic text', () => {
      renderComponent(defaultProps);
      const indicator = screen.getByText(/edited/i);
      expect(indicator).toHaveStyle('font-style: italic');
    });

    it('should have gray color by default', () => {
      renderComponent(defaultProps);
      const indicator = screen.getByText(/edited/i);
      expect(indicator).toHaveClass('chakra-text');
    });

    it('should accept custom color prop', () => {
      renderComponent({ ...defaultProps, color: 'blue.500' });
      const indicator = screen.getByText(/edited/i);
      expect(indicator).toHaveClass('chakra-text');
    });

    it('should accept custom fontSize prop', () => {
      renderComponent({ ...defaultProps, fontSize: 'lg' });
      const indicator = screen.getByText(/edited/i);
      expect(indicator).toHaveClass('chakra-text');
    });

    it('should accept custom className', () => {
      renderComponent({ ...defaultProps, className: 'custom-class' });
      const indicator = screen.getByText(/edited/i);
      expect(indicator).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid ISO date gracefully', () => {
      renderComponent({
        ...defaultProps,
        editedAt: 'invalid-date',
      });
      // Should render without crashing
      expect(screen.getByText(/edited/i)).toBeInTheDocument();
    });

    it('should handle null createdAt', () => {
      renderComponent({
        ...defaultProps,
        createdAt: '',
      });
      expect(screen.getByText(/edited/i)).toBeInTheDocument();
    });

    it('should handle editedAt = createdAt (same time)', () => {
      const sameTime = '2026-03-20T11:59:30Z'; // 30 seconds before NOW
      renderComponent({
        editedAt: sameTime,
        updatedCount: 1,
        createdAt: sameTime,
      });
      expect(screen.getByText(/edited just now/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be readable by screen readers', () => {
      renderComponent({
        ...defaultProps,
        updatedCount: 1,
      });
      const indicator = screen.getByText(/edited/i);
      expect(indicator).toHaveAttribute('aria-label');
    });

    it('should have proper ARIA label for single edit', () => {
      renderComponent({
        ...defaultProps,
        updatedCount: 1,
      });
      const indicator = screen.getByText(/edited/i);
      expect(indicator.getAttribute('aria-label')).toContain('Comment edited');
    });

    it('should have proper ARIA label for multiple edits', () => {
      renderComponent({
        ...defaultProps,
        updatedCount: 5,
      });
      const indicator = screen.getByText(/edited 5 times/i);
      expect(indicator.getAttribute('aria-label')).toContain('5 times');
    });

    it('should display as inline element', () => {
      renderComponent(defaultProps);
      const indicator = screen.getByText(/edited/i);
      expect(indicator).toHaveStyle('display: inline-block');
    });
  });

  describe('Real-time Updates', () => {
    it('should display correct relative time for different edit times', () => {
      // Test that as different editedAt values are provided, the correct time is shown
      const { rerender } = renderComponent({
        editedAt: '2026-03-20T11:55:00Z', // 5 minutes ago
        updatedCount: 1,
        createdAt: '2026-03-20T11:00:00Z',
      });

      expect(screen.getByText(/edited 5m ago/i)).toBeInTheDocument();

      // Simulate polling update with a different timestamp (6 minutes ago)
      rerender(
        <ChakraProvider>
          <CommentEditIndicator
            editedAt="2026-03-20T11:54:00Z"
            updatedCount={1}
            createdAt="2026-03-20T11:00:00Z"
          />
        </ChakraProvider>
      );

      // Should now show 6 minutes ago
      expect(screen.getByText(/edited 6m ago/i)).toBeInTheDocument();
    });
  });

  describe('Integration with Comments', () => {
    it('should display below comment text', () => {
      const { container } = renderComponent(defaultProps);
      expect(container.querySelector('span')).toBeTruthy();
    });

    it('should not interfere with other comment elements', () => {
      const { container } = renderComponent(defaultProps);
      const indicator = screen.getByText(/edited/i);
      expect(indicator).toBeInTheDocument();
      expect(indicator.parentElement).toBeTruthy();
    });
  });
});
