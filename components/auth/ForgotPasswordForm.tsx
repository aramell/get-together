'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Stack,
  Text,
  Link as ChakraLink,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validation/resetSchema';
import { forgotPassword } from '@/lib/services/authService';
import { ZodError } from 'zod';

export default function ForgotPasswordForm() {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ForgotPasswordFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const toast = useToast();

  // Validate individual field
  const validateField = (name: keyof ForgotPasswordFormData, value: string) => {
    try {
      const fieldSchema = forgotPasswordSchema.pick({ [name]: true });
      fieldSchema.parse({ [name]: value });
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    } catch (error) {
      if (error instanceof ZodError) {
        setErrors((prev) => ({
          ...prev,
          [name]: error.issues[0]?.message || 'Invalid input',
        }));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    validateField(name as keyof ForgotPasswordFormData, value);
  };

  const isFormValid = () => {
    try {
      forgotPasswordSchema.parse(formData);
      return Object.keys(errors).length === 0;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid()) {
      toast({
        title: 'Invalid form',
        description: 'Please fix the errors before submitting',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await forgotPassword(formData.email);

      if (result.success) {
        setIsSubmitted(true);
        toast({
          title: 'Success!',
          description: 'Check your email for reset instructions',
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message || 'An unexpected error occurred',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <Box w="100%" maxW="400px" mx="auto">
        <Stack spacing={4} textAlign="center">
          <Text fontSize="lg" fontWeight="medium" color="green.600">
            ✓ Reset link sent!
          </Text>
          <Text color="gray.600">Check your email for instructions to reset your password.</Text>
          <Text fontSize="sm" color="gray.500">
            Didn't receive the email? Check your spam folder or{' '}
            <ChakraLink
              as="button"
              onClick={() => {
                setIsSubmitted(false);
                setFormData({ email: '' });
              }}
              color="blue.600"
            >
              try again
            </ChakraLink>
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
        {/* Email Field */}
        <FormControl isInvalid={!!errors.email}>
          <FormLabel htmlFor="email">Email Address</FormLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleChange}
            onBlur={(e) => validateField('email', e.target.value)}
            isDisabled={isLoading}
            aria-label="Email address"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <FormErrorMessage id="email-error">{errors.email}</FormErrorMessage>
          )}
        </FormControl>

        {/* Help Text */}
        <Text fontSize="sm" color="gray.600">
          We'll send you a link to reset your password if an account exists with this email.
        </Text>

        {/* Submit Button */}
        <Button
          type="submit"
          colorScheme="blue"
          width="100%"
          isDisabled={!isFormValid() || isLoading}
          aria-label="Send reset link"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" mr={2} />
              Sending...
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>

        {/* Back to Login Link */}
        <Text textAlign="center" fontSize="sm">
          <ChakraLink as={NextLink} href="/auth/login" color="blue.600">
            ← Back to login
          </ChakraLink>
        </Text>
      </Stack>
    </Box>
  );
}
