import React from 'react';
import { CreateGroupForm } from '@/components/groups/CreateGroupForm';
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Create Group - Get Together',
  description: 'Create a new group to coordinate with your friends',
};

export default function CreateGroupPage() {
  const handleGroupCreationSuccess = (groupId: string) => {
    // Redirect to group detail page
    // Note: In a real app, this would be handled by the form's onSuccess callback
    // using useRouter from next/navigation
    console.log('Group created with ID:', groupId);
    // redirect(`/groups/${groupId}`);
  };

  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="lg" py={{ base: '12', md: '24' }}>
        <VStack spacing="8" align="stretch">
          <Box textAlign="center">
            <Heading as="h1" size="2xl" mb="2">
              Start a New Group
            </Heading>
            <Text color="gray.600" fontSize="lg">
              Invite your friends and start coordinating activities together.
            </Text>
          </Box>

          <CreateGroupForm onSuccess={handleGroupCreationSuccess} />
        </VStack>
      </Container>
    </Box>
  );
}
