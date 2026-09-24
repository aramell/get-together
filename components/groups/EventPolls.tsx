'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  Button,
  IconButton,
  Spinner,
  useToast,
  FormControl,
} from '@chakra-ui/react';
import { AddIcon, CloseIcon, DeleteIcon } from '@chakra-ui/icons';
import { useAuth } from '@/lib/contexts/AuthContext';

interface PollOption {
  id: string;
  label: string;
  display_order: number;
  vote_count: number;
}

interface Poll {
  id: string;
  created_by: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  user_vote: string | null;
}

// Guest (no-login) shape from publicPlanningService (Story 13.5). No
// user_vote -- a guest hasn't voted, and no per-voter identity is exposed
// (matches what even authenticated members see: vote counts only).
interface GuestPollOption {
  id: string;
  label: string;
  vote_count: number;
}

interface GuestPoll {
  id: string;
  question: string;
  options: GuestPollOption[];
  total_votes: number;
}

interface EventPollsProps {
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

export function EventPolls({ eventId, groupId, publicToken, requestLogin }: EventPollsProps) {
  const { userId, accessToken } = useAuth();
  const toast = useToast();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [guestPolls, setGuestPolls] = useState<GuestPoll[]>([]);
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
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);

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

  const fetchPolls = useCallback(async () => {
    if (!effectiveGroupId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/polls`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPolls(data.data);
        setMembershipConfirmed(true);
      }
    } catch (err) {
      console.error('Error fetching polls:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [eventId, effectiveGroupId, authHeaders]);

  const fetchUserRole = useCallback(async () => {
    if (!effectiveGroupId) return;
    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}`, { headers: authHeaders() });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && data.data?.currentUserRole) {
        setUserRole(data.data.currentUserRole);
      }
    } catch (err) {
      console.error('Error fetching group role:', err);
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
        if (Array.isArray(data.data.polls)) setGuestPolls(data.data.polls);
        if (typeof data.data.group_id === 'string') setResolvedGroupId(data.data.group_id);
      }
    } catch (err) {
      console.error('Error fetching public polls:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [publicToken, accessToken]);

  useEffect(() => {
    if (!canAttemptAuthenticated) return;

    setLoading(true);
    Promise.all([fetchPolls(), fetchUserRole()]).finally(() => setLoading(false));

    pollingIntervalRef.current = setInterval(() => {
      fetchPolls();
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

  const handleOptionChange = (index: number, value: string) => {
    setNewOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const handleAddOptionField = () => {
    setNewOptions((prev) => [...prev, '']);
  };

  const handleRemoveOptionField = (index: number) => {
    setNewOptions((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  };

  const canCreatePoll =
    newQuestion.trim().length > 0 && newOptions.filter((o) => o.trim().length > 0).length >= 2;

  const handleCreatePoll = async () => {
    if (!canCreatePoll) return;

    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/polls`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          question: newQuestion.trim(),
          options: newOptions.map((o) => o.trim()).filter((o) => o.length > 0),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create poll');
      }

      setPolls((prev) => [...prev, data.data]);
      setNewQuestion('');
      setNewOptions(['', '']);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create poll', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    const previousPolls = polls;
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        const previousVote = p.user_vote;
        return {
          ...p,
          user_vote: optionId,
          options: p.options.map((o) => {
            if (o.id === optionId) return { ...o, vote_count: o.vote_count + 1 };
            if (o.id === previousVote) return { ...o, vote_count: Math.max(0, o.vote_count - 1) };
            return o;
          }),
          total_votes: previousVote ? p.total_votes : p.total_votes + 1,
        };
      })
    );

    try {
      const response = await fetch(
        `/api/groups/${effectiveGroupId}/events/${eventId}/polls/${pollId}/vote`,
        {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ option_id: optionId }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to vote');
      }

      await fetchPolls();
    } catch (err: any) {
      setPolls(previousPolls);
      toast({ title: 'Error', description: err.message || 'Failed to vote', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleRemoveVote = async (pollId: string) => {
    const previousPolls = polls;
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId || !p.user_vote) return p;
        return {
          ...p,
          user_vote: null,
          options: p.options.map((o) =>
            o.id === p.user_vote ? { ...o, vote_count: Math.max(0, o.vote_count - 1) } : o
          ),
          total_votes: Math.max(0, p.total_votes - 1),
        };
      })
    );

    try {
      const response = await fetch(
        `/api/groups/${effectiveGroupId}/events/${eventId}/polls/${pollId}/vote`,
        { method: 'DELETE', headers: authHeaders() }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove vote');
      }
    } catch (err: any) {
      setPolls(previousPolls);
      toast({ title: 'Error', description: err.message || 'Failed to remove vote', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    const previousPolls = polls;
    setPolls((prev) => prev.filter((p) => p.id !== pollId));

    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/polls/${pollId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete poll');
      }
    } catch (err: any) {
      setPolls(previousPolls);
      toast({ title: 'Error', description: err.message || 'Failed to delete poll', status: 'error', duration: 3000, isClosable: true });
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
          Loading polls...
        </Text>
      </HStack>
    );
  }

  // Guest (no-login) read-only render: same vote bars, no selection state
  // (a guest hasn't voted), and Vote prompts login instead of voting. No
  // create-poll form.
  if (!interactive && publicToken) {
    return (
      <Box>
        <Heading as="h2" fontWeight="bold" fontSize="lg" mb={4}>
          Polls
        </Heading>

        <VStack spacing={4} align="stretch">
          {guestPolls.length === 0 && (
            <Text color="ink.500" fontSize="sm">
              No polls yet.
            </Text>
          )}
          {guestPolls.map((poll) => (
            <Box key={poll.id} p={3} borderWidth="1px" borderColor="cork.100" borderRadius="md">
              <Text fontWeight="semibold" mb={2}>
                {poll.question}
              </Text>
              <VStack spacing={2} align="stretch">
                {poll.options.map((option) => {
                  const pct = poll.total_votes > 0 ? Math.round((option.vote_count / poll.total_votes) * 100) : 0;
                  return (
                    <HStack key={option.id} spacing={3}>
                      <Box flex={1} position="relative" bg="cork.100" borderRadius="md" overflow="hidden" h="32px">
                        <Box
                          position="absolute"
                          top={0}
                          left={0}
                          bottom={0}
                          bg="cork.300"
                          width={`${pct}%`}
                          transition="width 0.2s"
                        />
                        <HStack position="relative" h="100%" px={2} justify="space-between">
                          <Text fontSize="sm">{option.label}</Text>
                          <Text fontSize="xs" color="ink.600">
                            {option.vote_count} ({pct}%)
                          </Text>
                        </HStack>
                      </Box>
                      <Button size="sm" variant="outline" onClick={() => requestLogin?.()}>
                        Log in to vote
                      </Button>
                    </HStack>
                  );
                })}
              </VStack>
            </Box>
          ))}
        </VStack>
      </Box>
    );
  }

  return (
    <Box>
      <Heading as="h2" fontWeight="bold" fontSize="lg" mb={4}>
        Polls
      </Heading>

      <VStack spacing={4} align="stretch" mb={6}>
        {polls.length === 0 && (
          <Text color="ink.500" fontSize="sm">
            No polls yet.
          </Text>
        )}
        {polls.map((poll) => {
          const canModify = poll.created_by === userId || isAdmin;
          return (
            <Box key={poll.id} p={3} borderWidth="1px" borderColor="cork.100" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="semibold">{poll.question}</Text>
                {canModify && (
                  <IconButton
                    aria-label="Delete poll"
                    icon={<DeleteIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePoll(poll.id)}
                  />
                )}
              </HStack>

              <VStack spacing={2} align="stretch">
                {poll.options.map((option) => {
                  const pct = poll.total_votes > 0 ? Math.round((option.vote_count / poll.total_votes) * 100) : 0;
                  const isSelected = poll.user_vote === option.id;
                  return (
                    <HStack key={option.id} spacing={3}>
                      <Box flex={1} position="relative" bg="cork.100" borderRadius="md" overflow="hidden" h="32px">
                        <Box
                          position="absolute"
                          top={0}
                          left={0}
                          bottom={0}
                          bg={isSelected ? 'coral.400' : 'cork.300'}
                          width={`${pct}%`}
                          transition="width 0.2s"
                        />
                        <HStack position="relative" h="100%" px={2} justify="space-between">
                          <Text fontSize="sm" fontWeight={isSelected ? 'bold' : 'normal'}>
                            {option.label}
                          </Text>
                          <Text fontSize="xs" color="ink.600">
                            {option.vote_count} ({pct}%)
                          </Text>
                        </HStack>
                      </Box>
                      <Button
                        size="sm"
                        variant={isSelected ? 'solid' : 'outline'}
                        colorScheme={isSelected ? 'coral' : undefined}
                        onClick={() => handleVote(poll.id, option.id)}
                      >
                        {isSelected ? 'Selected' : 'Vote'}
                      </Button>
                    </HStack>
                  );
                })}
              </VStack>

              {poll.user_vote && (
                <Button size="sm" variant="ghost" mt={2} onClick={() => handleRemoveVote(poll.id)}>
                  Remove my vote
                </Button>
              )}
            </Box>
          );
        })}
      </VStack>

      {/* Create poll form */}
      <VStack align="stretch" spacing={2}>
        <FormControl>
          <Input
            placeholder="Ask a question... (e.g. Pizza or tacos?)"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            aria-label="New poll question"
          />
        </FormControl>

        {newOptions.map((option, index) => (
          <HStack key={index}>
            <Input
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              aria-label={`Poll option ${index + 1}`}
            />
            {newOptions.length > 2 && (
              <IconButton
                aria-label={`Remove option ${index + 1}`}
                icon={<CloseIcon />}
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveOptionField(index)}
              />
            )}
          </HStack>
        ))}

        <HStack justify="space-between">
          <Button size="sm" leftIcon={<AddIcon />} variant="ghost" onClick={handleAddOptionField}>
            Add option
          </Button>
          <Button onClick={handleCreatePoll} isDisabled={!canCreatePoll} colorScheme="coral">
            Create Poll
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}

export default EventPolls;
