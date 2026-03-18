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
  Tooltip,
} from '@chakra-ui/react';
import type { WishlistItemResponse } from '@/lib/validation/wishlistSchema';
import { ConvertToEventModal } from './ConvertToEventModal';
import { CommentSection } from '@/components/wishlist/CommentSection';

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
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Get user ID from localStorage (populated by AuthContext)
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  // Fetch user's group role for authorization checks
  useEffect(() => {
    if (!isOpen || !groupId) {
      return;
    }

    const fetchUserRole = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.currentUserRole) {
            setUserRole(data.data.currentUserRole);
          }
        }
      } catch (err) {
        // Silently fail - authorization check will use backend validation
        console.error('Failed to fetch user role:', err);
      }
    };

    fetchUserRole();
  }, [isOpen, groupId]);

  // Fetch item details and set up polling
  useEffect(() => {
    if (!isOpen || !itemId) {
      if (pollingInterval) clearInterval(pollingInterval);
      return;
    }

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

    // Initial fetch
    fetchItem();

    // Set up polling for real-time updates (check for conversion)
    const interval = setInterval(fetchItem, 5000);
    setPollingInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, itemId, groupId]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

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
        // Update local state with confirmed interest count from server
        setItem({
          ...item,
          interest_count: data.data.interest_count,
          user_is_interested: !item.user_is_interested,
        });
      } else {
        // Provide specific error message based on response
        const errorMessage = data.message || data.error || 'Failed to update interest';
        throw new Error(errorMessage);
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

              {/* Conversion Status Indicator */}
              {item.item_to_event_id && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <VStack align="flex-start" spacing={0}>
                    <Text fontWeight="600">Converted to Event</Text>
                    <Text fontSize="sm">
                      This item has been converted to an event proposal. Click the event
                      link in the button below to view it.
                    </Text>
                  </VStack>
                </Alert>
              )}

              {/* Comments Section */}
              <CommentSection groupId={groupId} itemId={itemId} />
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

            {/* Convert to Event Button */}
            {item?.item_to_event_id ? (
              <Button
                colorScheme="teal"
                isDisabled
                minH="48px"
                title="This item has already been converted to an event"
              >
                Already Converted
              </Button>
            ) : userId && item && (userId === item.created_by || userRole === 'admin') ? (
              <Button
                colorScheme="teal"
                onClick={() => setIsConvertModalOpen(true)}
                minH="48px"
                aria-label="Convert this wishlist item to an event"
              >
                Convert to Event
              </Button>
            ) : (
              <Tooltip label="Only the item creator or group admin can convert this">
                <Button colorScheme="teal" isDisabled minH="48px">
                  Convert to Event
                </Button>
              </Tooltip>
            )}
          </HStack>
        </ModalFooter>

        {/* Convert to Event Modal */}
        {item && (
          <ConvertToEventModal
            isOpen={isConvertModalOpen}
            onClose={() => setIsConvertModalOpen(false)}
            groupId={groupId}
            itemId={itemId}
            item={item}
            onSuccess={() => {
              setIsConvertModalOpen(false);
              // Refresh the item to show conversion status
              const fetchItem = async () => {
                try {
                  const response = await fetch(`/api/groups/${groupId}/wishlist/${itemId}`);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                      setItem(data.data);
                    }
                  }
                } catch (err) {
                  console.error('Failed to refresh item:', err);
                }
              };
              fetchItem();
            }}
          />
        )}
      </ModalContent>
    </Modal>
  );
}
