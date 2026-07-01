'use client';

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  HStack,
  VStack,
  Text,
  Input,
  Box,
  Alert,
  AlertIcon,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { CopyIcon } from '@chakra-ui/icons';

interface PublicLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  userRole: 'creator' | 'admin' | 'member';
}

export const PublicLinkModal: React.FC<PublicLinkModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  userRole,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const toast = useToast();

  // Check if user has permission (only creator or admin)
  const hasPermission = userRole === 'creator' || userRole === 'admin';

  const generateLink = async () => {
    if (!hasPermission) {
      setError('Only event creators and group admins can generate public links');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}/public-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate link');
      }

      const data = await response.json();
      setPublicLink(data.data.publicLink);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate public link'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (publicLink) {
      try {
        await navigator.clipboard.writeText(publicLink);
        toast({
          title: 'Copied!',
          description: 'Public link copied to clipboard',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to copy link',
          status: 'error',
          duration: 2000,
          isClosable: true,
        });
      }
    }
  };

  const revokeLink = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}/public-link`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to revoke link');
      }

      setPublicLink(null);
      toast({
        title: 'Link revoked',
        description: 'Public link has been disabled',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to revoke public link'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent maxW={{ base: '90vw', md: '500px' }}>
        <ModalHeader>Share Event: {eventTitle}</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {!hasPermission ? (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Only event creators and group admins can share events publicly
                </Text>
              </Alert>
            ) : null}

            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">{error}</Text>
              </Alert>
            )}

            {!publicLink ? (
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" color="gray.600">
                  Generate a unique public link to allow anyone to RSVP to this
                  event without needing an account.
                </Text>
                <Button
                  colorScheme="blue"
                  onClick={generateLink}
                  isLoading={isLoading}
                  isDisabled={!hasPermission}
                  minH="44px"
                  aria-label="Generate public link"
                >
                  {isLoading ? <Spinner /> : 'Generate Public Link'}
                </Button>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="500">
                  Public Link Created!
                </Text>
                <HStack spacing={2}>
                  <Input
                    value={publicLink}
                    isReadOnly
                    fontSize="sm"
                    minH="44px"
                    aria-label="Public event link"
                  />
                  <Button
                    onClick={copyToClipboard}
                    colorScheme="blue"
                    variant="outline"
                    leftIcon={<CopyIcon />}
                    minH="44px"
                    aria-label="Copy link to clipboard"
                  >
                    Copy
                  </Button>
                </HStack>
                <Box
                  p={3}
                  bg="blue.50"
                  borderRadius="md"
                  fontSize="xs"
                  color="blue.800"
                >
                  You can share this link via email, SMS, or social media. Anyone
                  with this link can view the event and RSVP without creating an
                  account.
                </Box>
                <Button
                  colorScheme="red"
                  variant="outline"
                  onClick={revokeLink}
                  isLoading={isLoading}
                  size="sm"
                  minH="40px"
                  aria-label="Revoke public link"
                >
                  Revoke Link
                </Button>
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            minH="44px"
            aria-label="Close modal"
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
