'use client';

import { useEffect, useState } from 'react';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';

interface Comment {
  id: string;
  content: string;
  created_by: string;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

interface CommentSectionProps {
  groupId: string;
  itemId: string;
}

/**
 * CommentSection: Main container for wishlist item comments
 * - Display comment count
 * - List all comments in chronological order (oldest first)
 * - Provide form to post new comments
 * - Real-time polling: fetch comments every 5 seconds
 * - Loading and empty states
 * - Error handling
 */
export function CommentSection({ groupId, itemId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch comments from API
  const fetchComments = async () => {
    try {
      const response = await fetch(
        `/api/groups/${groupId}/wishlist/${itemId}/comments?limit=50&offset=0`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch comments (${response.status})`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setComments(data.data.comments || []);
        setTotalCount(data.data.totalCount || 0);
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to fetch comments');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch comments';
      setError(message);
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchComments();
  }, [groupId, itemId, fetchComments]);

  // Real-time polling: refetch every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchComments();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  // Handle comment posted event
  const handleCommentPosted = () => {
    // Immediately refetch to get the new comment
    fetchComments();
  };

  return (
    <Box as="section" className="mt-8 pt-6 border-t border-gray-200">
      {/* Section header with comment count */}
      <Text
        as="h3"
        fontSize="lg"
        fontWeight="600"
        className="text-gray-900 mb-4"
        aria-live="polite"
      >
        Comments ({totalCount})
      </Text>

      {/* Comment form */}
      <CommentForm
        groupId={groupId}
        itemId={itemId}
        onCommentPosted={handleCommentPosted}
      />

      {/* Loading state */}
      {isLoading && !comments.length && (
        <Box display="flex" justifyContent="center" py={8}>
          <Spinner />
        </Box>
      )}

      {/* Error state */}
      {error && !comments.length && (
        <Box
          bg="red.50"
          border="1px solid"
          borderColor="red.200"
          rounded="md"
          p={4}
          className="text-red-800"
        >
          <Text className="text-sm">{error}</Text>
        </Box>
      )}

      {/* Empty state */}
      {!isLoading && !error && comments.length === 0 && (
        <Box
          bg="gray.50"
          rounded="md"
          p={6}
          textAlign="center"
          className="text-gray-600"
        >
          <Text className="text-sm">No comments yet. Be the first to comment!</Text>
        </Box>
      )}

      {/* Comments list */}
      {comments.length > 0 && (
        <VStack align="stretch" spacing={4}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              id={comment.id}
              content={comment.content}
              authorName={comment.display_name}
              authorAvatar={comment.avatar_url}
              createdAt={comment.created_at}
            />
          ))}
        </VStack>
      )}
    </Box>
  );
}
