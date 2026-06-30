'use client';

import React from 'react';
import {
  VStack,
  HStack,
  Checkbox,
  Text,
  Badge,
  Box,
  Divider,
} from '@chakra-ui/react';

interface UserSearchResult {
  id: string;
  email: string;
  username: string;
  alreadyMember: boolean;
  hasPendingInvite: boolean;
}

interface UserSearchResultsProps {
  users: UserSearchResult[];
  selectedUsers: Set<string>;
  onToggleUser: (userId: string) => void;
}

/**
 * UserSearchResults Component
 * Displays search results for user selection
 */
const UserSearchResults: React.FC<UserSearchResultsProps> = ({
  users,
  selectedUsers,
  onToggleUser,
}) => {
  return (
    <VStack align="stretch" spacing={0} borderWidth="1px" borderColor="gray.200" borderRadius="md">
      {users.map((user, index) => (
        <React.Fragment key={user.id}>
          <HStack
            p={3}
            spacing={3}
            _hover={{ bg: 'gray.50' }}
            cursor={user.alreadyMember || user.hasPendingInvite ? 'not-allowed' : 'pointer'}
            opacity={user.alreadyMember || user.hasPendingInvite ? 0.6 : 1}
          >
            <Checkbox
              isChecked={selectedUsers.has(user.id)}
              onChange={() => onToggleUser(user.id)}
              isDisabled={user.alreadyMember || user.hasPendingInvite}
            />

            <VStack align="flex-start" spacing={0} flex={1}>
              <Text fontWeight="semibold">{user.username}</Text>
              <Text fontSize="sm" color="gray.600">
                {user.email}
              </Text>
            </VStack>

            <HStack spacing={2}>
              {user.alreadyMember && (
                <Badge colorScheme="green" fontSize="xs">
                  Member
                </Badge>
              )}
              {user.hasPendingInvite && (
                <Badge colorScheme="yellow" fontSize="xs">
                  Pending
                </Badge>
              )}
            </HStack>
          </HStack>

          {index < users.length - 1 && <Divider m={0} />}
        </React.Fragment>
      ))}
    </VStack>
  );
};

export default UserSearchResults;
