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

  // Signature treatment: a proposed event reads like a note freshly pinned to
  // a corkboard (tilted, cork-tan edge, dashed outline). Once it's confirmed,
  // it settles flat and gets a solid meadow border — the plan has "stuck."
  const isConfirmed = status === 'confirmed';
  const isCancelled = status === 'cancelled';
  const pinTilt = (eventId.charCodeAt(0) % 5 === 0) ? '1.2deg' : '-1.2deg';

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
      position="relative"
      opacity={isCancelled ? 0.6 : 1}
      transform={isConfirmed || isCancelled ? 'rotate(0deg)' : `rotate(${pinTilt})`}
      borderLeftWidth="5px"
      borderLeftColor={isConfirmed ? 'meadow.500' : isCancelled ? 'gray.300' : 'cork.400'}
      borderStyle={isConfirmed || isCancelled ? 'solid' : 'dashed'}
      _hover={onClick ? { boxShadow: 'md', transform: 'rotate(0deg)' } : undefined}
      _focus={{
        outline: '2px solid',
        outlineColor: 'coral.500',
        outlineOffset: '2px',
      }}
      transition="all 0.2s"
      width="100%"
      maxWidth="100%"
      aria-label={onClick ? `View event: ${title}` : undefined}
    >
      {/* Pushpin / seal marker — pin while pending, sealed check once confirmed */}
      <Box
        position="absolute"
        top="-8px"
        left="16px"
        width="16px"
        height="16px"
        borderRadius="full"
        bg={isConfirmed ? 'meadow.500' : isCancelled ? 'gray.400' : 'coral.500'}
        border="2px solid"
        borderColor="paper.200"
        aria-hidden="true"
      />

      <CardHeader pb={2}>
        <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={2}>
          <VStack align="flex-start" spacing={1} flex={1} minWidth="0">
            <Heading size="md" fontSize={['20px', '24px', '28px']}>{title}</Heading>
            <Text fontSize={['14px', '16px']} color="ink.500">
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

      <CardBody px={[3, 4]} py={[3, 4]}>
        <VStack align="stretch" spacing={[3, 4]}>
          {/* Momentum Counter */}
          <Box
            p={[3, 4]}
            bg="paper.100"
            borderRadius="md"
            borderLeft="4px solid"
            borderColor="marigold.500"
            aria-live="polite"
            aria-atomic="true"
          >
            <Text fontSize={['14px', '16px']} color="ink.600" fontWeight="medium">
              RSVPs: {momentumText}
            </Text>
          </Box>

          {/* Threshold Display */}
          {initialThreshold !== null && initialThreshold !== undefined && (
            <Box
              p={[3, 4]}
              bg={inCount >= initialThreshold ? 'meadow.50' : 'paper.100'}
              borderRadius="md"
              borderLeft="4px solid"
              borderColor={inCount >= initialThreshold ? 'meadow.400' : 'cork.300'}
            >
              <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                <Text fontSize={['14px', '16px']} color="ink.600" fontWeight="medium">
                  Confirmation Status
                </Text>
                <Text fontSize={['14px', '16px']} fontWeight="bold" fontFamily="mono">
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
            <Box p={[2, 3]} bg="ink.50" borderRadius="md" minHeight="44px" display="flex" alignItems="center">
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
