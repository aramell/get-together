'use client';

import { Box, HStack, VStack, Text, Badge, Progress, useToast } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

interface MomentumCounterProps {
  eventId: string;
  threshold?: number | null;
  isConfirmed?: boolean;
  onConfirmation?: () => void;
}

interface MomentumData {
  in: number;
  maybe: number;
  out: number;
  threshold?: number;
  thresholdMet?: boolean;
}

export function MomentumCounter({
  eventId,
  threshold,
  isConfirmed,
  onConfirmation,
}: MomentumCounterProps) {
  const toast = useToast();
  const [momentum, setMomentum] = useState<MomentumData>({
    in: 0,
    maybe: 0,
    out: 0,
  });
  const [wasConfirmed, setWasConfirmed] = useState(isConfirmed ?? false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMomentum();
    // Poll for real-time updates every 1 second
    const interval = setInterval(loadMomentum, 1000);
    return () => clearInterval(interval);
  }, [eventId]);

  useEffect(() => {
    // Detect threshold crossing for celebration animation
    if (
      momentum.thresholdMet &&
      !wasConfirmed &&
      !isConfirmed &&
      momentum.threshold
    ) {
      setWasConfirmed(true);
      toast({
        title: 'Event Confirmed! 🎉',
        description: `Enough confirmations received! The event is now confirmed.`,
        status: 'success',
        duration: 4000,
        isClosable: true,
        position: 'top',
      });
      onConfirmation?.();
    }
  }, [momentum.thresholdMet, wasConfirmed, isConfirmed, toast, onConfirmation]);

  const loadMomentum = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/momentum`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setMomentum(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading momentum:', error);
    } finally {
      setLoading(false);
    }
  };

  const total = momentum.in + momentum.maybe + momentum.out;
  const inPercentage = total > 0 ? (momentum.in / total) * 100 : 0;

  return (
    <VStack spacing={3} align="stretch" width="100%">
      <Box
        p={4}
        bg={isConfirmed || momentum.thresholdMet ? 'green.50' : 'gray.50'}
        borderRadius="md"
        borderLeft={isConfirmed || momentum.thresholdMet ? '4px solid' : '4px solid'}
        borderColor={isConfirmed || momentum.thresholdMet ? 'green.500' : 'blue.500'}
        transition="all 0.3s ease"
      >
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between" align="flex-start">
            <Text fontSize="sm" fontWeight="semibold" color="gray.600">
              Momentum
            </Text>
            {isConfirmed && (
              <Badge colorScheme="green" borderRadius="full">
                Confirmed
              </Badge>
            )}
          </HStack>

          {/* Progress bar showing "IN" vs others */}
          {total > 0 && threshold && (
            <Box width="100%">
              <Progress
                value={Math.min((momentum.in / threshold) * 100, 100)}
                colorScheme={momentum.in >= threshold ? 'green' : 'blue'}
                size="lg"
                borderRadius="full"
              />
              <HStack justify="space-between" mt={2}>
                <Text fontSize="xs" color="gray.600">
                  {momentum.in} / {threshold} confirmations
                </Text>
                {threshold && (
                  <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                    {Math.round((momentum.in / threshold) * 100)}%
                  </Text>
                )}
              </HStack>
            </Box>
          )}

          {/* Vote breakdown */}
          <HStack spacing={4} width="100%">
            <VStack align="center" spacing={1} flex={1}>
              <Text fontWeight="bold" fontSize="lg" color="green.600">
                {momentum.in}
              </Text>
              <Text fontSize="xs" color="gray.600">
                In
              </Text>
            </VStack>

            <VStack align="center" spacing={1} flex={1}>
              <Text fontWeight="bold" fontSize="lg" color="yellow.600">
                {momentum.maybe}
              </Text>
              <Text fontSize="xs" color="gray.600">
                Maybe
              </Text>
            </VStack>

            <VStack align="center" spacing={1} flex={1}>
              <Text fontWeight="bold" fontSize="lg" color="red.600">
                {momentum.out}
              </Text>
              <Text fontSize="xs" color="gray.600">
                Out
              </Text>
            </VStack>
          </HStack>

          {/* Status message */}
          {threshold && (
            <Text fontSize="xs" color="gray.600" textAlign="center">
              {momentum.in >= threshold
                ? '✓ Event has enough confirmations'
                : `${threshold - momentum.in} more confirmations needed`}
            </Text>
          )}
        </VStack>
      </Box>
    </VStack>
  );
}
