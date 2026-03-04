'use client';

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  HStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/contexts/AuthContext';
import { availabilityInputSchema } from '@/lib/validation/availabilitySchema';

interface MarkAvailabilityModalProps {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  start_time: string;
  end_time: string;
  status: 'free' | 'busy';
  recurring_pattern?: 'daily' | 'weekly' | null;
  recurring_end_date?: string;
}

export default function MarkAvailabilityModal({
  groupId,
  isOpen,
  onClose,
  onSuccess,
}: MarkAvailabilityModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const { userId } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(availabilityInputSchema),
    defaultValues: {
      start_time: new Date().toISOString().slice(0, 16),
      end_time: new Date(Date.now() + 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16),
      status: 'free',
      recurring_pattern: null,
      recurring_end_date: '',
    },
  });

  const startTime = watch('start_time');
  const endTime = watch('end_time');
  const status = watch('status');
  const recurringPattern = watch('recurring_pattern');
  const recurringEndDate = watch('recurring_end_date');

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      // Convert local datetime to ISO string with Z suffix
      const startTimeIso = new Date(data.start_time).toISOString();
      const endTimeIso = new Date(data.end_time).toISOString();

      // Build request body
      const requestBody: any = {
        start_time: startTimeIso,
        end_time: endTimeIso,
        status: data.status,
      };

      // Add recurring parameters if applicable
      if (data.recurring_pattern && data.recurring_end_date) {
        requestBody.recurring_pattern = data.recurring_pattern;
        requestBody.recurring_end_date = new Date(data.recurring_end_date).toISOString();
      }

      const response = await fetch(
        `/api/groups/${groupId}/availabilities`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId || '',
          },
          body: JSON.stringify(requestBody),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            title: 'Conflict',
            description:
              result.message ||
              'This time slot already has an availability marked',
            status: 'warning',
            duration: 3000,
            isClosable: true,
          });
          return;
        }

        throw new Error(
          result.error || 'Failed to mark availability'
        );
      }

      toast({
        title: 'Success',
        description: 'Availability marked successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      reset();
      onClose();
      onSuccess();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to mark availability';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Calculate duration for display
  const calculateDuration = () => {
    if (!startTime || !endTime) return '';
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

      // Handle zero or negative duration
      if (diffMinutes <= 0) {
        return 'End time must be after start time';
      }

      // Less than 1 minute
      if (diffMinutes < 1) {
        return 'Less than 1 minute';
      }

      // Less than 1 hour - show minutes only
      if (diffMinutes < 60) {
        return `${Math.round(diffMinutes)} minutes`;
      }

      // 1+ hours - show hours and minutes
      const hours = Math.floor(diffMinutes / 60);
      const minutes = Math.round(diffMinutes % 60);
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
    } catch {
      return '';
    }
  };

  // Calculate number of recurring occurrences
  const calculateOccurrences = () => {
    if (!recurringPattern || !recurringEndDate || !startTime) return 0;
    try {
      const start = new Date(startTime);
      const end = new Date(recurringEndDate);
      if (end <= start) return 0;

      let count = 0;
      let current = new Date(start);
      while (current <= end) {
        count++;
        if (recurringPattern === 'daily') {
          current.setDate(current.getDate() + 1);
        } else if (recurringPattern === 'weekly') {
          current.setDate(current.getDate() + 7);
        }
      }
      return count;
    } catch {
      return 0;
    }
  };

  // Check if duration exceeds 12 hours
  const isDurationTooLong = () => {
    if (!startTime || !endTime) return false;
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return diffHours > 12;
    } catch {
      return false;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Mark Your Availability</ModalHeader>
        <ModalCloseButton isDisabled={isSubmitting} />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              Indicate when you're available to meet. Choose a time block and mark it as free or busy.
            </Text>

            <FormControl isInvalid={!!errors.start_time}>
              <FormLabel fontSize="sm" fontWeight="600">
                Start Time
              </FormLabel>
              <Input
                type="datetime-local"
                {...register('start_time')}
                isDisabled={isSubmitting}
              />
              {errors.start_time && (
                <Text color="red.500" fontSize="xs" mt={1}>
                  {errors.start_time.message}
                </Text>
              )}
            </FormControl>

            <FormControl isInvalid={!!errors.end_time}>
              <FormLabel fontSize="sm" fontWeight="600">
                End Time
              </FormLabel>
              <Input
                type="datetime-local"
                {...register('end_time')}
                isDisabled={isSubmitting}
              />
              {errors.end_time && (
                <Text color="red.500" fontSize="xs" mt={1}>
                  {errors.end_time.message}
                </Text>
              )}
            </FormControl>

            {calculateDuration() && (
              <HStack spacing={2} justify="space-between" bg="blue.50" p={3} borderRadius="md">
                <Text fontSize="sm" fontWeight="600">
                  Duration:
                </Text>
                <Text fontSize="sm">{calculateDuration()}</Text>
              </HStack>
            )}

            <FormControl isInvalid={!!errors.status}>
              <FormLabel fontSize="sm" fontWeight="600">
                Availability Status
              </FormLabel>
              <HStack spacing={3} align="flex-start">
                <Select {...register('status')} isDisabled={isSubmitting} flex={1}>
                  <option value="free">Available (Free)</option>
                  <option value="busy">Not Available (Busy)</option>
                </Select>
                {/* Color indicator based on selected status */}
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    backgroundColor:
                      watch('status') === 'free' ? '#48bb78' : '#f56565',
                    marginTop: '8px',
                  }}
                  title={watch('status') === 'free' ? 'Available - Green' : 'Busy - Red'}
                />
              </HStack>
              {errors.status && (
                <Text color="red.500" fontSize="xs" mt={1}>
                  {errors.status.message}
                </Text>
              )}
            </FormControl>

            {/* Recurring pattern selector - only show for busy status */}
            {status === 'busy' && (
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">
                  Repeat
                </FormLabel>
                <Select
                  {...register('recurring_pattern')}
                  isDisabled={isSubmitting || isDurationTooLong()}
                  placeholder="Once"
                >
                  <option value="">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </Select>
                {isDurationTooLong() && (
                  <Text color="orange.500" fontSize="xs" mt={1}>
                    ⚠️ Duration exceeds 12 hours - recurring option disabled
                  </Text>
                )}
              </FormControl>
            )}

            {/* End date picker - only show when recurring pattern selected */}
            {status === 'busy' && recurringPattern && (
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">
                  Repeat Until
                </FormLabel>
                <Input
                  type="datetime-local"
                  {...register('recurring_end_date')}
                  isDisabled={isSubmitting}
                  defaultValue={
                    startTime
                      ? new Date(new Date(startTime).getTime() + 7 * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                />
              </FormControl>
            )}

            {/* Occurrence preview - show when recurring pattern and end date selected */}
            {status === 'busy' && recurringPattern && recurringEndDate && (
              <HStack
                spacing={2}
                justify="space-between"
                bg="green.50"
                p={3}
                borderRadius="md"
              >
                <Text fontSize="sm" fontWeight="600">
                  Preview:
                </Text>
                <Text fontSize="sm">
                  This will create {calculateOccurrences()} {recurringPattern} blocks
                </Text>
              </HStack>
            )}

            <Text fontSize="xs" color="gray.500">
              <strong>Note:</strong> Use 'Free' to indicate you're available during this time, and 'Busy' to indicate
              you're not available.
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost"
            mr={3}
            onClick={handleClose}
            isDisabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            loadingText="Saving..."
          >
            Mark Availability
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
