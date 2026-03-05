'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Grid,
  GridItem,
  Badge,
  Spinner,
  Tooltip,
  Alert,
  AlertIcon,
  VisuallyHidden,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import MarkAvailabilityModal from './MarkAvailabilityModal';
import { AvailabilityWithUser } from '@/lib/validation/availabilitySchema';

interface SoftCalendarProps {
  groupId: string;
  isGroupMember: boolean;
}

interface AvailabilityData {
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

interface MemberAvailabilities {
  user_id: string;
  user_name: string;
  availabilities: AvailabilityData[];
}

export default function SoftCalendar({
  groupId,
  isGroupMember,
}: SoftCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [members, setMembers] = useState<MemberAvailabilities[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [liveRegionMessage, setLiveRegionMessage] = useState<string>('');

  // Fetch calendar data for current month
  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get month start and end dates
      const monthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const monthEnd = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );

      const startDate = monthStart.toISOString();
      const endDate = new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(
        `/api/groups/${groupId}/calendar?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendar data');
      }

      const data = await response.json();
      if (data.success) {
        setMembers(data.data?.members || []);
      } else {
        throw new Error(data.errorCode || 'Failed to fetch calendar data');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch calendar data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentDate, groupId]);

  // Fetch calendar data on mount and when month changes
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Set up polling (5-second interval for real-time MVP)
  useEffect(() => {
    const interval = setInterval(fetchCalendarData, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [fetchCalendarData]);

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    const monthYear = newDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    setLiveRegionMessage(`Navigated to ${monthYear}`);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    const monthYear = newDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    setLiveRegionMessage(`Navigated to ${monthYear}`);
  };

  const handleMarkAvailabilitySuccess = () => {
    setShowMarkModal(false);
    fetchCalendarData();
  };

  // Get availabilities for a specific date and member
  const getMemberDateAvailabilities = (member: MemberAvailabilities, date: Date): AvailabilityData[] => {
    const dateStr = date.toISOString().split('T')[0];
    return member.availabilities.filter((avail) =>
      avail.start_time.startsWith(dateStr)
    );
  };

  // Generate days of current month for display
  const monthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const monthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );
  const daysInMonth = monthEnd.getDate();

  const daysOfMonth: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    daysOfMonth.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  // Get color for a single availability status
  const getAvailabilityColor = (status: 'free' | 'busy'): string => {
    return status === 'free' ? 'green.100' : 'red.100';
  };

  if (loading && members.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="lg" color="blue.500" />
        <Text mt={4}>Loading calendar...</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch" role="main" aria-label="Group soft calendar view">
      {/* Live region for screen reader announcements */}
      <Box
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Calendar navigation updates"
      >
        <VisuallyHidden>{liveRegionMessage}</VisuallyHidden>
      </Box>

      {/* Header with month navigation */}
      <HStack justify="space-between" align="center">
        <Button
          leftIcon={<ChevronLeftIcon />}
          onClick={handlePrevMonth}
          variant="outline"
          aria-label={`View previous month`}
          title="View previous month"
        >
          Previous
        </Button>

        <Text
          fontSize="2xl"
          fontWeight="bold"
          aria-label={`Current month: ${currentDate.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          })}`}
        >
          {currentDate.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          })}
        </Text>

        <Button
          rightIcon={<ChevronRightIcon />}
          onClick={handleNextMonth}
          variant="outline"
          aria-label={`View next month`}
          title="View next month"
        >
          Next
        </Button>
      </HStack>

      {/* Mark Availability Button */}
      {isGroupMember && (
        <Button
          colorScheme="blue"
          onClick={() => setShowMarkModal(true)}
          width="full"
          aria-label="Open form to mark your availability for this group"
          title="Mark your availability for this group"
        >
          Mark Your Availability
        </Button>
      )}

      {/* Multi-Member Calendar View */}
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="lg"
        p={4}
        overflowX="auto"
        role="table"
        aria-label="Group members' availability calendar"
        aria-describedby="calendar-description"
      >
        <VisuallyHidden id="calendar-description">
          Calendar showing availability for all group members. Green indicates free, red indicates busy, gray indicates unspecified. Each row is a member, each column is a day of the month.
        </VisuallyHidden>
        {/* Day headers */}
        <HStack spacing={2} mb={4} minW="100%" role="row">
          <Box minW="150px" fontWeight="bold" fontSize="sm" role="columnheader">
            Member
          </Box>
          {daysOfMonth.map((day) => (
            <Tooltip key={day.toISOString()} label={day.toLocaleDateString()}>
              <Box
                minW="40px"
                textAlign="center"
                fontWeight="bold"
                fontSize="xs"
                role="columnheader"
                aria-label={`Day ${day.getDate()}, ${day.toLocaleDateString('default', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}`}
              >
                {day.getDate()}
              </Box>
            </Tooltip>
          ))}
        </HStack>

        {/* Member rows */}
        {members.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={6} role="status">
            No members in this group
          </Text>
        ) : (
          members.map((member) => (
            <HStack
              key={member.user_id}
              spacing={2}
              mb={3}
              align="flex-start"
              role="row"
              aria-label={`${member.user_name} availability row`}
            >
              <Box
                minW="150px"
                fontSize="sm"
                fontWeight="500"
                isTruncated
                role="rowheader"
                aria-label={member.user_name}
                title={member.user_name}
              >
                {member.user_name}
              </Box>
              {daysOfMonth.map((day) => {
                const dayAvailabilities = getMemberDateAvailabilities(member, day);
                const hasAvailability = dayAvailabilities.length > 0;
                const status = dayAvailabilities[0]?.status || 'unspecified';
                const statusLabel =
                  status === 'free'
                    ? 'available'
                    : status === 'busy'
                    ? 'busy'
                    : 'not specified';

                return (
                  <Tooltip
                    key={`${member.user_id}-${day.toISOString()}`}
                    label={
                      dayAvailabilities.length === 0
                        ? 'No availability set'
                        : `${member.user_name} - ${status === 'free' ? 'Available ✓' : 'Busy ✗'}`
                    }
                  >
                    <Box
                      minW="40px"
                      h="30px"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.300"
                      bg={
                        status === 'free'
                          ? 'green.100'
                          : status === 'busy'
                          ? 'red.100'
                          : 'gray.100'
                      }
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontSize="xs"
                      fontWeight="bold"
                      cursor="pointer"
                      role="gridcell"
                      aria-label={`${member.user_name}, ${day.toLocaleDateString('default', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}, ${statusLabel}`}
                      _focus={{
                        outline: '2px solid',
                        outlineColor: 'blue.500',
                      }}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          // Could trigger a detail view or edit here
                        }
                      }}
                    >
                      {status === 'free' ? '✓' : status === 'busy' ? '✗' : '?'}
                    </Box>
                  </Tooltip>
                );
              })}
            </HStack>
          ))
        )}
      </Box>

      {/* Error state */}
      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Error Loading Calendar</Text>
            <Text fontSize="sm">{error}</Text>
          </Box>
        </Alert>
      )}

      {/* Mark Availability Modal */}
      {showMarkModal && (
        <MarkAvailabilityModal
          groupId={groupId}
          isOpen={showMarkModal}
          onClose={() => setShowMarkModal(false)}
          onSuccess={handleMarkAvailabilitySuccess}
        />
      )}
    </VStack>
  );
}
