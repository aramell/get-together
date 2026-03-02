'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Input,
  Button,
  VStack,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  Text,
  useToast,
} from '@chakra-ui/react';
import { searchUsersForInvite, inviteUserToGroup } from '@/lib/services/groupService';
import UserSearchResults from './UserSearchResults';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onInvitationSent?: () => void;
}

/**
 * InviteUserModal Component
 * Modal for searching users and inviting them to a group
 */
const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  groupId,
  onInvitationSent,
}) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    email: string;
    username: string;
    alreadyMember: boolean;
    hasPendingInvite: boolean;
  }> | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults(null);
        return;
      }

      if (query.length < 2) {
        setError('Search must be at least 2 characters');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await searchUsersForInvite(groupId, query);
        if (result.success && result.users) {
          setSearchResults(result.users);
        } else {
          setError(result.error || 'Search failed');
        }
      } catch (err) {
        setError('Failed to search users');
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    },
    [groupId]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleToggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleInvite = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: 'No users selected',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setInviting(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const userId of selectedUsers) {
        try {
          const result = await inviteUserToGroup(groupId, userId);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Invitations sent',
          description: `Successfully invited ${successCount} user(s)`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      }

      if (errorCount > 0) {
        toast({
          title: 'Some invitations failed',
          description: `${errorCount} invitation(s) could not be sent`,
          status: 'warning',
          duration: 2000,
          isClosable: true,
        });
      }

      setSelectedUsers(new Set());
      setSearchQuery('');
      setSearchResults(null);
      onInvitationSent?.();
      onClose();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to send invitations',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
      console.error('Invite error:', err);
    } finally {
      setInviting(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSelectedUsers(new Set());
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Invite Users to Group</ModalHeader>
        <ModalCloseButton isDisabled={inviting} />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Input
              placeholder="Search by email or username..."
              value={searchQuery}
              onChange={handleSearchChange}
              isDisabled={loading || inviting}
              aria-label="Search users"
            />

            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}

            {loading && (
              <VStack justify="center" py={4}>
                <Spinner />
                <Text fontSize="sm">Searching users...</Text>
              </VStack>
            )}

            {searchResults && !loading && (
              <>
                {searchResults.length > 0 ? (
                  <UserSearchResults
                    users={searchResults}
                    selectedUsers={selectedUsers}
                    onToggleUser={handleToggleUser}
                  />
                ) : (
                  <Text color="gray.500" fontSize="sm">
                    No users found
                  </Text>
                )}
              </>
            )}

            {selectedUsers.size > 0 && (
              <Text fontSize="sm" color="blue.600">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </Text>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={2}>
            <Button variant="ghost" onClick={handleClose} isDisabled={inviting}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleInvite}
              isDisabled={selectedUsers.size === 0}
              isLoading={inviting}
              loadingText="Inviting..."
            >
              Send Invitations
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default InviteUserModal;
