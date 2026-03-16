'use client';

import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  HStack,
  VStack,
  Badge,
  Button,
  useDisclosure,
  Box,
  useToast,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { UpdateThresholdModal } from './UpdateThresholdModal';
import { RSVPButtons } from '@/components/events/RSVPButtons';
import { ConfirmationBadge } from '@/components/events/ConfirmationBadge';

interface EventCardProps {
  eventId: string;
  groupId: string;
  title: string;
  date: string;
  threshold: number | null;
  status: 'proposal' | 'confirmed' | 'cancelled';
  confirmedAt?: string | null;
  createdBy: string;
  currentUserId: string;
}

export function EventCard({
  eventId,
  groupId,
  title,
  date,
  threshold: initialThreshold,
  status,
  confirmedAt: initialConfirmedAt,
  createdBy,
  currentUserId,
}: EventCardProps) {
  const [momentum, setMomentum] = useState<{ in: number; maybe: number; out: number } | null>(null);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [confirmedAt, setConfirmedAt] = useState(initialConfirmedAt || null);
  const [loading, setLoading] = useState(true);
  const [previousStatus, setPreviousStatus] = useState(status);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isCreator = createdBy === currentUserId;
  const toast = useToast();

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  // Detect confirmation and show celebration animation + toast
  useEffect(() => {
    if (previousStatus !== 'confirmed' && status === 'confirmed') {
      // Play celebration animation
      triggerCelebrationAnimation();

      // Show success toast
      toast({
        title: '🎉 Event Confirmed!',
        description: `${title} is officially happening!`,
        status: 'success',
        duration: 4000,
        isClosable: true,
        position: 'top',
      });
    }
    setPreviousStatus(status);
  }, [status, title, toast]);

  const loadEventData = async () => {
    setLoading(true);
    try {
      // Load momentum and threshold data
      const response = await fetch(`/api/events/${eventId}/momentum`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setMomentum(result.data);
          // Update threshold from momentum response if available
          if (result.data.threshold !== undefined) {
            setThreshold(result.data.threshold);
          }
        }
      }

      // Load confirmation status
      const confirmResponse = await fetch(`/api/groups/${groupId}/events/${eventId}/confirmation`);
      if (confirmResponse.ok) {
        const confirmResult = await confirmResponse.json();
        if (confirmResult.success && confirmResult.data) {
          setConfirmedAt(confirmResult.data.confirmedAt);
        }
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerCelebrationAnimation = () => {
    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    // Create a brief green glow effect on the card
    const card = document.querySelector(`[data-event-id="${eventId}"]`);
    if (card) {
      card.classList.add('celebration-animation');
      setTimeout(() => {
        card.classList.remove('celebration-animation');
      }, 2000);
    }
  };

  const eventDate = new Date(date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusColor = status === 'confirmed' ? 'green' : status === 'cancelled' ? 'red' : 'blue';
  const inCount = momentum?.in || 0;
  const thresholdText =
    threshold !== null
      ? `${inCount}/${threshold} confirmations`
      : 'No confirmation threshold';

  return (
    <>
      <Card data-event-id={eventId}>
        <CardHeader pb={2}>
          <HStack justify="space-between" align="flex-start">
            <VStack align="flex-start" spacing={1} flex={1}>
              <Heading size="md">{title}</Heading>
              <Text fontSize="sm" color="gray.600">
                {formattedDate}
              </Text>
            </VStack>
            <ConfirmationBadge status={status as 'proposal' | 'confirmed'} confirmedAt={confirmedAt} />
          </HStack>
        </CardHeader>

        <CardBody spacing={3}>
          <VStack align="stretch" spacing={3}>
            {/* Momentum Counter */}
            <Box
              p={3}
              bg="gray.50"
              borderRadius="md"
              borderLeft="4px solid"
              borderColor="blue.500"
            >
              <Text fontSize="sm" color="gray.600" mb={1}>
                RSVPs
              </Text>
              <HStack spacing={4}>
                <HStack>
                  <Text fontWeight="bold" color="green.600">
                    {inCount}
                  </Text>
                  <Text fontSize="sm">In</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" color="yellow.600">
                    {momentum?.maybe || 0}
                  </Text>
                  <Text fontSize="sm">Maybe</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" color="red.600">
                    {momentum?.out || 0}
                  </Text>
                  <Text fontSize="sm">Out</Text>
                </HStack>
              </HStack>
            </Box>

            {/* RSVP Buttons */}
            <RSVPButtons
              eventId={eventId}
              groupId={groupId}
              onSuccess={loadEventData}
              isEventConfirmed={status === 'confirmed'}
            />

            {/* Threshold Display */}
            <Box
              p={3}
              bg="blue.50"
              borderRadius="md"
              borderLeft="4px solid"
              borderColor="blue.300"
            >
              <Text fontSize="sm" color="gray.600" mb={1}>
                Confirmation Status
              </Text>
              <HStack justify="space-between" align="center">
                <Text fontWeight="medium">{thresholdText}</Text>
                {isCreator && (
                  <Button size="sm" variant="ghost" onClick={onOpen}>
                    Edit
                  </Button>
                )}
              </HStack>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Update Threshold Modal */}
      <UpdateThresholdModal
        isOpen={isOpen}
        onClose={onClose}
        eventId={eventId}
        groupId={groupId}
        currentThreshold={threshold}
        currentInCount={inCount}
        onSuccess={loadEventData}
      />
    </>
  );
}
