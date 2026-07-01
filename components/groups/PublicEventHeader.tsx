'use client';

import React from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Progress,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiCalendar, FiMapPin } from 'react-icons/fi';

interface EventMomentum {
  in: number;
  maybe: number;
  out: number;
}

interface PublicEventHeaderProps {
  title: string;
  description: string;
  date: string;
  location?: string;
  threshold?: number;
  momentum: EventMomentum;
}

export const PublicEventHeader: React.FC<PublicEventHeaderProps> = ({
  title,
  description,
  date,
  location,
  threshold,
  momentum,
}) => {
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryColor = useColorModeValue('gray.600', 'gray.400');

  const totalConfirmed = momentum.in + (momentum.maybe || 0);
  const thresholdMet = threshold && totalConfirmed >= threshold;

  // Format date
  const eventDate = new Date(date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const confirmationPercentage = threshold
    ? (totalConfirmed / threshold) * 100
    : 0;

  return (
    <VStack
      spacing={4}
      align="stretch"
      p={{ base: 4, md: 6 }}
      bg="white"
      borderRadius="lg"
      boxShadow="sm"
    >
      {/* Title */}
      <Heading
        as="h1"
        size="lg"
        color={textColor}
      >
        Event: {title}
      </Heading>

      {/* Description */}
      <Text color={secondaryColor} fontSize="md" lineHeight="1.6">
        {description}
      </Text>

      {/* Date and Time */}
      <HStack spacing={2} color={secondaryColor} fontSize="sm">
        <FiCalendar size={16} />
        <Text>
          {formattedDate} at {formattedTime}
        </Text>
      </HStack>

      {/* Location */}
      {location && (
        <HStack spacing={2} color={secondaryColor} fontSize="sm">
          <FiMapPin size={16} />
          <Text>{location}</Text>
        </HStack>
      )}

      {/* Momentum Counter */}
      <Box
        role="status"
        aria-live="polite"
        aria-atomic="true"
        p={4}
        bg="blue.50"
        borderRadius="md"
        borderLeft="4px"
        borderColor="blue.500"
      >
        <HStack spacing={6} justify="space-around" wrap="wrap">
          <VStack spacing={1} align="center">
            <Text fontSize="2xl" fontWeight="bold" color="green.600">
              {momentum.in}
            </Text>
            <Text fontSize="xs" textTransform="uppercase" color="gray.600">
              IN
            </Text>
          </VStack>
          <VStack spacing={1} align="center">
            <Text fontSize="2xl" fontWeight="bold" color="yellow.600">
              {momentum.maybe}
            </Text>
            <Text fontSize="xs" textTransform="uppercase" color="gray.600">
              MAYBE
            </Text>
          </VStack>
          <VStack spacing={1} align="center">
            <Text fontSize="2xl" fontWeight="bold" color="red.600">
              {momentum.out}
            </Text>
            <Text fontSize="xs" textTransform="uppercase" color="gray.600">
              OUT
            </Text>
          </VStack>
        </HStack>
      </Box>

      {/* Threshold Progress */}
      {threshold && (
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" fontWeight="500" color={textColor}>
              {totalConfirmed}/{threshold} people committed to make this happen
            </Text>
            <Text
              fontSize="sm"
              color={thresholdMet ? 'green.600' : 'gray.600'}
              fontWeight={thresholdMet ? 'bold' : 'normal'}
            >
              {thresholdMet ? '✓ Confirmed!' : `${threshold - totalConfirmed} more needed`}
            </Text>
          </HStack>
          <Progress
            value={Math.min(confirmationPercentage, 100)}
            colorScheme={thresholdMet ? 'green' : 'blue'}
            hasStripe
            role="progressbar"
            aria-valuenow={totalConfirmed}
            aria-valuemin={0}
            aria-valuemax={threshold}
            aria-label={`Event confirmation: ${totalConfirmed} of ${threshold}`}
          />
        </VStack>
      )}
    </VStack>
  );
};
