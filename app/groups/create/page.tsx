'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateGroupForm } from '@/components/groups/CreateGroupForm';
import { InviteUsersModal } from '@/components/groups/InviteUsersModal';
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';

interface GroupCreated {
  id: string;
  name: string;
}

export default function CreateGroupPage() {
  const router = useRouter();
  const [createdGroup, setCreatedGroup] = useState<GroupCreated | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const handleGroupCreationSuccess = (groupId: string, groupName: string) => {
    setCreatedGroup({
      id: groupId,
      name: groupName,
    });
    setIsInviteModalOpen(true);
  };

  const handleInviteComplete = () => {
    if (createdGroup) {
      setIsInviteModalOpen(false);
      // Redirect to the group page
      router.push(`/groups/${createdGroup.id}`);
    }
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

      {createdGroup && (
        <InviteUsersModal
          isOpen={isInviteModalOpen}
          groupId={createdGroup.id}
          groupName={createdGroup.name}
          onClose={() => setIsInviteModalOpen(false)}
          onInviteComplete={handleInviteComplete}
        />
      )}
    </Box>
  );
}
