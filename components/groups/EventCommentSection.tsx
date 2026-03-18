'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
  HStack,
  Textarea,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  creator?: {
    display_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface EventCommentSectionProps {
  eventId: string;
  groupId: string;
  initialComments?: Comment[];
}

/**
 * EventCommentSection Component
 * Displays comments on an event with real-time polling support
 * Allows authenticated group members to add comments
 */
export const EventCommentSection: React.FC<EventCommentSectionProps> = ({
  eventId,
  groupId,
  initialComments = [],
}) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { authToken } = useAuth();
  const toastManager = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch comments from API
  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/comments`);

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setComments(data.data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
      // Don't show toast for polling errors
    }
  };

  // Set up polling interval on mount
  useEffect(() => {
    // Initial fetch
    fetchComments();

    // Set up polling (5-second interval)
    pollingIntervalRef.current = setInterval(() => {
      fetchComments();
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [eventId, groupId]);

  // Handle comment submission
  const handlePostComment = async () => {
    if (!newCommentContent.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    if (newCommentContent.length > 2000) {
      setError('Comment must be 2000 characters or less');
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content: newCommentContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post comment');
      }

      // Optimistic update: add comment immediately
      if (data.success && data.data) {
        setComments((prev) => [...prev, data.data]);
        setNewCommentContent('');
        toastManager({ title: 'Comment posted', status: 'success', duration: 2000, isClosable: true });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to post comment';
      setError(errorMessage);
      toastManager({ title: 'Error', description: errorMessage, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Box borderTop="1px solid" borderColor="gray.200" pt={6} mt={6}>
      {/* Comment Header */}
      <Text fontWeight="bold" fontSize="lg" mb={4}>
        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
      </Text>

      {/* Comments List */}
      {comments.length > 0 ? (
        <VStack spacing={4} mb={6} align="stretch">
          {comments.map((comment) => (
            <Box key={comment.id} borderBottom="1px solid" borderColor="gray.100" pb={3}>
              {/* Comment Header */}
              <HStack mb={2}>
                <Text fontWeight="bold" fontSize="sm">
                  {comment.creator?.display_name || comment.creator?.email || 'Anonymous'}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </Text>
              </HStack>
              {/* Comment Content */}
              <Text fontSize="sm" whiteSpace="pre-wrap">
                {comment.content}
              </Text>
            </Box>
          ))}
        </VStack>
      ) : (
        <Text color="gray.500" mb={6}>
          No comments yet. Be the first to comment!
        </Text>
      )}

      {/* Comment Input Form */}
      <VStack spacing={3} align="stretch" borderTop="1px solid" borderColor="gray.200" pt={4}>
        <FormControl>
          <FormLabel htmlFor="comment-input" fontSize="sm">
            Add a comment...
          </FormLabel>
          <Textarea
            id="comment-input"
            placeholder="Share your thoughts..."
            value={newCommentContent}
            onChange={(e) => {
              setNewCommentContent(e.target.value);
              setError(null);
            }}
            disabled={isPosting || !authToken}
            rows={3}
            maxLength={2000}
            aria-label="Comment input"
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            {newCommentContent.length}/2000 characters
          </Text>
        </FormControl>

        {/* Error Message */}
        {error && (
          <Box bg="red.50" borderLeft="4px" borderColor="red.500" p={2} borderRadius="sm">
            <Text color="red.700" fontSize="sm" aria-live="polite">
              {error}
            </Text>
          </Box>
        )}

        {/* Submit Button */}
        <HStack justify="flex-end" spacing={2}>
          <Button
            onClick={handlePostComment}
            isDisabled={isPosting || !authToken || !newCommentContent.trim()}
            isLoading={isPosting}
            loadingText="Posting..."
            colorScheme="blue"
            size="sm"
          >
            Post Comment
          </Button>
        </HStack>
      </VStack>

      {/* Loading Indicator during initial fetch */}
      {isLoading && (
        <HStack justify="center" py={4}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.500">
            Loading comments...
          </Text>
        </HStack>
      )}
    </Box>
  );
};

export default EventCommentSection;
