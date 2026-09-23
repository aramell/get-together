'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  HStack,
  Spinner,
  useToast,
} from '@chakra-ui/react';

export type ContactType = 'phone' | 'user';

export interface AddedContact {
  id: string;
  type: ContactType;
  displayName: string;
}

interface AddContactFormProps {
  circleId: string;
  onContactAdded: (contact: AddedContact) => void;
}

/**
 * Add-contact form for a social circle (Story 10.2, AC1-AC5, AC8)
 * Toggles between phone-number and app-username input modes.
 */
export const AddContactForm: React.FC<AddContactFormProps> = ({ circleId, onContactAdded }) => {
  const toast = useToast();
  const [mode, setMode] = useState<ContactType>('phone');
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholder = mode === 'phone' ? '+1 555 000 1234' : 'Name or email';
  const label = mode === 'phone' ? 'Phone number' : 'App username';

  const handleModeChange = (nextMode: ContactType) => {
    if (isLoading) return;
    setMode(nextMode);
    setValue('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!value.trim()) {
      setError(mode === 'phone' ? 'Phone number is required' : 'Please enter a name or email');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/circles/${circleId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mode, value: value.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Contact added',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        onContactAdded(result.data);
        setValue('');
      } else {
        setError(result.message || 'Failed to add contact');
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
    <Box as="form" onSubmit={handleSubmit}>
      <ButtonGroup isAttached mb={3} size="sm">
        <Button
          variant={mode === 'phone' ? 'solid' : 'outline'}
          colorScheme="teal"
          onClick={() => handleModeChange('phone')}
          isDisabled={isLoading}
          aria-pressed={mode === 'phone'}
          minHeight="48px"
        >
          Phone number
        </Button>
        <Button
          variant={mode === 'user' ? 'solid' : 'outline'}
          colorScheme="teal"
          onClick={() => handleModeChange('user')}
          isDisabled={isLoading}
          aria-pressed={mode === 'user'}
          minHeight="48px"
        >
          App username
        </Button>
      </ButtonGroup>

      <FormControl isInvalid={!!error}>
        <FormLabel htmlFor="add-contact-value">{label}</FormLabel>
        <HStack align="flex-start">
          <Input
            id="add-contact-value"
            type={mode === 'phone' ? 'tel' : 'text'}
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            isDisabled={isLoading}
            aria-label={label}
            minHeight="44px"
          />
          <Button
            type="submit"
            colorScheme="teal"
            isDisabled={isLoading || !value.trim()}
            display="flex"
            alignItems="center"
            minHeight="48px"
            flexShrink={0}
          >
            {isLoading && <Spinner size="sm" mr={2} />}
            {isLoading ? 'Adding...' : 'Add Contact'}
          </Button>
        </HStack>
        {mode === 'phone' && !error && (
          <FormHelperText>Include the country code, e.g. +1 555 000 1234</FormHelperText>
        )}
        {error && <FormErrorMessage aria-live="polite">{error}</FormErrorMessage>}
      </FormControl>
    </Box>
  );
};

export default AddContactForm;
