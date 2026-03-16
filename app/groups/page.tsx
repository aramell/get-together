'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  Input,
  Select,
  SimpleGrid,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getGroupsByUser } from '@/lib/services/groupService';
import { GroupCard } from '@/components/groups/GroupCard';
import { GroupsEmptyState } from '@/components/groups/GroupsEmptyState';

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  user_role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
}

export default function GroupsPage() {
  const router = useRouter();
  const toast = useToast();
  const { userId, isAuthenticated, isLoading: authLoading } = useAuth();

  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Fetch groups on mount
  useEffect(() => {
    const loadGroups = async () => {
      try {
        console.log('[GroupsPage] Loading groups, isAuthenticated:', isAuthenticated, 'userId:', userId);

        if (!isAuthenticated || !userId) {
          console.log('[GroupsPage] Not authenticated or no userId');
          setError('Please log in to view your groups');
          setLoading(false);
          return;
        }

        console.log('[GroupsPage] Calling getGroupsByUser...');
        const result = await getGroupsByUser(userId);
        console.log('[GroupsPage] Got result:', result);

        if (result.success && result.groups) {
          console.log('[GroupsPage] Setting groups:', result.groups);
          setGroups(result.groups);
          setError(null);
        } else {
          console.log('[GroupsPage] Failed:', result.message);
          setError(result.message || 'Failed to load groups');
        }
      } catch (err) {
        console.error('[GroupsPage] Error loading groups:', err);
        setError('An error occurred while loading your groups');
      } finally {
        console.log('[GroupsPage] Finished loading');
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      console.log('[GroupsPage] Calling loadGroups');
      loadGroups();
    } else {
      console.log('[GroupsPage] Not authenticated, skipping loadGroups');
    }
  }, [isAuthenticated, userId]);

  // Filter and search groups
  const filteredGroups = useMemo(() => {
    let filtered = groups;

    // Apply role filter
    if (roleFilter === 'admin') {
      filtered = filtered.filter((g) => g.user_role === 'admin');
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          (g.description && g.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [groups, searchQuery, roleFilter]);

  // Paginate groups
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredGroups.slice(startIndex, endIndex);
  }, [filteredGroups, currentPage]);

  // Handle leave group (TODO: implement actual API call)
  const handleLeaveGroup = async (groupId: string) => {
    // TODO: Call API endpoint to leave group
    // For now, just remove from local list
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // Show loading state (including while auth is initializing)
  if (loading || authLoading) {
    return (
      <Box bg="gray.50" minH="100vh" suppressHydrationWarning>
        <Container maxW="6xl" py={{ base: '12', md: '24' }}>
          <VStack spacing={8} align="center" justify="center" minH="400px">
            <Spinner size="lg" color="blue.500" />
            <Text>Loading your groups...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  // Show error state
  if (error && groups.length === 0) {
    return (
      <Box bg="gray.50" minH="100vh" suppressHydrationWarning>
        <Container maxW="6xl" py={{ base: '12', md: '24' }}>
          <VStack spacing={6}>
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <Text>{error}</Text>
            </Alert>
            <Button colorScheme="blue" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh" suppressHydrationWarning>
      <Container maxW="6xl" py={{ base: '12', md: '24' }}>
        <VStack spacing={{ base: '8', md: '12' }} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="flex-start">
            <VStack align="flex-start" spacing={2}>
              <Heading as="h1" size="2xl">
                Your Groups
              </Heading>
              <Text color="gray.600" fontSize="lg">
                {groups.length === 0
                  ? "You're not in any groups yet"
                  : `You're in ${groups.length} group${groups.length !== 1 ? 's' : ''}`}
              </Text>
            </VStack>
            <Button
              colorScheme="blue"
              size="lg"
              onClick={() => router.push('/groups/create')}
            >
              Create Group
            </Button>
          </HStack>

          {/* Search and Filter */}
          {groups.length > 0 && (
            <HStack
              spacing={4}
              justify="space-between"
              align="flex-end"
              flexWrap={{ base: 'wrap', md: 'nowrap' }}
            >
              <Input
                placeholder="Search groups by name or description..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                maxW={{ base: '100%', md: '400px' }}
                aria-label="Search groups"
              />
              <Select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as 'all' | 'admin');
                  setCurrentPage(1);
                }}
                maxW={{ base: '100%', md: '200px' }}
                aria-label="Filter by role"
              >
                <option value="all">All Groups</option>
                <option value="admin">Admin Groups</option>
              </Select>
            </HStack>
          )}

          {/* Groups Grid or Empty State */}
          {filteredGroups.length === 0 ? (
            <GroupsEmptyState
              type={searchQuery.trim() ? 'no-search-results' : 'no-groups'}
            />
          ) : (
            <>
              <SimpleGrid
                columns={{ base: 1, md: 2, lg: 3 }}
                spacing={6}
                w="full"
              >
                {paginatedGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onLeaveGroup={handleLeaveGroup}
                  />
                ))}
              </SimpleGrid>

              {/* Pagination */}
              {totalPages > 1 && (
                <HStack justify="space-between" align="center" pt={6}>
                  <Text fontSize="sm" color="gray.600">
                    Page {currentPage} of {totalPages} ({filteredGroups.length}
                    {' '}
                    {filteredGroups.length === 1 ? 'group' : 'groups'})
                  </Text>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      isDisabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Select
                      size="sm"
                      w="auto"
                      value={currentPage}
                      onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <option key={page} value={page}>
                            {page}
                          </option>
                        )
                      )}
                    </Select>
                    <Button
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      isDisabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </HStack>
                </HStack>
              )}
            </>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
