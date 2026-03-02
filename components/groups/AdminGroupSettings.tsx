'use client';

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Heading,
  Text,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Divider,
  Spinner,
} from '@chakra-ui/react';

export interface GroupData {
  id: string;
  name: string;
  description: string | null;
}

interface AdminGroupSettingsProps {
  groupData: GroupData;
  onSave?: (updatedData: { name: string; description: string | null }) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * AdminGroupSettings Component
 * Provides admin-only controls for editing and managing group settings
 *
 * @param groupData - Current group information
 * @param onSave - Callback to save group changes
 * @param onDelete - Callback to delete group
 * @param isLoading - Loading state
 * @param error - Error message if any
 */
export const AdminGroupSettings: React.FC<AdminGroupSettingsProps> = ({
  groupData,
  onSave,
  onDelete,
  isLoading = false,
  error = null,
}) => {
  const toast = useToast();
  const deleteModal = useDisclosure();
  const editModal = useDisclosure();

  const [editData, setEditData] = useState({
    name: groupData.name,
    description: groupData.description || '',
  });

  const [editErrors, setEditErrors] = useState<{ name?: string; description?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const validateEditForm = () => {
    const newErrors: { name?: string; description?: string } = {};

    if (!editData.name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (editData.name.trim().length > 100) {
      newErrors.name = 'Group name must be 100 characters or less';
    }

    if (editData.description && editData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSave = async () => {
    if (!validateEditForm() || !onSave) return;

    setIsSaving(true);
    try {
      await onSave({
        name: editData.name.trim(),
        description: editData.description.trim() || null,
      });

      toast({
        title: 'Success',
        description: 'Group settings updated successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      editModal.onClose();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update group settings',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete();

      toast({
        title: 'Success',
        description: 'Group deleted successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      deleteModal.onClose();
      // In a real app, redirect to groups list after successful deletion
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditCancel = () => {
    setEditData({
      name: groupData.name,
      description: groupData.description || '',
    });
    setEditErrors({});
    editModal.onClose();
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={{ base: '6', md: '8' }}
      borderColor="red.200"
      bg="red.50"
    >
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <Box>
          <Heading size="md" mb={2} color="red.700">
            Admin Actions
          </Heading>
          <Text color="gray.600" fontSize="sm">
            Manage group settings and danger zone actions
          </Text>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Text>{error}</Text>
          </Alert>
        )}

        {/* Edit Group Button */}
        <Box>
          <Heading size="sm" mb={3}>
            Group Settings
          </Heading>
          <Button
            colorScheme="blue"
            variant="outline"
            onClick={editModal.onOpen}
            isDisabled={isLoading}
          >
            Edit Group
          </Button>
        </Box>

        <Divider />

        {/* Danger Zone */}
        <Box>
          <Heading size="sm" mb={3} color="red.700">
            Danger Zone
          </Heading>
          <Text fontSize="sm" color="gray.600" mb={4}>
            These actions cannot be undone. Please proceed with caution.
          </Text>
          <Button
            colorScheme="red"
            variant="outline"
            onClick={deleteModal.onOpen}
            isDisabled={isLoading}
          >
            Delete Group
          </Button>
        </Box>
      </VStack>

      {/* Edit Modal */}
      <Modal isOpen={editModal.isOpen} onClose={handleEditCancel}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Group Settings</ModalHeader>
          <ModalCloseButton isDisabled={isSaving} />
          <ModalBody>
            <VStack spacing={4}>
              {/* Group Name */}
              <FormControl isInvalid={!!editErrors.name}>
                <FormLabel htmlFor="groupName">Group Name</FormLabel>
                <Input
                  id="groupName"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  placeholder="Enter group name"
                  isDisabled={isSaving}
                  aria-label="Group name input"
                />
                {editErrors.name && (
                  <FormErrorMessage>{editErrors.name}</FormErrorMessage>
                )}
              </FormControl>

              {/* Description */}
              <FormControl isInvalid={!!editErrors.description}>
                <FormLabel htmlFor="groupDescription">Description</FormLabel>
                <Textarea
                  id="groupDescription"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Enter group description (optional)"
                  isDisabled={isSaving}
                  aria-label="Group description input"
                />
                {editErrors.description && (
                  <FormErrorMessage>{editErrors.description}</FormErrorMessage>
                )}
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {editData.description.length}/500 characters
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={2}>
              <Button
                variant="ghost"
                onClick={handleEditCancel}
                isDisabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleEditSave}
                isLoading={isSaving}
                loadingText="Saving..."
              >
                Save Changes
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={() => deleteModal.onClose()}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="red.600">Delete Group</ModalHeader>
          <ModalCloseButton isDisabled={isDeleting} />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">This action cannot be undone</Text>
                  <Text fontSize="sm">
                    Deleting this group will permanently remove it and all associated data.
                  </Text>
                </Box>
              </Alert>
              <Box>
                <Text fontSize="sm" mb={2}>
                  To confirm, type the group name:
                </Text>
                <Text fontWeight="bold" fontSize="md">
                  {groupData.name}
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={2}>
              <Button
                variant="ghost"
                onClick={() => deleteModal.onClose()}
                isDisabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDelete}
                isLoading={isDeleting}
                loadingText="Deleting..."
              >
                Delete Group
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AdminGroupSettings;
