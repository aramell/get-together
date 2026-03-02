'use client';

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Avatar,
  Text,
  Badge,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Heading,
} from '@chakra-ui/react';

export interface GroupMember {
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

interface MemberListProps {
  members: GroupMember[];
  currentUserRole: 'admin' | 'member' | null;
  currentUserId?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onRemoveMember?: (userId: string) => Promise<void>;
  onPromoteToAdmin?: (userId: string) => Promise<void>;
  onDemoteToMember?: (userId: string) => Promise<void>;
  showActions?: boolean;
  maxHeight?: string;
  emptyMessage?: string;
}

/**
 * MemberList Component
 * Displays a list of group members with role badges and optional admin actions
 *
 * @param members - Array of group members
 * @param currentUserRole - Current user's role in the group
 * @param currentUserId - Current user's ID (for filtering self)
 * @param isLoading - Loading state
 * @param error - Error message if any
 * @param onRemoveMember - Callback to remove a member
 * @param onPromoteToAdmin - Callback to promote member to admin
 * @param onDemoteToMember - Callback to demote admin to member
 * @param showActions - Show action menu for admins (default: true)
 * @param maxHeight - Optional max height for scrollable container
 * @param emptyMessage - Message to show when member list is empty
 */
export const MemberList: React.FC<MemberListProps> = ({
  members,
  currentUserRole,
  currentUserId,
  isLoading = false,
  error = null,
  onRemoveMember,
  onPromoteToAdmin,
  onDemoteToMember,
  showActions = true,
  maxHeight,
  emptyMessage = 'No members in this group',
}) => {
  const toast = useToast();
  const isAdmin = currentUserRole === 'admin';

  const handleRemoveMember = async (userId: string) => {
    if (!onRemoveMember) return;

    try {
      await onRemoveMember(userId);
      toast({
        title: 'Member removed',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (!onPromoteToAdmin) return;

    try {
      await onPromoteToAdmin(userId);
      toast({
        title: 'Member promoted to admin',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to promote member',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const handleDemoteToMember = async (userId: string) => {
    if (!onDemoteToMember) return;

    try {
      await onDemoteToMember(userId);
      toast({
        title: 'Admin demoted to member',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to demote admin',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  if (isLoading) {
    return (
      <VStack spacing={4} align="center" justify="center" minH="200px">
        <Spinner size="lg" color="blue.500" />
        <Text>Loading members...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Text>{error}</Text>
      </Alert>
    );
  }

  if (members.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Text color="gray.500">{emptyMessage}</Text>
      </Box>
    );
  }

  const containerStyle = maxHeight
    ? {
        maxH: maxHeight,
        overflowY: 'auto' as const,
      }
    : {};

  return (
    <VStack spacing={3} align="stretch" {...containerStyle}>
      {members.map((member) => {
        const isCurrentUser = member.user_id === currentUserId;
        const canManage = isAdmin && !isCurrentUser && showActions;

        return (
          <Box
            key={member.user_id}
            p={4}
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            _hover={{ shadow: 'sm' }}
            transition="all 0.2s"
          >
            <HStack justify="space-between" align="center">
              {/* Member Info */}
              <HStack spacing={3} flex={1}>
                <Avatar name={member.user_id} size="md" />
                <VStack align="flex-start" spacing={0} flex={1}>
                  <HStack spacing={2}>
                    <Text fontWeight="semibold">{member.user_id}</Text>
                    {isCurrentUser && (
                      <Badge colorScheme="green" fontSize="xs">
                        You
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="gray.500">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </Text>
                </VStack>
              </HStack>

              {/* Role and Actions */}
              <HStack spacing={3}>
                <Badge colorScheme={member.role === 'admin' ? 'purple' : 'blue'}>
                  {member.role.toUpperCase()}
                </Badge>

                {canManage && (
                  <Menu>
                    <MenuButton as={Button} variant="ghost" size="sm">
                      ⋮
                    </MenuButton>
                    <MenuList>
                      {member.role === 'member' && (
                        <MenuItem onClick={() => handlePromoteToAdmin(member.user_id)}>
                          Promote to Admin
                        </MenuItem>
                      )}
                      {member.role === 'admin' && (
                        <MenuItem onClick={() => handleDemoteToMember(member.user_id)}>
                          Demote to Member
                        </MenuItem>
                      )}
                      <MenuItem
                        onClick={() => handleRemoveMember(member.user_id)}
                        color="red.600"
                      >
                        Remove Member
                      </MenuItem>
                    </MenuList>
                  </Menu>
                )}
              </HStack>
            </HStack>
          </Box>
        );
      })}
    </VStack>
  );
};

export default MemberList;
