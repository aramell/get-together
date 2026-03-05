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
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { loginSchema, type LoginFormData } from '@/lib/validation/authSchema';
import { ZodError } from 'zod';

interface LoginFormProps {
  onSuccess?: (tokens: { accessToken: string; idToken: string }) => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ status: 'success' | 'error'; title: string; description: string } | null>(null);

  // Validate individual field
  const validateField = (name: keyof LoginFormData, value: string) => {
    try {
      const fieldSchema =
        name === 'email'
          ? loginSchema.pick({ email: true })
          : loginSchema.pick({ password: true });
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
    validateField(name as keyof LoginFormData, value);
  };

  const isFormValid = () => {
    try {
      loginSchema.parse(formData);
      return Object.keys(errors).length === 0;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid()) {
      setAlert({
        status: 'error',
        title: 'Invalid form',
        description: 'Please fix the errors before submitting',
      });
      return;
    }

    setIsLoading(true);
    setAlert(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success && result.accessToken && result.idToken) {
        setAlert({
          status: 'success',
          title: 'Login successful!',
          description: 'Redirecting to your groups...',
        });

        // Call success callback
        if (onSuccess) {
          onSuccess({
            accessToken: result.accessToken,
            idToken: result.idToken,
          });
        }

        // Redirect handled by parent component
      } else {
        setAlert({
          status: 'error',
          title: 'Login failed',
          description: result.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setAlert({
        status: 'error',
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%" maxW="400px" mx="auto">
      <Stack spacing={4}>
        {/* Alert Messages */}
        {alert && (
          <Alert status={alert.status} borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.description}</AlertDescription>
            </Box>
            <CloseButton
              position="absolute"
              right="8px"
              top="8px"
              onClick={() => setAlert(null)}
            />
          </Alert>
        )}
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

        {/* Password Field */}
        <FormControl isInvalid={!!errors.password}>
          <FormLabel htmlFor="password">Password</FormLabel>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            onBlur={(e) => validateField('password', e.target.value)}
            isDisabled={isLoading}
            aria-label="Password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <FormErrorMessage id="password-error">{errors.password}</FormErrorMessage>
          )}
        </FormControl>

        {/* Forgot Password Link */}
        <Box textAlign="right">
          <ChakraLink as={NextLink} href="/auth/forgot-password" fontSize="sm" color="blue.600">
            Forgot password?
          </ChakraLink>
        </Box>

        {/* Submit Button */}
        <Button
          type="submit"
          colorScheme="blue"
          width="100%"
          isDisabled={!isFormValid() || isLoading}
          aria-label="Log in"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" mr={2} />
              Logging in...
            </>
          ) : (
            'Log In'
          )}
        </Button>

        {/* Sign Up Link */}
        <Text textAlign="center" fontSize="sm">
          Don&apos;t have an account?{' '}
          <ChakraLink as={NextLink} href="/auth/signup" color="blue.600">
            Sign up
          </ChakraLink>
        </Text>
      </Stack>
    </Box>
  );
}
