'use client';

import { IconButton } from '@chakra-ui/react';
import { EditIcon } from '@chakra-ui/icons';
import { memo } from 'react';

interface CommentEditButtonProps {
  /**
   * Whether the button should be visible
   * Show only if user is comment author or group admin
   */
  isVisible: boolean;

  /**
   * Callback when edit button is clicked
   */
  onClick: () => void;

  /**
   * Optional custom aria-label for accessibility
   */
  ariaLabel?: string;

  /**
   * Optional CSS class for styling
   */
  className?: string;

  /**
   * Optional size prop
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';

  /**
   * Optional loading state
   */
  isLoading?: boolean;

  /**
   * Optional disabled state
   */
  isDisabled?: boolean;
}

/**
 * CommentEditButton Component (Story 6.4 Task 2.1)
 * Displays an edit button on comments authored by the current user or for group admins
 *
 * Accessibility:
 * - Keyboard accessible (Tab, Enter/Space to activate)
 * - Touch-friendly (48px+ minimum target)
 * - ARIA labels for screen readers
 * - Focus indicators
 *
 * Visibility:
 * - Only shows when isVisible prop is true
 * - Hidden for comments authored by other users (unless user is admin)
 */
export const CommentEditButton = memo(function CommentEditButton({
  isVisible,
  onClick,
  ariaLabel = 'Edit comment',
  className,
  size = 'sm',
  isLoading = false,
  isDisabled = false,
}: CommentEditButtonProps) {
  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <IconButton
      size={size}
      variant="ghost"
      icon={<EditIcon />}
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
      minHeight="48px"
      minWidth="48px"
      _focus={{
        outline: '2px solid',
        outlineColor: 'blue.500',
        outlineOffset: '2px',
      }}
      isLoading={isLoading}
      isDisabled={isDisabled}
      title="Edit this comment"
    />
  );
});

CommentEditButton.displayName = 'CommentEditButton';
