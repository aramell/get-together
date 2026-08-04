'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Button,
  IconButton,
  Spinner,
  useToast,
  FormControl,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { useAuth } from '@/lib/contexts/AuthContext';

interface TimelineItem {
  id: string;
  created_by: string;
  item_time: string;
  title: string;
  description: string | null;
}

interface EventTimelineProps {
  eventId: string;
  groupId: string;
}

function formatItemTime(itemTime: string): string {
  const date = new Date(itemTime);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${formattedDate}, ${formattedTime}`;
}

export function EventTimeline({ eventId, groupId }: EventTimelineProps) {
  const { userId, accessToken } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemTime, setNewItemTime] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItemTime, setEditingItemTime] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDescription, setEditingDescription] = useState('');

  const authHeaders = useCallback(
    (extra?: Record<string, string>): Record<string, string> => ({
      Authorization: `Bearer ${accessToken}`,
      ...extra,
    }),
    [accessToken]
  );

  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/timeline`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
      }
    } catch (err) {
      console.error('Error fetching timeline items:', err);
    }
  }, [eventId, groupId, authHeaders]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    fetchItems().finally(() => setLoading(false));
    // Fetch once on mount/tab-open only — no polling for the Timeline section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, groupId, accessToken]);

  const handleAddItem = async () => {
    if (!newItemTime || !newTitle.trim()) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/timeline`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          item_time: newItemTime,
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add item');
      }

      await fetchItems();
      setNewItemTime('');
      setNewTitle('');
      setNewDescription('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add item', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleStartEdit = (item: TimelineItem) => {
    setEditingId(item.id);
    setEditingItemTime(item.item_time.slice(0, 16));
    setEditingTitle(item.title);
    setEditingDescription(item.description || '');
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editingItemTime || !editingTitle.trim()) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/timeline/${itemId}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          item_time: editingItemTime,
          title: editingTitle.trim(),
          description: editingDescription.trim() || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update item');
      }

      await fetchItems();
      setEditingId(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update item', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleDelete = async (itemId: string) => {
    const previousItems = items;
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/timeline/${itemId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete item');
      }
    } catch (err: any) {
      setItems(previousItems);
      toast({ title: 'Error', description: err.message || 'Failed to delete item', status: 'error', duration: 3000, isClosable: true });
    }
  };

  if (loading) {
    return (
      <HStack justify="center" py={6}>
        <Spinner size="sm" />
        <Text fontSize="sm" color="ink.500">
          Loading timeline...
        </Text>
      </HStack>
    );
  }

  return (
    <Box>
      <Text fontWeight="bold" fontSize="lg" mb={4}>
        Timeline
      </Text>

      <VStack spacing={2} align="stretch" mb={6}>
        {items.length === 0 && (
          <Text color="ink.500" fontSize="sm">
            No timeline items yet.
          </Text>
        )}
        {items.map((item) => (
          <Box key={item.id} py={2} borderBottom="1px solid" borderColor="cork.100">
            {editingId === item.id ? (
              <VStack align="stretch" spacing={2}>
                <Input
                  size="sm"
                  type="datetime-local"
                  value={editingItemTime}
                  onChange={(e) => setEditingItemTime(e.target.value)}
                  aria-label="Edit timeline item time"
                />
                <Input
                  size="sm"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  aria-label="Edit timeline item title"
                />
                <Textarea
                  size="sm"
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  aria-label="Edit timeline item description"
                />
                <HStack>
                  <Button size="sm" onClick={() => handleSaveEdit(item.id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </HStack>
              </VStack>
            ) : (
              <HStack spacing={3} align="start">
                <Box flex={1}>
                  <Text fontWeight="semibold" fontSize="sm" color="ink.600">
                    {formatItemTime(item.item_time)}
                  </Text>
                  <Text color="ink.800">{item.title}</Text>
                  {item.description && (
                    <Text fontSize="sm" color="ink.500">
                      {item.description}
                    </Text>
                  )}
                </Box>
                {item.created_by === userId && (
                  <HStack spacing={1}>
                    <IconButton
                      aria-label="Edit item"
                      icon={<EditIcon />}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(item)}
                    />
                    <IconButton
                      aria-label="Delete item"
                      icon={<DeleteIcon />}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                    />
                  </HStack>
                )}
              </HStack>
            )}
          </Box>
        ))}
      </VStack>

      <VStack spacing={2} align="stretch">
        <HStack spacing={2} align="flex-end">
          <FormControl flex={1}>
            <Input
              type="datetime-local"
              value={newItemTime}
              onChange={(e) => setNewItemTime(e.target.value)}
              aria-label="New timeline item time"
            />
          </FormControl>
          <FormControl flex={2}>
            <Input
              placeholder="Add a timeline item..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              aria-label="New timeline item title"
            />
          </FormControl>
        </HStack>
        <Textarea
          placeholder="Description (optional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          aria-label="New timeline item description"
        />
        <Button
          onClick={handleAddItem}
          isDisabled={!newItemTime || !newTitle.trim()}
          colorScheme="coral"
          alignSelf="flex-start"
        >
          Add
        </Button>
      </VStack>
    </Box>
  );
}

export default EventTimeline;
