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
  HStack,
  Button,
  Avatar,
  Alert,
  AlertIcon,
  Spinner,
  Divider,
} from '@chakra-ui/react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getUserProfile } from '@/lib/services/authService';
import type { UserProfile as UserProfileType } from '@/lib/services/authService';

export default function UserProfile() {
  const router = useRouter();
  const { userId, logout, isAuthenticated } = useAuth();
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

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleChangePassword = () => {
    router.push('/auth/forgot-password');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  if (!isAuthenticated || loading) {
    return (
      <Container maxW="md" py={{ base: '12', md: '24' }}>
        <VStack spacing={8} align="center" justify="center" minH="400px">
          <Spinner size="lg" color="blue.500" />
          <Text>Loading your profile...</Text>
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
          <Button colorScheme="blue" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </VStack>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxW="md" py={{ base: '12', md: '24' }}>
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Text>Profile data not available</Text>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="md" py={{ base: '12', md: '24' }}>
      <VStack spacing={{ base: '8', md: '10' }} align="stretch">
        {/* Header */}
        <Stack spacing="2" textAlign="center">
          <Heading size="lg">Your Profile</Heading>
          <Text color="fg.muted">View and manage your account information</Text>
        </Stack>

        {/* Profile Card */}
        <Box
          borderWidth="1px"
          borderRadius="lg"
          p={{ base: '6', md: '8' }}
          shadow="sm"
          backgroundColor="white"
        >
          <VStack spacing={6} align="stretch">
            {/* Avatar Section */}
            <VStack spacing={3} align="center">
              <Avatar
                name={profile.display_name || profile.email}
                src={profile.avatar_url || undefined}
                size="2xl"
                aria-label="Profile avatar"
              />
              <VStack spacing={0} align="center">
                <Heading size="md" aria-label="Display name">
                  {profile.display_name || 'No name set'}
                </Heading>
                <Text color="fg.muted" fontSize="sm">
                  {profile.email}
                </Text>
              </VStack>
            </VStack>

            <Divider />

            {/* Profile Information */}
            <VStack spacing={3} align="stretch">
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="fg.muted" mb={1}>
                  Display Name
                </Text>
                <Text fontSize="md">{profile.display_name || 'Not set'}</Text>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="fg.muted" mb={1}>
                  Email Address
                </Text>
                <Text fontSize="md">{profile.email}</Text>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="fg.muted" mb={1}>
                  Member Since
                </Text>
                <Text fontSize="sm">
                  {new Date(profile.created_at).toLocaleDateString()}
                </Text>
              </Box>
            </VStack>

            <Divider />

            {/* Action Buttons */}
            <VStack spacing={3} align="stretch">
              <Button
                colorScheme="blue"
                width="100%"
                onClick={handleEditProfile}
                aria-label="Edit profile button"
              >
                Edit Profile
              </Button>

              <Button
                colorScheme="gray"
                variant="outline"
                width="100%"
                onClick={handleChangePassword}
                aria-label="Change password button"
              >
                Change Password
              </Button>

              <Button
                colorScheme="red"
                variant="outline"
                width="100%"
                onClick={handleLogout}
                aria-label="Logout button"
              >
                Logout
              </Button>
            </VStack>
          </VStack>
        </Box>

        {/* Help Text */}
        <Text fontSize="xs" color="fg.muted" textAlign="center">
          Last updated: {new Date(profile.updated_at).toLocaleDateString()}
        </Text>
      </VStack>
    </Container>
  );
}
