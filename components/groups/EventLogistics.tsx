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
  useDisclosure,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  isItemToday,
  formatItemDateLabel,
  compareByItemDateThenCreatedAt,
} from '@/lib/utils/itemDateGrouping';
import { ItemCommentPopover } from './ItemCommentPopover';
import { LogisticsCategoryEditor } from './LogisticsCategoryEditor';
import {
  LogisticsCategoryDef,
  LogisticsCategoryMode,
  defaultLogisticsCategories,
  isLogisticsCategoryMode,
} from '@/lib/logistics/defaultCategories';

// Accept only well-formed category lists from the API; anything else falls
// back to the built-in defaults so the widget always renders.
function parseCategories(value: unknown): LogisticsCategoryDef[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parsed: LogisticsCategoryDef[] = [];
  for (const c of value) {
    if (
      !c ||
      typeof c.key !== 'string' ||
      typeof c.label !== 'string' ||
      !isLogisticsCategoryMode(c.mode)
    ) {
      return null;
    }
    parsed.push({ key: c.key, label: c.label, mode: c.mode });
  }
  return parsed;
}

// Empty-state copy for the built-in categories is kept as it was before
// categories became configurable.
function emptyText(category: LogisticsCategoryDef): string {
  if (category.key === 'bring' && category.label === 'Bring List') return 'Nothing on the bring list yet.';
  if (category.key === 'carpool' && category.label === 'Carpool') return 'No carpools set up yet.';
  return `Nothing in ${category.label} yet.`;
}

interface LogisticsClaim {
  user_id: string;
  claimed_at: string;
}

interface LogisticsItem {
  id: string;
  created_by: string;
  category: string;
  title: string;
  assigned_to: string | null;
  capacity: number | null;
  item_date: string | null;
  created_at: string;
  claims: LogisticsClaim[];
  claim_count: number;
  comment_count?: number;
}

interface GroupMember {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

// Guest (no-login) shape from publicPlanningService -- first-name-only
// identity (Story 13.5).
interface GuestLogisticsItem {
  id: string;
  category: string;
  title: string;
  capacity: number | null;
  assignee_first_name: string | null;
  claim_count: number;
  claimant_first_names: string[];
  comment_count?: number;
}

interface EventLogisticsProps {
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

export function EventLogistics({ eventId, groupId, publicToken, requestLogin }: EventLogisticsProps) {
  const { userId, accessToken } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<LogisticsItem[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [guestItems, setGuestItems] = useState<GuestLogisticsItem[]>([]);
  // Learned from the public planning endpoint once a guest logs in via the
  // in-place modal -- lets this widget upgrade to the interactive fetches
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
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<LogisticsCategoryDef[]>(defaultLogisticsCategories);
  const [newCategoryKey, setNewCategoryKey] = useState('bring');
  const categoryEditor = useDisclosure();
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

  // Fall back to the first category if the selected one no longer exists.
  const activeCategory = categories.find((c) => c.key === newCategoryKey) ?? categories[0];
  const newMode: LogisticsCategoryMode = activeCategory?.mode ?? 'single';
  const categoryByKey = (key: string) => categories.find((c) => c.key === key);

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
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/logistics`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
        setMembershipConfirmed(true);
      }
    } catch (err) {
      console.error('Error fetching logistics items:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [eventId, effectiveGroupId, authHeaders]);

  const fetchCategories = useCallback(async () => {
    if (!effectiveGroupId) return;
    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/logistics-categories`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      const parsed = data.success ? parseCategories(data.data?.categories) : null;
      if (parsed) setCategories(parsed);
    } catch (err) {
      console.error('Error fetching logistics categories:', err);
    }
  }, [effectiveGroupId, authHeaders]);

  const fetchMembers = useCallback(async () => {
    if (!effectiveGroupId) return;
    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}`, { headers: authHeaders() });
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
  }, [effectiveGroupId, authHeaders]);

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
        if (Array.isArray(data.data.logistics)) setGuestItems(data.data.logistics);
        const parsed = parseCategories(data.data.logistics_categories);
        if (parsed) setCategories(parsed);
        if (typeof data.data.group_id === 'string') setResolvedGroupId(data.data.group_id);
      }
    } catch (err) {
      console.error('Error fetching public logistics:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [publicToken, accessToken]);

  useEffect(() => {
    if (!canAttemptAuthenticated) return;

    setLoading(true);
    Promise.all([fetchItems(), fetchMembers(), fetchCategories()]).finally(() => setLoading(false));

    pollingIntervalRef.current = setInterval(() => {
      fetchItems();
      fetchCategories();
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
    if (!activeCategory) return;
    if (newMode === 'seats' && (!newAssignee || !newCapacity)) return;

    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/logistics`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          category: activeCategory.key,
          title: newTitle.trim(),
          assigned_to: newAssignee || undefined,
          capacity: newMode === 'seats' ? parseInt(newCapacity, 10) : undefined,
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
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/logistics/${itemId}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: editingTitle.trim(), item_date: editingDate || null }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update item');
      }

      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...data.data, comment_count: i.comment_count } : i))
      );
      setEditingId(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update item', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleDelete = async (itemId: string) => {
    const previousItems = items;
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/logistics/${itemId}`, {
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
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/logistics/${item.id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ assigned_to: claiming ? userId : null }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update item');
      }

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...data.data, comment_count: i.comment_count } : i))
      );
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
        `/api/groups/${effectiveGroupId}/events/${eventId}/logistics/${item.id}/claims`,
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

  const handleSaveCategories = async (
    list: { key?: string; label: string; mode: LogisticsCategoryMode }[]
  ) => {
    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/logistics-categories`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ categories: list }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save categories');
      }
      const parsed = parseCategories(data.data?.categories);
      if (parsed) setCategories(parsed);
      categoryEditor.onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save categories', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const memberName = (id: string | null) => {
    if (!id) return null;
    return members.find((m) => m.user_id === id)?.name || 'Unknown';
  };

  const handleCommentCountChange = useCallback((itemId: string, count: number) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, comment_count: count } : i)));
    setGuestItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, comment_count: count } : i)));
  }, []);

  const renderCommentPopover = (item: LogisticsItem) => (
    <ItemCommentPopover
      itemId={item.id}
      itemType="logistics"
      itemLabel={item.title}
      fetchCommentsUrl={`/api/groups/${effectiveGroupId}/events/${eventId}/logistics/${item.id}/comments`}
      addCommentUrl={`/api/groups/${effectiveGroupId}/events/${eventId}/logistics/${item.id}/comments`}
      commentCount={item.comment_count ?? 0}
      userRole={userRole}
      onCountChange={handleCommentCountChange}
    />
  );

  const renderGuestCommentPopover = (item: GuestLogisticsItem) => (
    <ItemCommentPopover
      itemId={item.id}
      itemType="logistics"
      itemLabel={item.title}
      fetchCommentsUrl={`/api/events/public/${publicToken}/logistics/${item.id}/comments`}
      addCommentUrl={`/api/events/public/${publicToken}/logistics/${item.id}/comments`}
      commentCount={item.comment_count ?? 0}
      isGuest
      onRequestLogin={requestLogin}
      onCountChange={handleCommentCountChange}
    />
  );

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
  // where items from every category are interleaved and the category
  // heading that normally conveys it isn't present.
  const renderSingleRow = (item: LogisticsItem, opts?: { showCategoryBadge?: boolean }) => {
    const isSelf = item.assigned_to === userId;
    return (
      <HStack key={item.id} spacing={3} py={2} borderBottom="1px solid" borderColor="cork.100">
        {renderTitleOrEdit(item)}
        {editingId !== item.id && (
          <>
            {opts?.showCategoryBadge && (
              <Badge colorScheme="cork" fontSize="xs">
                {categoryByKey(item.category)?.label ?? item.category}
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
            {renderCommentPopover(item)}
            {renderItemControls(item)}
          </>
        )}
      </HStack>
    );
  };

  const renderSeatsRow = (item: LogisticsItem, opts?: { showCategoryBadge?: boolean }) => {
    const hasClaimed = item.claims.some((c) => c.user_id === userId);
    const isFull = item.claim_count >= (item.capacity ?? 0);
    return (
      <HStack key={item.id} spacing={3} py={2} borderBottom="1px solid" borderColor="cork.100">
        {renderTitleOrEdit(item)}
        {editingId !== item.id && (
          <>
            {opts?.showCategoryBadge && (
              <Badge colorScheme="cork" fontSize="xs">
                {categoryByKey(item.category)?.label ?? item.category}
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
            {renderCommentPopover(item)}
            {renderItemControls(item)}
          </>
        )}
      </HStack>
    );
  };

  const renderItemRow = (item: LogisticsItem, opts?: { showCategoryBadge?: boolean }) =>
    categoryByKey(item.category)?.mode === 'seats'
      ? renderSeatsRow(item, opts)
      : renderSingleRow(item, opts);

  const todayItems = items.filter(isItemToday);
  const generalItems = items.filter((item) => !isItemToday(item));
  // Each general sub-list (one per category) is ordered by item_date
  // ascending on its own — they render as separate lists under separate
  // headings, so there's no single combined "general list" to sort.
  const itemsForCategory = (key: string) =>
    generalItems.filter((i) => i.category === key).sort(compareByItemDateThenCreatedAt);
  const usedKeys = new Set(items.map((i) => i.category));

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
          Loading logistics...
        </Text>
      </HStack>
    );
  }

  // Guest (no-login) read-only render: same Bring List/Carpool split, minus
  // interactive controls. Claim buttons prompt login instead of claiming.
  if (!interactive && publicToken) {
    return (
      <Box>
        <Heading as="h2" fontWeight="bold" fontSize="lg" mb={4}>
          Logistics
        </Heading>

        {categories.map((category) => {
          const categoryItems = guestItems.filter((i) => i.category === category.key);
          return (
            <Box key={category.key} mb={6}>
              <Heading as="h3" fontWeight="semibold" fontSize="md" mb={2}>
                {category.label}
              </Heading>
              <VStack spacing={2} align="stretch">
                {categoryItems.length === 0 && (
                  <Text color="ink.500" fontSize="sm">
                    {emptyText(category)}
                  </Text>
                )}
                {category.mode === 'single'
                  ? categoryItems.map((item) => (
                      <HStack key={item.id} spacing={3} py={2} borderBottom="1px solid" borderColor="cork.100">
                        <Text flex={1} color="ink.800">
                          {item.title}
                        </Text>
                        {item.assignee_first_name ? (
                          <Badge colorScheme="cork" fontSize="xs">
                            {item.assignee_first_name}
                          </Badge>
                        ) : (
                          <>
                            <Text color="ink.500" fontSize="xs">
                              Unclaimed
                            </Text>
                            <Button size="sm" variant="outline" onClick={() => requestLogin?.()}>
                              Log in to bring this
                            </Button>
                          </>
                        )}
                        {renderGuestCommentPopover(item)}
                      </HStack>
                    ))
                  : categoryItems.map((item) => {
                      const isFull = item.claim_count >= (item.capacity ?? 0);
                      return (
                        <HStack key={item.id} spacing={3} py={2} borderBottom="1px solid" borderColor="cork.100">
                          <Text flex={1} color="ink.800">
                            {item.title}
                          </Text>
                          {item.assignee_first_name && (
                            <Badge colorScheme="cork" fontSize="xs">
                              Driver: {item.assignee_first_name}
                            </Badge>
                          )}
                          <Text fontSize="xs" color="ink.500">
                            {item.claim_count}/{item.capacity} seats claimed
                            {item.claimant_first_names.length > 0 && ` — ${item.claimant_first_names.join(', ')}`}
                          </Text>
                          <Button size="sm" variant="outline" isDisabled={isFull} onClick={() => requestLogin?.()}>
                            {isFull ? 'Seats full' : 'Log in to claim a seat'}
                          </Button>
                          {renderGuestCommentPopover(item)}
                        </HStack>
                      );
                    })}
              </VStack>
            </Box>
          );
        })}
      </Box>
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

      {categories.map((category) => {
        const categoryItems = itemsForCategory(category.key);
        return (
          <Box key={category.key} mb={6}>
            <Heading as="h3" fontWeight="semibold" fontSize="md" mb={2}>
              {category.label}
            </Heading>
            <VStack spacing={2} align="stretch">
              {categoryItems.length === 0 && (
                <Text color="ink.500" fontSize="sm">
                  {emptyText(category)}
                </Text>
              )}
              {categoryItems.map((item) => renderItemRow(item))}
            </VStack>
          </Box>
        );
      })}

      {/* Add item form */}
      <VStack align="stretch" spacing={2}>
        <RadioGroup value={activeCategory?.key ?? ''} onChange={(v) => setNewCategoryKey(v)}>
          <HStack spacing={4} wrap="wrap">
            {categories.map((c) => (
              <Radio key={c.key} value={c.key}>
                {c.label}
              </Radio>
            ))}
          </HStack>
        </RadioGroup>

        <HStack spacing={2} align="flex-end">
          <FormControl flex={2}>
            <Input
              placeholder={newMode === 'single' ? 'What are you bringing?' : 'e.g. Leaving downtown at 5pm'}
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
              placeholder={newMode === 'seats' ? 'Driver (required)' : 'Unassigned'}
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              aria-label={newMode === 'seats' ? 'Driver' : 'Assign to (optional)'}
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </FormControl>
          {newMode === 'seats' && (
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
            isDisabled={!newTitle.trim() || (newMode === 'seats' && (!newAssignee || !newCapacity))}
            colorScheme="coral"
          >
            Add
          </Button>
        </HStack>
      </VStack>

      {isAdmin && interactive && (
        <>
          <Button size="sm" variant="ghost" mt={4} onClick={categoryEditor.onOpen}>
            Manage categories
          </Button>
          <LogisticsCategoryEditor
            isOpen={categoryEditor.isOpen}
            onClose={categoryEditor.onClose}
            categories={categories}
            usedKeys={usedKeys}
            onSave={handleSaveCategories}
          />
        </>
      )}
    </Box>
  );
}

export default EventLogistics;
