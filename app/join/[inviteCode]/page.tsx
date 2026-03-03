'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Avatar,
  AvatarGroup,
  Card,
  CardBody,
  SimpleGrid,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { joinGroup, getGroupPreview } from '@/lib/services/groupService';

interface GroupPreviewData {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
}

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { isAuthenticated, userId } = useAuth();

  const inviteCode = params?.inviteCode as string;

  const [groupData, setGroupData] = useState<GroupPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      // Store the current invite code in session/state for post-login redirect
      const returnUrl = `/join/${inviteCode}`;
      router.push(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }
  }, [isAuthenticated, inviteCode, loading, router]);

  // Fetch group preview on load
  useEffect(() => {
    const fetchGroupPreview = async () => {
      if (!inviteCode) {
        setError('Invalid invite code');
        setLoading(false);
        return;
      }

      // Validate invite code format (16 hex characters)
      if (!/^[a-f0-9]{16}$/.test(inviteCode)) {
        setError('Invalid invite code format');
        setLoading(false);
        return;
      }

      try {
        const result = await getGroupPreview(inviteCode);

        if (result.success && result.data?.group) {
          setGroupData(result.data.group);
        } else if (result.errorCode === 'NOT_FOUND') {
          setError('Invalid or expired invite code. Please check the link and try again.');
        } else {
          setError(result.message || 'Failed to load group information');
        }
      } catch (err) {
        console.error('Error fetching group preview:', err);
        setError('An unexpected error occurred while loading the group');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupPreview();
  }, [inviteCode]);

  const handleJoinGroup = async () => {
    if (!inviteCode || isJoining) return;

    setIsJoining(true);

    try {
      const result = await joinGroup(inviteCode);

      if (result.success && result.group) {
        toast({
          title: 'Success!',
          description: `You've joined ${result.group.name}`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });

        // Redirect to group details page
        router.push(`/groups/${result.group.id}`);
      } else if (result.errorCode === 'CONFLICT') {
        // User is already a member
        toast({
          title: 'Already a Member',
          description: 'You are already a member of this group',
          status: 'info',
          duration: 2000,
          isClosable: true,
        });

        // Redirect to group details page
        if (result.group?.id) {
          router.push(`/groups/${result.group.id}`);
        }
      } else if (result.errorCode === 'NOT_FOUND') {
        setError('Invalid or expired invite code. Please check the link and try again.');
      } else if (result.errorCode === 'UNAUTHORIZED') {
        // Should not happen if we redirected to login earlier
        router.push('/auth/login');
      } else {
        setError(result.message || 'Failed to join group. Please try again.');
      }
    } catch (err) {
      console.error('Error joining group:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Box bg="gray.50" minH="100vh">
        <Container maxW="md" py={{ base: '12', md: '24' }}>
          <VStack spacing={8} align="stretch">
            <Box textAlign="center">
              <Heading as="h1" size="2xl" mb={2}>
                Join a Group
              </Heading>
              <Text color="gray.600" fontSize="lg">
                Sign in to accept this group invitation
              </Text>
            </Box>

            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Text>
                Please log in or create an account to join this group.
              </Text>
            </Alert>

            <Button
              colorScheme="blue"
              size="lg"
              width="100%"
              onClick={() => router.push(`/auth/login?returnUrl=${encodeURIComponent(`/join/${inviteCode}`)}`)}
            >
              Log In
            </Button>

            <Button
              colorScheme="gray"
              variant="outline"
              size="lg"
              width="100%"
              onClick={() => router.push(`/auth/signup?returnUrl=${encodeURIComponent(`/join/${inviteCode}`)}`)}
            >
              Create Account
            </Button>
          </VStack>
        </Container>
      </Box>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <Container maxW="md" py={{ base: '12', md: '24' }}>
        <VStack spacing={8} align="center" justify="center" minH="400px">
          <Spinner size="lg" color="blue.500" />
          <Text>Loading group information...</Text>
        </VStack>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box bg="gray.50" minH="100vh">
        <Container maxW="md" py={{ base: '12', md: '24' }}>
          <VStack spacing={6}>
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <Text>{error}</Text>
            </Alert>
            <Button colorScheme="blue" onClick={() => router.push('/groups')}>
              Back to Groups
            </Button>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="md" py={{ base: '12', md: '24' }}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <Heading as="h1" size="2xl" mb={2}>
              You're Invited!
            </Heading>
            <Text color="gray.600" fontSize="lg">
              Join a group and start coordinating activities
            </Text>
          </Box>

          {/* Group Preview Card */}
          {groupData && (
            <Card borderWidth="2px" borderColor="blue.200" bg="blue.50">
              <CardBody>
                <VStack spacing={6} align="stretch">
                  {/* Group Header */}
                  <VStack spacing={3} align="flex-start">
                    <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                      Group Invitation
                    </Badge>
                    <VStack spacing={2} align="flex-start" w="full">
                      <Heading size="xl">{groupData.name}</Heading>
                      {groupData.description && (
                        <Text color="gray.600" fontSize="md">
                          {groupData.description}
                        </Text>
                      )}
                    </VStack>
                  </VStack>

                  {/* Group Stats */}
                  <SimpleGrid columns={2} spacing={4}>
                    <Box>
                      <Text fontSize="sm" color="gray.500" fontWeight="semibold" mb={1}>
                        Members
                      </Text>
                      <Text fontSize="2xl" fontWeight="bold">
                        {groupData.member_count}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.500" fontWeight="semibold" mb={1}>
                        Created
                      </Text>
                      <Text fontSize="md" fontWeight="semibold">
                        {new Date(groupData.created_at).toLocaleDateString()}
                      </Text>
                    </Box>
                  </SimpleGrid>

                  {/* Member Avatars */}
                  <Box>
                    <Text fontSize="sm" color="gray.500" fontWeight="semibold" mb={2}>
                      Group Members
                    </Text>
                    <AvatarGroup size="md" max={5}>
                      {Array.from({ length: Math.min(5, groupData.member_count) }).map(
                        (_, i) => (
                          <Avatar key={i} name={`Member ${i + 1}`} />
                        )
                      )}
                    </AvatarGroup>
                  </Box>

                  {/* Join Button */}
                  <Button
                    colorScheme="blue"
                    size="lg"
                    width="100%"
                    isLoading={isJoining}
                    loadingText="Joining..."
                    onClick={handleJoinGroup}
                    isDisabled={isJoining}
                  >
                    Join Group
                  </Button>

                  {/* Decline Button */}
                  <Button
                    colorScheme="gray"
                    variant="outline"
                    width="100%"
                    onClick={() => router.push('/groups')}
                    isDisabled={isJoining}
                  >
                    Maybe Later
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Info Box */}
          <Alert status="info" borderRadius="md" bg="blue.50" borderColor="blue.200">
            <AlertIcon />
            <Box>
              <Text fontWeight="semibold" mb={1}>
                What happens when you join?
              </Text>
              <Text fontSize="sm" color="gray.600">
                You'll be able to see group details, member list, and participate in group
                activities. You can leave the group anytime from the group settings.
              </Text>
            </Box>
          </Alert>
        </VStack>
      </Container>
    </Box>
  );
}
