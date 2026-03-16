'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Spinner,
  Text,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { EventCard } from './EventCard';

export interface EventWithMomentum {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  date: string;
  threshold?: number | null;
  status: 'proposal' | 'confirmed' | 'cancelled';
  momentum: {
    in: number;
    maybe: number;
    out: number;
  };
  created_at: string;
  updated_at: string;
}

export interface EventListProps {
  groupId: string;
  userId: string;
  limit?: number;
  onEventClick?: (event: EventWithMomentum) => void;
  enablePolling?: boolean;
  userRsvpStatus?: Record<string, 'in' | 'maybe' | 'out'>;
}

export const EventList: React.FC<EventListProps> = ({
  groupId,
  userId,
  limit = 20,
  onEventClick,
  enablePolling = false,
  userRsvpStatus = {},
}) => {
  const [events, setEvents] = useState<EventWithMomentum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousEventIdsRef = useRef<Set<string>>(new Set());

  // Fetch events from API
  const fetchEvents = useCallback(
    async (currentOffset: number = 0, isLoadingMore: boolean = false) => {
      try {
        if (!isLoadingMore) {
          setLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const url = new URL(
          `/api/groups/${groupId}/events`,
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
        );
        url.searchParams.set('limit', limit.toString());
        url.searchParams.set('offset', currentOffset.toString());

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch events');
        }

        const newEvents = result.data || [];

        if (isLoadingMore) {
          // Append events for "Load More"
          setEvents(prevEvents => [...prevEvents, ...newEvents]);
          setOffset(currentOffset + limit);
        } else {
          // Replace events for initial load or polling
          setEvents(newEvents);
          setOffset(limit);
        }

        setTotalCount(result.total_count || 0);
      } catch (err: any) {
        console.error('Error loading events:', err);
        setError(err.message || 'An error occurred while loading events');
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [groupId, limit]
  );

  // Initial load
  useEffect(() => {
    fetchEvents(0, false);
  }, [groupId, fetchEvents]);

  // Set up real-time polling
  useEffect(() => {
    if (!enablePolling) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      return;
    }

    // Poll every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      // Fetch only the first page to detect new events
      fetchEvents(0, false).then(() => {
        // Check if new events were added
        const currentEventIds = new Set(events.map(e => e.id));
        const previousEventIds = previousEventIdsRef.current;

        const hasNewEvents = events.some(e => !previousEventIds.has(e.id));

        if (hasNewEvents) {
          // Reset pagination when new events are detected
          setOffset(limit);
        }

        // Update previous event IDs
        previousEventIdsRef.current = currentEventIds;
      });
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [enablePolling, events, limit, fetchEvents]);

  const handleLoadMore = () => {
    fetchEvents(offset, true);
  };

  const hasMoreEvents = offset + limit < totalCount;

  if (loading) {
    return (
      <HStack justify="center" py={8}>
        <Spinner color="blue.500" />
        <Text>Loading events...</Text>
      </HStack>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Text>Error loading events: {error}</Text>
      </Alert>
    );
  }

  if (events.length === 0) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text>No events yet. Create one using the "Propose Event" button above.</Text>
      </Alert>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          userRsvpStatus={userRsvpStatus[event.id] || null}
          onClick={onEventClick ? () => onEventClick(event) : undefined}
        />
      ))}

      {/* Load More Button */}
      {hasMoreEvents && (
        <Box pt={4} textAlign="center">
          <Button
            colorScheme="blue"
            variant="outline"
            onClick={handleLoadMore}
            isLoading={isLoadingMore}
            loadingText="Loading..."
          >
            Load More Events ({events.length} of {totalCount})
          </Button>
        </Box>
      )}
    </VStack>
  );
};

export default EventList;
