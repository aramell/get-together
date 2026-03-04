'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  Divider,
  Badge,
  Avatar,
  SimpleGrid,
  Card,
  CardBody,
  useToast,
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@chakra-ui/react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getGroupDetails, deleteGroup, removeMember } from '@/lib/services/groupService';
import { MemberList } from '@/components/groups/MemberList';
import { AdminGroupSettings } from '@/components/groups/AdminGroupSettings';

interface GroupDetailsData {
  group: {
    id: string;
    name: string;
    description: string | null;
    created_by: string;
    invite_code: string;
    created_at: string;
    updated_at: string;
  };
  members: Array<{
    user_id: string;
    name: string;
    email: string;
    role: 'admin' | 'member';
    joined_at: string;
  }>;
  currentUserRole: 'admin' | 'member' | null;
}

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { userId, isAuthenticated } = useAuth();

  const groupId = params?.groupId as string;

  const [data, setData] = useState<GroupDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isRemoving, setIsRemoving] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef(null);
  useEffect(() => {
    const loadGroupDetails = async () => {
      try {
        if (!isAuthenticated) {
          setError('Please log in to view group details');
          setLoading(false);
          return;
        }

        if (!groupId) {
          setError('Invalid group ID');
          setLoading(false);
          return;
        }

        const result = await getGroupDetails(groupId);

        if (result.success && result.data) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.message || 'Failed to load group details');
        }
      } catch (err) {
        console.error('Error loading group details:', err);
        setError('An error occurred while loading group details');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadGroupDetails();
    }
  }, [groupId, isAuthenticated]);

  const handleCopyInviteCode = async () => {
    if (data?.group.invite_code) {
      try {
        const inviteUrl = `${window.location.origin}/join/${data.group.invite_code}`;
        await navigator.clipboard.writeText(inviteUrl);
        toast({
          title: 'Copied!',
          description: 'Invite link copied to clipboard',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to copy invite link',
          status: 'error',
          duration: 2000,
          isClosable: true,
        });
      }
    }
  };

  const handleLeaveGroup = async () => {
    // TODO: Implement leave group functionality
    toast({
      title: 'Coming soon',
      description: 'Leave group functionality will be available soon',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleManageMembers = () => {
    // TODO: Navigate to member management page
    toast({
      title: 'Coming soon',
      description: 'Member management will be available soon',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleDeleteGroup = async () => {
    const result = await deleteGroup(groupId);
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Group deleted successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      // Redirect to groups list after successful deletion
      router.push('/groups');
    } else {
      toast({
        title: 'Error',
        description: result.message || 'Failed to delete group',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    }
  };


  const handleRemoveMemberClick = async (memberId: string) => {
    setPendingMemberId(memberId);
    onOpen();
  };

  const confirmRemoval = async () => {
    if (!pendingMemberId) return;

    setIsRemoving(true);
    const memberId = pendingMemberId;

    try {
      const member = data?.members.find(m => m.user_id === memberId);
      const memberName = member?.name || 'member';

      const result = await removeMember(groupId, memberId);

      if (result.success) {
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            members: prev.members.filter(m => m.user_id !== memberId),
          };
        });

        toast({
          title: 'Success',
          description: `${memberName} has been removed from the group`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else if (result.errorCode === 'CONFLICT') {
        toast({
          title: 'Cannot Remove Admin',
          description: result.message || 'Cannot remove the last admin from the group. Please promote another member to admin first.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove member',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error('Error removing member:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRemoving(false);
      onClose();
      setPendingMemberId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxW="4xl" py={{ base: '12', md: '24' }}>
        <VStack spacing={6}>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Text>You must be logged in to view this group</Text>
          </Alert>
          <Button colorScheme="blue" onClick={() => router.push('/auth/login')}>
            Go to Login
          </Button>
        </VStack>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxW="4xl" py={{ base: '12', md: '24' }}>
        <VStack spacing={8} align="center" justify="center" minH="400px">
          <Spinner size="lg" color="blue.500" />
          <Text>Loading group details...</Text>
        </VStack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="4xl" py={{ base: '12', md: '24' }}>
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
    );
  }

  if (!data) {
    return (
      <Container maxW="4xl" py={{ base: '12', md: '24' }}>
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Text>Group data not available</Text>
        </Alert>
      </Container>
    );
  }

  const { group, members, currentUserRole } = data;
  const isAdmin = currentUserRole === 'admin';
  const createdDate = new Date(group.created_at).toLocaleDateString();
  const updatedDate = new Date(group.updated_at).toLocaleDateString();

  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="4xl" py={{ base: '12', md: '24' }}>
        <VStack spacing={{ base: '8', md: '12' }} align="stretch">
          {/* Navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/groups')}
            alignSelf="flex-start"
            mb={4}
          >
            ← Back to Groups
          </Button>

          {/* Header Section */}
          <Box>
            <HStack justify="space-between" align="flex-start" mb={6}>
              <VStack align="flex-start" spacing={2}>
                <HStack spacing={3}>
                  <Heading as="h1" size="2xl">
                    {group.name}
                  </Heading>
                  <Badge colorScheme={isAdmin ? 'purple' : 'blue'} fontSize="md" px={3} py={1}>
                    {currentUserRole?.toUpperCase()}
                  </Badge>
                </HStack>
                {group.description && (
                  <Text color="gray.600" fontSize="lg" maxW="2xl">
                    {group.description}
                  </Text>
                )}
              </VStack>
              <Button colorScheme="red" variant="outline" onClick={handleLeaveGroup}>
                Leave Group
              </Button>
            </HStack>

            {/* Info Cards */}
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Card>
                <CardBody>
                  <VStack align="flex-start" spacing={1}>
                    <Text fontSize="sm" color="gray.500" fontWeight="semibold">
                      Members
                    </Text>
                    <Text fontSize="2xl" fontWeight="bold">
                      {members.length}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <VStack align="flex-start" spacing={1}>
                    <Text fontSize="sm" color="gray.500" fontWeight="semibold">
                      Created
                    </Text>
                    <Text fontSize="md" fontWeight="semibold">
                      {createdDate}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <VStack align="flex-start" spacing={1}>
                    <Text fontSize="sm" color="gray.500" fontWeight="semibold">
                      Updated
                    </Text>
                    <Text fontSize="md" fontWeight="semibold">
                      {updatedDate}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Invite Section */}
          <Box
            borderWidth="1px"
            borderRadius="lg"
            p={{ base: '6', md: '8' }}
            borderColor="blue.200"
            bg="blue.50"
          >
            <VStack align="stretch" spacing={4}>
              <Box>
                <Heading size="md" mb={2}>
                  Invite Members
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  Share this link with others to invite them to the group
                </Text>
              </Box>
              <HStack spacing={2}>
                <Box
                  flex={1}
                  p={3}
                  bg="white"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="gray.200"
                  fontFamily="monospace"
                  fontSize="sm"
                  overflow="auto"
                >
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${group.invite_code}`}
                </Box>
                <Button colorScheme="blue" onClick={handleCopyInviteCode}>
                  Copy Link
                </Button>
              </HStack>
            </VStack>
          </Box>

          <Divider />

          {/* Members Section */}
          <Box>
            <HStack justify="space-between" align="center" mb={6}>
              <Heading size="lg">Members ({members.length})</Heading>
              {isAdmin && (
                <Button colorScheme="gray" variant="outline" size="sm" onClick={handleManageMembers}>
                  Manage Members
                </Button>
              )}
            </HStack>

            <MemberList
              members={members}
              currentUserRole={currentUserRole}
              currentUserId={userId}
              showActions={true}
              emptyMessage="No members in this group yet"
              onRemoveMember={handleRemoveMemberClick}
            />
          </Box>

          {isAdmin && (
            <>
              <Divider />

              {/* Admin Settings */}
              <AdminGroupSettings
                groupData={group}
                onSave={async (updatedData) => {
                  // TODO: Implement actual API call to update group
                  console.log('Update group:', updatedData);
                }}
                onDelete={handleDeleteGroup}
              />
            </>
          )}
        </VStack>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Remove Member
            </AlertDialogHeader>
            <AlertDialogBody>
              {pendingMemberId && data?.members.find(m => m.user_id === pendingMemberId) && (
                <Text>
                  Are you sure you want to remove{' '}
                  <strong>{data?.members.find(m => m.user_id === pendingMemberId)?.name}</strong> from this group? They can rejoin with an invite link.
                </Text>
              )}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} isDisabled={isRemoving}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmRemoval}
                ml={3}
                isLoading={isRemoving}
                loadingText="Removing..."
              >
                Remove
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      </Container>
    </Box>
  );
}
