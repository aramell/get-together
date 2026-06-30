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
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validation/resetSchema';
import { resetPassword } from '@/lib/services/authService';
import { ZodError } from 'zod';

interface ResetPasswordFormProps {
  email?: string;
  code?: string;
  onSuccess?: () => void;
}

export default function ResetPasswordForm({ email: initialEmail, code: initialCode, onSuccess }: ResetPasswordFormProps) {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    email: initialEmail || '',
    code: initialCode || '',
    newPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const validateField = (name: keyof ResetPasswordFormData, value: string) => {
    try {
      const fieldSchema = resetPasswordSchema.pick({ [name]: true } as Record<keyof ResetPasswordFormData, true>);
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
    validateField(name as keyof ResetPasswordFormData, value);
  };

  const isFormValid = () => {
    try {
      resetPasswordSchema.parse(formData);
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
      const result = await resetPassword(formData.email, formData.code, formData.newPassword);

      if (result.success) {
        toast({
          title: 'Success!',
          description: 'Your password has been reset. You can now log in.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: 'Reset failed',
          description: result.message || 'An unexpected error occurred',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });

        // If code expired, offer to get a new one
        if (result.errorCode === 'CODE_EXPIRED' || result.errorCode === 'ExpiredCodeException') {
          setFormData((prev) => ({
            ...prev,
            code: '',
          }));
        }
      }
    } catch (error) {
      console.error('Reset password error:', error);
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

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%" maxW="400px" mx="auto">
      <Stack spacing={4}>
        {/* Email Field (read-only) */}
        <FormControl isInvalid={!!errors.email}>
          <FormLabel htmlFor="email">Email Address</FormLabel>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={(e) => validateField('email', e.target.value)}
            isDisabled={isLoading || !!initialEmail}
            aria-label="Email address"
          />
          {errors.email && (
            <FormErrorMessage>{errors.email}</FormErrorMessage>
          )}
        </FormControl>

        {/* Reset Code Field */}
        <FormControl isInvalid={!!errors.code}>
          <FormLabel htmlFor="code">Reset Code</FormLabel>
          <Input
            id="code"
            name="code"
            type="text"
            placeholder="Enter code from email"
            value={formData.code}
            onChange={handleChange}
            onBlur={(e) => validateField('code', e.target.value)}
            isDisabled={isLoading || !!initialCode}
            aria-label="Reset code"
          />
          {errors.code && (
            <FormErrorMessage>{errors.code}</FormErrorMessage>
          )}
        </FormControl>

        {/* New Password Field */}
        <FormControl isInvalid={!!errors.newPassword}>
          <FormLabel htmlFor="newPassword">New Password</FormLabel>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="••••••••"
            value={formData.newPassword}
            onChange={handleChange}
            onBlur={(e) => validateField('newPassword', e.target.value)}
            isDisabled={isLoading}
            aria-label="New password"
          />
          {errors.newPassword && (
            <FormErrorMessage>{errors.newPassword}</FormErrorMessage>
          )}
          <Text fontSize="xs" color="gray.500" mt={1}>
            Must be at least 8 characters with uppercase and number
          </Text>
        </FormControl>

        {/* Submit Button */}
        <Button
          type="submit"
          colorScheme="blue"
          width="100%"
          isDisabled={!isFormValid() || isLoading}
          aria-label="Reset password"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" mr={2} />
              Resetting...
            </>
          ) : (
            'Reset Password'
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
