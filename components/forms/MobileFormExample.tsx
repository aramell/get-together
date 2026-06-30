'use client';

import React, { useState } from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Button,
  FormErrorMessage,
  VStack,
} from '@chakra-ui/react';

/**
 * Mobile-optimized form controls with:
 * - 44px minimum input height
 * - Visible labels (not placeholder-only)
 * - Touch-friendly spacing
 * - Responsive text sizing
 */
export function MobileFormExample() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setError('');
  };

  return (
    <VStack spacing={[3, 4]} p={[4, 6]} align="stretch">
      {/* Text Input - Mobile Optimized */}
      <FormControl isInvalid={!!error}>
        <FormLabel htmlFor="name" fontSize={['14px', '16px']} fontWeight="600" mb={2}>
          Your Name
        </FormLabel>
        <Input
          id="name"
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError('');
          }}
          minHeight="44px"
          fontSize={['16px', '16px']}
          padding="10px 12px"
          _focus={{
            borderColor: 'blue.500',
            boxShadow: '0 0 0 1px rgba(49, 130, 206, 0.5)',
          }}
        />
        {error && (
          <FormErrorMessage fontSize={['12px', '14px']} mt={2}>
            {error}
          </FormErrorMessage>
        )}
      </FormControl>

      {/* Textarea - Mobile Optimized */}
      <FormControl>
        <FormLabel htmlFor="message" fontSize={['14px', '16px']} fontWeight="600" mb={2}>
          Message
        </FormLabel>
        <Textarea
          id="message"
          placeholder="Type your message here..."
          minHeight="120px"
          fontSize={['16px', '16px']}
          padding="10px 12px"
          rows={4}
          _focus={{
            borderColor: 'blue.500',
            boxShadow: '0 0 0 1px rgba(49, 130, 206, 0.5)',
          }}
        />
      </FormControl>

      {/* Select - Mobile Optimized */}
      <FormControl>
        <FormLabel htmlFor="category" fontSize={['14px', '16px']} fontWeight="600" mb={2}>
          Category
        </FormLabel>
        <Select
          id="category"
          placeholder="Select a category"
          minHeight="44px"
          fontSize={['16px', '16px']}
          padding="10px 12px"
          _focus={{
            borderColor: 'blue.500',
            boxShadow: '0 0 0 1px rgba(49, 130, 206, 0.5)',
          }}
        >
          <option>Option 1</option>
          <option>Option 2</option>
          <option>Option 3</option>
        </Select>
      </FormControl>

      {/* Submit Button - Touch Friendly */}
      <Button
        onClick={handleSubmit}
        minHeight="48px"
        fontSize={['16px', '16px']}
        fontWeight="600"
        width="100%"
        colorScheme="blue"
        mt={4}
      >
        Submit
      </Button>
    </VStack>
  );
}

export default MobileFormExample;
