'use client';

import React, { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  Text,
  VStack,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';

interface Member {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'member';
}

interface RemoveMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  isRemoving?: boolean;
  onConfirm: () => void;
}

/**
 * RemoveMemberDialog Component
 * Confirmation dialog before removing a member from group
 */
const RemoveMemberDialog: React.FC<RemoveMemberDialogProps> = ({
  isOpen,
  onClose,
  member,
  isRemoving = false,
  onConfirm,
}) => {
  const cancelRef = useRef(null);

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Remove Member
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} align="stretch">
              <Text>
                Are you sure you want to remove <strong>{member.username}</strong> from
                this group?
              </Text>

              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <VStack align="flex-start" spacing={1}>
                  <Text fontSize="sm" fontWeight="semibold">
                    This action cannot be undone
                  </Text>
                  <Text fontSize="sm">
                    {member.username} will lose access to the group and all its
                    content. They can rejoin if invited again.
                  </Text>
                </VStack>
              </Alert>

              <Text fontSize="sm" color="gray.600">
                Email: {member.email}
              </Text>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose} isDisabled={isRemoving}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={onConfirm}
              ml={3}
              isLoading={isRemoving}
              loadingText="Removing..."
            >
              Remove Member
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default RemoveMemberDialog;
