'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Link,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useWidgetLabel } from './EventLabelsContext';
import { isValidNoteUrl } from '@/lib/services/noteUrlValidation';

interface Note {
  id: string;
  created_by: string;
  title: string;
  url: string | null;
  body: string | null;
}

interface EventNotesProps {
  eventId: string;
  groupId?: string;
  publicToken?: string;
  requestLogin?: () => void;
}

export function EventNotes({ eventId, groupId, publicToken }: EventNotesProps) {
  const widgetLabel = useWidgetLabel('notes');
  const { userId, accessToken } = useAuth();
  const toast = useToast();

  const interactive = Boolean(groupId && accessToken);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editBody, setEditBody] = useState('');

  const authHeaders = useCallback(
    (extra?: Record<string, string>): Record<string, string> => ({
      Authorization: `Bearer ${accessToken}`,
      ...extra,
    }),
    [accessToken]
  );

  const baseUrl = groupId ? `/api/groups/${groupId}/events/${eventId}/notes` : null;

  const fetchNotes = useCallback(async () => {
    try {
      const endpoint = interactive ? baseUrl : publicToken ? `/api/events/public/${publicToken}/notes` : null;
      if (!endpoint) return;
      const response = await fetch(endpoint, { headers: interactive ? authHeaders() : undefined });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) setNotes(data.data);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  }, [interactive, baseUrl, publicToken, authHeaders]);

  const fetchRole = useCallback(async () => {
    if (!interactive || !groupId || !userId) return;
    try {
      const response = await fetch(`/api/groups/${groupId}`, { headers: authHeaders({ 'x-user-id': userId }) });
      if (!response.ok) return;
      const data = await response.json();
      const me = Array.isArray(data.data?.members)
        ? data.data.members.find((m: { user_id: string }) => m.user_id === userId)
        : null;
      setIsAdmin(me?.role === 'admin');
    } catch (err) {
      console.error('Error fetching group role:', err);
    }
  }, [interactive, groupId, userId, authHeaders]);

  useEffect(() => {
    if (!groupId && !publicToken) return;
    setLoading(true);
    Promise.all([fetchNotes(), fetchRole()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, groupId, publicToken, accessToken]);

  const urlProblem = (value: string) => value.trim() !== '' && !isValidNoteUrl(value.trim());

  const handleAdd = async () => {
    if (submitting || !title.trim() || urlProblem(url)) return;
    setSubmitting(true);
    try {
      const response = await fetch(baseUrl!, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: title.trim(), url: url.trim() || undefined, body: body.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.data) throw new Error(data.error || 'Failed to add note');
      setNotes((prev) => [...prev, data.data]);
      setTitle('');
      setUrl('');
      setBody('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add note', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (n: Note) => {
    setEditingId(n.id);
    setEditTitle(n.title);
    setEditUrl(n.url ?? '');
    setEditBody(n.body ?? '');
  };

  const saveEdit = async (id: string) => {
    if (submitting || !editTitle.trim() || urlProblem(editUrl)) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${baseUrl}/${id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: editTitle.trim(), url: editUrl.trim() || null, body: editBody.trim() || null }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.data) throw new Error(data.error || 'Failed to update note');
      setNotes((prev) => prev.map((n) => (n.id === id ? data.data : n)));
      setEditingId(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update note', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const previous = notes;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      const response = await fetch(`${baseUrl}/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete note');
      }
    } catch (err: any) {
      setNotes(previous);
      toast({ title: 'Error', description: err.message || 'Failed to delete note', status: 'error', duration: 3000, isClosable: true });
    }
  };

  if (!groupId && !publicToken) return null;

  if (loading) {
    return (
      <HStack justify="center" py={6}>
        <Spinner size="sm" />
        <Text fontSize="sm" color="ink.500">
          Loading notes...
        </Text>
      </HStack>
    );
  }

  const renderNote = (n: Note) => {
    if (editingId === n.id) {
      return (
        <VStack key={n.id} align="stretch" spacing={2} py={2} borderBottom="1px solid" borderColor="cork.100">
          <Input size="sm" maxLength={255} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} aria-label="Edit note title" />
          <Input
            size="sm"
            maxLength={2000}
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            isInvalid={urlProblem(editUrl)}
            aria-label="Edit note link"
          />
          <Textarea size="sm" maxLength={5000} value={editBody} onChange={(e) => setEditBody(e.target.value)} aria-label="Edit note text" />
          <HStack>
            <Button size="sm" onClick={() => saveEdit(n.id)} isDisabled={submitting}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </HStack>
        </VStack>
      );
    }
    const canManage = interactive && (n.created_by === userId || isAdmin);
    return (
      <HStack key={n.id} spacing={3} py={2} align="flex-start" borderBottom="1px solid" borderColor="cork.100">
        <Box flex={1} minW={0}>
          <Text fontWeight="semibold" color="ink.800">
            {n.title}
          </Text>
          {n.url && isValidNoteUrl(n.url) && (
            <Link href={n.url} isExternal rel="noopener noreferrer" target="_blank" color="coral.600" fontSize="sm" wordBreak="break-all">
              {n.url}
            </Link>
          )}
          {n.body && (
            <Text fontSize="sm" color="ink.600" whiteSpace="pre-wrap">
              {n.body}
            </Text>
          )}
        </Box>
        {canManage && (
          <HStack spacing={1}>
            <IconButton aria-label={`Edit note: ${n.title}`} icon={<EditIcon />} size="sm" variant="ghost" onClick={() => startEdit(n)} />
            <IconButton aria-label={`Delete note: ${n.title}`} icon={<DeleteIcon />} size="sm" variant="ghost" onClick={() => handleDelete(n.id)} />
          </HStack>
        )}
      </HStack>
    );
  };

  return (
    <Box>
      <Heading as="h2" fontWeight="bold" fontSize="lg" mb={4}>
        {widgetLabel}
      </Heading>

      <VStack spacing={2} align="stretch" mb={interactive ? 6 : 0}>
        {notes.length === 0 && (
          <Text color="ink.500" fontSize="sm">
            No notes or links yet.
          </Text>
        )}
        {notes.map(renderNote)}
      </VStack>

      {interactive && (
        <VStack spacing={2} align="stretch">
          <Input maxLength={255} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="New note title" />
          <Input
            maxLength={2000}
            placeholder="Link (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            isInvalid={urlProblem(url)}
            aria-label="New note link (optional)"
          />
          <Textarea maxLength={5000} placeholder="Notes (optional)" value={body} onChange={(e) => setBody(e.target.value)} aria-label="New note text (optional)" />
          <Button onClick={handleAdd} isDisabled={submitting || !title.trim() || urlProblem(url)} colorScheme="coral" alignSelf="flex-start">
            Add
          </Button>
        </VStack>
      )}
    </Box>
  );
}

export default EventNotes;
