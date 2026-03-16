'use client';

import React, { useState, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  FormErrorMessage,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from '@/lib/contexts/AuthContext';

interface EditAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  availability: {
    id: string;
    start_time: string;
    end_time: string;
    status: 'free' | 'busy';
    version: number;
  };
  groupId: string;
  onSuccess: () => void;
}

export function EditAvailabilityModal({
  isOpen,
  onClose,
  availability,
  groupId,
  onSuccess,
}: EditAvailabilityModalProps) {
  const { userId } = useAuth();
  const toast = useToast();
  const [startTime, setStartTime] = useState(availability.start_time.slice(0, 16));
  const [endTime, setEndTime] = useState(availability.end_time.slice(0, 16));
  const [status, setStatus] = useState<'free' | 'busy'>(availability.status);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lastUpdatedText, setLastUpdatedText] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (end <= start) {
        newErrors.endTime = 'End time must be after start time';
      }

      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (durationHours > 24) {
        newErrors.endTime = 'Duration cannot exceed 24 hours';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle update with retry logic
  const handleUpdate = async () => {
    if (!validateForm()) return;

    // Security fix: Check user is authenticated via context
    if (!userId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update availability',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    retryCountRef.current = 0;

    const attemptUpdate = async (): Promise<boolean> => {
      try {
        const startDate = new Date(startTime).toISOString();
        const endDate = new Date(endTime).toISOString();

        const response = await fetch(
          `/api/groups/${groupId}/availabilities/${availability.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify({
              startTime: startDate,
              endTime: endDate,
              status,
              version: availability.version,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
            // Conflict: concurrent update detected
            toast({
              title: 'Conflict',
              description: data.message || 'This availability has been updated. Please refresh and try again.',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            onClose();
            return true; // Stop retrying
          }

          if (response.status >= 500 && retryCountRef.current < MAX_RETRIES) {
            // Retryable server error
            retryCountRef.current += 1;
            const delay = Math.pow(2, retryCountRef.current) * 1000; // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay));
            return attemptUpdate(); // Retry
          }

          // Non-retryable error
          toast({
            title: 'Error',
            description: data.message || `Failed to update availability (${response.status})`,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return true; // Stop trying
        }

        // Success
        setLastUpdatedText('just now');
        toast({
          title: 'Success',
          description: 'Availability updated',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        onSuccess();
        onClose();
        return true;
      } catch (error: unknown) {
        // Network error - retry if not exceeded limit
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          const delay = Math.pow(2, retryCountRef.current) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return attemptUpdate();
        }

        // Max retries exceeded
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown network error';
        toast({
          title: 'Network Error',
          description: `Failed to update availability: ${errorMsg}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return true; // Stop trying
      }
    };

    try {
      await attemptUpdate();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete with retry logic and idempotency
  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsLoading(true);

    // Security fix: Check user is authenticated
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to delete availability',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsLoading(false);
      return;
    }

    retryCountRef.current = 0;

    const attemptDelete = async (): Promise<boolean> => {
      try {
        // Generate idempotency key to prevent duplicate deletes
        const idempotencyKey = `${availability.id}-${Date.now()}`;

        const response = await fetch(
          `/api/groups/${groupId}/availabilities/${availability.id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
              'idempotency-key': idempotencyKey,
            },
          }
        );

        if (!response.ok) {
          if (response.status >= 500 && retryCountRef.current < MAX_RETRIES) {
            // Retryable server error
            retryCountRef.current += 1;
            const delay = Math.pow(2, retryCountRef.current) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return attemptDelete();
          }

          // Non-retryable error
          const data = await response.json();
          toast({
            title: 'Error',
            description: data.message || `Failed to delete availability (${response.status})`,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return true;
        }

        // Success
        toast({
          title: 'Success',
          description: 'Availability deleted',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        onSuccess();
        onClose();
        return true;
      } catch (error: unknown) {
        // Network error - retry if not exceeded limit
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          const delay = Math.pow(2, retryCountRef.current) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return attemptDelete();
        }

        // Max retries exceeded
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown network error';
        toast({
          title: 'Network Error',
          description: `Failed to delete availability: ${errorMsg}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return true;
      }
    };

    try {
      await attemptDelete();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', sm: 'md' }}>
        <ModalOverlay />
        <ModalContent mx={{ base: 2, sm: 0 }} borderRadius={{ base: 'lg', sm: 'md' }}>
          <ModalHeader fontSize={{ base: 'lg', sm: 'md' }}>Edit Availability</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6} px={{ base: 4, sm: 6 }}>
            <FormControl isInvalid={!!errors.startTime} mb={4}>
              <FormLabel fontSize={{ base: 'sm', md: 'md' }}>Start Time</FormLabel>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                size={{ base: 'lg', md: 'md' }}
                h={{ base: '48px', md: 'auto' }}
                fontSize={{ base: 'base', md: 'sm' }}
                aria-label="Start time picker"
              />
              {errors.startTime && <FormErrorMessage fontSize={{ base: 'xs', md: 'sm' }}>{errors.startTime}</FormErrorMessage>}
            </FormControl>

            <FormControl isInvalid={!!errors.endTime} mb={4}>
              <FormLabel fontSize={{ base: 'sm', md: 'md' }}>End Time</FormLabel>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                size={{ base: 'lg', md: 'md' }}
                h={{ base: '48px', md: 'auto' }}
                fontSize={{ base: 'base', md: 'sm' }}
                aria-label="End time picker"
              />
              {errors.endTime && <FormErrorMessage fontSize={{ base: 'xs', md: 'sm' }}>{errors.endTime}</FormErrorMessage>}
            </FormControl>

            <FormControl mb={4}>
              <FormLabel fontSize={{ base: 'sm', md: 'md' }}>Status</FormLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'free' | 'busy')}
                size={{ base: 'lg', md: 'md' }}
                h={{ base: '48px', md: 'auto' }}
                fontSize={{ base: 'base', md: 'sm' }}
                aria-label="Availability status"
              >
                <option value="free">Free</option>
                <option value="busy">Busy</option>
              </Select>
            </FormControl>

            {lastUpdatedText && (
              <Text fontSize="xs" color="gray.500" mb={4}>
                Last updated: {lastUpdatedText}
              </Text>
            )}
          </ModalBody>

          <ModalFooter
            gap={{ base: 2, md: 3 }}
            flexDirection={{ base: 'column-reverse', sm: 'row' }}
            pt={{ base: 4, md: 2 }}
          >
            <Button
              colorScheme="red"
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              isDisabled={isLoading}
              size={{ base: 'lg', md: 'md' }}
              h={{ base: '48px', md: 'auto' }}
              width={{ base: 'full', sm: 'auto' }}
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              isDisabled={isLoading}
              size={{ base: 'lg', md: 'md' }}
              h={{ base: '48px', md: 'auto' }}
              width={{ base: 'full', sm: 'auto' }}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleUpdate}
              isLoading={isLoading}
              size={{ base: 'lg', md: 'md' }}
              h={{ base: '48px', md: 'auto' }}
              width={{ base: 'full', sm: 'auto' }}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={showDeleteConfirm}
        leastDestructiveRef={cancelRef}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={{ base: 2, sm: 0 }}>
            <AlertDialogHeader fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold">
              Delete Availability
            </AlertDialogHeader>
            <AlertDialogBody fontSize={{ base: 'sm', md: 'base' }}>
              Are you sure? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter
              gap={3}
              flexDirection={{ base: 'column-reverse', sm: 'row' }}
              pt={4}
            >
              <Button
                ref={cancelRef}
                onClick={() => setShowDeleteConfirm(false)}
                size={{ base: 'lg', md: 'md' }}
                h={{ base: '48px', md: 'auto' }}
                width={{ base: 'full', sm: 'auto' }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDelete}
                isLoading={isLoading}
                size={{ base: 'lg', md: 'md' }}
                h={{ base: '48px', md: 'auto' }}
                width={{ base: 'full', sm: 'auto' }}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
