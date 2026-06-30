'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Box,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { memo } from 'react';

interface CommentEditModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback to close the modal
   */
  onClose: () => void;

  /**
   * Initial comment content to populate the textarea
   */
  initialContent: string;

  /**
   * Callback when save is clicked with new content
   * Should handle API call and error handling
   */
  onSave: (newContent: string) => Promise<void>;

  /**
   * Optional comment ID for accessibility/tracking
   */
  commentId?: string;

  /**
   * Optional title for the modal
   */
  modalTitle?: string;
}

const MAX_CONTENT_LENGTH = 2000;

/**
 * CommentEditModal Component (Story 6.4 Task 2.2)
 * Modal for editing comment content with validation and real-time feedback
 *
 * Features:
 * - Pre-filled textarea with current comment
 * - Character count display (X / 2000)
 * - Real-time validation with error messages
 * - Save & Cancel buttons
 * - Loading state during submission
 * - Keyboard support (Escape to close, Enter to save)
 * - WCAG 2.1 AA accessibility
 *
 * Validation:
 * - Content required (non-empty after trimming)
 * - Max 2000 characters
 * - Real-time feedback as user types
 */
export const CommentEditModal = memo(function CommentEditModal({
  isOpen,
  onClose,
  initialContent,
  onSave,
  commentId,
  modalTitle = 'Edit Comment',
}: CommentEditModalProps) {
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setError('');
      // Focus textarea after modal opens
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [isOpen, initialContent]);

  // Validate content in real-time
  const validateContent = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return 'Comment cannot be empty';
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      return `Comment exceeds ${MAX_CONTENT_LENGTH} character limit`;
    }
    return '';
  }, []);

  // Handle content change
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      // Real-time validation
      const validationError = validateContent(newContent);
      setError(validationError);
    },
    [validateContent]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    const trimmed = content.trim();
    const validationError = validateContent(trimmed);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSave(trimmed);
      toast({
        title: 'Success',
        description: 'Comment edited successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to edit comment';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [content, validateContent, onSave, onClose, toast]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      // Ctrl/Cmd + Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    },
    [onClose, handleSave]
  );

  const isSaveDisabled = !content.trim() || validateContent(content) !== '';
  const charCount = content.length;
  const isNearLimit = charCount > MAX_CONTENT_LENGTH * 0.9;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent maxW={{ base: '95%', md: '90%' }} mx="auto">
        <ModalHeader>{modalTitle}</ModalHeader>

        <ModalBody>
          <FormControl isInvalid={!!error}>
            <FormLabel htmlFor="comment-content">Comment</FormLabel>
            <Textarea
              id="comment-content"
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Edit your comment..."
              rows={6}
              minHeight="150px"
              isDisabled={isLoading}
              aria-label="Edit comment content"
              aria-describedby={error ? 'comment-error' : 'char-count'}
            />
            {error && <FormErrorMessage id="comment-error">{error}</FormErrorMessage>}
          </FormControl>

          {/* Character count display */}
          <Box mt={2} display="flex" justifyContent="flex-end" alignItems="center" gap={2}>
            <Text
              fontSize="sm"
              id="char-count"
              color={isNearLimit ? 'orange.500' : 'gray.500'}
              fontWeight={isNearLimit ? 'bold' : 'normal'}
              aria-live="polite"
              aria-label={`${charCount} characters, limit is ${MAX_CONTENT_LENGTH}`}
            >
              {charCount} / {MAX_CONTENT_LENGTH}
            </Text>
          </Box>

          {/* Keyboard hint */}
          <Text fontSize="xs" color="gray.500" mt={3}>
            Press <kbd>Ctrl+Enter</kbd> to save, <kbd>Esc</kbd> to cancel
          </Text>
        </ModalBody>

        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSave}
            isLoading={isLoading}
            isDisabled={isSaveDisabled}
            loadingText="Saving..."
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});

CommentEditModal.displayName = 'CommentEditModal';
