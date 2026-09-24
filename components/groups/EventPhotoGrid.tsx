'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Image,
  IconButton,
  Button,
  Spinner,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import { useAuth } from '@/lib/contexts/AuthContext';

interface EventPhoto {
  id: string;
  uploaded_by: string;
  url: string;
  caption: string | null;
}

// Guest (no-login) shape from publicPlanningService (Story 13.5). No
// uploaded_by -- a guest can't act on photos, so there's no need to expose
// uploader identity here (matches the no-group-leakage stance).
interface GuestPhoto {
  id: string;
  url: string;
  caption: string | null;
}

interface EventPhotoGridProps {
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

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function EventPhotoGrid({ eventId, groupId, publicToken, requestLogin }: EventPhotoGridProps) {
  const { userId, accessToken } = useAuth();
  const toast = useToast();

  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [guestPhotos, setGuestPhotos] = useState<GuestPhoto[]>([]);
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  const authHeaders = useCallback(
    (): Record<string, string> => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );

  const fetchPhotos = useCallback(async () => {
    if (!effectiveGroupId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/photos`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPhotos(data.data);
        setMembershipConfirmed(true);
      }
    } catch (err) {
      console.error('Error fetching event photos:', err);
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
        if (Array.isArray(data.data.photos)) setGuestPhotos(data.data.photos);
        if (typeof data.data.group_id === 'string') setResolvedGroupId(data.data.group_id);
      }
    } catch (err) {
      console.error('Error fetching public photos:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [publicToken, accessToken]);

  useEffect(() => {
    if (!canAttemptAuthenticated) return;
    setLoading(true);
    fetchPhotos().finally(() => setLoading(false));

    pollingIntervalRef.current = setInterval(() => {
      fetchPhotos();
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

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: 'Error', description: 'Please upload a JPEG, PNG, or WebP image', status: 'error', duration: 3000, isClosable: true });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_SIZE) {
      toast({ title: 'Error', description: 'Photo must be less than 5MB', status: 'error', duration: 3000, isClosable: true });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set('file', file);

      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/photos`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      setPhotos((prev) => [...prev, data.data]);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to upload photo', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photoId: string) => {
    const previousPhotos = photos;
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));

    try {
      const response = await fetch(`/api/groups/${effectiveGroupId}/events/${eventId}/photos/${photoId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete photo');
      }
    } catch (err: any) {
      setPhotos(previousPhotos);
      toast({ title: 'Error', description: err.message || 'Failed to delete photo', status: 'error', duration: 3000, isClosable: true });
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
          Loading photos...
        </Text>
      </HStack>
    );
  }

  // Guest (no-login) read-only render: same grid, no delete controls (no
  // ownership concept for a guest), and Upload prompts login instead of
  // opening the file picker.
  if (!interactive && publicToken) {
    return (
      <Box>
        <Heading as="h2" fontWeight="bold" fontSize="lg" mb={4}>
          Photos
        </Heading>

        {guestPhotos.length === 0 && (
          <Text color="ink.500" fontSize="sm" mb={4}>
            No photos yet.
          </Text>
        )}

        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3} mb={4}>
          {guestPhotos.map((photo) => (
            <Image
              key={photo.id}
              src={photo.url}
              alt={photo.caption || 'Event planning photo'}
              borderRadius="md"
              objectFit="cover"
              width="100%"
              height="120px"
            />
          ))}
        </SimpleGrid>

        <Button colorScheme="coral" onClick={() => requestLogin?.()}>
          Log in to upload a photo
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Heading as="h2" fontWeight="bold" fontSize="lg" mb={4}>
        Photos
      </Heading>

      {photos.length === 0 && (
        <Text color="ink.500" fontSize="sm" mb={4}>
          No photos yet.
        </Text>
      )}

      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3} mb={4}>
        {photos.map((photo) => (
          <Box key={photo.id} position="relative">
            <Image
              src={photo.url}
              alt={photo.caption || 'Event planning photo'}
              borderRadius="md"
              objectFit="cover"
              width="100%"
              height="120px"
            />
            {photo.uploaded_by === userId && (
              <IconButton
                aria-label="Delete photo"
                icon={<DeleteIcon />}
                size="xs"
                position="absolute"
                top={1}
                right={1}
                colorScheme="red"
                onClick={() => handleDelete(photo.id)}
              />
            )}
          </Box>
        ))}
      </SimpleGrid>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
        aria-label="Upload a photo"
        id="event-photo-upload-input"
      />
      <Button
        as="label"
        htmlFor="event-photo-upload-input"
        colorScheme="coral"
        isLoading={uploading}
        loadingText="Uploading..."
        cursor="pointer"
      >
        Upload Photo
      </Button>
    </Box>
  );
}

export default EventPhotoGrid;
