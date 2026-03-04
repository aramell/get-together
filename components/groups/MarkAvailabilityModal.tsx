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
}

export default function MarkAvailabilityModal({
  groupId,
  isOpen,
  onClose,
  onSuccess,
}: MarkAvailabilityModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
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
    },
  });

  const startTime = watch('start_time');
  const endTime = watch('end_time');

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      // Convert local datetime to ISO string with Z suffix
      const startTimeIso = new Date(data.start_time).toISOString();
      const endTimeIso = new Date(data.end_time).toISOString();

      const response = await fetch(
        `/api/groups/${groupId}/availabilities`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            start_time: startTimeIso,
            end_time: endTimeIso,
            status: data.status,
          }),
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
      if (diffMinutes < 60) {
        return `${Math.round(diffMinutes)} minutes`;
      }
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes > 0 ? `${Math.round(minutes)}m` : ''}`.trim();
    } catch {
      return '';
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
                Status
              </FormLabel>
              <Select {...register('status')} isDisabled={isSubmitting}>
                <option value="free">Available (Free)</option>
                <option value="busy">Not Available (Busy)</option>
              </Select>
              {errors.status && (
                <Text color="red.500" fontSize="xs" mt={1}>
                  {errors.status.message}
                </Text>
              )}
            </FormControl>

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
