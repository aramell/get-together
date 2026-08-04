'use client';

import { Avatar, Box, HStack, Text } from '@chakra-ui/react';
import { formatDistanceToNow } from 'date-fns';
import { CommentEditButton } from '@/components/groups/CommentEditButton';
import { CommentDeleteButton } from '@/components/groups/CommentDeleteButton';
import { CommentEditIndicator } from '@/components/groups/CommentEditIndicator';

interface CommentItemProps {
  id: string;
  content: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  createdAt: string;
  editedAt?: string | null;
  updatedCount?: number;
  canModify?: boolean;
  isDeleting?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * CommentItem: Display a single comment with author info and timestamp
 * - Author name, avatar, relative timestamp
 * - Comment text in readable format
 * - Edit/Delete controls, gated on canModify (comment author or group admin)
 * - Accessibility: aria-label, semantic HTML
 * - Responsive design (mobile/desktop)
 */
export function CommentItem({
  id,
  content,
  authorName,
  authorAvatar,
  createdAt,
  editedAt = null,
  updatedCount = 0,
  canModify = false,
  isDeleting = false,
  onEdit,
  onDelete,
}: CommentItemProps) {
  // Parse and format timestamp
  const date = new Date(createdAt);
  const relativeTime = formatDistanceToNow(date, { addSuffix: true });

  return (
    <article
      key={id}
      className="border-l-2 border-gray-200 pl-3 py-3"
      aria-label={`Comment by ${authorName || 'Unknown'}`}
    >
      <Box display="flex" gap={3} alignItems="flex-start">
        {/* Avatar */}
        <Avatar
          name={authorName || 'U'}
          src={authorAvatar || undefined}
          size="sm"
          flexShrink={0}
        />

        {/* Comment content */}
        <Box flex="1" minW={0}>
          {/* Author, timestamp, and edit/delete controls */}
          <HStack justify="space-between" mb={1}>
            <div className="flex items-baseline gap-2">
              <Text
                as="span"
                fontWeight="600"
                fontSize="sm"
                className="text-gray-900"
              >
                {authorName || 'Unknown'}
              </Text>
              <time
                dateTime={createdAt}
                className="text-xs text-gray-500"
                aria-label={`Posted ${relativeTime}`}
              >
                {relativeTime}
              </time>
              <CommentEditIndicator editedAt={editedAt} updatedCount={updatedCount} createdAt={createdAt} />
            </div>
            <HStack spacing={1}>
              <CommentEditButton isVisible={canModify} onClick={() => onEdit?.()} />
              <CommentDeleteButton
                isVisible={canModify}
                onClick={() => onDelete?.()}
                isDisabled={isDeleting}
              />
            </HStack>
          </HStack>

          {/* Comment text */}
          <Text className="text-sm text-gray-800 break-words whitespace-pre-wrap">
            {content}
          </Text>
        </Box>
      </Box>
    </article>
  );
}
