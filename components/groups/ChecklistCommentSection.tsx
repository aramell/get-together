'use client';

import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Text,
  VStack,
  HStack,
  Textarea,
  Spinner,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { CommentEditButton } from './CommentEditButton';
import { CommentEditModal } from './CommentEditModal';
import { CommentDeleteButton } from './CommentDeleteButton';
import { CommentEditIndicator } from './CommentEditIndicator';

export interface ItemComment {
  id: string;
  content: string;
  created_by?: string;
  created_at: string;
  edited_at?: string | null;
  updated_count?: number;
  creator?: {
    display_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
}

export interface ChecklistCommentSectionProps {
  // GET (list) URL. Guests pass the public-token-gated URL.
  fetchCommentsUrl: string;
  // POST URL; also the base for PATCH/DELETE (`${addCommentUrl}/${commentId}`).
  addCommentUrl: string;
  // Real role of the current user in the group (from group membership).
  userRole?: 'admin' | 'member' | null;
  // Guest (no-login) read-only mode: no input/edit/delete; adding prompts login.
  readOnly?: boolean;
  onRequestLogin?: () => void;
  // Reports the current non-deleted comment count to the host (badge sync).
  onCountChange?: (count: number) => void;
  initialComments?: ItemComment[];
}

/**
 * Full read/write comment thread for one item, with 5s polling (Story 13.2
 * pattern). Mirrors EventCommentSection; URLs are props so the same component
 * serves Logistics/Timeline/Poll comments in Stories 13.8-13.10.
 */
export const ChecklistCommentSection: React.FC<ChecklistCommentSectionProps> = ({
  fetchCommentsUrl,
  addCommentUrl,
  userRole = null,
  readOnly = false,
  onRequestLogin,
  onCountChange,
  initialComments = [],
}) => {
  const [comments, setComments] = useState<ItemComment[]>(initialComments);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(initialComments.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<ItemComment | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { userId, accessToken } = useAuth();
  const toast = useToast();
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);
  const inputId = useId();
  const isAdmin = userRole === 'admin';

  const authHeaders = useCallback(
    (extra?: Record<string, string>): Record<string, string> => ({
      Authorization: `Bearer ${accessToken}`,
      ...extra,
    }),
    [accessToken]
  );

  // Report the live count to the host (badge sync) once real data has loaded.
  // Done in an effect, not inside state updaters, so the parent's setState
  // never runs during this component's render.
  const hasLoadedRef = useRef(initialComments.length > 0);
  useEffect(() => {
    if (hasLoadedRef.current) onCountChange?.(comments.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments.length]);

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(fetchCommentsUrl);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        hasLoadedRef.current = true;
        setComments(data.data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
      // Don't toast for polling errors
    } finally {
      setIsLoading(false);
    }
  }, [fetchCommentsUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch syncs with the server
    fetchComments();
    const interval = setInterval(fetchComments, 5000);
    return () => clearInterval(interval);
  }, [fetchComments]);

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
      const response = await fetch(addCommentUrl, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content: newCommentContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to post comment');

      if (data.success && data.data) {
        hasLoadedRef.current = true;
        setComments((prev) => [...prev, data.data]);
        setNewCommentContent('');
        toast({ title: 'Comment posted', status: 'success', duration: 2000, isClosable: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to post comment';
      setError(message);
      toast({ title: 'Error', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setIsPosting(false);
    }
  };

  const handleSaveEdit = async (newContent: string) => {
    if (!editingComment) return;
    const response = await fetch(`${addCommentUrl}/${editingComment.id}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ content: newContent }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to edit comment');

    setComments((prev) =>
      prev.map((c) =>
        c.id === editingComment.id
          ? { ...c, content: data.data.content, edited_at: data.data.edited_at, updated_count: data.data.updated_count }
          : c
      )
    );
    setEditingComment(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
    try {
      const response = await fetch(`${addCommentUrl}/${commentId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to delete comment');

      hasLoadedRef.current = true;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast({ title: 'Comment deleted', status: 'success', duration: 2000, isClosable: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete comment';
      toast({ title: 'Error', description: message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <Box>
      <Heading as="h3" fontSize="md" fontWeight="bold" mb={4}>
        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
      </Heading>

      {isLoading && comments.length === 0 ? (
        <HStack justify="center" py={4}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.500">
            Loading comments...
          </Text>
        </HStack>
      ) : comments.length > 0 ? (
        <VStack spacing={4} mb={6} align="stretch">
          {comments.map((comment) => {
            const canModify =
              !readOnly && (isAdmin || (!!userId && !!comment.created_by && comment.created_by === userId));
            return (
              <Box key={comment.id} borderBottom="1px solid" borderColor="gray.100" pb={3}>
                <HStack mb={2} justify="space-between">
                  <HStack>
                    <Text fontWeight="bold" fontSize="sm">
                      {comment.creator?.display_name || comment.creator?.email || 'Anonymous'}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </Text>
                    <CommentEditIndicator
                      editedAt={comment.edited_at ?? null}
                      updatedCount={comment.updated_count ?? 0}
                      createdAt={comment.created_at}
                    />
                  </HStack>
                  <HStack spacing={1}>
                    <CommentEditButton isVisible={canModify} onClick={() => setEditingComment(comment)} />
                    <CommentDeleteButton
                      isVisible={canModify}
                      onClick={() => setPendingDeleteId(comment.id)}
                      isDisabled={deletingCommentId === comment.id}
                    />
                  </HStack>
                </HStack>
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {comment.content}
                </Text>
              </Box>
            );
          })}
        </VStack>
      ) : (
        <Text color="gray.500" mb={6}>
          No comments yet. Be the first to comment!
        </Text>
      )}

      {readOnly ? (
        <HStack justify="flex-end" borderTop="1px solid" borderColor="gray.200" pt={4}>
          <Button size="sm" colorScheme="blue" onClick={() => onRequestLogin?.()}>
            Log in to comment
          </Button>
        </HStack>
      ) : (
        <VStack spacing={3} align="stretch" borderTop="1px solid" borderColor="gray.200" pt={4}>
          <FormControl>
            <FormLabel htmlFor={inputId} fontSize="sm">
              Add a comment...
            </FormLabel>
            <Textarea
              id={inputId}
              placeholder="Share your thoughts..."
              value={newCommentContent}
              onChange={(e) => {
                setNewCommentContent(e.target.value);
                setError(null);
              }}
              disabled={isPosting || !userId}
              rows={3}
              maxLength={2000}
              aria-label="Comment input"
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              {newCommentContent.length}/2000 characters
            </Text>
          </FormControl>

          {error && (
            <Box bg="red.50" borderLeft="4px" borderColor="red.500" p={2} borderRadius="sm">
              <Text color="red.700" fontSize="sm" aria-live="polite">
                {error}
              </Text>
            </Box>
          )}

          <HStack justify="flex-end" spacing={2}>
            <Button
              onClick={handlePostComment}
              isDisabled={isPosting || !userId || !newCommentContent.trim()}
              isLoading={isPosting}
              loadingText="Posting..."
              colorScheme="blue"
              size="sm"
            >
              Post Comment
            </Button>
          </HStack>
        </VStack>
      )}

      <CommentEditModal
        isOpen={editingComment !== null}
        onClose={() => setEditingComment(null)}
        initialContent={editingComment?.content ?? ''}
        onSave={handleSaveEdit}
        commentId={editingComment?.id}
      />

      <AlertDialog
        isOpen={pendingDeleteId !== null}
        leastDestructiveRef={cancelDeleteRef}
        onClose={() => setPendingDeleteId(null)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Comment
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this comment? This cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelDeleteRef} onClick={() => setPendingDeleteId(null)}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  if (pendingDeleteId) handleDeleteComment(pendingDeleteId);
                  setPendingDeleteId(null);
                }}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default ChecklistCommentSection;
