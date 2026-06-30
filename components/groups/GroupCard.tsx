'use client';

import React from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  HStack,
  VStack,
  Button,
  Badge,
  useToast,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  useDisclosure,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

export interface GroupCardData {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  user_role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
}

interface GroupCardProps {
  group: GroupCardData;
  onLeaveGroup?: (groupId: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * GroupCard Component
 * Displays a single group in a card format with group info and actions
 *
 * @param group - Group data to display
 * @param onLeaveGroup - Callback to handle leaving the group
 * @param isLoading - Loading state
 */
export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onLeaveGroup,
  isLoading = false,
}) => {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef(null);
  const [isLeavingGroup, setIsLeavingGroup] = React.useState(false);

  const handleViewGroup = () => {
    router.push(`/groups/${group.id}`);
  };

  const handleLeaveGroup = async () => {
    if (!onLeaveGroup) return;

    setIsLeavingGroup(true);
    try {
      await onLeaveGroup(group.id);

      toast({
        title: 'Left Group',
        description: `You've left ${group.name}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      onClose();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to leave group',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    } finally {
      setIsLeavingGroup(false);
    }
  };

  const lastActivityDate = new Date(group.updated_at).toLocaleDateString();
  const truncatedDescription =
    group.description && group.description.length > 100
      ? `${group.description.substring(0, 100)}...`
      : group.description;

  return (
    <>
      <Card
        borderWidth="1px"
        borderColor="gray.200"
        _hover={{ shadow: 'md', borderColor: 'blue.300' }}
        transition="all 0.2s"
        h="full"
        display="flex"
        flexDirection="column"
      >
        <CardBody display="flex" flexDirection="column" gap={4}>
          {/* Header with Role Badge */}
          <HStack justify="space-between" align="flex-start">
            <VStack align="flex-start" spacing={1} flex={1}>
              <Heading
                size="md"
                cursor="pointer"
                _hover={{ color: 'blue.500' }}
                onClick={handleViewGroup}
                noOfLines={2}
              >
                {group.name}
              </Heading>
              {truncatedDescription && (
                <Text fontSize="sm" color="gray.600" noOfLines={2}>
                  {truncatedDescription}
                </Text>
              )}
            </VStack>
            <Badge
              colorScheme={group.user_role === 'admin' ? 'purple' : 'blue'}
              fontSize="xs"
              px={2}
              py={1}
            >
              {group.user_role.toUpperCase()}
            </Badge>
          </HStack>

          {/* Stats */}
          <HStack spacing={4} fontSize="sm" color="gray.600">
            <Box>
              <Text fontWeight="semibold">{group.member_count}</Text>
              <Text fontSize="xs">
                {group.member_count === 1 ? 'member' : 'members'}
              </Text>
            </Box>
            <Box>
              <Text fontWeight="semibold">Active</Text>
              <Text fontSize="xs">{lastActivityDate}</Text>
            </Box>
          </HStack>

          {/* Action Buttons */}
          <HStack spacing={2} mt="auto" pt={2}>
            <Button
              colorScheme="blue"
              size="sm"
              flex={1}
              onClick={handleViewGroup}
              isDisabled={isLoading || isLeavingGroup}
            >
              View
            </Button>
            <Button
              colorScheme="gray"
              variant="outline"
              size="sm"
              flex={1}
              onClick={onOpen}
              isDisabled={isLoading || isLeavingGroup}
            >
              Leave
            </Button>
          </HStack>
        </CardBody>
      </Card>

      {/* Leave Confirmation Modal */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Leave {group.name}
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to leave this group? You can rejoin later if
              someone invites you again.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} isDisabled={isLeavingGroup}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleLeaveGroup}
                ml={3}
                isLoading={isLeavingGroup}
                loadingText="Leaving..."
              >
                Leave
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default GroupCard;
