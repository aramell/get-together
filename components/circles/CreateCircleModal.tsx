'use client';

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  HStack,
  Text,
  Spinner,
  useToast,
} from '@chakra-ui/react';

interface CreateCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (circle: { id: string; name: string; contactCount: number; createdAt: string }) => void;
}

export const CreateCircleModal: React.FC<CreateCircleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setError(null);
      onClose();
    }
  };

  const validate = (): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Circle name is required');
      return false;
    }
    if (trimmed.length > 100) {
      setError('Circle name must be 100 characters or less');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Circle created',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        onSuccess(result.data);
        handleClose();
      } else {
        setError(result.message || 'Failed to create circle');
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent maxW={{ base: '95%', md: '90%' }} mx="auto">
        <ModalHeader>New Circle</ModalHeader>
        <ModalCloseButton minH="48px" minW="48px" isDisabled={isLoading} />

        <form onSubmit={handleSubmit}>
          <ModalBody>
            <FormControl isInvalid={!!error}>
              <FormLabel htmlFor="circle-name">Circle name</FormLabel>
              <Input
                id="circle-name"
                placeholder="e.g., Weekend Crew"
                value={name}
                onChange={(e) => setName(e.target.value)}
                isDisabled={isLoading}
                aria-label="Circle name"
                maxLength={100}
                minHeight="44px"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {name.length}/100 characters
              </Text>
              {error && (
                <FormErrorMessage aria-live="polite">{error}</FormErrorMessage>
              )}
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button
                variant="ghost"
                onClick={handleClose}
                isDisabled={isLoading}
                minHeight="48px"
              >
                Cancel
              </Button>
              <Button
                colorScheme="teal"
                type="submit"
                isDisabled={isLoading || !name.trim()}
                display="flex"
                alignItems="center"
                minHeight="48px"
              >
                {isLoading && <Spinner size="sm" mr={2} />}
                {isLoading ? 'Creating...' : 'Create'}
              </Button>
            </HStack>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default CreateCircleModal;
