'use client';

import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Box,
  Spinner,
  useToast,
  Select,
} from '@chakra-ui/react';
import { removeMember, updateMemberRole } from '@/lib/services/groupService';
import RemoveMemberDialog from './RemoveMemberDialog';

interface Member {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'member';
  joinedAt: string;
  isCurrentUser?: boolean;
}

interface MemberListWithActionsProps {
  members: Member[];
  loading?: boolean;
  currentUserRole?: 'admin' | 'member' | null;
  groupId: string;
  onMemberRemoved?: () => void;
  onMemberRoleChanged?: () => void;
}

/**
 * MemberListWithActions Component
 * Display group members with admin controls (remove, change role)
 */
const MemberListWithActions: React.FC<MemberListWithActionsProps> = ({
  members,
  loading = false,
  currentUserRole,
  groupId,
  onMemberRemoved,
  onMemberRoleChanged,
}) => {
  const toast = useToast();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const isAdmin = currentUserRole === 'admin';

  const handleRemoveClick = (member: Member) => {
    setSelectedMember(member);
    setShowRemoveDialog(true);
  };

  const handleConfirmRemove = async (member: Member) => {
    setRemovingMemberId(member.id);
    try {
      const result = await removeMember(groupId, member.id);
      if (result.success) {
        toast({
          title: 'Member removed',
          description: `${member.username} has been removed from the group`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        onMemberRemoved?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove member',
          status: 'error',
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
      console.error('Remove error:', error);
    } finally {
      setRemovingMemberId(null);
      setShowRemoveDialog(false);
      setSelectedMember(null);
    }
  };

  const handleRoleChange = async (member: Member, newRole: 'admin' | 'member') => {
    if (member.role === newRole) return;

    setUpdatingMemberId(member.id);
    try {
      const result = await updateMemberRole(groupId, member.id, newRole);
      if (result.success) {
        toast({
          title: 'Role updated',
          description: `${member.username} is now a ${newRole}`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        onMemberRoleChanged?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update role',
          status: 'error',
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update role',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
      console.error('Role update error:', error);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  if (loading) {
    return (
      <VStack justify="center" py={4}>
        <Spinner />
        <Text fontSize="sm">Loading members...</Text>
      </VStack>
    );
  }

  if (members.length === 0) {
    return (
      <Box textAlign="center" py={8} color="gray.500">
        <Text>No members in this group</Text>
      </Box>
    );
  }

  return (
    <>
      <VStack align="stretch" spacing={3}>
        {members.map((member) => (
          <Box
            key={member.id}
            p={4}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            _hover={{ borderColor: 'gray.300' }}
          >
            <HStack justify="space-between" align="start">
              <VStack align="flex-start" spacing={1} flex={1}>
                <HStack>
                  <Text fontWeight="semibold">{member.username}</Text>
                  {member.isCurrentUser && (
                    <Badge colorScheme="blue" fontSize="xs">
                      You
                    </Badge>
                  )}
                  <Badge
                    colorScheme={member.role === 'admin' ? 'purple' : 'gray'}
                    fontSize="xs"
                  >
                    {member.role.toUpperCase()}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  {member.email}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </Text>
              </VStack>

              {isAdmin && !member.isCurrentUser && (
                <VStack spacing={2} align="flex-end">
                  {members.filter((m) => m.role === 'admin').length > 1 && (
                    <Select
                      size="sm"
                      width="120px"
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(
                          member,
                          e.target.value as 'admin' | 'member'
                        )
                      }
                      isDisabled={updatingMemberId === member.id}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </Select>
                  )}
                  <Button
                    colorScheme="red"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveClick(member)}
                    isDisabled={removingMemberId === member.id}
                  >
                    Remove
                  </Button>
                </VStack>
              )}
            </HStack>
          </Box>
        ))}
      </VStack>

      {selectedMember && (
        <RemoveMemberDialog
          isOpen={showRemoveDialog}
          onClose={() => {
            setShowRemoveDialog(false);
            setSelectedMember(null);
          }}
          member={selectedMember}
          isRemoving={removingMemberId === selectedMember.id}
          onConfirm={() => handleConfirmRemove(selectedMember)}
        />
      )}
    </>
  );
};

export default MemberListWithActions;
