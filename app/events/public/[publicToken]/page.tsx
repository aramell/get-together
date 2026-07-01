'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Container,
  VStack,
  Box,
  Heading,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { PublicEventHeader } from '@/components/groups/PublicEventHeader';
import { PublicRsvpForm } from '@/components/groups/PublicRsvpForm';

interface EventData {
  id: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  threshold?: number;
  momentum: {
    in: number;
    maybe: number;
    out: number;
  };
}

type ErrorType = 'not_found' | 'deleted' | 'error' | null;

export default function PublicEventPage() {
  const params = useParams();
  const publicToken = params.publicToken as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorType>(null);

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/public/${publicToken}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('not_found');
          } else if (response.status === 410) {
            setError('deleted');
          } else {
            setError('error');
          }
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setEvent(data.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setError('error');
      } finally {
        setIsLoading(false);
      }
    };

    if (publicToken) {
      fetchEvent();
    }
  }, [publicToken]);

  // Polling for momentum updates
  useEffect(() => {
    if (!event) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/events/public/${publicToken}`);
        if (response.ok) {
          const data = await response.json();
          setEvent((prev) => ({
            ...prev!,
            momentum: data.data.momentum,
          }));
        }
      } catch (err) {
        console.error('Failed to update momentum:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [event, publicToken]);

  const handleRsvpSuccess = (response: any) => {
    // Update momentum immediately (optimistic update)
    if (event) {
      setEvent({
        ...event,
        momentum: response.data.momentum,
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text>Loading event...</Text>
        </VStack>
      </Center>
    );
  }

  // Error states
  if (error === 'not_found') {
    return (
      <Container maxW="lg" centerContent minH="100vh" display="flex" alignItems="center">
        <Alert
          status="error"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="auto"
          borderRadius="lg"
          p={6}
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            Event Not Found
          </AlertTitle>
          <AlertDescription maxWidth="sm">
            Event not found or link has expired. The organizer may have deleted
            the event or the link is no longer valid.
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (error === 'deleted') {
    return (
      <Container maxW="lg" centerContent minH="100vh" display="flex" alignItems="center">
        <Alert
          status="error"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="auto"
          borderRadius="lg"
          p={6}
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            Event Cancelled
          </AlertTitle>
          <AlertDescription maxWidth="sm">
            This event is no longer available. The organizer has cancelled or
            deleted the event.
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (error || !event) {
    return (
      <Container maxW="lg" centerContent minH="100vh" display="flex" alignItems="center">
        <Alert
          status="error"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="auto"
          borderRadius="lg"
          p={6}
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            Error Loading Event
          </AlertTitle>
          <AlertDescription maxWidth="sm">
            We encountered an error while loading this event. Please try again
            later.
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="lg" py={{ base: 6, md: 10 }} px={{ base: 4, md: 6 }}>
      <main role="main">
        <VStack spacing={8} align="stretch">
          {/* Event Header */}
          <PublicEventHeader
            title={event.title}
            description={event.description}
            date={event.date}
            location={event.location}
            threshold={event.threshold}
            momentum={event.momentum}
          />

          {/* RSVP Form */}
          <Box>
            <Heading as="h2" size="md" mb={4}>
              Will You Join?
            </Heading>
            <PublicRsvpForm
              publicToken={publicToken}
              eventTitle={event.title}
              onSuccess={handleRsvpSuccess}
            />
          </Box>
        </VStack>
      </main>
    </Container>
  );
}
