'use client';

import React, { useState, useMemo } from 'react';
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
  Select,
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
  itemsPerPage?: number;
  showPagination?: boolean;
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
  itemsPerPage = 10,
  showPagination = true,
}) => {
  const toast = useToast();
  const isAdmin = currentUserRole === 'admin';
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalPages = Math.ceil(members.length / itemsPerPage);
  const paginatedMembers = useMemo(() => {
    if (!showPagination) return members;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return members.slice(startIndex, endIndex);
  }, [members, currentPage, itemsPerPage, showPagination]);

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
    <VStack spacing={4} align="stretch">
      <VStack spacing={3} align="stretch" {...containerStyle}>
        {paginatedMembers.map((member) => {
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

      {/* Pagination Controls */}
      {showPagination && totalPages > 1 && (
        <HStack justify="space-between" align="center" pt={2}>
          <Text fontSize="sm" color="gray.600">
            Page {currentPage} of {totalPages} ({members.length} total)
          </Text>
          <HStack spacing={2}>
            <Button
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              isDisabled={currentPage === 1}
            >
              Previous
            </Button>
            <Select
              size="sm"
              w="auto"
              value={currentPage}
              onChange={(e) => setCurrentPage(parseInt(e.target.value))}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              isDisabled={currentPage === totalPages}
            >
              Next
            </Button>
          </HStack>
        </HStack>
      )}
    </VStack>
  );
};

export default MemberList;
