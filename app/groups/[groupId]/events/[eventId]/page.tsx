'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Text,
  VStack,
  Button,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { EventDetail } from '@/components/groups/EventDetail';

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const groupId = params?.groupId as string;
  const eventId = params?.eventId as string;

  if (!isAuthenticated) {
    return (
      <Container maxW="4xl" py={{ base: '12', md: '24' }}>
        <VStack spacing={6}>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Text>You must be logged in to view this event</Text>
          </Alert>
          <Button colorScheme="blue" onClick={() => router.push('/auth/login')}>
            Go to Login
          </Button>
        </VStack>
      </Container>
    );
  }

  if (!groupId || !eventId) {
    return (
      <Container maxW="4xl" py={{ base: '12', md: '24' }}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text>Invalid group or event ID</Text>
        </Alert>
      </Container>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh">
      <Box bg="white" borderBottom="1px" borderColor="gray.200" py={4} position="sticky" top={0} zIndex={10}>
        <Container maxW="4xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<Box>←</Box>}
            fontWeight="medium"
          >
            Back to Group
          </Button>
        </Container>
      </Box>

      <Container maxW="4xl" py={{ base: '12', md: '24' }}>
        <EventDetail groupId={groupId} eventId={eventId} />
      </Container>
    </Box>
  );
}
