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
        <ModalHeader>Wishlist Item Details</ModalHeader>
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

              {/* Interest Count Placeholder */}
              <Box>
                <HStack spacing={2}>
                  <Badge colorScheme="purple" variant="subtle">
                    0 interested
                  </Badge>
                  <Text fontSize="xs" color="gray.600">
                    (Coming in Story 5.3)
                  </Text>
                </HStack>
              </Box>
            </VStack>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button colorScheme="blue" isDisabled>
              Mark Interested (Coming Soon)
            </Button>
            <Button colorScheme="teal" isDisabled>
              Convert to Event (Coming Soon)
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
