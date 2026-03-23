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
  Box,
  Progress,
} from '@chakra-ui/react';
import { EventWithMomentum } from './EventList';

interface EventCardProps {
  event: EventWithMomentum;
  userRsvpStatus?: 'in' | 'maybe' | 'out' | null;
  onClick?: () => void;
}

export function EventCard({ event, userRsvpStatus, onClick }: EventCardProps) {
  const {
    id: eventId,
    group_id: groupId,
    title,
    date,
    threshold: initialThreshold,
    status,
    created_by: createdBy,
    momentum: initialMomentum,
  } = event;
  const momentum = initialMomentum || { in: 0, maybe: 0, out: 0 };

  const eventDate = new Date(date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const momentumText = `${momentum.in} in, ${momentum.maybe} maybe, ${momentum.out} out`;

  const inCount = momentum.in || 0;

  return (
    <Card
      data-event-id={eventId}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      cursor={onClick ? 'pointer' : 'default'}
      _hover={onClick ? { boxShadow: 'md' } : undefined}
      _focus={{
        outline: '2px solid',
        outlineColor: 'blue.500',
        outlineOffset: '2px',
      }}
      transition="all 0.2s"
      width="100%"
      maxWidth="100%"
    >
      <CardHeader pb={2}>
        <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={2}>
          <VStack align="flex-start" spacing={1} flex={1} minWidth="0">
            <Heading size="md" fontSize={['20px', '24px', '28px']}>{title}</Heading>
            <Text fontSize={['14px', '16px']} color="gray.600">
              {formattedDate} {formattedTime}
            </Text>
          </VStack>
          <Badge
            colorScheme={status === 'confirmed' ? 'green' : status === 'cancelled' ? 'gray' : 'yellow'}
            fontSize={['xs', 'sm']}
            px={2}
            py={1}
            whiteSpace="nowrap"
          >
            {status === 'confirmed' ? '✓ Confirmed' : status === 'cancelled' ? 'Cancelled' : 'Proposed'}
          </Badge>
        </HStack>
      </CardHeader>

      <CardBody spacing={[3, 4]} px={[3, 4]} py={[3, 4]}>
        <VStack align="stretch" spacing={[3, 4]}>
          {/* Momentum Counter */}
          <Box
            p={[3, 4]}
            bg="gray.50"
            borderRadius="md"
            borderLeft="4px solid"
            borderColor="blue.500"
            aria-live="polite"
          >
            <Text fontSize={['14px', '16px']} color="gray.600" fontWeight="medium">
              RSVPs: {momentumText}
            </Text>
          </Box>

          {/* Threshold Display */}
          {initialThreshold !== null && initialThreshold !== undefined && (
            <Box
              p={[3, 4]}
              bg="blue.50"
              borderRadius="md"
              borderLeft="4px solid"
              borderColor="blue.300"
            >
              <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                <Text fontSize={['14px', '16px']} color="gray.600" fontWeight="medium">
                  Confirmation Status
                </Text>
                <Text fontSize={['14px', '16px']} fontWeight="bold">
                  {inCount}/{initialThreshold}
                </Text>
              </HStack>
              <Progress
                value={inCount}
                max={initialThreshold}
                size="sm"
                colorScheme={inCount >= initialThreshold ? 'green' : 'blue'}
                height={['6px', '8px']}
              />
            </Box>
          )}

          {/* RSVP Status Indicator */}
          {userRsvpStatus && (
            <Box p={[2, 3]} bg="gray.100" borderRadius="md" minHeight="44px" display="flex" alignItems="center">
              <Text fontSize={['14px', '16px']} fontWeight="medium">
                Your RSVP: {userRsvpStatus.charAt(0).toUpperCase() + userRsvpStatus.slice(1)}
              </Text>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
