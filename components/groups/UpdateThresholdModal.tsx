'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  HStack,
  Text,
  Checkbox,
  useToast,
  VStack,
  Spinner,
  Box,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

interface UpdateThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  groupId: string;
  currentThreshold: number | null;
  currentInCount: number;
  onSuccess: () => void;
}

export function UpdateThresholdModal({
  isOpen,
  onClose,
  eventId,
  groupId,
  currentThreshold,
  currentInCount,
  onSuccess,
}: UpdateThresholdModalProps) {
  const toast = useToast();
  const { userId, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasThreshold, setHasThreshold] = useState(currentThreshold !== null);
  const [threshold, setThreshold] = useState(currentThreshold?.toString() || '');
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // Check if userId is available when modal opens
    if (isOpen && !userId && !authLoading) {
      setAuthError('User authentication required. Please refresh the page and try again.');
    } else {
      setAuthError('');
    }
  }, [isOpen, userId, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate authentication
    if (!userId) {
      setAuthError('User authentication required. Please refresh the page and try again.');
      toast({
        title: 'Authentication Error',
        description: 'User not authenticated. Please refresh and try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Validate threshold
    if (hasThreshold) {
      const thresholdNum = parseInt(threshold, 10);
      if (!threshold || isNaN(thresholdNum) || thresholdNum < 1 || thresholdNum > 1000) {
        setError('Threshold must be between 1 and 1000');
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/groups/${groupId}/events/${eventId}/threshold`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({
            threshold: hasThreshold ? parseInt(threshold, 10) : null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update threshold');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: data.message,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onClose();
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update threshold';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setThreshold(currentThreshold?.toString() || '');
    setHasThreshold(currentThreshold !== null);
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Update Threshold</ModalHeader>
        <ModalCloseButton isDisabled={isLoading} />

        <ModalBody>
          <VStack spacing={6} align="start" width="100%">
            {authError && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {authError}
              </Alert>
            )}

            <Box>
              <Text fontSize="sm" color="gray.600">
                Current confirmations: <strong>{currentInCount}</strong>
              </Text>
            </Box>

            <FormControl isInvalid={!!error}>
              <HStack spacing={4} align="flex-start">
                <Checkbox
                  isChecked={hasThreshold}
                  onChange={(e) => {
                    setHasThreshold(e.target.checked);
                    setError('');
                  }}
                  isDisabled={isLoading}
                  mt="2"
                >
                  <FormLabel mb={0} ml={2} cursor="pointer">
                    Require confirmations
                  </FormLabel>
                </Checkbox>
              </HStack>
              {hasThreshold && (
                <FormControl isInvalid={!!error} mt={4}>
                  <FormLabel>Number of confirmations needed</FormLabel>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={threshold}
                    onChange={(e) => {
                      setThreshold(e.target.value);
                      setError('');
                    }}
                    placeholder="e.g., 5"
                    isDisabled={isLoading}
                    aria-label="Threshold value"
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    When {threshold} people confirm, the event auto-confirms
                  </Text>
                  {error && <FormErrorMessage>{error}</FormErrorMessage>}
                </FormControl>
              )}
              {!hasThreshold && (
                <Text fontSize="sm" color="gray.600" mt={2}>
                  Event will require manual confirmation
                </Text>
              )}
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button
              variant="ghost"
              onClick={handleClose}
              isDisabled={isLoading}
              aria-label="Cancel"
            >
              Cancel
            </Button>
            <Button
              colorScheme="teal"
              onClick={handleSubmit}
              isDisabled={isLoading || (hasThreshold && !threshold) || !!authError || authLoading}
              aria-label="Update threshold"
            >
              {isLoading ? <Spinner size="sm" mr={2} /> : null}
              {isLoading ? 'Updating...' : 'Update'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
