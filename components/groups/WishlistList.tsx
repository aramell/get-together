'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  VStack,
  HStack,
  Button,
  Spinner,
  Text,
  useDisclosure,
  Box,
  Center,
} from '@chakra-ui/react';
import { WishlistAddModal } from './WishlistAddModal';
import { WishlistItem } from './WishlistItem';
import { WishlistDetail } from './WishlistDetail';
import type { WishlistListResponse, WishlistItemResponse } from '@/lib/validation/wishlistSchema';

interface WishlistListProps {
  groupId: string;
}

export function WishlistList({ groupId }: WishlistListProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [items, setItems] = useState<WishlistItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string>(new Date().toISOString());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch wishlist items
  const fetchItems = async (pollMode = false) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/wishlist?limit=50&offset=0`);

      if (!response.ok) {
        throw new Error('Failed to fetch wishlist items');
      }

      const data: WishlistListResponse = await response.json();

      if (data.items) {
        setItems(data.items);
        setError(null);

        if (!pollMode) {
          setIsLoading(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      if (!pollMode) {
        setIsLoading(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchItems(false);
  }, [groupId]);

  // Set up polling for real-time updates
  useEffect(() => {
    // Handler for visibility changes - pause polling when not visible
    const handleVisibilityChange = () => {
      if (document.hidden && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      } else if (!document.hidden && !pollingIntervalRef.current) {
        // Resume polling when document becomes visible
        pollingIntervalRef.current = setInterval(() => {
          fetchItems(true);
        }, 5000);
      }
    };

    // Start polling if document is visible
    if (!document.hidden) {
      pollingIntervalRef.current = setInterval(() => {
        fetchItems(true);
      }, 5000);
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [groupId]);

  const handleItemAdded = () => {
    // Refresh the list immediately when an item is added
    fetchItems(false);
  };

  const handleItemClick = (itemId: string) => {
    setSelectedItemId(itemId);
    onDetailOpen();
  };

  if (isLoading) {
    return (
      <Center py={8}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Box p={6} textAlign="center">
        <Text color="red.500" mb={4}>
          {error}
        </Text>
        <Button onClick={() => fetchItems(false)} colorScheme="blue">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="600">
          Wishlist
        </Text>
        <Button colorScheme="blue" size="sm" onClick={onOpen}>
          + Add Item
        </Button>
      </HStack>

      {items.length === 0 ? (
        <Box p={8} textAlign="center" color="gray.500">
          <Text>No items yet. Add something to get started!</Text>
        </Box>
      ) : (
        <VStack spacing={3} align="stretch">
          {items.map((item) => (
            <WishlistItem
              key={item.id}
              id={item.id}
              title={item.title}
              description={item.description}
              link={item.link}
              creator_name={item.creator_name}
              creator_email={item.creator_email}
              created_at={item.created_at}
              onClick={() => handleItemClick(item.id)}
            />
          ))}
        </VStack>
      )}

      <WishlistAddModal
        isOpen={isOpen}
        onClose={onClose}
        groupId={groupId}
        onItemAdded={handleItemAdded}
      />

      {selectedItemId && (
        <WishlistDetail
          isOpen={isDetailOpen}
          onClose={onDetailClose}
          itemId={selectedItemId}
          groupId={groupId}
        />
      )}
    </VStack>
  );
}
