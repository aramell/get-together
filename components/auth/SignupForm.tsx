'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  VStack,
  useToast,
  Text,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { signupSchema, SignupFormData } from '@/lib/validation/authSchema';
import { ZodError } from 'zod';
import NextLink from 'next/link';

export interface SignupFormProps {
  onSuccess?: (email: string) => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<Partial<SignupFormData>>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Validate form on change
  const validateField = (name: string, value: string) => {
    try {
      const partialData = { ...formData, [name]: value };

      // Try to validate just this field
      if (name === 'email') {
        signupSchema.shape.email.parse(value);
      } else if (name === 'password') {
        signupSchema.shape.password.parse(value);
      } else if (name === 'confirmPassword') {
        // Check if passwords match
        if (value !== partialData.password) {
          setErrors((prev) => ({
            ...prev,
            confirmPassword: 'Passwords do not match',
          }));
          return;
        }
      }

      // Clear error for this field if validation passes
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldError = error.errors[0];
        setErrors((prev) => ({
          ...prev,
          [name]: fieldError.message,
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
    validateField(name, value);
  };

  const isFormValid = () => {
    try {
      signupSchema.parse(formData);
      return Object.keys(errors).length === 0;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate full form
    try {
      const validatedData = signupSchema.parse(formData);

      setIsLoading(true);

      // Call signup API
      let response;
      try {
        response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: validatedData.email,
            password: validatedData.password,
          }),
        });
      } catch (networkError) {
        // Handle network errors (timeout, connection refused, etc.)
        console.error('Network error during signup:', networkError);
        toast({
          title: 'Connection Error',
          description: 'Unable to reach the server. Please check your internet connection and try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setIsLoading(false);
        return;
      }

      // Parse response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        toast({
          title: 'Server Error',
          description: 'The server returned an invalid response. Please try again later.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setIsLoading(false);
        return;
      }

      if (response.ok && data.success) {
        toast({
          title: 'Success!',
          description: data.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Reset form
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
        });

        // Call onSuccess callback if provided
        if (onSuccess && validatedData.email) {
          onSuccess(validatedData.email);
        }
      } else {
        // Handle error from API
        const errorMessage = data.message || 'Signup failed. Please try again.';

        // Check for rate limiting
        if (response.status === 429 || data.errorCode === 'RATE_LIMITED') {
          toast({
            title: 'Too Many Attempts',
            description: 'You have made too many signup attempts. Please wait a few minutes before trying again.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        } else {
          toast({
            title: 'Signup Failed',
            description: errorMessage,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }

        // If it's a validation error, show field-specific errors
        if (data.errorCode === 'VALIDATION_ERROR') {
          setErrors({
            form: errorMessage,
          });
        }
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as string;
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      } else {
        console.error('Unexpected error:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="md" py={{ base: '12', md: '24' }}>
      <Box
        bg="white"
        px={{ base: '4', md: '8' }}
        py={{ base: '6', md: '12' }}
        rounded="lg"
        shadow="md"
      >
        <VStack spacing="6" align="stretch" as="form" onSubmit={handleSubmit}>
          <Heading as="h1" size="lg" textAlign="center">
            Create Account
          </Heading>

          {errors.form && (
            <Box
              bg="red.50"
              border="1px"
              borderColor="red.200"
              p="3"
              rounded="md"
              role="alert"
            >
              <Text color="red.700" fontSize="sm">
                {errors.form}
              </Text>
            </Box>
          )}

          <FormControl isInvalid={!!errors.email}>
            <FormLabel htmlFor="email">Email Address</FormLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email || ''}
              onChange={handleChange}
              onBlur={(e) => validateField('email', e.target.value)}
              isDisabled={isLoading}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <FormErrorMessage id="email-error">{errors.email}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl isInvalid={!!errors.password}>
            <FormLabel htmlFor="password">Password</FormLabel>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Min 8 characters, 1 uppercase, 1 number"
              value={formData.password || ''}
              onChange={handleChange}
              onBlur={(e) => validateField('password', e.target.value)}
              isDisabled={isLoading}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <FormErrorMessage id="password-error">
                {errors.password}
              </FormErrorMessage>
            )}
          </FormControl>

          <FormControl isInvalid={!!errors.confirmPassword}>
            <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword || ''}
              onChange={handleChange}
              onBlur={(e) => validateField('confirmPassword', e.target.value)}
              isDisabled={isLoading}
              aria-describedby={
                errors.confirmPassword ? 'confirmPassword-error' : undefined
              }
            />
            {errors.confirmPassword && (
              <FormErrorMessage id="confirmPassword-error">
                {errors.confirmPassword}
              </FormErrorMessage>
            )}
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            size="lg"
            w="full"
            isLoading={isLoading}
            isDisabled={!isFormValid() || isLoading}
          >
            Sign Up
          </Button>

          <Text textAlign="center" fontSize="sm" color="gray.600">
            Already have an account?{' '}
            <ChakraLink as={NextLink} href="/auth/login" color="blue.600" fontWeight="semibold">
              Log in here
            </ChakraLink>
          </Text>
        </VStack>
      </Box>
    </Container>
  );
};

export default SignupForm;
