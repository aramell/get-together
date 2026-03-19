'use client';

import { Box, VStack, HStack, Avatar, Text, Link, Spinner } from '@chakra-ui/react';
import { formatDistanceToNow } from 'date-fns';
import NextLink from 'next/link';

interface Comment {
  id: string;
  created_by: string;
  content: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
  target_id: string;
  target_type: 'event' | 'wishlist';
  target_name: string;
}

interface CommentListProps {
  comments: Comment[];
  isLoading?: boolean;
  onCommentClick?: (commentId: string) => void;
  groupId: string;
}

/**
 * CommentList: Displays paginated list of comments with author info and target links
 * Shows: author avatar, name, timestamp, target (event/item), comment text
 */
export function CommentList({
  comments,
  isLoading = false,
  onCommentClick,
  groupId,
}: CommentListProps) {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <Spinner size="lg" color="blue.500" />
      </Box>
    );
  }

  if (comments.length === 0) {
    return (
      <Box
        bg="gray.50"
        rounded="md"
        p={8}
        textAlign="center"
        className="text-gray-600"
      >
        <Text fontSize="sm">No comments match your filters. Try adjusting your search or filters.</Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      {comments.map((comment) => {
        const targetLink =
          comment.target_type === 'event'
            ? `/groups/${groupId}/events/${comment.target_id}`
            : `/groups/${groupId}/wishlist/${comment.target_id}`;

        return (
          <Box
            key={comment.id}
            borderWidth="1px"
            borderColor="gray.200"
            rounded="md"
            p={4}
            _hover={{ bg: 'gray.50' }}
            onClick={() => onCommentClick?.(comment.id)}
            role="article"
            aria-label={`Comment by ${comment.display_name || 'Unknown'}`}
          >
            {/* Comment Header: Author Info & Target Link */}
            <HStack justify="space-between" mb={3} wrap="wrap">
              <HStack spacing={3}>
                {/* Author Avatar & Name */}
                <Avatar
                  name={comment.display_name || 'Unknown'}
                  src={comment.avatar_url || undefined}
                  size="sm"
                />
                <Box>
                  <Text fontWeight="600" fontSize="sm" className="text-gray-900">
                    {comment.display_name || 'Unknown Author'}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    <time dateTime={comment.created_at}>
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </time>
                  </Text>
                </Box>
              </HStack>

              {/* Target Link */}
              <Link
                as={NextLink}
                href={targetLink}
                fontSize="xs"
                color="blue.600"
                _hover={{ textDecoration: 'underline' }}
                aria-label={`View ${comment.target_type} "${comment.target_name}"`}
              >
                📍 {comment.target_name}
                {comment.target_type === 'event' ? ' (Event)' : ' (Wishlist)'}
              </Link>
            </HStack>

            {/* Comment Content */}
            <Box className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {comment.content}
            </Box>
          </Box>
        );
      })}
    </VStack>
  );
}
