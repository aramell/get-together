'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverBody,
  Text,
  VStack,
  Badge,
  useDisclosure,
} from '@chakra-ui/react';
import { FiMessageSquare } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { CommentItemType } from '@/lib/validation/commentSchema';
import { ItemCommentSection, ItemComment } from './ItemCommentSection';

export interface ItemCommentPopoverProps {
  // Generic: one popover serves every commentable item type.
  itemId: string;
  itemType: CommentItemType;
  // Human label used in accessible names, e.g. the checklist item title.
  itemLabel?: string;
  fetchCommentsUrl: string;
  addCommentUrl: string;
  // Non-deleted comment count known to the host (badge shows iff > 0).
  commentCount?: number;
  // Real role of the current user in the group; null for non-members/guests.
  userRole?: 'admin' | 'member' | null;
  // Guest (no-login): icon + read-only preview/thread; adding prompts login.
  isGuest?: boolean;
  onRequestLogin?: () => void;
  onCountChange?: (itemId: string, count: number) => void;
}

/**
 * Always-visible comment icon (count badge only when >= 1 comment). Focus or
 * click opens a small preview of the latest comment; "View all" / "Add a
 * comment" opens the full thread in a modal. Escape or an outside click closes
 * the preview (not hover alone, so it is keyboard- and touch-operable).
 */
export const ItemCommentPopover: React.FC<ItemCommentPopoverProps> = ({
  itemId,
  itemType,
  itemLabel,
  fetchCommentsUrl,
  addCommentUrl,
  commentCount = 0,
  userRole = null,
  isGuest = false,
  onRequestLogin,
  onCountChange,
}) => {
  const preview = useDisclosure();
  const modal = useDisclosure();
  const [count, setCount] = useState(commentCount);
  const [latest, setLatest] = useState<ItemComment | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  // When the modal closes, focus returns to the trigger; that must not
  // re-open the preview.
  const suppressFocusOpenRef = useRef(false);

  // Re-sync when the host's count changes (e.g. its 5s poll), without an effect.
  const [prevCommentCount, setPrevCommentCount] = useState(commentCount);
  if (prevCommentCount !== commentCount) {
    setPrevCommentCount(commentCount);
    setCount(commentCount);
  }

  const handleCountChange = useCallback(
    (next: number) => {
      setCount(next);
      onCountChange?.(itemId, next);
    },
    [itemId, onCountChange]
  );

  // Fetch the preview whenever it opens.
  useEffect(() => {
    if (!preview.isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(fetchCommentsUrl);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data.success && Array.isArray(data.data)) {
          setLatest(data.data.length > 0 ? data.data[data.data.length - 1] : null);
          setCount(data.data.length);
        }
      } catch (err) {
        console.error('Error fetching comment preview:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preview.isOpen, fetchCommentsUrl]);

  // Escape and outside-click close the preview.
  useEffect(() => {
    if (!preview.isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        preview.onClose();
        // Focus returns to the trigger; re-focusing must not re-open the
        // preview (only needed if focus actually moves -- no event otherwise).
        if (triggerRef.current && document.activeElement !== triggerRef.current) {
          suppressFocusOpenRef.current = true;
          triggerRef.current.focus();
        }
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || contentRef.current?.contains(target)) return;
      preview.onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview.isOpen]);

  const handleTriggerFocus = () => {
    if (suppressFocusOpenRef.current) {
      suppressFocusOpenRef.current = false;
      return;
    }
    preview.onOpen();
  };

  const handleBlur = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && (triggerRef.current?.contains(next) || contentRef.current?.contains(next))) return;
    // relatedTarget null (e.g. a click on non-focusable area) is handled by
    // the outside-click listener; only close on keyboard-style blur to a
    // different focusable element.
    if (next) preview.onClose();
  };

  const openThread = () => {
    preview.onClose();
    modal.onOpen();
  };

  const closeThread = () => {
    suppressFocusOpenRef.current = true;
    modal.onClose();
  };

  const label = itemLabel ? ` on "${itemLabel}"` : '';
  const ariaLabel =
    count > 0
      ? `Comments${label} (${count})`
      : `Comments${label} (none yet)`;

  return (
    <>
      <Popover
        isOpen={preview.isOpen}
        onClose={preview.onClose}
        isLazy
        autoFocus={false}
        returnFocusOnClose={false}
        closeOnBlur={false}
        closeOnEsc={false}
        placement="bottom-end"
      >
        <PopoverAnchor>
          <Box position="relative" display="inline-block">
            <IconButton
              ref={triggerRef}
              aria-label={ariaLabel}
              aria-haspopup="dialog"
              aria-expanded={preview.isOpen}
              data-testid={`${itemType}-comment-trigger-${itemId}`}
              icon={<FiMessageSquare />}
              size="sm"
              variant="ghost"
              onFocus={handleTriggerFocus}
              onBlur={handleBlur}
              onClick={preview.onOpen}
            />
            {count > 0 && (
              <Badge
                position="absolute"
                top="-1"
                right="-1"
                colorScheme="coral"
                borderRadius="full"
                fontSize="xs"
                data-testid={`${itemType}-comment-count-${itemId}`}
                aria-hidden="true"
              >
                {count}
              </Badge>
            )}
          </Box>
        </PopoverAnchor>
        <PopoverContent ref={contentRef} onBlur={handleBlur} w="xs">
          <PopoverBody>
            <VStack align="stretch" spacing={2}>
              {latest && count > 0 ? (
                <Box>
                  <Text fontSize="sm" fontWeight="bold">
                    {latest.creator?.display_name || latest.creator?.email || 'Anonymous'}
                  </Text>
                  <Text fontSize="sm" noOfLines={3} whiteSpace="pre-wrap">
                    {latest.content}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })}
                  </Text>
                </Box>
              ) : (
                <Text fontSize="sm" color="gray.500">
                  No comments yet.
                </Text>
              )}
              <Button size="sm" variant="outline" onClick={openThread}>
                {count > 0 ? `View all (${count})` : isGuest ? 'View comments' : 'Add a comment'}
              </Button>
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>

      <Modal isOpen={modal.isOpen} onClose={closeThread} size="lg" finalFocusRef={triggerRef}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Comments{itemLabel ? `: ${itemLabel}` : ''}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <ItemCommentSection
              fetchCommentsUrl={fetchCommentsUrl}
              addCommentUrl={addCommentUrl}
              userRole={userRole}
              readOnly={isGuest}
              onRequestLogin={onRequestLogin}
              onCountChange={handleCountChange}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ItemCommentPopover;
