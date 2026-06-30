'use client';

import React, { useMemo } from 'react';
import {
  Box,
  Badge,
  Tooltip,
  VStack,
  HStack,
  Text,
} from '@chakra-ui/react';

export interface AvailabilityData {
  id: string;
  user_id: string;
  group_id: string;
  start_time: string;
  end_time: string;
  status: 'free' | 'busy';
  version: number;
  created_at: string;
  updated_at: string;
}

export interface MemberRow {
  user_id: string;
  user_name: string;
  availabilities: AvailabilityData[];
}

interface MemberCountBadgeProps {
  members: MemberRow[];
  showPeakTimes?: boolean;
}

/**
 * MemberCountBadge Component
 * Displays statistics about member availability
 * Shows peak times when most members are free
 */
export default function MemberCountBadge({
  members,
  showPeakTimes = true,
}: MemberCountBadgeProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    if (members.length === 0) {
      return {
        totalMembers: 0,
        availableMembers: 0,
        busyMembers: 0,
        unspecifiedMembers: 0,
        availabilityPercentage: 0,
        peakTimes: [] as Array<{ time: string; count: number; members: string[] }>,
      };
    }

    let totalAvailable = 0;
    let totalBusy = 0;
    let totalUnspecified = 0;

    // Count members by status
    members.forEach((member) => {
      if (member.availabilities.length === 0) {
        totalUnspecified++;
      } else {
        const freeCount = member.availabilities.filter(
          (a) => a.status === 'free'
        ).length;
        const busyCount = member.availabilities.filter(
          (a) => a.status === 'busy'
        ).length;

        if (freeCount > 0) totalAvailable++;
        if (busyCount > 0) totalBusy++;
        if (freeCount === 0 && busyCount === 0) totalUnspecified++;
      }
    });

    // Calculate peak times (times when most members are free)
    const timeSlots = new Map<string, { count: number; members: string[] }>();
    members.forEach((member) => {
      member.availabilities
        .filter((a) => a.status === 'free')
        .forEach((avail) => {
          const timeKey = `${avail.start_time.split('T')[1]} - ${avail.end_time.split('T')[1]}`;
          if (!timeSlots.has(timeKey)) {
            timeSlots.set(timeKey, { count: 0, members: [] });
          }
          const slot = timeSlots.get(timeKey)!;
          slot.count++;
          slot.members.push(member.user_name);
        });
    });

    // Get top 3 peak times
    const peakTimes = Array.from(timeSlots.entries())
      .map(([time, data]) => ({
        time,
        ...data,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalMembers: members.length,
      availableMembers: totalAvailable,
      busyMembers: totalBusy,
      unspecifiedMembers: totalUnspecified,
      availabilityPercentage: Math.round(
        (totalAvailable / members.length) * 100
      ),
      peakTimes,
    };
  }, [members]);

  return (
    <VStack align="stretch" spacing={4}>
      {/* Summary Stats */}
      <HStack spacing={4} flexWrap="wrap">
        <Tooltip label={`${stats.availableMembers} members have marked availability`}>
          <Badge colorScheme="green" fontSize="md" px={3} py={1}>
            {stats.availableMembers} Available
          </Badge>
        </Tooltip>

        <Tooltip label={`${stats.busyMembers} members marked as busy`}>
          <Badge colorScheme="red" fontSize="md" px={3} py={1}>
            {stats.busyMembers} Busy
          </Badge>
        </Tooltip>

        <Tooltip label={`${stats.unspecifiedMembers} members haven't set availability`}>
          <Badge colorScheme="gray" fontSize="md" px={3} py={1}>
            {stats.unspecifiedMembers} Unspecified
          </Badge>
        </Tooltip>

        <Tooltip label={`${stats.availabilityPercentage}% of members have availability`}>
          <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
            {stats.availabilityPercentage}% Complete
          </Badge>
        </Tooltip>
      </HStack>

      {/* Peak Times Section */}
      {showPeakTimes && stats.peakTimes.length > 0 && (
        <Box
          bg="blue.50"
          border="1px solid"
          borderColor="blue.200"
          borderRadius="md"
          p={3}
        >
          <Text fontWeight="bold" fontSize="sm" mb={2} color="blue.900">
            📅 Peak Free Times
          </Text>
          <VStack align="stretch" spacing={2}>
            {stats.peakTimes.map((peak, idx) => (
              <Tooltip
                key={idx}
                label={`Members: ${peak.members.join(', ')}`}
                maxW="300px"
              >
                <HStack justify="space-between" fontSize="sm">
                  <Text color="blue.800">{peak.time}</Text>
                  <Badge colorScheme="green" variant="subtle">
                    {peak.count} free
                  </Badge>
                </HStack>
              </Tooltip>
            ))}
          </VStack>
        </Box>
      )}

      {/* Empty State */}
      {stats.totalMembers === 0 && (
        <Text color="gray.500" textAlign="center" py={4}>
          No members in group yet
        </Text>
      )}
    </VStack>
  );
}
