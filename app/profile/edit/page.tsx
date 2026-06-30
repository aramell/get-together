'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  VStack,
  Button,
  Alert,
  AlertIcon,
  Spinner,
} from '@chakra-ui/react';
import EditProfileForm from '@/components/auth/EditProfileForm';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getUserProfile } from '@/lib/services/authService';
import type { UserProfile as UserProfileType } from '@/lib/services/authService';

export default function EditProfilePage() {
  const router = useRouter();
  const { userId, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!userId) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        const result = await getUserProfile(userId);
        if (result.success && result.profile) {
          setProfile(result.profile);
        } else {
          setError(result.message || 'Failed to load profile');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('An error occurred while loading your profile');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadProfile();
    }
  }, [userId, isAuthenticated]);

  const handleSuccess = () => {
    // Redirect back to profile page after successful update
    router.push('/profile');
  };

  if (!isAuthenticated || loading) {
    return (
      <Container maxW="md" py={{ base: '12', md: '24' }}>
        <VStack spacing={8} align="center" justify="center" minH="400px">
          <Spinner size="lg" color="blue.500" />
          <Text>Loading profile...</Text>
        </VStack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="md" py={{ base: '12', md: '24' }}>
        <VStack spacing={6}>
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Text>{error}</Text>
          </Alert>
          <Button colorScheme="blue" onClick={() => router.push('/profile')}>
            Back to Profile
          </Button>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="md" py={{ base: '12', md: '24' }}>
      <VStack spacing={{ base: '8', md: '10' }}>
        <Stack spacing="2" textAlign="center">
          <Heading size="lg">Edit Profile</Heading>
          <Text color="fg.muted">Update your account information</Text>
        </Stack>

        <Box w="100%">
          <EditProfileForm
            onSuccess={handleSuccess}
            initialProfile={{
              display_name: profile?.display_name || undefined,
              email: profile?.email,
              avatar_url: profile?.avatar_url || undefined,
            }}
          />
        </Box>

        <Button
          variant="ghost"
          colorScheme="gray"
          w="100%"
          onClick={() => router.push('/profile')}
        >
          Cancel
        </Button>
      </VStack>
    </Container>
  );
}
