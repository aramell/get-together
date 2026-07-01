'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  HStack,
  VStack,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
} from '@chakra-ui/react';
import { z } from 'zod';

// Validation schema
const publicRsvpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional().default(''),
  status: z.enum(['in', 'maybe', 'out']),
});

type PublicRsvpInput = z.infer<typeof publicRsvpSchema>;

interface PublicRsvpFormProps {
  publicToken: string;
  eventTitle: string;
  onSuccess?: (response: any) => void;
}

export const PublicRsvpForm: React.FC<PublicRsvpFormProps> = ({
  publicToken,
  eventTitle,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'in' | 'maybe' | 'out' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Validate email on blur
  const handleEmailBlur = () => {
    if (email) {
      const result = z.string().email().safeParse(email);
      if (!result.success) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!status) {
      setError('Please select an RSVP status');
      return;
    }

    const result = publicRsvpSchema.safeParse({
      email,
      name,
      status,
    });

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/events/public/${publicToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit RSVP');
      }

      const data = await response.json();
      const statusText =
        status === 'in' ? 'IN' : status === 'maybe' ? 'MAYBE' : 'OUT';
      setSuccess(`Thanks! You're marked as ${statusText}. ${data.message}`);

      if (onSuccess) {
        onSuccess(data);
      }

      // Reset form for status change
      setStatus(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit RSVP'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      as="form"
      aria-label={`RSVP form for ${eventTitle}`}
      noValidate
      onSubmit={handleSubmit}
      maxW="100%"
      p={{ base: 4, md: 6 }}
      bg="white"
      borderRadius="lg"
      boxShadow="sm"
    >
      <VStack spacing={6} align="stretch">
        {/* Email Field */}
        <FormControl isRequired isInvalid={!!emailError}>
          <FormLabel htmlFor="email">Email Address</FormLabel>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            isDisabled={isLoading}
            minH="44px"
            aria-describedby={emailError ? 'email-error' : undefined}
          />
          {emailError && (
            <Text id="email-error" color="red.500" fontSize="sm" mt={1}>
              {emailError}
            </Text>
          )}
        </FormControl>

        {/* Name Field */}
        <FormControl>
          <FormLabel htmlFor="name">Name (optional)</FormLabel>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            isDisabled={isLoading}
            minH="44px"
          />
        </FormControl>

        {/* RSVP Status Selection */}
        <FormControl isRequired>
          <FormLabel id="rsvp-status-label">Select your RSVP status</FormLabel>
          <HStack
            spacing={3}
            role="group"
            aria-labelledby="rsvp-status-label"
            width="100%"
            justify="center"
            wrap="wrap"
          >
            {(['in', 'maybe', 'out'] as const).map((statusOption) => (
              <Button
                key={statusOption}
                onClick={() => setStatus(statusOption)}
                variant={status === statusOption ? 'solid' : 'outline'}
                colorScheme={
                  statusOption === 'in'
                    ? 'green'
                    : statusOption === 'maybe'
                      ? 'yellow'
                      : 'red'
                }
                minH="48px"
                isDisabled={isLoading}
                aria-label={`Mark as ${statusOption.toUpperCase()}`}
                aria-pressed={status === statusOption}
                className={status === statusOption ? 'selected' : ''}
              >
                {statusOption.toUpperCase()}
              </Button>
            ))}
          </HStack>
        </FormControl>

        {/* Error Message */}
        {error && (
          <Alert status="error" role="alert" aria-live="polite">
            <AlertIcon />
            <Box>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Success Message */}
        {success && (
          <Alert status="success" role="status" aria-live="polite">
            <AlertIcon />
            <Box>
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          colorScheme="blue"
          isLoading={isLoading}
          loadingText="Submitting..."
          isDisabled={isLoading || !!emailError}
          minH="48px"
          width="100%"
          aria-label="Submit RSVP"
        >
          {isLoading ? <Spinner /> : 'Submit RSVP'}
        </Button>
      </VStack>
    </Box>
  );
};
