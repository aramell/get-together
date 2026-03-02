'use client';

import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Box,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { respondToInvitation } from '@/lib/services/groupService';

interface UserInvitation {
  id: string;
  groupId: string;
  groupName: string;
  groupDescription: string | null;
  memberCount: number;
  invitedBy: string;
  status: string;
  invitedAt: string;
  expiresAt: string;
}

interface UserInvitationsListProps {
  invitations: UserInvitation[];
  loading?: boolean;
  onInvitationResponded?: () => void;
}

/**
 * UserInvitationsList Component
 * Displays list of invitations received by user
 */
const UserInvitationsList: React.FC<UserInvitationsListProps> = ({
  invitations,
  loading = false,
  onInvitationResponded,
}) => {
  const toast = useToast();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const handleRespond = async (
    invitationId: string,
    action: 'accept' | 'decline'
  ) => {
    setRespondingTo(invitationId);
    try {
      const result = await respondToInvitation(invitationId, action);
      if (result.success) {
        toast({
          title: action === 'accept' ? 'Joined group!' : 'Invitation declined',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        onInvitationResponded?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to respond to invitation',
          status: 'error',
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to respond to invitation',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
      console.error('Respond error:', error);
    } finally {
      setRespondingTo(null);
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

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <VStack align="stretch" spacing={3}>
      {invitations.map((invitation) => {
        const expired = isExpired(invitation.expiresAt);

        return (
          <Box
            key={invitation.id}
            p={4}
            borderWidth="1px"
            borderColor={expired ? 'red.200' : 'gray.200'}
            borderRadius="md"
            bg={expired ? 'red.50' : 'white'}
            _hover={{ borderColor: expired ? 'red.300' : 'gray.300' }}
          >
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between" align="start">
                <VStack align="flex-start" spacing={1} flex={1}>
                  <Text fontWeight="semibold" fontSize="lg">
                    {invitation.groupName}
                  </Text>
                  {invitation.groupDescription && (
                    <Text fontSize="sm" color="gray.600" noOfLines={2}>
                      {invitation.groupDescription}
                    </Text>
                  )}
                  <HStack spacing={3} fontSize="sm" color="gray.600">
                    <Text>{invitation.memberCount} members</Text>
                    <Text>•</Text>
                    <Text>Invited by {invitation.invitedBy}</Text>
                  </HStack>
                </VStack>
              </HStack>

              <Text fontSize="xs" color="gray.500">
                Expires: {formatDate(invitation.expiresAt)}
                {expired && <Text color="red.600"> (EXPIRED)</Text>}
              </Text>

              {!expired && (
                <HStack spacing={2} pt={2}>
                  <Button
                    colorScheme="blue"
                    size="sm"
                    onClick={() => handleRespond(invitation.id, 'accept')}
                    isLoading={respondingTo === invitation.id}
                    loadingText="Accepting..."
                    isDisabled={respondingTo !== null}
                  >
                    Accept
                  </Button>
                  <Button
                    colorScheme="gray"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRespond(invitation.id, 'decline')}
                    isLoading={respondingTo === invitation.id}
                    loadingText="Declining..."
                    isDisabled={respondingTo !== null}
                  >
                    Decline
                  </Button>
                </HStack>
              )}

              {expired && (
                <Text fontSize="sm" color="red.600" fontWeight="semibold">
                  This invitation has expired
                </Text>
              )}
            </VStack>
          </Box>
        );
      })}
    </VStack>
  );
};

export default UserInvitationsList;
