'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Alert,
  AlertIcon,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { EventWithMomentum } from './EventList';

interface EventDetailProps {
  groupId: string;
  eventId: string;
}

export const EventDetail: React.FC<EventDetailProps> = ({ groupId, eventId }) => {
  const { userId } = useAuth();
  const [event, setEvent] = useState<EventWithMomentum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef(null);
  const toast = useToast();

  // Fetch event detail
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = new URL(
          `/api/groups/${groupId}/events/${eventId}`,
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
        );

        const response = await fetch(url.toString());

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to load event');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to load event');
        }

        setEvent(result.data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading the event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [groupId, eventId]);

  const handleCancelEvent = async () => {
    if (!event) return;

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/groups/${groupId}/events/${eventId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to cancel event');
      }

      toast({
        title: 'Event cancelled',
        description: `${event.title} has been cancelled.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onClose();
      // Redirect or update state
      setTimeout(() => {
        window.location.href = `/groups/${groupId}`;
      }, 1000);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to cancel event',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <HStack justify="center" py={8}>
        <Spinner color="blue.500" />
        <Text>Loading event...</Text>
      </HStack>
    );
  }

  if (error || !event) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Text>{error || 'Event not found'}</Text>
      </Alert>
    );
  }

  const isCreator = userId !== null && event.created_by === userId;
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const momentum = event.momentum || { in: 0, maybe: 0, out: 0 };

  return (
    <VStack spacing={6} align="stretch">
      <Card>
        <CardHeader pb={2}>
          <VStack align="flex-start" spacing={2}>
            <Heading size="lg">{event.title}</Heading>
            <Text fontSize="md" color="gray.600">
              {formattedDate} at {formattedTime}
            </Text>
          </VStack>
        </CardHeader>

        <CardBody spacing={4}>
          <VStack align="stretch" spacing={4}>
            {event.description && (
              <Box>
                <Text fontWeight="medium" mb={2}>
                  Description
                </Text>
                <Text color="gray.700">{event.description}</Text>
              </Box>
            )}

            {/* Momentum Counter */}
            <Box p={3} bg="gray.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                RSVPs: {momentum.in} in, {momentum.maybe} maybe, {momentum.out} out
              </Text>
            </Box>

            {/* Action Buttons */}
            <HStack spacing={3} pt={4}>
              {isCreator && (
                <Button colorScheme="red" variant="outline" onClick={onOpen}>
                  Cancel Event
                </Button>
              )}
              <Button colorScheme="blue" variant="outline" onClick={() => window.history.back()}>
                Back
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Confirmation Modal */}
      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirm Cancellation
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to cancel this event? This action cannot be undone. All group members will be notified.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Keep Event
              </Button>
              <Button
                colorScheme="red"
                onClick={handleCancelEvent}
                ml={3}
                isLoading={deleting}
                loadingText="Cancelling..."
              >
                Confirm
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </VStack>
  );
};
