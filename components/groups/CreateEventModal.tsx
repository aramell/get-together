'use client';

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Textarea,
  VStack,
  HStack,
  Text,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { createEvent } from '@/lib/services/eventService';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess: () => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  groupId,
  onSuccess,
}) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    threshold: '',
    description: '',
  });

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ title: '', date: '', threshold: '', description: '' });
      setErrors({});
      onClose();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Event title must be 255 characters or less';
    }

    if (!formData.date) {
      newErrors.date = 'Event date is required';
    } else {
      const selectedDate = new Date(formData.date);
      if (selectedDate <= new Date()) {
        newErrors.date = 'Event date must be in the future';
      }
    }

    if (formData.threshold) {
      const threshold = parseInt(formData.threshold);
      if (isNaN(threshold) || threshold <= 0) {
        newErrors.threshold = 'Threshold must be a positive number';
      } else if (threshold > 1000) {
        newErrors.threshold = 'Threshold is too large';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await createEvent(groupId, '', {
        title: formData.title,
        date: formData.date,
        threshold: formData.threshold ? parseInt(formData.threshold) : undefined,
        description: formData.description || undefined,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Event proposed successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        handleClose();
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to create event',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Propose an Event</ModalHeader>
        <ModalCloseButton isDisabled={isLoading} />

        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4}>
              {/* Title Field */}
              <FormControl isInvalid={!!errors.title}>
                <FormLabel htmlFor="event-title">Event Title *</FormLabel>
                <Input
                  id="event-title"
                  placeholder="e.g., Pizza Night at Downtown"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  isDisabled={isLoading}
                  aria-label="Event title"
                  maxLength={255}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {formData.title.length}/255 characters
                </Text>
                {errors.title && <FormErrorMessage>{errors.title}</FormErrorMessage>}
              </FormControl>

              {/* Date Field */}
              <FormControl isInvalid={!!errors.date}>
                <FormLabel htmlFor="event-date">Date & Time *</FormLabel>
                <Input
                  id="event-date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  isDisabled={isLoading}
                  aria-label="Event date and time"
                />
                {errors.date && <FormErrorMessage>{errors.date}</FormErrorMessage>}
              </FormControl>

              {/* Threshold Field */}
              <FormControl isInvalid={!!errors.threshold}>
                <FormLabel htmlFor="event-threshold">
                  Commitment Threshold (optional)
                </FormLabel>
                <Input
                  id="event-threshold"
                  type="number"
                  placeholder="e.g., 5 (how many people needed to confirm)"
                  value={formData.threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, threshold: e.target.value })
                  }
                  isDisabled={isLoading}
                  aria-label="Commitment threshold"
                  min="1"
                  max="1000"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Optional: Event auto-confirms when this many people say yes
                </Text>
                {errors.threshold && (
                  <FormErrorMessage>{errors.threshold}</FormErrorMessage>
                )}
              </FormControl>

              {/* Description Field */}
              <FormControl>
                <FormLabel htmlFor="event-description">Description</FormLabel>
                <Textarea
                  id="event-description"
                  placeholder="Add details about the event (optional)"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  isDisabled={isLoading}
                  aria-label="Event description"
                  maxLength={2000}
                  rows={4}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {formData.description.length}/2000 characters
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button
                variant="ghost"
                onClick={handleClose}
                isDisabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                colorScheme="teal"
                type="submit"
                isDisabled={isLoading || !formData.title || !formData.date}
                display="flex"
                alignItems="center"
              >
                {isLoading && <Spinner size="sm" mr={2} />}
                {isLoading ? 'Creating...' : 'Create Event'}
              </Button>
            </HStack>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
