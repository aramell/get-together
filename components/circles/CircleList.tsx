'use client';

import React from 'react';
import { Box, Button, HStack, Spinner, Text, VStack } from '@chakra-ui/react';

export interface CircleSummary {
  id: string;
  name: string;
  contactCount: number;
  createdAt: string;
}

interface CircleListProps {
  circles: CircleSummary[];
  loading?: boolean;
  onCreateClick: () => void;
  onCircleClick: (circleId: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function contactLabel(count: number): string {
  return `${count} contact${count === 1 ? '' : 's'}`;
}

/**
 * List of a user's social circles, with create/empty state (Story 10.3, AC1, AC2, AC8)
 */
export const CircleList: React.FC<CircleListProps> = ({
  circles,
  loading = false,
  onCreateClick,
  onCircleClick,
}) => {
  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <Text fontSize="sm" color="gray.600">
          Reusable contact lists you can bulk-invite to groups and events.
        </Text>
        <Button colorScheme="teal" onClick={onCreateClick} aria-label="Create Circle" minHeight="48px">
          Create Circle
        </Button>
      </HStack>

      {loading ? (
        <HStack>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.500">
            Loading circles...
          </Text>
        </HStack>
      ) : circles.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          No circles yet. Create one to bulk-invite your friends.
        </Text>
      ) : (
        <VStack align="stretch" spacing={2} data-testid="circles-list">
          {circles.map((circle) => (
            <Box
              key={circle.id}
              as="button"
              type="button"
              onClick={() => onCircleClick(circle.id)}
              borderWidth="1px"
              borderRadius="md"
              p={3}
              textAlign="left"
              minHeight="48px"
              aria-label={`${circle.name}, ${contactLabel(circle.contactCount)}`}
            >
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontWeight="medium">{circle.name}</Text>
                  <Text fontSize="xs" color="gray.500">
                    Created {formatDate(circle.createdAt)}
                  </Text>
                </VStack>
                <Text fontSize="sm" color="gray.500">
                  {contactLabel(circle.contactCount)}
                </Text>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </VStack>
  );
};

export default CircleList;
