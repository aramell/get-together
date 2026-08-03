'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
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

interface EventPhotoGridProps {
  eventId: string;
  groupId: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function EventPhotoGrid({ eventId, groupId }: EventPhotoGridProps) {
  const { userId, accessToken } = useAuth();
  const toast = useToast();

  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = useCallback(
    (): Record<string, string> => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );

  const fetchPhotos = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/photos`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPhotos(data.data);
      }
    } catch (err) {
      console.error('Error fetching event photos:', err);
    }
  }, [eventId, groupId, authHeaders]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    fetchPhotos().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, groupId, accessToken]);

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

      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/photos`, {
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
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/photos/${photoId}`, {
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

  return (
    <Box>
      <Text fontWeight="bold" fontSize="lg" mb={4}>
        Photos
      </Text>

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
