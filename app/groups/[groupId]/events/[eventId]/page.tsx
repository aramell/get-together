'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Divider,
  SimpleGrid,
  Card,
  CardBody,
  useToast,
} from '@chakra-ui/react';
import { FiMapPin } from 'react-icons/fi';
import { useAuth } from '@/lib/contexts/AuthContext';

interface EventDetails {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string | null;
  location: string | null;
  date: string;
  threshold: number | null;
  status: 'proposal' | 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string;
  momentum: {
    in: number;
    maybe: number;
    out: number;
  };
}

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { userId, isAuthenticated } = useAuth();

  const groupId = params?.groupId as string;
  const eventId = params?.eventId as string;

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEventDetails = async () => {
      try {
        if (!isAuthenticated) {
          setError('Please log in to view event details');
          setLoading(false);
          return;
        }

        if (!groupId || !eventId) {
          setError('Invalid group or event ID');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/groups/${groupId}/events/${eventId}`);

        if (!response.ok) {
          setError('Failed to load event details');
          setLoading(false);
          return;
        }

        const result = await response.json();

        if (result.success && result.data) {
          setEvent(result.data);
          setError(null);
        } else {
          setError(result.message || 'Failed to load event details');
        }
      } catch (err) {
        console.error('Error loading event details:', err);
        setError('An error occurred while loading event details');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadEventDetails();
    }
  }, [groupId, eventId, isAuthenticated, userId]);

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

  if (loading) {
    return (
      <Container maxW="4xl" py={{ base: '12', md: '24' }}>
        <VStack spacing={8} align="center" justify="center" minH="400px">
          <Spinner size="lg" color="blue.500" />
          <Text>Loading event details...</Text>
        </VStack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="4xl" py={{ base: '12', md: '24' }}>
        <VStack spacing={6}>
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Text>{error}</Text>
          </Alert>
          <Button colorScheme="blue" onClick={() => router.back()}>
            Go Back
          </Button>
        </VStack>
      </Container>
    );
  }

  if (!event) {
    return (
      <Container maxW="4xl" py={{ base: '12', md: '24' }}>
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Text>Event not found</Text>
        </Alert>
      </Container>
    );
  }

  const eventDate = new Date(event.date);
  const isConfirmed = event.status === 'confirmed';
  const thresholdMet = event.threshold && event.momentum.in >= event.threshold;

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
        <VStack spacing={{ base: '8', md: '12' }} align="stretch">
          <Box>
            <HStack justify="space-between" align="flex-start" mb={6}>
              <VStack align="flex-start" spacing={3}>
                <HStack spacing={3} align="center">
                  <Heading as="h1" size="2xl">
                    {event.title}
                  </Heading>
                  <Badge
                    colorScheme={isConfirmed ? 'green' : 'orange'}
                    fontSize="md"
                    px={3}
                    py={1}
                  >
                    {isConfirmed ? 'CONFIRMED' : 'PROPOSED'}
                  </Badge>
                </HStack>
                {event.description && (
                  <Text color="gray.600" fontSize="lg" maxW="2xl">
                    {event.description}
                  </Text>
                )}
                {event.location && (
                  <HStack spacing={2} color="gray.600" fontSize="md">
                    <FiMapPin size={16} />
                    <Text>{event.location}</Text>
                  </HStack>
                )}
              </VStack>
            </HStack>
          </Box>

          <Divider />

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Card>
              <CardBody>
                <VStack align="flex-start" spacing={2}>
                  <Text fontSize="sm" color="gray.500" fontWeight="semibold">
                    DATE & TIME
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold">
                    {eventDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text fontSize="md" color="gray.600">
                    {eventDate.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <VStack align="flex-start" spacing={2}>
                  <Text fontSize="sm" color="gray.500" fontWeight="semibold">
                    COMMITMENT THRESHOLD
                  </Text>
                  {event.threshold ? (
                    <>
                      <Text fontSize="lg" fontWeight="semibold">
                        {event.threshold} people needed
                      </Text>
                      <Text fontSize="sm" color={thresholdMet ? 'green.600' : 'gray.600'}>
                        {thresholdMet ? '✓ Threshold met!' : `${event.threshold - event.momentum.in} more needed`}
                      </Text>
                    </>
                  ) : (
                    <Text fontSize="md" color="gray.600">
                      No threshold set
                    </Text>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>

          <Divider />

          <Box>
            <Heading size="lg" mb={6}>
              RSVP Status
            </Heading>
            <SimpleGrid columns={{ base: 3 }} spacing={4}>
              <Card>
                <CardBody>
                  <VStack align="center" spacing={2}>
                    <Text fontSize="sm" color="gray.500" fontWeight="semibold">
                      IN
                    </Text>
                    <Text fontSize="3xl" fontWeight="bold" color="green.500">
                      {event.momentum.in}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <VStack align="center" spacing={2}>
                    <Text fontSize="sm" color="gray.500" fontWeight="semibold">
                      MAYBE
                    </Text>
                    <Text fontSize="3xl" fontWeight="bold" color="yellow.500">
                      {event.momentum.maybe}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <VStack align="center" spacing={2}>
                    <Text fontSize="sm" color="gray.500" fontWeight="semibold">
                      OUT
                    </Text>
                    <Text fontSize="3xl" fontWeight="bold" color="red.500">
                      {event.momentum.out}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
