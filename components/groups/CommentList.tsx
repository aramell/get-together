'use client';

import { Box, VStack, HStack, Avatar, Text, Link, Spinner, useDisclosure } from '@chakra-ui/react';
import { formatDistanceToNow } from 'date-fns';
import NextLink from 'next/link';
import { useState } from 'react';
import { CommentEditButton } from './CommentEditButton';
import { CommentEditModal } from './CommentEditModal';
import { CommentEditIndicator } from './CommentEditIndicator';

interface Comment {
  id: string;
  created_by: string;
  content: string;
  created_at: string;
  edited_at?: string | null;
  updated_count?: number;
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
  onCommentUpdate?: (commentId: string, newContent: string) => Promise<void>;
  groupId: string;
  currentUserId?: string;
  userRole?: 'admin' | 'member';
}

/**
 * CommentList: Displays paginated list of comments with author info and target links
 * Shows: author avatar, name, timestamp, target (event/item), comment text
 * Supports: Edit comments (for author or admin), edit indicators
 */
export function CommentList({
  comments,
  isLoading = false,
  onCommentClick,
  onCommentUpdate,
  groupId,
  currentUserId,
  userRole,
}: CommentListProps) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
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
    <>
      <VStack align="stretch" spacing={4}>
        {comments.map((comment) => {
          const targetLink =
            comment.target_type === 'event'
              ? `/groups/${groupId}/events/${comment.target_id}`
              : `/groups/${groupId}/wishlist/${comment.target_id}`;

          const isAuthor = comment.created_by === currentUserId;
          const canEdit = isAuthor || userRole === 'admin';

          const handleEditClick = () => {
            setEditingCommentId(comment.id);
            setEditingCommentContent(comment.content);
            onEditModalOpen();
          };

          const handleEditSave = async (newContent: string) => {
            if (!onCommentUpdate) return;
            setIsEditingSaving(true);
            try {
              await onCommentUpdate(comment.id, newContent);
              onEditModalClose();
            } finally {
              setIsEditingSaving(false);
            }
          };

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
              {/* Comment Header: Author Info, Target Link, & Edit Button */}
              <HStack justify="space-between" mb={3} wrap="wrap">
                <HStack spacing={3}>
                  {/* Author Avatar & Name */}
                  <Avatar
                    name={comment.display_name || 'Unknown'}
                    src={comment.avatar_url || undefined}
                    size="sm"
                  />
                  <Box flex={1}>
                    <Text fontWeight="600" fontSize="sm" className="text-gray-900">
                      {comment.display_name || 'Unknown Author'}
                    </Text>
                    <HStack spacing={2} fontSize="xs" color="gray.500">
                      <time dateTime={comment.created_at}>
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </time>
                      {comment.edited_at && (
                        <CommentEditIndicator
                          editedAt={comment.edited_at}
                          updatedCount={comment.updated_count || 0}
                          createdAt={comment.created_at}
                          fontSize="xs"
                        />
                      )}
                    </HStack>
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

                {/* Edit Button */}
                <CommentEditButton
                  isVisible={canEdit}
                  onClick={handleEditClick}
                  ariaLabel="Edit this comment"
                />
              </HStack>

              {/* Comment Content */}
              <Box className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {comment.content}
              </Box>
            </Box>
          );
        })}
      </VStack>

      {/* Edit Modal */}
      {editingCommentId && (
        <CommentEditModal
          isOpen={isEditModalOpen}
          onClose={onEditModalClose}
          initialContent={editingCommentContent}
          onSave={handleEditSave}
          commentId={editingCommentId}
        />
      )}
    </>
  );
}
