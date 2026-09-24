'use client';

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from '@chakra-ui/react';
import LoginForm from './LoginForm';
import { useAuth } from '@/lib/contexts/AuthContext';

interface LoginInPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Login-in-place modal for the no-login public event page (Story 13.5).
 * Opened by a guest's first attempted interactive action on a widget.
 * Reuses the existing password-only LoginForm as-is; on success, calls
 * AuthContext's login() (synchronous, no navigation) and closes -- the
 * page/URL never changes, and the widget that triggered this picks up the
 * new auth state on its own next render/poll.
 */
export function LoginInPlaceModal({ isOpen, onClose }: LoginInPlaceModalProps) {
  const { login } = useAuth();

  const handleSuccess = (tokens: { accessToken: string; idToken: string; userId?: string }) => {
    login(tokens);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>Log in to continue</ModalHeader>
        <ModalCloseButton aria-label="Close login dialog" />
        <ModalBody pb={6}>
          <LoginForm onSuccess={handleSuccess} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default LoginInPlaceModal;
