'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  ButtonGroup,
  FormControl,
  FormErrorMessage,
  Input,
  HStack,
  VStack,
  Text,
  Spinner,
  Divider,
  useToast,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@chakra-ui/react';
import { ContactList, type Contact } from './ContactList';
import { AddContactForm, type AddedContact } from './AddContactForm';

interface CircleDetailData {
  id: string;
  name: string;
  contacts: Contact[];
  createdAt: string;
  updatedAt: string;
}

interface CircleDetailProps {
  circleId: string;
  isOpen: boolean;
  onClose: () => void;
  onCircleUpdated: (circle: { id: string; name: string; updatedAt: string }) => void;
  onCircleDeleted: (circleId: string) => void;
}

/**
 * Circle detail modal: name (with inline edit), contacts, add-contact, and
 * delete-with-confirmation (Story 10.3, AC3-AC6, AC8)
 */
export const CircleDetail: React.FC<CircleDetailProps> = ({
  circleId,
  isOpen,
  onClose,
  onCircleUpdated,
  onCircleDeleted,
}) => {
  const toast = useToast();
  const deleteCancelRef = useRef(null);

  const [circle, setCircle] = useState<CircleDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const [isAddingContact, setIsAddingContact] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/circles/${circleId}`)
      .then((res) => res.json())
      .then((result) => {
        if (!cancelled && result.success) {
          setCircle(result.data);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [circleId, isOpen]);

  const handleStartEditName = () => {
    if (!circle) return;
    setNameDraft(circle.name);
    setNameError(null);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setNameError(null);
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError('Circle name is required');
      return;
    }
    if (trimmed.length > 100) {
      setNameError('Circle name must be 100 characters or less');
      return;
    }

    setNameError(null);
    setIsSavingName(true);

    try {
      const response = await fetch(`/api/circles/${circleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await response.json();

      if (result.success) {
        setCircle((prev) => (prev ? { ...prev, name: result.data.name } : prev));
        toast({ title: 'Circle name updated', status: 'success', duration: 3000, isClosable: true });
        onCircleUpdated(result.data);
        setIsEditingName(false);
      } else {
        setNameError(result.message || 'Failed to update circle name');
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
      setIsSavingName(false);
    }
  };

  const handleContactAdded = (contact: AddedContact) => {
    setCircle((prev) => (prev ? { ...prev, contacts: [...prev.contacts, contact] } : prev));
    setIsAddingContact(false);
  };

  const handleContactRemoved = (contactId: string) => {
    setCircle((prev) =>
      prev ? { ...prev, contacts: prev.contacts.filter((c) => c.id !== contactId) } : prev
    );
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/circles/${circleId}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        toast({ title: 'Circle deleted', status: 'success', duration: 3000, isClosable: true });
        onCircleDeleted(circleId);
        setIsDeleteConfirmOpen(false);
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to delete circle',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
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
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent maxW={{ base: '95%', md: '90%' }} mx="auto">
          <ModalHeader>
            {loading || !circle ? (
              <Spinner size="sm" />
            ) : isEditingName ? (
              <FormControl isInvalid={!!nameError}>
                <HStack>
                  <Input
                    aria-label="Circle name"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    isDisabled={isSavingName}
                    maxLength={100}
                    minHeight="44px"
                  />
                  <Button
                    colorScheme="teal"
                    onClick={handleSaveName}
                    isLoading={isSavingName}
                    minHeight="48px"
                  >
                    Save
                  </Button>
                  <Button onClick={handleCancelEditName} isDisabled={isSavingName} minHeight="48px">
                    Cancel
                  </Button>
                </HStack>
                {nameError && <FormErrorMessage aria-live="polite">{nameError}</FormErrorMessage>}
              </FormControl>
            ) : (
              <HStack justify="space-between">
                <Text as="span">{circle.name}</Text>
                <Button size="sm" onClick={handleStartEditName} minHeight="48px">
                  Edit Circle Name
                </Button>
              </HStack>
            )}
          </ModalHeader>
          <ModalCloseButton minH="48px" minW="48px" />

          <ModalBody>
            {loading || !circle ? (
              <HStack>
                <Spinner size="sm" />
                <Text fontSize="sm" color="gray.500">
                  Loading circle...
                </Text>
              </HStack>
            ) : (
              <VStack align="stretch" spacing={4}>
                <Button
                  alignSelf="flex-start"
                  size="sm"
                  variant={isAddingContact ? 'solid' : 'outline'}
                  colorScheme="teal"
                  onClick={() => setIsAddingContact((prev) => !prev)}
                  minHeight="48px"
                >
                  Add Contact
                </Button>

                {isAddingContact && (
                  <AddContactForm circleId={circleId} onContactAdded={handleContactAdded} />
                )}

                <ContactList
                  circleId={circleId}
                  contacts={circle.contacts}
                  onContactRemoved={handleContactRemoved}
                />
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="red"
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(true)}
              isDisabled={loading || !circle}
              aria-label={circle ? `Delete circle ${circle.name}` : 'Delete circle'}
              minHeight="48px"
            >
              Delete Circle
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteConfirmOpen}
        leastDestructiveRef={deleteCancelRef}
        onClose={() => (isDeleting ? undefined : setIsDeleteConfirmOpen(false))}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Circle
            </AlertDialogHeader>

            <AlertDialogBody>
              Delete {circle?.name}? This will not affect any existing group or event memberships.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={deleteCancelRef}
                onClick={() => setIsDeleteConfirmOpen(false)}
                isDisabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleConfirmDelete}
                ml={3}
                isLoading={isDeleting}
                loadingText="Deleting..."
              >
                Delete Circle
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default CircleDetail;
