'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
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

// Guest (no-login) shape from publicPlanningService (Story 13.5).
interface GuestTimelineItem {
  id: string;
  item_time: string;
  title: string;
  description: string | null;
}

interface EventTimelineProps {
  eventId: string;
  // groupId is only known when rendered from the authenticated Dashboard.
  // A guest render (publicToken set instead) doesn't have it up front --
  // see resolvedGroupId below.
  groupId?: string;
  // Set when rendered from the no-login public event page instead of the
  // authenticated Dashboard.
  publicToken?: string;
  // Opens the public page's login-in-place modal; only relevant in guest
  // context (publicToken set). Timeline has no guest-triggerable action
  // today (no checkbox/claim/vote/upload), but the prop is accepted for a
  // consistent widget signature.
  requestLogin?: () => void;
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

export function EventTimeline({ eventId, groupId, publicToken, requestLogin }: EventTimelineProps) {
  const { userId, accessToken } = useAuth();
  const toast = useToast();
  void requestLogin; // no guest-triggerable action in this widget yet -- see prop doc above

  const [items, setItems] = useState<TimelineItem[]>([]);
  const [guestItems, setGuestItems] = useState<GuestTimelineItem[]>([]);
  // Learned from the public planning endpoint once a guest logs in via the
  // in-place modal -- lets this widget upgrade to the interactive fetch
  // below without navigating away.
  const [resolvedGroupId, setResolvedGroupId] = useState<string | null>(null);
  const effectiveGroupId = groupId ?? resolvedGroupId ?? undefined;
  // Set only once the authenticated fetch below actually succeeds for a
  // guest-resolved group -- a resolved group_id alone doesn't prove
  // membership. See EventChecklist.tsx for the shared pattern this mirrors.
  const [membershipConfirmed, setMembershipConfirmed] = useState(false);
  const canAttemptAuthenticated = Boolean(accessToken && effectiveGroupId);
  const interactive =
    Boolean(accessToken && groupId) || Boolean(accessToken && resolvedGroupId && membershipConfirmed);
  const [loading, setLoading] = useState(true);
  const [newItemTime, setNewItemTime] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItemTime, setEditingItemTime] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDescription, setEditingDescription] = useState('');

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  const authHeaders = useCallback(
    (extra?: Record<string, string>): Record<string, string> => ({
      Authorization: `Bearer ${accessToken}`,
      ...extra,
    }),
    [accessToken]
  );

  const fetchItems = useCallback(async () => {
    if (!effectiveGroupId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/timeline`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
        setMembershipConfirmed(true);
      }
    } catch (err) {
      console.error('Error fetching timeline items:', err);
      // Don't show a toast for background polling failures
    } finally {
      isFetchingRef.current = false;
    }
  }, [eventId, effectiveGroupId, authHeaders]);

  // Guest (no-login) read-only fetch -- see EventChecklist.tsx for the
  // shared pattern this mirrors.
  const fetchGuestPlanning = useCallback(async () => {
    if (!publicToken || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const response = await fetch(`/api/events/public/${publicToken}/planning`, { headers });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && data.data) {
        if (Array.isArray(data.data.timeline)) setGuestItems(data.data.timeline);
        if (typeof data.data.group_id === 'string') setResolvedGroupId(data.data.group_id);
      }
    } catch (err) {
      console.error('Error fetching public timeline:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [publicToken, accessToken]);

  useEffect(() => {
    if (!canAttemptAuthenticated) return;
    setLoading(true);
    fetchItems().finally(() => setLoading(false));

    pollingIntervalRef.current = setInterval(() => {
      fetchItems();
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, effectiveGroupId, accessToken]);

  useEffect(() => {
    if (!publicToken || interactive) return;

    setLoading(true);
    fetchGuestPlanning().finally(() => setLoading(false));

    const interval = setInterval(fetchGuestPlanning, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, publicToken, accessToken, effectiveGroupId]);

  const handleAddItem = async () => {
    if (!newItemTime || !newTitle.trim()) return;

    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/timeline`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          item_time: new Date(newItemTime).toISOString(),
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
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/timeline/${itemId}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          item_time: new Date(editingItemTime).toISOString(),
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
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/timeline/${itemId}`, {
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

  // Neither an authenticated group nor a public token to read from -- there
  // is nothing this widget can render, and without one of them neither
  // fetch effect above ever resolves `loading`.
  if (!groupId && !publicToken) {
    return null;
  }

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

  // Guest (no-login) read-only render: purely informational -- Timeline has
  // no guest-triggerable interactive control (no checkbox/claim/vote/upload).
  if (!interactive && publicToken) {
    return (
      <Box>
        <Heading as="h2" fontWeight="bold" fontSize="lg" mb={4}>
          Timeline
        </Heading>
        <VStack spacing={2} align="stretch">
          {guestItems.length === 0 && (
            <Text color="ink.500" fontSize="sm">
              No timeline items yet.
            </Text>
          )}
          {guestItems.map((item) => (
            <Box key={item.id} py={2} borderBottom="1px solid" borderColor="cork.100">
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
          ))}
        </VStack>
      </Box>
    );
  }

  return (
    <Box>
      <Heading as="h2" fontWeight="bold" fontSize="lg" mb={4}>
        Timeline
      </Heading>

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
