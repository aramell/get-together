'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Checkbox,
  Input,
  Select,
  Button,
  IconButton,
  Badge,
  Spinner,
  useToast,
  FormControl,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  isItemToday,
  formatItemDateLabel,
  compareByItemDateThenCreatedAt,
} from '@/lib/utils/itemDateGrouping';

interface ChecklistItem {
  id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  is_checked: boolean;
  item_date: string | null;
  created_at: string;
}

interface GroupMember {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

interface EventChecklistProps {
  eventId: string;
  groupId: string;
}

export function EventChecklist({ eventId, groupId }: EventChecklistProps) {
  const { userId, accessToken } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDate, setNewDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDate, setEditingDate] = useState('');

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
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/checklist`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
      }
    } catch (err) {
      console.error('Error fetching checklist items:', err);
      // Don't show a toast for background polling failures
    } finally {
      isFetchingRef.current = false;
    }
  }, [eventId, groupId, authHeaders]);

  const fetchMembers = useCallback(async () => {
    try {
      // /api/groups/:groupId authenticates via x-user-id, not the Bearer
      // token the checklist endpoints use — send both so this call actually
      // succeeds (an Authorization-only header made this a silent 401).
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: authHeaders(userId ? { 'x-user-id': userId } : undefined),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data?.members)) {
        setMembers(data.data.members);
      }
    } catch (err) {
      console.error('Error fetching group members:', err);
    }
  }, [groupId, authHeaders]);

  useEffect(() => {
    if (!accessToken) return;

    setLoading(true);
    Promise.all([fetchItems(), fetchMembers()]).finally(() => setLoading(false));

    pollingIntervalRef.current = setInterval(() => {
      fetchItems();
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, groupId, accessToken]);

  const handleAddItem = async () => {
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/checklist`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title: newTitle.trim(),
          assigned_to: newAssignee || undefined,
          item_date: newDate || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add item');
      }

      setItems((prev) => [...prev, data.data]);
      setNewTitle('');
      setNewAssignee('');
      setNewDate('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add item', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleToggle = async (item: ChecklistItem) => {
    const previousChecked = item.is_checked;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_checked: !previousChecked } : i)));

    try {
      const response = await fetch(
        `/api/groups/${groupId}/events/${eventId}/checklist/${item.id}`,
        {
          method: 'PATCH',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ is_checked: !previousChecked }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update item');
      }
    } catch (err: any) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_checked: previousChecked } : i)));
      toast({ title: 'Error', description: err.message || 'Failed to update item', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
    setEditingDate(item.item_date ? item.item_date.slice(0, 10) : '');
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editingTitle.trim()) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: editingTitle.trim(), item_date: editingDate || null }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update item');
      }

      setItems((prev) => prev.map((i) => (i.id === itemId ? data.data : i)));
      setEditingId(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update item', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleDelete = async (itemId: string) => {
    const previousItems = items;
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/checklist/${itemId}`, {
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

  const memberName = (id: string | null) => {
    if (!id) return null;
    return members.find((m) => m.user_id === id)?.name || 'Unknown';
  };

  const renderItemRow = (item: ChecklistItem) => (
    <HStack key={item.id} spacing={3} py={2} borderBottom="1px solid" borderColor="cork.100">
      <Checkbox
        isChecked={item.is_checked}
        onChange={() => handleToggle(item)}
        aria-label={`Mark "${item.title}" as ${item.is_checked ? 'not done' : 'done'}`}
      />
      {editingId === item.id ? (
        <HStack flex={1}>
          <Input
            size="sm"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            aria-label="Edit checklist item title"
          />
          <Input
            size="sm"
            type="date"
            value={editingDate}
            onChange={(e) => setEditingDate(e.target.value)}
            aria-label="Edit checklist item date"
          />
          <Button size="sm" onClick={() => handleSaveEdit(item.id)}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
            Cancel
          </Button>
        </HStack>
      ) : (
        <>
          <Text flex={1} textDecoration={item.is_checked ? 'line-through' : 'none'} color={item.is_checked ? 'ink.400' : 'ink.800'}>
            {item.title}
          </Text>
          {item.item_date && (
            <Badge colorScheme="cork" fontSize="xs">
              {formatItemDateLabel(item.item_date)}
            </Badge>
          )}
          {item.assigned_to && (
            <Badge colorScheme="cork" fontSize="xs">
              {memberName(item.assigned_to)}
            </Badge>
          )}
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
        </>
      )}
    </HStack>
  );

  const todayItems = items.filter(isItemToday);
  const generalItems = items.filter((item) => !isItemToday(item)).sort(compareByItemDateThenCreatedAt);

  if (loading) {
    return (
      <HStack justify="center" py={6}>
        <Spinner size="sm" />
        <Text fontSize="sm" color="ink.500">
          Loading checklist...
        </Text>
      </HStack>
    );
  }

  return (
    <Box>
      <Heading as="h2" fontWeight="bold" fontSize="lg" mb={4}>
        Checklist
      </Heading>

      {todayItems.length > 0 && (
        <Box mb={6}>
          <Heading as="h3" fontWeight="semibold" fontSize="md" mb={2}>
            Today
          </Heading>
          <VStack spacing={2} align="stretch">
            {todayItems.map(renderItemRow)}
          </VStack>
        </Box>
      )}

      <VStack spacing={2} align="stretch" mb={6}>
        {generalItems.length === 0 && (
          <Text color="ink.500" fontSize="sm">
            No checklist items yet.
          </Text>
        )}
        {generalItems.map(renderItemRow)}
      </VStack>

      <HStack spacing={2} align="flex-end">
        <FormControl flex={2}>
          <Input
            placeholder="Add a checklist item..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddItem();
            }}
            aria-label="New checklist item title"
          />
        </FormControl>
        <FormControl flex={1}>
          <Select
            placeholder="Unassigned"
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            aria-label="Assign to (optional)"
          >
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl flex={1}>
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            aria-label="Item date (optional)"
          />
        </FormControl>
        <Button onClick={handleAddItem} isDisabled={!newTitle.trim()} colorScheme="coral">
          Add
        </Button>
      </HStack>
    </Box>
  );
}

export default EventChecklist;
