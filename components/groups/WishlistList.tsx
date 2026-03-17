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
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch wishlist items
  const fetchItems = async (pollMode = false, append = false) => {
    try {
      const currentOffset = append ? offset : 0;
      const response = await fetch(`/api/groups/${groupId}/wishlist?limit=20&offset=${currentOffset}`);

      if (!response.ok) {
        throw new Error('Failed to fetch wishlist items');
      }

      const data = await response.json();

      if (data.success && data.data?.items) {
        const responseData = data.data;
        if (append) {
          // When loading more, detect new items added by polling
          const oldItemIds = new Set(items.map((item) => item.id));
          const newIds = responseData.items.filter((item: WishlistItemResponse) => !oldItemIds.has(item.id)).map((item: WishlistItemResponse) => item.id);
          if (newIds.length > 0) {
            setNewItemIds(new Set(newIds));
          }
          setItems([...items, ...responseData.items]);
          setOffset(currentOffset + responseData.items.length);
        } else {
          // Reset and set new items for initial/polling loads
          if (pollMode) {
            const oldItemIds = new Set(items.map((item) => item.id));
            const newIds = responseData.items.filter((item: WishlistItemResponse) => !oldItemIds.has(item.id)).map((item: WishlistItemResponse) => item.id);
            if (newIds.length > 0) {
              setNewItemIds(new Set(newIds));
              // Clear highlight after 3 seconds
              setTimeout(() => setNewItemIds(new Set()), 3000);
            }
          }
          setItems(responseData.items);
          setOffset(20);
        }
        setTotal(responseData.total);
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
        <Button onClick={() => fetchItems(false)} colorScheme="blue" minH="48px">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between" mb={2}>
        <Text fontSize="lg" fontWeight="600">
          Wishlist
        </Text>
        <Button colorScheme="blue" size="md" onClick={onOpen} minH="48px">
          + Add Item
        </Button>
      </HStack>

      {items.length === 0 ? (
        <Box p={8} textAlign="center" color="gray.500">
          <Text>No items yet. Add something to get started!</Text>
        </Box>
      ) : (
        <>
          <VStack spacing={3} align="stretch" role="list">
            {items.map((item) => (
              <div key={item.id} role="listitem">
                <WishlistItem
                  id={item.id}
                  title={item.title}
                  description={item.description}
                  link={item.link}
                  creator_name={item.creator_name}
                  creator_email={item.creator_email}
                  created_at={item.created_at}
                  onClick={() => handleItemClick(item.id)}
                  isNew={newItemIds.has(item.id)}
                  interest_count={item.interest_count}
                  user_is_interested={item.user_is_interested}
                />
              </div>
            ))}
          </VStack>
          {offset < total && (
            <Box mt={6}>
              <Button colorScheme="blue" variant="outline" width="full" onClick={() => fetchItems(false, true)} minH="48px">
                Load More Items
              </Button>
            </Box>
          )}
        </>
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
