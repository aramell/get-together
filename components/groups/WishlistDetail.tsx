'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Link,
  Avatar,
  Box,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Divider,
} from '@chakra-ui/react';
import type { WishlistItemResponse } from '@/lib/validation/wishlistSchema';

interface WishlistDetailProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  groupId: string;
}

export function WishlistDetail({ isOpen, onClose, itemId, groupId }: WishlistDetailProps) {
  const [item, setItem] = useState<WishlistItemResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingInterest, setIsMarkingInterest] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !itemId) return;

    const fetchItem = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/groups/${groupId}/wishlist/${itemId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Item not found');
          } else if (response.status === 403) {
            throw new Error('You do not have access to this item');
          } else {
            throw new Error('Failed to fetch item details');
          }
        }

        const data = await response.json();
        if (data.success && data.data) {
          setItem(data.data);
        } else {
          throw new Error(data.message || 'Failed to fetch item');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [isOpen, itemId, groupId]);

  const handleToggleInterest = async () => {
    if (!item) return;

    setIsMarkingInterest(true);
    setInterestError(null);

    try {
      const method = item.user_is_interested ? 'DELETE' : 'POST';
      const response = await fetch(
        `/api/groups/${groupId}/wishlist/${itemId}/interest`,
        { method }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have permission to mark interest');
        } else if (response.status === 404) {
          throw new Error('Item not found');
        } else if (response.status === 409) {
          throw new Error('You have already marked interest on this item');
        } else {
          throw new Error('Failed to update interest status');
        }
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Update local state optimistically
        setItem({
          ...item,
          interest_count: data.data.interest_count,
          user_is_interested: !item.user_is_interested,
        });
      } else {
        throw new Error(data.message || 'Failed to update interest');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setInterestError(errorMessage);
    } finally {
      setIsMarkingInterest(false);
    }
  };

  if (!item && !error && !isLoading) {
    return null;
  }

  const initials = item?.creator_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const formattedDate = item?.created_at ? format(new Date(item.created_at), 'MMM d, yyyy \'at\' h:mm a') : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader aria-label="Wishlist Item Details">Wishlist Item Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <Spinner size="lg" />
            </Box>
          ) : error ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : item ? (
            <VStack spacing={6} align="stretch">
              {/* Title */}
              <Box>
                <Text fontSize="2xl" fontWeight="bold" mb={2}>
                  {item.title}
                </Text>
              </Box>

              <Divider />

              {/* Creator Info */}
              <Box>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Added by
                </Text>
                <HStack spacing={3}>
                  <Avatar
                    size="md"
                    name={item.creator_name || item.creator_email || 'Unknown'}
                    getInitials={() => initials}
                  />
                  <VStack align="flex-start" spacing={0}>
                    <Text fontWeight="600">{item.creator_name || 'Unknown'}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {item.creator_email}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {formattedDate}
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              <Divider />

              {/* Description */}
              {item.description && (
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    Description
                  </Text>
                  <Text fontSize="md" color="gray.800" whiteSpace="pre-wrap">
                    {item.description}
                  </Text>
                </Box>
              )}

              {/* Link */}
              {item.link && (
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    Link
                  </Text>
                  <Link
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="blue.500"
                    fontSize="md"
                    isExternal
                    wordBreak="break-all"
                  >
                    {item.link}
                  </Link>
                </Box>
              )}

              {/* Interest Count & Error */}
              {interestError && (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  {interestError}
                </Alert>
              )}
              <Box>
                <HStack spacing={2}>
                  <Badge
                    colorScheme={item.user_is_interested ? 'green' : 'purple'}
                    variant="subtle"
                  >
                    {item.interest_count ?? 0} interested
                  </Badge>
                  {item.user_is_interested && (
                    <Badge colorScheme="green" variant="solid">
                      You're interested
                    </Badge>
                  )}
                </HStack>
              </Box>
            </VStack>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose} minH="48px">
              Close
            </Button>
            <Button
              colorScheme={item?.user_is_interested ? 'red' : 'blue'}
              onClick={handleToggleInterest}
              isLoading={isMarkingInterest}
              minH="48px"
              aria-label={
                item?.user_is_interested
                  ? 'Unmark interest on this item'
                  : 'Mark interest on this item'
              }
              aria-pressed={item?.user_is_interested}
            >
              {item?.user_is_interested ? 'Unmark Interest' : 'Mark Interest'}
            </Button>
            <Button colorScheme="teal" isDisabled minH="48px">
              Convert to Event (Coming Soon)
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
