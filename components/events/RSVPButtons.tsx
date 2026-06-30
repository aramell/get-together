'use client';

import { HStack, Button, Spinner, useToast, VStack, Text } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

interface RSVPButtonsProps {
  eventId: string;
  groupId: string;
  currentStatus?: 'in' | 'maybe' | 'out' | null;
  onSuccess?: () => void;
  isEventConfirmed?: boolean;
}

const statusConfig = {
  in: { label: 'In', color: 'green', icon: '✓' },
  maybe: { label: 'Maybe', color: 'yellow', icon: '?' },
  out: { label: 'Out', color: 'red', icon: '✕' },
};

export function RSVPButtons({ eventId, groupId, currentStatus, onSuccess, isEventConfirmed }: RSVPButtonsProps) {
  const toast = useToast();
  const { userId } = useAuth();
  const [status, setStatus] = useState<'in' | 'maybe' | 'out' | null>(currentStatus ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(!currentStatus);

  // Load user's current RSVP status if not provided
  useEffect(() => {
    if (currentStatus === undefined && userId && !isLoadingStatus) {
      loadCurrentStatus();
    }
  }, [eventId, userId, currentStatus]);

  const loadCurrentStatus = async () => {
    if (!userId) return;
    setIsLoadingStatus(true);
    try {
      const response = await fetch(
        `/api/groups/${groupId}/events/${eventId}/rsvp-status`,
        {
          headers: {
            'x-user-id': userId,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStatus(data.data.status);
        }
      }
    } catch (error) {
      console.error('Error loading RSVP status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleRsvp = async (newStatus: 'in' | 'maybe' | 'out') => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Don't allow submission while still loading current status
    if (isLoadingStatus) {
      toast({
        title: 'Loading',
        description: 'Please wait while we load your current selection',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    // Optimistic update
    const previousStatus = status;
    setStatus(newStatus);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/groups/${groupId}/events/${eventId}/rsvp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update on error
        setStatus(previousStatus);
        throw new Error(data.message || 'Failed to update RSVP');
      }

      toast({
        title: 'Success',
        description: `You marked the event as "${statusConfig[newStatus].label}"`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      onSuccess?.();
    } catch (error: any) {
      setStatus(previousStatus);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update RSVP',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack spacing={3} align="stretch" width="100%">
      <VStack align="flex-start" spacing={1}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.600">
          Your Response
        </Text>
        {isEventConfirmed && (
          <Text fontSize="xs" color="green.600">
            Event is confirmed even though some people may change their response
          </Text>
        )}
      </VStack>
      <HStack spacing={3} width="100%" justify="space-between" opacity={isEventConfirmed ? 0.7 : 1}>
        {(Object.entries(statusConfig) as Array<[string, any]>).map(([key, config]) => (
          <Button
            key={key}
            minH="48px"
            flex={1}
            variant={status === key ? 'solid' : 'outline'}
            colorScheme={config.color}
            onClick={() => handleRsvp(key as 'in' | 'maybe' | 'out')}
            isDisabled={isLoading || isLoadingStatus}
            isLoading={isLoading && status === key}
            spinner={<Spinner size="sm" />}
            aria-label={`Mark event as ${config.label}`}
            aria-pressed={status === key}
            fontSize={isEventConfirmed ? 'sm' : 'md'}
          >
            {config.icon} {config.label}
          </Button>
        ))}
      </HStack>
    </VStack>
  );
}
