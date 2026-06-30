'use client';

import React from 'react';
import { IconButton, Icon } from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';

interface CommentDeleteButtonProps {
  isVisible: boolean;
  onClick: () => void;
  ariaLabel?: string;
  isDisabled?: boolean;
}

/**
 * CommentDeleteButton Component
 * Displays a delete button on comments that the current user authored or can admin-delete
 * Only shows for authorized users (comment author or group admin)
 * Keyboard accessible and 48px+ touch target (via Chakra UI IconButton)
 */
export const CommentDeleteButton: React.FC<CommentDeleteButtonProps> = ({
  isVisible,
  onClick,
  ariaLabel = 'Delete this comment',
  isDisabled = false,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <IconButton
      aria-label={ariaLabel}
      icon={<DeleteIcon />}
      onClick={onClick}
      variant="ghost"
      colorScheme="red"
      size="sm"
      isDisabled={isDisabled}
      _hover={{ bg: 'red.50' }}
    />
  );
};

export default CommentDeleteButton;
