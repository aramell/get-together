'use client';

import React, { useState } from 'react';
import {
  VStack,
  HStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Textarea,
  Button,
  Text,
  Box,
  useToast,
} from '@chakra-ui/react';
import { updateGroupSettings } from '@/lib/services/groupService';

interface GroupSettingsFormProps {
  groupId: string;
  initialName: string;
  initialDescription: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * GroupSettingsForm Component
 * Form to edit group name and description
 */
const GroupSettingsForm: React.FC<GroupSettingsFormProps> = ({
  groupId,
  initialName,
  initialDescription,
  onSuccess,
  onCancel,
}) => {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Group name must be 100 characters or less';
    }

    if (description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await updateGroupSettings(groupId, {
        name: name.trim(),
        description: description.trim() || null,
      });

      if (result.success) {
        toast({
          title: 'Settings updated',
          description: 'Group settings have been saved',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update settings',
          status: 'error',
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
      console.error('Update settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = name.trim().length > 0 && description.length <= 500;
  const hasChanges = name !== initialName || description !== (initialDescription || '');

  return (
    <form onSubmit={handleSubmit}>
      <VStack spacing={6} align="stretch">
        {/* Name Field */}
        <FormControl isInvalid={!!errors.name}>
          <FormLabel htmlFor="group-name" fontWeight="semibold">
            Group Name
          </FormLabel>
          <Input
            id="group-name"
            placeholder="Enter group name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            maxLength={100}
            disabled={loading}
          />
          <HStack justify="space-between" mt={1}>
            <FormErrorMessage>{errors.name}</FormErrorMessage>
            <Text fontSize="xs" color="gray.500">
              {name.length}/100
            </Text>
          </HStack>
        </FormControl>

        {/* Description Field */}
        <FormControl isInvalid={!!errors.description}>
          <FormLabel htmlFor="group-description" fontWeight="semibold">
            Description (Optional)
          </FormLabel>
          <Textarea
            id="group-description"
            placeholder="Enter group description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors({ ...errors, description: undefined });
            }}
            maxLength={500}
            disabled={loading}
            rows={4}
            resize="vertical"
          />
          <HStack justify="space-between" mt={1}>
            <FormErrorMessage>{errors.description}</FormErrorMessage>
            <Text fontSize="xs" color="gray.500">
              {description.length}/500
            </Text>
          </HStack>
        </FormControl>

        {/* Action Buttons */}
        <HStack spacing={3} justify="flex-end" pt={4}>
          <Button
            variant="ghost"
            onClick={onCancel}
            isDisabled={loading}
          >
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            type="submit"
            isLoading={loading}
            loadingText="Saving..."
            isDisabled={!isFormValid || !hasChanges || loading}
          >
            Save Changes
          </Button>
        </HStack>
      </VStack>
    </form>
  );
};

export default GroupSettingsForm;
