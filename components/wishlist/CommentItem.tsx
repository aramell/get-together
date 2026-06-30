'use client';

import { Avatar, Box, Text } from '@chakra-ui/react';
import { formatDistanceToNow } from 'date-fns';

interface CommentItemProps {
  id: string;
  content: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  createdAt: string;
}

/**
 * CommentItem: Display a single comment with author info and timestamp
 * - Author name, avatar, relative timestamp
 * - Comment text in readable format
 * - Accessibility: aria-label, semantic HTML
 * - Responsive design (mobile/desktop)
 */
export function CommentItem({
  id,
  content,
  authorName,
  authorAvatar,
  createdAt,
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
          {/* Author and timestamp */}
          <div className="flex items-baseline gap-2 mb-1">
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
          </div>

          {/* Comment text */}
          <Text className="text-sm text-gray-800 break-words whitespace-pre-wrap">
            {content}
          </Text>
        </Box>
      </Box>
    </article>
  );
}
