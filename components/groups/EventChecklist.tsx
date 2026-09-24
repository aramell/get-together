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

// Guest (no-login) shape from publicPlanningService -- first-name-only
// identity, no raw item_date/created_by (Story 13.5).
interface GuestChecklistItem {
  id: string;
  title: string;
  is_checked: boolean;
  assignee_first_name: string | null;
}

interface EventChecklistProps {
  eventId: string;
  // groupId is only known when rendered from the authenticated Dashboard.
  // A guest render (publicToken set instead) doesn't have it up front --
  // see resolvedGroupId below.
  groupId?: string;
  // Set when rendered from the no-login public event page instead of the
  // authenticated Dashboard.
  publicToken?: string;
  // Opens the public page's login-in-place modal; only relevant in guest
  // context (publicToken set).
  requestLogin?: () => void;
}

export function EventChecklist({ eventId, groupId, publicToken, requestLogin }: EventChecklistProps) {
  const { userId, accessToken } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [guestItems, setGuestItems] = useState<GuestChecklistItem[]>([]);
  // Learned from the public planning endpoint once a guest logs in via the
  // in-place modal (that endpoint includes group_id only for an
  // authenticated caller -- see publicPlanningService.ts). Lets this widget
  // upgrade to the real member-authenticated fetches below without
  // navigating away.
  const [resolvedGroupId, setResolvedGroupId] = useState<string | null>(null);
  const effectiveGroupId = groupId ?? resolvedGroupId ?? undefined;
  // Set only once the authenticated fetch below actually succeeds for a
  // guest-resolved group -- a resolved group_id alone doesn't prove the
  // logged-in account is a member (see the I/O matrix's "isn't a group
  // member -> stays read-only" row), so this can't be inferred just from
  // effectiveGroupId being set.
  const [membershipConfirmed, setMembershipConfirmed] = useState(false);
  // Whether it's worth attempting the authenticated fetch at all.
  const canAttemptAuthenticated = Boolean(accessToken && effectiveGroupId);
  // True once we have both a logged-in user and a real group we can act
  // against -- either the authenticated Dashboard's trusted groupId prop,
  // or a guest who just logged in, resolved a group_id, and whose
  // authenticated fetch actually succeeded (proving membership).
  const interactive =
    Boolean(accessToken && groupId) || Boolean(accessToken && resolvedGroupId && membershipConfirmed);
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
    if (!effectiveGroupId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/checklist`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
        // Reaching here proves the current account is an actual member of
        // effectiveGroupId -- see membershipConfirmed's doc above.
        setMembershipConfirmed(true);
      }
    } catch (err) {
      console.error('Error fetching checklist items:', err);
      // Don't show a toast for background polling failures
    } finally {
      isFetchingRef.current = false;
    }
  }, [eventId, effectiveGroupId, authHeaders]);

  const fetchMembers = useCallback(async () => {
    if (!effectiveGroupId) return;
    try {
      // /api/groups/:groupId authenticates via x-user-id, not the Bearer
      // token the checklist endpoints use — send both so this call actually
      // succeeds (an Authorization-only header made this a silent 401).
      const response = await fetch(`/api/groups/${effectiveGroupId}`, {
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
  }, [effectiveGroupId, authHeaders, userId]);

  // Guest (no-login) read-only fetch: the same public endpoint every guest
  // widget reads from, gated by public_token instead of accessToken. Also
  // forwards the Bearer token once one exists (post-login) so the response
  // can include group_id and this widget can upgrade to the interactive
  // fetch above -- see resolvedGroupId.
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
        if (Array.isArray(data.data.checklist)) setGuestItems(data.data.checklist);
        if (typeof data.data.group_id === 'string') setResolvedGroupId(data.data.group_id);
      }
    } catch (err) {
      console.error('Error fetching public checklist:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [publicToken, accessToken]);

  useEffect(() => {
    if (!canAttemptAuthenticated) return;

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
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/checklist`, {
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
        `/api/groups/${effectiveGroupId}/events/${eventId}/checklist/${item.id}`,
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
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/checklist/${itemId}`, {
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
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/checklist/${itemId}`, {
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
          Loading checklist...
        </Text>
      </HStack>
    );
  }

  // Guest (no-login) read-only render: same widget, minus interactive
  // controls, driven by the public-token-gated data fetched above. A click
  // on the checkbox prompts login instead of toggling anything.
  if (!interactive && publicToken) {
    return (
      <Box>
        <Heading as="h2" fontWeight="bold" fontSize="lg" mb={4}>
          Checklist
        </Heading>
        <VStack spacing={2} align="stretch">
          {guestItems.length === 0 && (
            <Text color="ink.500" fontSize="sm">
              No checklist items yet.
            </Text>
          )}
          {guestItems.map((item) => (
            <HStack key={item.id} spacing={3} py={2} borderBottom="1px solid" borderColor="cork.100">
              <Checkbox
                isChecked={item.is_checked}
                onChange={() => requestLogin?.()}
                aria-label={`Log in to mark "${item.title}" as ${item.is_checked ? 'not done' : 'done'}`}
              />
              <Text
                flex={1}
                textDecoration={item.is_checked ? 'line-through' : 'none'}
                color={item.is_checked ? 'ink.400' : 'ink.800'}
              >
                {item.title}
              </Text>
              {item.assignee_first_name && (
                <Badge colorScheme="cork" fontSize="xs">
                  {item.assignee_first_name}
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={() => requestLogin?.()}>
                Log in to check off
              </Button>
            </HStack>
          ))}
        </VStack>
      </Box>
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
