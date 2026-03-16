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
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Textarea,
  VStack,
  Box,
  Text,
  useToast,
} from '@chakra-ui/react';

export interface InviteUsersModalProps {
  isOpen: boolean;
  groupId: string;
  groupName: string;
  onClose: () => void;
  onInviteComplete: () => void;
}

export const InviteUsersModal: React.FC<InviteUsersModalProps> = ({
  isOpen,
  groupId,
  groupName,
  onClose,
  onInviteComplete,
}) => {
  const [emails, setEmails] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const validateEmails = (emailString: string): string[] => {
    const emailList = emailString
      .split(/[\n,;]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    const validEmails: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of emailList) {
      if (!emailRegex.test(email)) {
        setError(`Invalid email: ${email}`);
        return [];
      }
      validEmails.push(email);
    }

    setError('');
    return validEmails;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEmails(e.target.value);
    setError('');
  };

  const handleSendInvites = async () => {
    const validEmails = validateEmails(emails);

    if (validEmails.length === 0) {
      if (emails.trim().length === 0) {
        setError('Please enter at least one email address');
      }
      return;
    }

    setIsLoading(true);

    try {
      // Send invitations for each email
      const invitePromises = validEmails.map((email) =>
        fetch(`/api/groups/${groupId}/invitations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })
      );

      const responses = await Promise.all(invitePromises);
      const allSuccessful = responses.every((res) => res.ok);

      if (allSuccessful) {
        toast({
          title: 'Invitations sent!',
          description: `Sent ${validEmails.length} invitation${validEmails.length > 1 ? 's' : ''}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        onInviteComplete();
      } else {
        throw new Error('Some invitations failed to send');
      }
    } catch (err) {
      toast({
        title: 'Error sending invitations',
        description: 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      console.error('Error sending invitations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onInviteComplete();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" closeOnEsc={false} closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Invite Members to {groupName}</ModalHeader>
        <ModalCloseButton isDisabled={isLoading} />

        <ModalBody>
          <VStack spacing="4" align="stretch">
            <Text color="gray.600">
              Add email addresses to invite members to your group. You can invite more people anytime from the group settings.
            </Text>

            <FormControl isInvalid={!!error}>
              <FormLabel htmlFor="emails">Email Addresses</FormLabel>
              <Textarea
                id="emails"
                placeholder="Enter one or more email addresses&#10;you@example.com&#10;friend@example.com"
                value={emails}
                onChange={handleEmailChange}
                isDisabled={isLoading}
                rows={6}
              />
              <FormHelperText>
                Separate multiple emails with commas, semicolons, or line breaks
              </FormHelperText>
              {error && <FormErrorMessage>{error}</FormErrorMessage>}
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleSkip} isDisabled={isLoading}>
            Skip for now
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSendInvites}
            isLoading={isLoading}
            isDisabled={emails.trim().length === 0 || isLoading}
          >
            Send Invitations
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default InviteUsersModal;
