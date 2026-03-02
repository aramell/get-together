'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Container, Heading, Text, Stack, VStack, Alert, AlertIcon } from '@chakra-ui/react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get('email') || '';
  const code = searchParams.get('code') || '';

  const handleSuccess = () => {
    // Redirect to login page after successful reset
    router.push('/auth/login');
  };

  return (
    <Container maxW="md" py={{ base: '12', md: '24' }}>
      <VStack spacing={{ base: '8', md: '10' }}>
        <Stack spacing="2" textAlign="center">
          <Heading size="lg">Create new password</Heading>
          <Text color="fg.muted">Enter your new password below</Text>
        </Stack>

        {!email && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">Please use the reset link from your email</Text>
          </Alert>
        )}

        <Box w="100%">
          <ResetPasswordForm
            email={email}
            code={code}
            onSuccess={handleSuccess}
          />
        </Box>
      </VStack>
    </Container>
  );
}
