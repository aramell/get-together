'use client';

import React from 'react';
import {
  Box,
  HStack,
  Tooltip,
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

interface CalendarGridProps {
  members: MemberRow[];
  daysOfMonth: Date[];
  onDateSelect?: (memberId: string, date: Date) => void;
}

/**
 * CalendarGrid Component
 * Renders a multi-member calendar grid showing availability by day
 * Each row represents one group member
 * Each column represents one day of the month
 */
export default function CalendarGrid({
  members,
  daysOfMonth,
  onDateSelect,
}: CalendarGridProps) {
  // Get availabilities for a specific member on a specific date
  const getMemberDateAvailabilities = (member: MemberRow, date: Date): AvailabilityData[] => {
    const dateStr = date.toISOString().split('T')[0];
    return member.availabilities.filter((avail) =>
      avail.start_time.startsWith(dateStr)
    );
  };

  // Get color for availability status
  const getStatusColor = (status: 'free' | 'busy' | 'unspecified'): string => {
    switch (status) {
      case 'free':
        return 'green.100';
      case 'busy':
        return 'red.100';
      case 'unspecified':
      default:
        return 'gray.100';
    }
  };

  // Get icon for availability status
  const getStatusIcon = (status: 'free' | 'busy' | 'unspecified'): string => {
    switch (status) {
      case 'free':
        return '✓';
      case 'busy':
        return '✗';
      case 'unspecified':
      default:
        return '?';
    }
  };

  // Get tooltip text for a member's availability on a date
  const getTooltipLabel = (member: MemberRow, date: Date, availabilities: AvailabilityData[]): string => {
    if (availabilities.length === 0) {
      return `${member.user_name} - No availability set`;
    }
    const status = availabilities[0].status;
    const statusText = status === 'free' ? 'Available' : 'Busy';
    return `${member.user_name} - ${statusText} ✓`;
  };

  if (members.length === 0) {
    return (
      <Text color="gray.500" textAlign="center" py={6}>
        No members in this group
      </Text>
    );
  }

  return (
    <Box overflowX="auto" w="100%">
      {/* Header Row - Day Numbers */}
      <HStack spacing={2} mb={4} minW="100%">
        <Box minW="150px" fontWeight="bold" fontSize="sm">
          Member
        </Box>
        {daysOfMonth.map((day) => (
          <Tooltip key={day.toISOString()} label={day.toLocaleDateString()}>
            <Box
              minW="40px"
              textAlign="center"
              fontWeight="bold"
              fontSize="xs"
              cursor="help"
            >
              {day.getDate()}
            </Box>
          </Tooltip>
        ))}
      </HStack>

      {/* Member Rows */}
      {members.map((member) => {
        const freeDays = daysOfMonth.filter((day) => {
          const avails = getMemberDateAvailabilities(member, day);
          return avails.length > 0 && avails[0].status === 'free';
        }).length;

        return (
          <HStack
            key={member.user_id}
            spacing={2}
            mb={3}
            align="flex-start"
            title={`${member.user_name} - ${freeDays} days free`}
          >
            {/* Member Name */}
            <Tooltip label={member.user_name} maxW="200px">
              <Box
                minW="150px"
                fontSize="sm"
                fontWeight="500"
                isTruncated
                cursor="help"
              >
                {member.user_name}
              </Box>
            </Tooltip>

            {/* Availability Grid for this Member */}
            {daysOfMonth.map((day) => {
              const dayAvailabilities = getMemberDateAvailabilities(member, day);
              const status = dayAvailabilities.length > 0
                ? dayAvailabilities[0].status
                : 'unspecified';
              const icon = getStatusIcon(status);
              const color = getStatusColor(status);

              return (
                <Tooltip
                  key={`${member.user_id}-${day.toISOString()}`}
                  label={getTooltipLabel(member, day, dayAvailabilities)}
                  placement="top"
                >
                  <Box
                    minW="40px"
                    h="30px"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.300"
                    bg={color}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="xs"
                    fontWeight="bold"
                    cursor="pointer"
                    onClick={() => onDateSelect?.(member.user_id, day)}
                    _hover={{
                      boxShadow: 'md',
                      transform: 'scale(1.05)',
                    }}
                    transition="all 0.2s"
                  >
                    {icon}
                  </Box>
                </Tooltip>
              );
            })}
          </HStack>
        );
      })}
    </Box>
  );
}
