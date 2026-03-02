'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  GridItem,
  Heading,
  Stack,
  Text,
  Badge,
  Spinner,
  useToast,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { getGroupsByUser } from '@/lib/services/groupService';
import { useAuth } from '@/lib/contexts/AuthContext';
import { SearchIcon } from '@chakra-ui/icons';

interface Group {
  id: string;
  name: string;
  member_count: number;
  last_activity_date: string;
  role: 'admin' | 'member';
}

interface GroupsListProps {
  onGroupSelect?: (groupId: string) => void;
}

/**
 * GroupsList Component
 * Displays all groups the user belongs to with member counts and last activity date
 * Shows empty state if user has no groups
 * Includes admin badge for groups where user is admin
 */
export const GroupsList: React.FC<GroupsListProps> = ({ onGroupSelect }) => {
  const router = useRouter();
  const toast = useToast();
  const { userId } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch groups on mount
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchGroups = async () => {
      setLoading(true);
      const result = await getGroupsByUser(userId);

      if (result.success) {
        setGroups(result.groups || []);
      } else {
        toast({
          title: 'Error loading groups',
          description: result.message || 'Could not load your groups',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

      setLoading(false);
    };

    fetchGroups();
  }, [userId, toast]);

  // Handle group selection
  const handleGroupClick = (groupId: string) => {
    if (onGroupSelect) {
      onGroupSelect(groupId);
    } else {
      router.push(`/groups/${groupId}`);
    }
  };

  // Filter groups by search term
  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format last activity date for display
  const formatLastActivity = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="lg" color="blue.500" />
      </Box>
    );
  }

  // Empty state
  if (groups.length === 0) {
    return (
      <Stack spacing={8} align="center" py={12}>
        <Box textAlign="center">
          <Heading size="lg" mb={2}>
            No groups yet
          </Heading>
          <Text color="gray.600" mb={6}>
            Create a group to start coordinating with friends, or join an existing group with an invite link.
          </Text>
        </Box>

        <Stack direction={{ base: 'column', md: 'row' }} spacing={4} w="full" maxW="md">
          <Button
            colorScheme="blue"
            size="lg"
            onClick={() => router.push('/groups/create')}
            flex={1}
          >
            Create Group
          </Button>
        </Stack>

        <Box w="full" maxW="md">
          <Text fontSize="sm" color="gray.600" mb={2}>
            Join with invite link
          </Text>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Paste invite code..."
              disabled
              aria-label="Join group with invite code"
            />
          </InputGroup>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Invite code joining coming soon
          </Text>
        </Box>
      </Stack>
    );
  }

  // Groups list view
  return (
    <Stack spacing={6} w="full">
      {/* Search bar */}
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.300" />
        </InputLeftElement>
        <Input
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search groups"
        />
      </InputGroup>

      {/* Groups grid */}
      {filteredGroups.length > 0 ? (
        <Grid
          templateColumns={{
            base: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          }}
          gap={4}
        >
          {filteredGroups.map((group) => (
            <GridItem key={group.id}>
              <Box
                p={4}
                borderWidth="1px"
                borderRadius="lg"
                borderColor="gray.200"
                bg="white"
                cursor="pointer"
                onClick={() => handleGroupClick(group.id)}
                transition="all 0.2s"
                _hover={{
                  boxShadow: 'md',
                  borderColor: 'blue.500',
                }}
              >
                {/* Group header with name and admin badge */}
                <Stack spacing={3}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                    <Heading size="md" flex={1} pr={2}>
                      {group.name}
                    </Heading>
                    {group.role === 'admin' && (
                      <Badge colorScheme="purple" mt={1} flexShrink={0}>
                        Admin
                      </Badge>
                    )}
                  </Box>

                  {/* Group metadata */}
                  <Stack spacing={2} fontSize="sm" color="gray.600">
                    <Box display="flex" justifyContent="space-between">
                      <Text>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</Text>
                      <Text>{formatLastActivity(group.last_activity_date)}</Text>
                    </Box>
                  </Stack>

                  {/* Action button */}
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                    w="full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGroupClick(group.id);
                    }}
                    aria-label={`View ${group.name} details`}
                  >
                    View Details
                  </Button>
                </Stack>
              </Box>
            </GridItem>
          ))}
        </Grid>
      ) : (
        <Box textAlign="center" py={8} color="gray.500">
          No groups match your search
        </Box>
      )}

      {/* Create group button (always available) */}
      <Box mt={4}>
        <Button
          colorScheme="green"
          size="lg"
          w="full"
          onClick={() => router.push('/groups/create')}
        >
          + Create New Group
        </Button>
      </Box>
    </Stack>
  );
};

export default GroupsList;
