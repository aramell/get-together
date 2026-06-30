'use client';

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  HStack,
  Spinner,
} from '@chakra-ui/react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title?: string;
  message?: string;
}

/**
 * DeleteConfirmationDialog Component
 * Confirmation modal for deleting comments
 * Displays warning message and requires explicit confirmation
 * Delete button is red (destructive) to indicate permanence
 * Supports Escape key to cancel
 */
export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = 'Delete Comment',
  message = 'Are you sure? This cannot be undone.',
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent onKeyDown={handleKeyDown}>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <Text fontSize="sm" color="gray.700">
            {message}
          </Text>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            <Button
              variant="ghost"
              onClick={onClose}
              isDisabled={isLoading}
              aria-label="Cancel deletion"
            >
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleConfirm}
              isDisabled={isLoading}
              isLoading={isLoading}
              loadingText="Deleting..."
              aria-label="Confirm delete"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" mr={2} />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DeleteConfirmationDialog;
