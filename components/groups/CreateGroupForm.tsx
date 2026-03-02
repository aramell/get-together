'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  FormHelperText,
  Heading,
  Input,
  Textarea,
  VStack,
  useToast,
  Text,
} from '@chakra-ui/react';
import { createGroupSchema, CreateGroupInput } from '@/lib/validation/groupSchema';
import { createGroup } from '@/lib/services/groupService';
import { ZodError } from 'zod';

export interface CreateGroupFormProps {
  onSuccess?: (groupId: string) => void;
}

export const CreateGroupForm: React.FC<CreateGroupFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<Partial<CreateGroupInput>>({
    name: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Validate field on change
  const validateField = (name: string, value: string) => {
    try {
      const partialData = { ...formData, [name]: value };

      // Validate just this field using the schema
      if (name === 'name') {
        createGroupSchema.pick({ name: true }).parse({ name: value });
      } else if (name === 'description') {
        createGroupSchema.pick({ description: true }).parse({ description: value || null });
      }

      // Clear error for this field if validation passes
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldError = error.issues[0];
        setErrors((prev) => ({
          ...prev,
          [name]: fieldError.message,
        }));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    validateField(name, value);
  };

  const isFormValid = () => {
    try {
      createGroupSchema.parse(formData);
      return Object.keys(errors).length === 0;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate full form
    try {
      const validatedData = createGroupSchema.parse(formData);

      setIsLoading(true);

      // Call group creation service
      const result = await createGroup('current-user-id', validatedData);

      if (result.success && result.group) {
        toast({
          title: 'Success!',
          description: result.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Reset form
        setFormData({
          name: '',
          description: '',
        });

        // Call onSuccess callback if provided with group ID
        if (onSuccess && result.group?.id) {
          onSuccess(result.group.id);
        }
      } else {
        // Handle error from service
        const errorMessage = result.message || 'Failed to create group';

        toast({
          title: 'Group Creation Failed',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });

        // If it's a validation error, show field-specific errors
        if (result.errorCode === 'VALIDATION_ERROR') {
          setErrors({
            form: errorMessage,
          });
        }
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          const path = err.path[0] as string;
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      } else {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="md" py={{ base: '12', md: '24' }}>
      <Box
        bg="white"
        px={{ base: '4', md: '8' }}
        py={{ base: '6', md: '12' }}
        rounded="lg"
        shadow="md"
      >
        <VStack spacing="6" align="stretch" as="form" onSubmit={handleSubmit}>
          <Heading as="h1" size="lg" textAlign="center">
            Create a New Group
          </Heading>

          {errors.form && (
            <Box
              bg="red.50"
              border="1px"
              borderColor="red.200"
              p="3"
              rounded="md"
              role="alert"
            >
              <Text color="red.700" fontSize="sm">
                {errors.form}
              </Text>
            </Box>
          )}

          <FormControl isInvalid={!!errors.name}>
            <FormLabel htmlFor="name">Group Name</FormLabel>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="My awesome group"
              value={formData.name || ''}
              onChange={handleChange}
              onBlur={(e) => validateField('name', e.target.value)}
              isDisabled={isLoading}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            <FormHelperText>
              Name your group something memorable. Max 100 characters.
            </FormHelperText>
            {errors.name && (
              <FormErrorMessage id="name-error">{errors.name}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl isInvalid={!!errors.description}>
            <FormLabel htmlFor="description">Description (Optional)</FormLabel>
            <Textarea
              id="description"
              name="description"
              placeholder="What's this group about?"
              value={formData.description || ''}
              onChange={handleChange}
              onBlur={(e) => validateField('description', e.target.value)}
              isDisabled={isLoading}
              aria-describedby={errors.description ? 'description-error' : undefined}
              rows={4}
            />
            <FormHelperText>
              Add a description to help members understand the group's purpose. Max 500 characters.
            </FormHelperText>
            {errors.description && (
              <FormErrorMessage id="description-error">
                {errors.description}
              </FormErrorMessage>
            )}
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            size="lg"
            w="full"
            isLoading={isLoading}
            isDisabled={!isFormValid() || isLoading}
          >
            Create Group
          </Button>
        </VStack>
      </Box>
    </Container>
  );
};

export default CreateGroupForm;
