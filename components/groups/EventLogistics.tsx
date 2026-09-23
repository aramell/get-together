'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  Select,
  Button,
  IconButton,
  Badge,
  Spinner,
  useToast,
  FormControl,
  RadioGroup,
  Radio,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  isItemToday,
  formatItemDateLabel,
  compareByItemDateThenCreatedAt,
} from '@/lib/utils/itemDateGrouping';

interface LogisticsClaim {
  user_id: string;
  claimed_at: string;
}

interface LogisticsItem {
  id: string;
  created_by: string;
  category: 'bring' | 'carpool';
  title: string;
  assigned_to: string | null;
  capacity: number | null;
  item_date: string | null;
  created_at: string;
  claims: LogisticsClaim[];
  claim_count: number;
}

interface GroupMember {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

interface EventLogisticsProps {
  eventId: string;
  groupId: string;
}

export function EventLogistics({ eventId, groupId }: EventLogisticsProps) {
  const { userId, accessToken } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<LogisticsItem[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState<'bring' | 'carpool'>('bring');
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newDate, setNewDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDate, setEditingDate] = useState('');

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  const isAdmin = userRole === 'admin';

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
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/logistics`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
      }
    } catch (err) {
      console.error('Error fetching logistics items:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [eventId, groupId, authHeaders]);

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}`, { headers: authHeaders() });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data?.members)) {
        setMembers(data.data.members);
      }
      if (data.success && data.data?.currentUserRole) {
        setUserRole(data.data.currentUserRole);
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
    if (newCategory === 'carpool' && (!newAssignee || !newCapacity)) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/logistics`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          category: newCategory,
          title: newTitle.trim(),
          assigned_to: newAssignee || undefined,
          capacity: newCategory === 'carpool' ? parseInt(newCapacity, 10) : undefined,
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
      setNewCapacity('');
      setNewDate('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add item', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleStartEdit = (item: LogisticsItem) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
    setEditingDate(item.item_date ? item.item_date.slice(0, 10) : '');
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editingTitle.trim()) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/logistics/${itemId}`, {
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
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/logistics/${itemId}`, {
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

  // Bring item: claim (assign to self) or unclaim (clear own assignment)
  const handleBringClaimToggle = async (item: LogisticsItem) => {
    const previousItems = items;
    const claiming = item.assigned_to === null;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, assigned_to: claiming ? userId : null } : i))
    );

    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/logistics/${item.id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ assigned_to: claiming ? userId : null }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update item');
      }

      setItems((prev) => prev.map((i) => (i.id === item.id ? data.data : i)));
    } catch (err: any) {
      setItems(previousItems);
      toast({ title: 'Error', description: err.message || 'Failed to update item', status: 'error', duration: 3000, isClosable: true });
    }
  };

  // Carpool item: claim or unclaim a seat via the dedicated claims endpoint
  const handleCarpoolClaimToggle = async (item: LogisticsItem) => {
    const hasClaimed = item.claims.some((c) => c.user_id === userId);

    try {
      const response = await fetch(
        `/api/groups/${groupId}/events/${eventId}/logistics/${item.id}/claims`,
        {
          method: hasClaimed ? 'DELETE' : 'POST',
          headers: authHeaders(),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update claim');
      }

      await fetchItems();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update claim', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const memberName = (id: string | null) => {
    if (!id) return null;
    return members.find((m) => m.user_id === id)?.name || 'Unknown';
  };

  const canModify = (item: LogisticsItem) => item.created_by === userId || isAdmin;

  const renderItemControls = (item: LogisticsItem) =>
    canModify(item) && (
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
    );

  const renderTitleOrEdit = (item: LogisticsItem) =>
    editingId === item.id ? (
      <HStack flex={1}>
        <Input
          size="sm"
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          aria-label="Edit logistics item title"
        />
        <Input
          size="sm"
          type="date"
          value={editingDate}
          onChange={(e) => setEditingDate(e.target.value)}
          aria-label="Edit logistics item date"
        />
        <Button size="sm" onClick={() => handleSaveEdit(item.id)}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
          Cancel
        </Button>
      </HStack>
    ) : (
      <Text flex={1} color="ink.800">
        {item.title}
      </Text>
    );

  const renderDateBadge = (item: LogisticsItem) =>
    item.item_date && (
      <Badge colorScheme="cork" fontSize="xs">
        {formatItemDateLabel(item.item_date)}
      </Badge>
    );

  // showCategoryBadge is true only inside the cross-cutting Today group,
  // where items from both categories are interleaved and the Bring
  // List/Carpool heading that normally conveys category isn't present.
  const renderBringRow = (item: LogisticsItem, opts?: { showCategoryBadge?: boolean }) => {
    const isSelf = item.assigned_to === userId;
    return (
      <HStack key={item.id} spacing={3} py={2} borderBottom="1px solid" borderColor="cork.100">
        {renderTitleOrEdit(item)}
        {editingId !== item.id && (
          <>
            {opts?.showCategoryBadge && (
              <Badge colorScheme="cork" fontSize="xs">
                Bring
              </Badge>
            )}
            {renderDateBadge(item)}
            {item.assigned_to ? (
              <Badge colorScheme="cork" fontSize="xs">
                {memberName(item.assigned_to)}
              </Badge>
            ) : (
              <Text color="ink.500" fontSize="xs">
                Unclaimed
              </Text>
            )}
            {(item.assigned_to === null || isSelf) && (
              <Button size="sm" variant="outline" onClick={() => handleBringClaimToggle(item)}>
                {isSelf ? 'Never mind' : "I'll bring this"}
              </Button>
            )}
            {renderItemControls(item)}
          </>
        )}
      </HStack>
    );
  };

  const renderCarpoolRow = (item: LogisticsItem, opts?: { showCategoryBadge?: boolean }) => {
    const hasClaimed = item.claims.some((c) => c.user_id === userId);
    const isFull = item.claim_count >= (item.capacity ?? 0);
    return (
      <HStack key={item.id} spacing={3} py={2} borderBottom="1px solid" borderColor="cork.100">
        {renderTitleOrEdit(item)}
        {editingId !== item.id && (
          <>
            {opts?.showCategoryBadge && (
              <Badge colorScheme="cork" fontSize="xs">
                Carpool
              </Badge>
            )}
            {renderDateBadge(item)}
            <Badge colorScheme="cork" fontSize="xs">
              Driver: {memberName(item.assigned_to)}
            </Badge>
            <Text fontSize="xs" color="ink.500">
              {item.claim_count}/{item.capacity} seats claimed
            </Text>
            <Button
              size="sm"
              variant="outline"
              isDisabled={!hasClaimed && isFull}
              onClick={() => handleCarpoolClaimToggle(item)}
            >
              {hasClaimed ? 'Unclaim seat' : 'Claim seat'}
            </Button>
            {renderItemControls(item)}
          </>
        )}
      </HStack>
    );
  };

  const renderItemRow = (item: LogisticsItem, opts?: { showCategoryBadge?: boolean }) =>
    item.category === 'bring' ? renderBringRow(item, opts) : renderCarpoolRow(item, opts);

  const todayItems = items.filter(isItemToday);
  const generalItems = items.filter((item) => !isItemToday(item));
  // Each general sub-list (Bring List, Carpool) is ordered by item_date
  // ascending on its own — they render as separate lists under separate
  // headings, so there's no single combined "general list" to sort.
  const bringItems = generalItems.filter((i) => i.category === 'bring').sort(compareByItemDateThenCreatedAt);
  const carpoolItems = generalItems.filter((i) => i.category === 'carpool').sort(compareByItemDateThenCreatedAt);

  if (loading) {
    return (
      <HStack justify="center" py={6}>
        <Spinner size="sm" />
        <Text fontSize="sm" color="ink.500">
          Loading logistics...
        </Text>
      </HStack>
    );
  }

  return (
    <Box>
      <Heading as="h2" fontWeight="bold" fontSize="lg" mb={4}>
        Logistics
      </Heading>

      {/* Today — a single cross-cutting group above the Bring/Carpool split;
          items keep their category badge since the section heading that
          normally conveys it isn't present here. */}
      {todayItems.length > 0 && (
        <Box mb={6}>
          <Heading as="h3" fontWeight="semibold" fontSize="md" mb={2}>
            Today
          </Heading>
          <VStack spacing={2} align="stretch">
            {todayItems.map((item) => renderItemRow(item, { showCategoryBadge: true }))}
          </VStack>
        </Box>
      )}

      {/* Bring List */}
      <Box mb={6}>
        <Heading as="h3" fontWeight="semibold" fontSize="md" mb={2}>
          Bring List
        </Heading>
        <VStack spacing={2} align="stretch">
          {bringItems.length === 0 && (
            <Text color="ink.500" fontSize="sm">
              Nothing on the bring list yet.
            </Text>
          )}
          {bringItems.map((item) => renderItemRow(item))}
        </VStack>
      </Box>

      {/* Carpool */}
      <Box mb={6}>
        <Heading as="h3" fontWeight="semibold" fontSize="md" mb={2}>
          Carpool
        </Heading>
        <VStack spacing={2} align="stretch">
          {carpoolItems.length === 0 && (
            <Text color="ink.500" fontSize="sm">
              No carpools set up yet.
            </Text>
          )}
          {carpoolItems.map((item) => renderItemRow(item))}
        </VStack>
      </Box>

      {/* Add item form */}
      <VStack align="stretch" spacing={2}>
        <RadioGroup value={newCategory} onChange={(v) => setNewCategory(v as 'bring' | 'carpool')}>
          <HStack spacing={4}>
            <Radio value="bring">Bring</Radio>
            <Radio value="carpool">Carpool</Radio>
          </HStack>
        </RadioGroup>

        <HStack spacing={2} align="flex-end">
          <FormControl flex={2}>
            <Input
              placeholder={newCategory === 'bring' ? 'What are you bringing?' : 'e.g. Leaving downtown at 5pm'}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem();
              }}
              aria-label="New logistics item title"
            />
          </FormControl>
          <FormControl flex={1}>
            <Select
              placeholder={newCategory === 'carpool' ? 'Driver (required)' : 'Unassigned'}
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              aria-label={newCategory === 'carpool' ? 'Driver' : 'Assign to (optional)'}
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </FormControl>
          {newCategory === 'carpool' && (
            <FormControl flex={1}>
              <NumberInput min={1} value={newCapacity} onChange={(v) => setNewCapacity(v)}>
                <NumberInputField placeholder="Seats" aria-label="Number of seats" />
              </NumberInput>
            </FormControl>
          )}
          <FormControl flex={1}>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              aria-label="Item date (optional)"
            />
          </FormControl>
          <Button
            onClick={handleAddItem}
            isDisabled={!newTitle.trim() || (newCategory === 'carpool' && (!newAssignee || !newCapacity))}
            colorScheme="coral"
          >
            Add
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}

export default EventLogistics;
