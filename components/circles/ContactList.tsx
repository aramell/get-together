'use client';

import React, { useRef, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  useToast,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';

export interface Contact {
  id: string;
  type: 'phone' | 'user';
  displayName: string;
}

interface ContactListProps {
  circleId: string;
  contacts: Contact[];
  onContactRemoved: (contactId: string) => void;
}

/**
 * List of a social circle's contacts with remove-with-confirmation (Story 10.2, AC6-AC8)
 */
export const ContactList: React.FC<ContactListProps> = ({ circleId, contacts, onContactRemoved }) => {
  const toast = useToast();
  const cancelRef = useRef(null);
  const [pendingContact, setPendingContact] = useState<Contact | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleConfirmRemove = async () => {
    if (!pendingContact) return;

    setIsRemoving(true);

    try {
      const response = await fetch(`/api/circles/${circleId}/contacts/${pendingContact.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        setStatusMessage('Contact removed');
        toast({ title: 'Contact removed', status: 'success', duration: 3000, isClosable: true });
        onContactRemoved(pendingContact.id);
        setPendingContact(null);
      } else {
        setStatusMessage(result.message || 'Failed to remove contact');
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
      setIsRemoving(false);
    }
  };

  return (
    <Box>
      {contacts.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          No contacts in this circle yet.
        </Text>
      ) : (
        <VStack align="stretch" spacing={2} data-testid="contact-list">
          {contacts.map((contact) => (
            <HStack key={contact.id} justify="space-between" borderWidth="1px" borderRadius="md" p={3}>
              <HStack>
                <Badge colorScheme={contact.type === 'phone' ? 'purple' : 'teal'}>
                  {contact.type === 'phone' ? 'Phone' : 'App user'}
                </Badge>
                <Text>{contact.displayName}</Text>
              </HStack>
              <IconButton
                aria-label={`Remove ${contact.displayName} from circle`}
                icon={<CloseIcon boxSize={3} />}
                size="sm"
                minHeight="48px"
                minWidth="48px"
                variant="ghost"
                colorScheme="red"
                onClick={() => setPendingContact(contact)}
              />
            </HStack>
          ))}
        </VStack>
      )}

      <Text position="absolute" width="1px" height="1px" overflow="hidden" aria-live="polite">
        {statusMessage}
      </Text>

      <AlertDialog
        isOpen={!!pendingContact}
        leastDestructiveRef={cancelRef}
        onClose={() => (isRemoving ? undefined : setPendingContact(null))}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Remove Contact
            </AlertDialogHeader>

            <AlertDialogBody>
              Remove {pendingContact?.displayName} from this circle?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setPendingContact(null)} isDisabled={isRemoving}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleConfirmRemove}
                ml={3}
                isLoading={isRemoving}
                loadingText="Removing..."
              >
                Remove
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default ContactList;
