import { Metadata } from 'next';
import { Box, Container, Heading, Stack } from '@chakra-ui/react';
import GroupsList from '@/components/groups/GroupsList';

export const metadata: Metadata = {
  title: 'My Groups | Get Together',
  description: 'View and manage all your groups',
};

/**
 * Groups Page
 * Displays all groups the user belongs to
 * Allows filtering and navigation to group details
 * Includes empty state with action to create or join a group
 */
export default function GroupsPage() {
  return (
    <Container maxW="container.lg" py={8}>
      <Stack spacing={8}>
        <Box>
          <Heading as="h1" size="lg" mb={2}>
            Your Groups
          </Heading>
          <p>Manage and access all your coordinated groups</p>
        </Box>

        <GroupsList />
      </Stack>
    </Container>
  );
}
