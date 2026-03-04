'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  useToast,
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
  user_name: string;
  user_email: string;
  start_time: string;
  end_time: string;
  status: 'free' | 'busy';
  version: number;
  created_at: string;
  updated_at: string;
}

export default function SoftCalendar({
  groupId,
  isGroupMember,
}: SoftCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [availabilities, setAvailabilities] = useState<AvailabilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const toast = useToast();

  // Fetch availabilities for current month
  const fetchAvailabilities = useCallback(async () => {
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
        `/api/groups/${groupId}/availabilities?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch availabilities');
      }

      const data = await response.json();
      if (data.success) {
        setAvailabilities(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch availabilities');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch availabilities';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [currentDate, groupId]);

  // Fetch availabilities on mount and when month changes
  useEffect(() => {
    fetchAvailabilities();
  }, [fetchAvailabilities]);

  // Set up polling (5-second interval for MVP real-time)
  useEffect(() => {
    const interval = setInterval(fetchAvailabilities, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [fetchAvailabilities]);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleMarkAvailabilitySuccess = () => {
    setShowMarkModal(false);
    fetchAvailabilities();
    toast({
      title: 'Success',
      description: 'Availability marked successfully',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // Get availabilities for a specific date
  const getDateAvailabilities = (date: Date): AvailabilityData[] => {
    const dateStr = date.toISOString().split('T')[0];
    return availabilities.filter((avail) =>
      avail.start_time.startsWith(dateStr)
    );
  };

  // Render calendar days
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
  const prevMonthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    0
  );

  const startingDayOfWeek = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const daysInPrevMonth = prevMonthEnd.getDate();

  const calendarDays = [];

  // Previous month's days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        daysInPrevMonth - i
      ),
      currentMonth: false,
    });
  }

  // Current month's days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i),
      currentMonth: true,
    });
  }

  // Next month's days
  const remainingDays = 42 - calendarDays.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({
      date: new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        i
      ),
      currentMonth: false,
    });
  }

  // Get background color for day cell based on availability status
  const getDayCellBackgroundColor = (dayAvailabilities: AvailabilityData[]) => {
    if (dayAvailabilities.length === 0) {
      return 'gray.100'; // Unspecified
    }
    const allFree = dayAvailabilities.every((a) => a.status === 'free');
    const allBusy = dayAvailabilities.every((a) => a.status === 'busy');

    if (allFree) return 'green.50'; // All free
    if (allBusy) return 'red.50'; // All busy
    return 'yellow.50'; // Mixed
  };

  if (loading && availabilities.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="lg" color="blue.500" />
        <Text mt={4}>Loading calendar...</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header with month navigation */}
      <HStack justify="space-between" align="center">
        <Button
          leftIcon={<ChevronLeftIcon />}
          onClick={handlePrevMonth}
          variant="outline"
        >
          Previous
        </Button>

        <Text fontSize="2xl" fontWeight="bold">
          {currentDate.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          })}
        </Text>

        <Button
          rightIcon={<ChevronRightIcon />}
          onClick={handleNextMonth}
          variant="outline"
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
        >
          Mark Your Availability
        </Button>
      )}

      {/* Calendar Grid */}
      <Box border="1px solid" borderColor="gray.200" borderRadius="lg" p={4}>
        {/* Day headers */}
        <Grid templateColumns="repeat(7, 1fr)" gap={2} mb={4}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <GridItem key={day} textAlign="center" fontWeight="bold">
              {day}
            </GridItem>
          ))}
        </Grid>

        {/* Calendar days */}
        <Grid templateColumns="repeat(7, 1fr)" gap={2} autoRows="minmax(100px, auto)">
          {calendarDays.map((item, idx) => {
            const dateAvails = getDateAvailabilities(item.date);
            const hasAvailabilities = dateAvails.length > 0;

            return (
              <GridItem
                key={idx}
                border="1px solid"
                borderColor={item.currentMonth ? 'gray.200' : 'gray.100'}
                p={2}
                bg={getDayCellBackgroundColor(dateAvails)}
                opacity={item.currentMonth ? 1 : 0.5}
                borderRadius="md"
                minH="100px"
              >
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  color={item.currentMonth ? 'black' : 'gray.400'}
                  mb={2}
                >
                  {item.date.getDate()}
                </Text>

                {hasAvailabilities && (
                  <VStack spacing={1} align="start">
                    {dateAvails.slice(0, 2).map((avail) => (
                      <Badge
                        key={avail.id}
                        colorScheme={avail.status === 'free' ? 'green' : 'red'}
                        fontSize="xs"
                        title={`${avail.user_name} - ${avail.status === 'free' ? 'Available' : 'Busy'}`}
                      >
                        {avail.status === 'free' ? '✓' : '✗'}
                        {' '}
                        {avail.user_name.split(' ')[0]}
                      </Badge>
                    ))}
                    {dateAvails.length > 2 && (
                      <Text fontSize="xs" color="gray.500">
                        +{dateAvails.length - 2} more
                      </Text>
                    )}
                  </VStack>
                )}
              </GridItem>
            );
          })}
        </Grid>
      </Box>

      {/* Error state */}
      {error && (
        <Box bg="red.50" border="1px solid red.200" borderRadius="md" p={4}>
          <Text color="red.800">Error: {error}</Text>
        </Box>
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
