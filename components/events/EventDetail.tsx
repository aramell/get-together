'use client';

import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Divider,
  Progress,
  useToast,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { RSVPButtons } from './RSVPButtons';
import { ConfirmationBadge } from './ConfirmationBadge';
import { useAuth } from '@/lib/contexts/AuthContext';

interface EventDetailProps {
  eventId: string;
  groupId: string;
  title: string;
  date: string;
  description?: string;
  threshold: number | null;
  status: 'proposal' | 'confirmed' | 'cancelled';
  confirmedAt?: string | null;
  createdBy: string;
  onClose?: () => void;
}

export function EventDetail({
  eventId,
  groupId,
  title,
  date,
  description,
  threshold,
  status,
  confirmedAt,
  createdBy,
  onClose,
}: EventDetailProps) {
  const { userId } = useAuth();
  const toast = useToast();
  const [momentum, setMomentum] = useState<{ in: number; maybe: number; out: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const isCreator = createdBy === userId;

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events/${eventId}/momentum`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setMomentum(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const eventDate = new Date(date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedConfirmedAt = confirmedAt
    ? new Date(confirmedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const inCount = momentum?.in || 0;
  const maybeCount = momentum?.maybe || 0;
  const outCount = momentum?.out || 0;
  const totalResponses = inCount + maybeCount + outCount;

  const confirmationPercentage = threshold ? Math.min((inCount / threshold) * 100, 100) : 0;

  return (
    <Card width="100%" maxW="600px" boxShadow="lg">
      {/* Header with Status */}
      <CardHeader pb={4} bg={status === 'confirmed' ? 'green.50' : 'blue.50'} borderBottom="1px solid" borderColor="gray.200">
        <VStack align="flex-start" spacing={3}>
          <HStack justify="space-between" width="100%">
            <Heading size="lg">{title}</Heading>
            <ConfirmationBadge status={status as 'proposal' | 'confirmed'} confirmedAt={confirmedAt} />
          </HStack>

          {status === 'confirmed' && (
            <Box bg="green.100" p={3} borderRadius="md" width="100%">
              <Text fontWeight="bold" color="green.800" mb={1}>
                🎉 This event is confirmed! It's happening!
              </Text>
              <Text fontSize="sm" color="green.700">
                {formattedConfirmedAt && `Confirmed on ${formattedConfirmedAt}`}
              </Text>
            </Box>
          )}
        </VStack>
      </CardHeader>

      <CardBody spacing={6}>
        {/* Date and Time */}
        <VStack align="flex-start" spacing={2}>
          <Text fontWeight="semibold" fontSize="sm" color="gray.600">
            DATE & TIME
          </Text>
          <Box
            p={3}
            bg="blue.50"
            borderRadius="md"
            borderLeft="4px solid"
            borderColor={status === 'confirmed' ? 'green.500' : 'blue.500'}
            width="100%"
          >
            <Text fontSize="md" fontWeight="bold" color={status === 'confirmed' ? 'green.700' : 'gray.800'}>
              {formattedDate}
            </Text>
          </Box>
        </VStack>

        {/* Description */}
        {description && (
          <VStack align="flex-start" spacing={2}>
            <Text fontWeight="semibold" fontSize="sm" color="gray.600">
              DESCRIPTION
            </Text>
            <Text fontSize="md" color="gray.700">
              {description}
            </Text>
          </VStack>
        )}

        <Divider />

        {/* Confirmation Status */}
        <VStack align="flex-start" spacing={3}>
          <Text fontWeight="semibold" fontSize="sm" color="gray.600">
            CONFIRMATION STATUS
          </Text>

          {status === 'confirmed' ? (
            <Box width="100%" p={3} bg="green.50" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="bold">Confirmed - {inCount} people going</Text>
              </HStack>
              <Progress value={100} colorScheme="green" borderRadius="full" />
            </Box>
          ) : threshold ? (
            <Box width="100%">
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="semibold">
                  {inCount}/{threshold} confirmations
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {Math.round(confirmationPercentage)}%
                </Text>
              </HStack>
              <Progress value={confirmationPercentage} colorScheme="blue" borderRadius="full" />
            </Box>
          ) : (
            <Text fontSize="sm" color="gray.600">
              No confirmation threshold set
            </Text>
          )}
        </VStack>

        {/* RSVP Breakdown */}
        <VStack align="flex-start" spacing={3}>
          <Text fontWeight="semibold" fontSize="sm" color="gray.600">
            RESPONSES
          </Text>
          <HStack spacing={4} width="100%">
            <Box flex={1} p={3} bg="green.50" borderRadius="md" textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="green.600">
                {inCount}
              </Text>
              <Text fontSize="xs" color="green.700">
                Going
              </Text>
            </Box>
            <Box flex={1} p={3} bg="yellow.50" borderRadius="md" textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="yellow.600">
                {maybeCount}
              </Text>
              <Text fontSize="xs" color="yellow.700">
                Maybe
              </Text>
            </Box>
            <Box flex={1} p={3} bg="red.50" borderRadius="md" textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="red.600">
                {outCount}
              </Text>
              <Text fontSize="xs" color="red.700">
                Not Going
              </Text>
            </Box>
          </HStack>
        </VStack>

        <Divider />

        {/* RSVP Buttons */}
        <RSVPButtons
          eventId={eventId}
          groupId={groupId}
          onSuccess={loadEventData}
          isEventConfirmed={status === 'confirmed'}
        />
      </CardBody>
    </Card>
  );
}
