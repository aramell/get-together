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
  Alert,
  AlertIcon,
  Badge,
  Box,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { CopyIcon } from '@chakra-ui/icons';
import type { WishlistItemResponse } from '@/lib/validation/wishlistSchema';
import { calculateSuggestedThreshold } from '@/lib/validation/convertToEventSchema';

interface ConvertToEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  itemId: string;
  item: WishlistItemResponse;
  onSuccess: () => void;
}

export const ConvertToEventModal: React.FC<ConvertToEventModalProps> = ({
  isOpen,
  onClose,
  groupId,
  itemId,
  item,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    description: item.description || '',
    threshold: '',
  });

  const suggestedThreshold = calculateSuggestedThreshold(item.interest_count ?? 0);

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        date: '',
        description: item.description || '',
        threshold: '',
      });
      setErrors({});
      setApiError(null);
      onClose();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = 'Event date is required';
    } else {
      const selectedDate = new Date(formData.date);
      if (selectedDate <= new Date()) {
        newErrors.date = 'Event date must be in the future';
      }
    }

    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be 2000 characters or less';
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
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/groups/${groupId}/wishlist/${itemId}/convert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: formData.date,
            description: formData.description || undefined,
            threshold: formData.threshold ? parseInt(formData.threshold) : undefined,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        handleClose();
        onSuccess();
      } else {
        setApiError(result.message || 'Failed to convert item to event');
      }
    } catch (err: any) {
      setApiError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (item.link) {
      try {
        await navigator.clipboard.writeText(item.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Convert "{item.title}" to Event
          <Text fontSize="sm" color="gray.600" mt={1}>
            This will create a new event from this wishlist item
          </Text>
        </ModalHeader>
        <ModalCloseButton isDisabled={isLoading} />

        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4}>
              {/* API Error Alert */}
              {apiError && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {apiError}
                </Alert>
              )}

              {/* Item Title (Read-only) */}
              <FormControl>
                <FormLabel htmlFor="item-title">Item Title</FormLabel>
                <Input
                  id="item-title"
                  value={item.title}
                  isReadOnly
                  isDisabled
                  bg="gray.50"
                />
              </FormControl>

              {/* Item Link (if exists) */}
              {item.link && (
                <FormControl>
                  <FormLabel htmlFor="item-link">Original Link</FormLabel>
                  <HStack spacing={2}>
                    <Input
                      id="item-link"
                      value={item.link}
                      isReadOnly
                      isDisabled
                      bg="gray.50"
                      fontSize="sm"
                      wordBreak="break-all"
                    />
                    <Tooltip label={copied ? 'Copied!' : 'Copy link'}>
                      <IconButton
                        icon={<CopyIcon />}
                        onClick={handleCopyLink}
                        size="sm"
                        isDisabled={isLoading}
                        aria-label="Copy link"
                      />
                    </Tooltip>
                  </HStack>
                </FormControl>
              )}

              {/* Interest Count Badge */}
              <Box width="100%">
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Interest Level
                </Text>
                <Badge colorScheme="purple" fontSize="md" px={3} py={2}>
                  {item.interest_count ?? 0} users interested
                </Badge>
              </Box>

              {/* Description Field (Editable) */}
              <FormControl isInvalid={!!errors.description}>
                <FormLabel htmlFor="event-description">
                  Description (optional)
                </FormLabel>
                <Textarea
                  id="event-description"
                  placeholder="You can modify the description or leave it as is..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  isDisabled={isLoading}
                  aria-label="Event description"
                  maxLength={2000}
                  rows={3}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {formData.description.length}/2000 characters
                </Text>
                {errors.description && (
                  <FormErrorMessage>{errors.description}</FormErrorMessage>
                )}
              </FormControl>

              {/* Date & Time Field */}
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

              {/* Threshold Field with Suggestion */}
              <FormControl isInvalid={!!errors.threshold}>
                <FormLabel htmlFor="event-threshold">
                  Commitment Threshold (optional)
                </FormLabel>
                <Input
                  id="event-threshold"
                  type="number"
                  placeholder={
                    suggestedThreshold
                      ? `e.g., ${suggestedThreshold} (50% of interested users)`
                      : 'e.g., 5 (how many people needed to confirm)'
                  }
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
                  {suggestedThreshold
                    ? `Suggested: ${suggestedThreshold} (50% of ${item.interest_count ?? 0} interested users)`
                    : 'Optional: Event auto-confirms when this many people say yes'}
                </Text>
                {errors.threshold && (
                  <FormErrorMessage>{errors.threshold}</FormErrorMessage>
                )}
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button
                variant="ghost"
                onClick={handleClose}
                isDisabled={isLoading}
                minH="48px"
              >
                Cancel
              </Button>
              <Button
                colorScheme="teal"
                type="submit"
                isDisabled={isLoading || !formData.date}
                display="flex"
                alignItems="center"
                minH="48px"
                aria-label="Create event from wishlist item"
              >
                {isLoading && <Spinner size="sm" mr={2} />}
                {isLoading ? 'Creating Event...' : 'Create Event'}
              </Button>
            </HStack>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
