'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  HStack,
  Text,
  Link as ChakraLink,
  Stack,
  Spinner,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { phoneNumberSchema } from '@/lib/validation/smsAuthSchema';

// Small fixed list -- no dependency is installed for full country-code data,
// and adding one is outside this story's scope. Covers the launch markets.
const COUNTRY_CODES = [
  { code: '+1', label: 'US/CA (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+61', label: 'AU (+61)' },
  { code: '+33', label: 'FR (+33)' },
  { code: '+49', label: 'DE (+49)' },
];

export default function PhoneMagicLinkForm() {
  const [countryCode, setCountryCode] = useState('+1');
  const [nationalNumber, setNationalNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sentToNumber, setSentToNumber] = useState('');

  const fullPhoneNumber = `${countryCode}${nationalNumber.replace(/\D/g, '')}`;

  const validate = (value: string): string | null => {
    const result = phoneNumberSchema.safeParse(value);
    if (result.success) return null;
    return result.error.issues[0]?.message || 'Invalid phone number';
  };

  const handleNationalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNationalNumber(value);
    setError(validate(`${countryCode}${value.replace(/\D/g, '')}`));
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCountryCode(value);
    setError(validate(`${value}${nationalNumber.replace(/\D/g, '')}`));
  };

  const isFormValid = nationalNumber.length > 0 && validate(fullPhoneNumber) === null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validate(fullPhoneNumber);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/sms/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSentToNumber(fullPhoneNumber);
        setIsSubmitted(true);
      } else if (response.status === 429) {
        setError('Too many requests. Please wait before requesting a new link.');
      } else {
        setError(data.message || 'An unexpected error occurred. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Box w="100%" maxW="400px" mx="auto">
        <Stack spacing={4} textAlign="center">
          <Text fontSize="lg" fontWeight="medium" color="green.600">
            Check your texts — we sent a link to {sentToNumber}
          </Text>
          <ChakraLink as={NextLink} href="/auth/login" color="blue.600" fontWeight="medium">
            ← Back to login
          </ChakraLink>
        </Stack>
      </Box>
    );
  }

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%" maxW="400px" mx="auto">
      <Stack spacing={4}>
        <FormControl isInvalid={!!error}>
          <FormLabel htmlFor="phoneNumber">Phone Number</FormLabel>
          <HStack spacing={2} align="start">
            <Select
              id="countryCode"
              aria-label="Country code"
              value={countryCode}
              onChange={handleCountryCodeChange}
              isDisabled={isLoading}
              w="140px"
              minH="48px"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder="555 000 1234"
              value={nationalNumber}
              onChange={handleNationalNumberChange}
              isDisabled={isLoading}
              aria-label="Phone number"
              aria-invalid={!!error}
              aria-describedby={error ? 'phoneNumber-error' : undefined}
              minH="48px"
            />
          </HStack>
          <Box role="alert" aria-live="polite" mt={error ? 2 : 0}>
            {error && (
              <Text id="phoneNumber-error" color="red.500" fontSize="sm">
                {error}
              </Text>
            )}
          </Box>
        </FormControl>

        <Text fontSize="sm" color="gray.600">
          We&apos;ll text you a one-time link to join or log in — no password needed.
        </Text>

        <Button
          type="submit"
          colorScheme="blue"
          width="100%"
          minH="48px"
          isDisabled={!isFormValid || isLoading}
          aria-label="Send magic link"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" mr={2} />
              Sending...
            </>
          ) : (
            'Send Magic Link'
          )}
        </Button>

        <Text textAlign="center" fontSize="sm">
          <ChakraLink as={NextLink} href="/auth/login" color="blue.600">
            ← Back to login
          </ChakraLink>
        </Text>
      </Stack>
    </Box>
  );
}
