'use client';

import React from 'react';
import { Box, VStack, Heading, Text, Button, HStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

interface GroupsEmptyStateProps {
  type?: 'no-groups' | 'no-search-results';
}

/**
 * GroupsEmptyState Component
 * Displays when user has no groups or search returns no results
 *
 * @param type - Type of empty state (no-groups or no-search-results)
 */
export const GroupsEmptyState: React.FC<GroupsEmptyStateProps> = ({
  type = 'no-groups',
}) => {
  const router = useRouter();

  const getEmptyStateContent = () => {
    switch (type) {
      case 'no-search-results':
        return {
          title: 'No Groups Found',
          description: 'Try adjusting your search or filter criteria',
          icon: '🔍',
        };
      case 'no-groups':
      default:
        return {
          title: "You Haven't Joined Any Groups Yet",
          description: 'Join a group to start coordinating activities with others',
          icon: '👥',
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <Box textAlign="center" py={20} px={4}>
      <VStack spacing={6}>
        <Box fontSize="4xl">{content.icon}</Box>

        <VStack spacing={2}>
          <Heading size="lg">{content.title}</Heading>
          <Text color="gray.600" fontSize="md" maxW="md">
            {content.description}
          </Text>
        </VStack>

        {type === 'no-groups' && (
          <HStack spacing={4} pt={4}>
            <Button
              colorScheme="blue"
              onClick={() => router.push('/groups/create')}
            >
              Create a Group
            </Button>
            <Button
              colorScheme="gray"
              variant="outline"
              onClick={() => {
                // Ideally we'd have a way to open an invite modal
                // For now, we can show an info message
                alert('Ask someone to share a group invite link with you!');
              }}
            >
              Join via Invite
            </Button>
          </HStack>
        )}

        {type === 'no-search-results' && (
          <Button colorScheme="gray" variant="outline" onClick={() => window.location.reload()}>
            Clear Search
          </Button>
        )}
      </VStack>
    </Box>
  );
};

export default GroupsEmptyState;
