'use client';

import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  useDisclosure,
  useToast,
  Spinner,
  Box,
} from '@chakra-ui/react';
import { revokeInvitation } from '@/lib/services/groupService';
import { useRef } from 'react';

interface Invitation {
  id: string;
  invitedUser?: {
    id: string;
    email: string;
    username: string;
  };
  invitedAt: string;
  expiresAt: string;
}

interface PendingInvitationsListProps {
  invitations: Invitation[];
  loading?: boolean;
  onInvitationRevoked?: () => void;
}

/**
 * PendingInvitationsList Component
 * Displays list of pending invitations for a group
 */
const PendingInvitationsList: React.FC<PendingInvitationsListProps> = ({
  invitations,
  loading = false,
  onInvitationRevoked,
}) => {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef(null);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [revoking, setRevoking] = useState(false);

  const handleRevokeClick = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    onOpen();
  };

  const handleConfirmRevoke = async () => {
    if (!selectedInvitation) return;

    setRevoking(true);
    try {
      const result = await revokeInvitation(selectedInvitation.id);
      if (result.success) {
        toast({
          title: 'Invitation revoked',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        onInvitationRevoked?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to revoke invitation',
          status: 'error',
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke invitation',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
      console.error('Revoke error:', error);
    } finally {
      setRevoking(false);
      onClose();
      setSelectedInvitation(null);
    }
  };

  if (loading) {
    return (
      <VStack justify="center" py={4}>
        <Spinner />
        <Text fontSize="sm">Loading invitations...</Text>
      </VStack>
    );
  }

  if (invitations.length === 0) {
    return (
      <Box textAlign="center" py={8} color="gray.500">
        <Text>No pending invitations</Text>
      </Box>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <VStack align="stretch" spacing={3}>
        {invitations.map((invitation) => (
          <Box
            key={invitation.id}
            p={4}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            _hover={{ borderColor: 'gray.300' }}
          >
            <HStack justify="space-between" align="start">
              <VStack align="flex-start" spacing={1} flex={1}>
                <Text fontWeight="semibold">
                  {invitation.invitedUser?.username}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {invitation.invitedUser?.email}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Invited: {formatDate(invitation.invitedAt)}
                  {' • '}
                  Expires: {formatDate(invitation.expiresAt)}
                </Text>
              </VStack>

              <Button
                colorScheme="red"
                variant="outline"
                size="sm"
                onClick={() => handleRevokeClick(invitation)}
                isDisabled={revoking}
              >
                Revoke
              </Button>
            </HStack>
          </Box>
        ))}
      </VStack>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Revoke Invitation
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to revoke the invitation to{' '}
              {selectedInvitation?.invitedUser?.username}? They won't be able to
              join using this invitation.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} isDisabled={revoking}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleConfirmRevoke}
                ml={3}
                isLoading={revoking}
                loadingText="Revoking..."
              >
                Revoke
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default PendingInvitationsList;
