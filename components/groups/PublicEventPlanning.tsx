'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Checkbox,
  Divider,
  Spinner,
} from '@chakra-ui/react';

interface PublicChecklistItem {
  id: string;
  title: string;
  is_checked: boolean;
  assignee_first_name: string | null;
}

interface PublicLogisticsItem {
  id: string;
  category: 'bring' | 'carpool';
  title: string;
  capacity: number | null;
  assignee_first_name: string | null;
  claim_count: number;
  claimant_first_names: string[];
}

interface PublicTimelineItem {
  id: string;
  item_time: string;
  title: string;
  description: string | null;
}

interface PublicPlanningData {
  checklist: PublicChecklistItem[];
  logistics: PublicLogisticsItem[];
  timeline: PublicTimelineItem[];
}

interface PublicEventPlanningProps {
  publicToken: string;
}

/**
 * Read-only view of an event's checklist/logistics/timeline for guests on
 * the public link — no login, no editing. Gated server-side by the same
 * public_token as the rest of the page (see Story 7.3 follow-up).
 */
export const PublicEventPlanning: React.FC<PublicEventPlanningProps> = ({ publicToken }) => {
  const [data, setData] = useState<PublicPlanningData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPlanning = async () => {
      try {
        const response = await fetch(`/api/events/public/${publicToken}/planning`);
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled && result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error('Failed to load public planning data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPlanning();
    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  if (loading) {
    return (
      <HStack justify="center" py={4}>
        <Spinner size="sm" />
        <Text fontSize="sm" color="gray.500">
          Loading trip details...
        </Text>
      </HStack>
    );
  }

  if (!data) return null;

  const hasAnything =
    data.checklist.length > 0 || data.logistics.length > 0 || data.timeline.length > 0;

  if (!hasAnything) return null;

  return (
    <VStack spacing={6} align="stretch" bg="white" borderRadius="lg" boxShadow="sm" p={{ base: 4, md: 6 }}>
      {data.timeline.length > 0 && (
        <Box>
          <Heading as="h2" size="sm" mb={3}>
            Schedule
          </Heading>
          <VStack spacing={2} align="stretch">
            {data.timeline.map((item) => (
              <HStack key={item.id} spacing={3} align="baseline">
                <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="90px">
                  {new Date(item.item_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
                <Box>
                  <Text fontWeight="medium">{item.title}</Text>
                  {item.description && (
                    <Text fontSize="sm" color="gray.600">
                      {item.description}
                    </Text>
                  )}
                </Box>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      {data.timeline.length > 0 && (data.checklist.length > 0 || data.logistics.length > 0) && (
        <Divider />
      )}

      {data.checklist.length > 0 && (
        <Box>
          <Heading as="h2" size="sm" mb={3}>
            Checklist
          </Heading>
          <VStack spacing={2} align="stretch">
            {data.checklist.map((item) => (
              <HStack key={item.id} spacing={3}>
                <Checkbox isChecked={item.is_checked} isDisabled aria-label={item.title} />
                <Text
                  flex={1}
                  textDecoration={item.is_checked ? 'line-through' : 'none'}
                  color={item.is_checked ? 'gray.400' : 'gray.800'}
                >
                  {item.title}
                </Text>
                {item.assignee_first_name && (
                  <Badge colorScheme="cyan" fontSize="xs">
                    {item.assignee_first_name}
                  </Badge>
                )}
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      {data.checklist.length > 0 && data.logistics.length > 0 && <Divider />}

      {data.logistics.length > 0 && (
        <Box>
          <Heading as="h2" size="sm" mb={3}>
            Who&apos;s Bringing What
          </Heading>
          <VStack spacing={2} align="stretch">
            {data.logistics.map((item) => (
              <HStack key={item.id} spacing={3}>
                <Badge colorScheme={item.category === 'carpool' ? 'purple' : 'orange'} fontSize="xs">
                  {item.category === 'carpool' ? 'Ride' : 'Bring'}
                </Badge>
                <Text flex={1}>{item.title}</Text>
                {item.category === 'bring' && item.assignee_first_name && (
                  <Text fontSize="sm" color="gray.600">
                    {item.assignee_first_name}
                  </Text>
                )}
                {item.category === 'carpool' && (
                  <Text fontSize="sm" color="gray.600">
                    {item.claim_count}/{item.capacity} seats
                    {item.claimant_first_names.length > 0 &&
                      ` — ${item.claimant_first_names.join(', ')}`}
                  </Text>
                )}
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
};

export default PublicEventPlanning;
