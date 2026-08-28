'use client';

import React, { useState } from 'react';
import { Box, HStack, VStack, Text, Button, IconButton } from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';

export type DayAvailabilityStatus = 'free' | 'busy' | 'unknown';
export type AvailabilitySource = 'manual' | 'google' | 'both';

export interface AvailabilityGridMember {
  id: string;
  name: string;
  isCurrentUser?: boolean;
  availability: DayAvailabilityStatus[]; // one entry per `days`, merged manual+synced
  source?: AvailabilitySource[]; // per-day source, for transparency
}

export interface AvailabilityGridProps {
  days: string[]; // Forward window, e.g. next 7-14 days (ISO date strings, YYYY-MM-DD)
  members: AvailabilityGridMember[];
  overlapThreshold?: number; // minimum free members to highlight a day, default: majority
  onSlotTap: (day: string) => void; // opens creation modal pre-filled with that day
  onConnectGoogleCalendar?: () => void; // presence signals current user hasn't connected
}

function formatDayLabel(day: string): { weekday: string; short: string } {
  const date = new Date(`${day}T00:00:00`);
  return {
    weekday: date.toLocaleDateString('default', { weekday: 'short' }),
    short: date.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' }),
  };
}

export default function AvailabilityGrid({
  days,
  members,
  overlapThreshold,
  onSlotTap,
  onConnectGoogleCalendar,
}: AvailabilityGridProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const threshold = overlapThreshold ?? Math.floor(members.length / 2) + 1;

  const orderedMembers = [...members].sort((a, b) => {
    if (a.isCurrentUser && !b.isCurrentUser) return -1;
    if (!a.isCurrentUser && b.isCurrentUser) return 1;
    return 0;
  });

  const freeCountForDay = (dayIndex: number): number =>
    members.reduce((count, member) => (member.availability[dayIndex] === 'free' ? count + 1 : count), 0);

  return (
    <VStack align="stretch" spacing={4}>
      {onConnectGoogleCalendar && !bannerDismissed && (
        <Box
          borderWidth="1px"
          borderColor="blue.200"
          bg="blue.50"
          borderRadius="md"
          p={3}
        >
          <HStack justify="space-between" align="center">
            <Text fontSize="sm">📅 Connect Google Calendar to see your real availability</Text>
            <HStack spacing={2}>
              <Button size="sm" colorScheme="blue" onClick={onConnectGoogleCalendar}>
                Connect
              </Button>
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Dismiss Google Calendar connect prompt"
                icon={<CloseIcon boxSize={2.5} />}
                onClick={() => setBannerDismissed(true)}
              />
            </HStack>
          </HStack>
        </Box>
      )}

      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="lg"
        p={4}
        overflowX="auto"
        role="table"
        aria-label="Group members' upcoming availability"
      >
        {/* Header row */}
        <HStack spacing={2} mb={3} minW="100%" role="row">
          <Box minW="120px" fontWeight="bold" fontSize="sm" as="span" role="columnheader">
            Member
          </Box>
          {days.map((day) => {
            const { weekday, short } = formatDayLabel(day);
            return (
              <Box
                key={day}
                minW="44px"
                textAlign="center"
                fontWeight="bold"
                fontSize="xs"
                role="columnheader"
                aria-label={short}
              >
                {weekday}
              </Box>
            );
          })}
        </HStack>

        {/* Member rows */}
        {orderedMembers.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={6} role="status">
            No members in this group
          </Text>
        ) : (
          orderedMembers.map((member) => (
            <HStack key={member.id} spacing={2} mb={2} align="center" role="row">
              <Box minW="120px" fontSize="sm" fontWeight="500" isTruncated role="rowheader" title={member.name}>
                {member.name}
              </Box>
              {days.map((day, dayIndex) => {
                const status = member.availability[dayIndex] ?? 'unknown';
                const { short } = formatDayLabel(day);
                const statusLabel = status === 'free' ? 'free' : status === 'busy' ? 'busy' : 'no data';

                return (
                  <Box
                    key={`${member.id}-${day}`}
                    minW="44px"
                    h="32px"
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="sm"
                    fontWeight="bold"
                    bg={status === 'free' ? '#f0fdf4' : status === 'busy' ? '#f3f4f6' : 'transparent'}
                    color={status === 'free' ? '#10b981' : '#d1d5db'}
                    role="gridcell"
                    aria-label={`${member.name}, ${short}, ${statusLabel}`}
                  >
                    {status === 'free' ? '✓' : status === 'unknown' ? '·' : ''}
                  </Box>
                );
              })}
            </HStack>
          ))
        )}

        {/* Overlap band */}
        {days.length > 0 && (
          <HStack spacing={2} mt={3} pt={3} borderTop="1px solid" borderColor="gray.200" role="row">
            <Box minW="120px" fontSize="xs" color="gray.500" role="rowheader">
              Propose
            </Box>
            {days.map((day, dayIndex) => {
              const freeCount = freeCountForDay(dayIndex);
              const isHighlighted = members.length > 0 && freeCount >= threshold;
              const { short } = formatDayLabel(day);

              return (
                <Box
                  key={`overlap-${day}`}
                  as="button"
                  type="button"
                  minW="44px"
                  h="28px"
                  borderRadius="md"
                  bg={isHighlighted ? '#e0e7ff' : 'transparent'}
                  border={isHighlighted ? '1px solid' : '1px dashed'}
                  borderColor={isHighlighted ? '#6366f1' : 'gray.300'}
                  fontSize="xs"
                  fontWeight={isHighlighted ? 'bold' : 'normal'}
                  cursor="pointer"
                  role="gridcell"
                  aria-label={`${short}, ${freeCount} of ${members.length} members free, tap to propose`}
                  onClick={() => onSlotTap(day)}
                >
                  {freeCount}/{members.length}
                </Box>
              );
            })}
          </HStack>
        )}
      </Box>
    </VStack>
  );
}
