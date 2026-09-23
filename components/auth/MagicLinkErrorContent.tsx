'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  HStack,
  Text,
  Heading,
  VStack,
  Spinner,
} from '@chakra-ui/react';
import { phoneNumberSchema, COUNTRY_CODES } from '@/lib/validation/smsAuthSchema';

// Exact copy from AC1, AC2, AC6.
const REASON_MESSAGES: Record<string, string> = {
  expired: 'This link has expired. Links are valid for 15 minutes.',
  already_used: 'This link has already been used. Request a new one below.',
  invalid: 'This link is invalid. Please request a new one.',
};

/**
 * The re-request form always prompts for a phone number rather than
 * pre-filling one (AC1's parenthetical): Story 9.1 deliberately never
 * persists the raw phone number past the initial SMS send (NFR32), so
 * there is no server-side value to pre-fill from a token or URL. The
 * original token is still passed through as originalToken so the API can
 * recover the group/event target context (AC4) without the user re-entering
 * anything about the invite itself.
 */
export default function MagicLinkErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'invalid';
  const originalToken = searchParams.get('t');

  const message = REASON_MESSAGES[reason] || REASON_MESSAGES.invalid;

  const [countryCode, setCountryCode] = useState('+1');
  const [nationalNumber, setNationalNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
    setStatus(null);

    try {
      const response = await fetch('/api/auth/sms/rerequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: fullPhoneNumber,
          originalToken: originalToken || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus(data.message || 'New link sent! Check your texts.');
      } else if (response.status === 429) {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setError(data.message || 'An unexpected error occurred. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack spacing={6} textAlign="center">
      <Heading as="h1" size="md">
        {message}
      </Heading>

      <Box role="status" aria-live="polite" minH="1.5em">
        {status && (
          <Text color="green.600" fontWeight="medium">
            {status}
          </Text>
        )}
      </Box>

      <Box as="form" onSubmit={handleSubmit} w="100%" maxW="360px">
        <VStack spacing={4}>
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

          <Button
            type="submit"
            colorScheme="blue"
            width="100%"
            minH="48px"
            isDisabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" mr={2} />
                Sending...
              </>
            ) : (
              'Send me a new link'
            )}
          </Button>
        </VStack>
      </Box>
    </VStack>
  );
}
