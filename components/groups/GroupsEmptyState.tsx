'use client';

import { VStack, Text, Button, Box } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

interface GroupsEmptyStateProps {
  type?: 'no-groups' | 'no-search-results';
}

export function GroupsEmptyState({ type = 'no-groups' }: GroupsEmptyStateProps) {
  const router = useRouter();

  if (type === 'no-search-results') {
    return (
      <VStack
        spacing={4}
        align="center"
        justify="center"
        minH="300px"
        bg="white"
        borderRadius="lg"
        border="1px"
        borderColor="gray.200"
        p={8}
      >
        <Text fontSize="lg" fontWeight="semibold" color="gray.700">
          No groups found
        </Text>
        <Text color="gray.500" textAlign="center">
          Try adjusting your search or filters to find what you're looking for.
        </Text>
      </VStack>
    );
  }

  return (
    <VStack
      spacing={6}
      align="center"
      justify="center"
      minH="400px"
      bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      borderRadius="lg"
      p={8}
      color="white"
      textAlign="center"
    >
      <Box fontSize="64px" mb={4}>
        👥
      </Box>

      <VStack spacing={2}>
        <Text fontSize="2xl" fontWeight="bold">
          You're not in any groups yet
        </Text>
        <Text fontSize="md" opacity={0.9} maxW="400px">
          Create a group to start coordinating with friends, colleagues, or community members.
        </Text>
      </VStack>

      <Button
        colorScheme="whiteAlpha"
        bg="white"
        color="purple.600"
        size="lg"
        _hover={{ bg: 'gray.100' }}
        onClick={() => router.push('/groups/create')}
        mt={4}
      >
        ➕ Create Your First Group
      </Button>

      <Text fontSize="sm" opacity={0.8} mt={8}>
        Or ask a friend to invite you to join their group!
      </Text>
    </VStack>
  );
}
