'use client';

import { Text, Tooltip, Box } from '@chakra-ui/react';
import { memo, useMemo } from 'react';

interface CommentEditIndicatorProps {
  /**
   * ISO 8601 timestamp when the comment was last edited
   * If null, comment has not been edited
   */
  editedAt: string | null;

  /**
   * Number of times the comment has been edited
   */
  updatedCount: number;

  /**
   * ISO 8601 timestamp when the comment was created
   * Used to calculate relative time
   */
  createdAt: string;

  /**
   * Optional CSS class for styling
   */
  className?: string;

  /**
   * Optional color override
   */
  color?: string;

  /**
   * Optional font size override
   */
  fontSize?: string;
}

/**
 * Calculate relative time string (e.g., "2 minutes ago")
 */
function getRelativeTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ago`;
    }
    if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours}h ago`;
    }
    if (seconds < 604800) {
      const days = Math.floor(seconds / 86400);
      return `${days}d ago`;
    }

    return date.toLocaleDateString();
  } catch {
    return isoDate;
  }
}

/**
 * CommentEditIndicator Component (Story 6.4 Task 2.3)
 * Displays "Edited X minutes ago" indicator on edited comments
 *
 * Features:
 * - Shows edit timestamp as relative time ("2 minutes ago")
 * - Shows edit count for multiple edits ("Edited 3 times")
 * - Tooltip on hover showing exact edit time
 * - Only renders if comment has been edited (editedAt is not null)
 * - Accessibility: ARIA labels for screen readers
 *
 * Display Format:
 * - Single edit: "Edited 5m ago"
 * - Multiple edits: "Edited 3 times · 5m ago"
 */
export const CommentEditIndicator = memo(function CommentEditIndicator({
  editedAt,
  updatedCount,
  createdAt,
  className,
  color = 'gray.500',
  fontSize = 'sm',
}: CommentEditIndicatorProps) {
  // Don't render if comment hasn't been edited
  if (!editedAt) {
    return null;
  }

  const relativeTime = getRelativeTime(editedAt);

  const editedAtDate = useMemo(() => {
    try {
      return new Date(editedAt).toLocaleString();
    } catch {
      return editedAt;
    }
  }, [editedAt]);

  // Build display text
  const displayText =
    updatedCount > 1
      ? `Edited ${updatedCount} times · ${relativeTime}`
      : `Edited ${relativeTime}`;

  const ariaLabel = useMemo(() => {
    if (updatedCount > 1) {
      return `Comment edited ${updatedCount} times, last edited on ${editedAtDate}`;
    }
    return `Comment edited on ${editedAtDate}`;
  }, [updatedCount, editedAtDate]);

  return (
    <Tooltip label={editedAtDate} placement="top" hasArrow>
      <Text
        fontSize={fontSize}
        color={color}
        fontStyle="italic"
        className={className}
        aria-label={ariaLabel}
        title={editedAtDate}
        display="inline-block"
      >
        {displayText}
      </Text>
    </Tooltip>
  );
});

CommentEditIndicator.displayName = 'CommentEditIndicator';
