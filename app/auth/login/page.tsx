'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Heading, Text, Stack, VStack } from '@chakra-ui/react';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = (tokens: { accessToken: string; idToken: string }) => {
    // Store tokens in localStorage (in addition to HTTP-only cookies)
    // This allows the frontend to access the tokens for API calls
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('idToken', tokens.idToken);

    // Redirect to dashboard/groups page
    router.push('/dashboard');
  };

  return (
    <Container maxW="md" py={{ base: '12', md: '24' }}>
      <VStack spacing={{ base: '8', md: '10' }}>
        {/* Header */}
        <Stack spacing="2" textAlign="center">
          <Heading size="lg">Welcome back</Heading>
          <Text color="fg.muted">Sign in to your get-together account</Text>
        </Stack>

        {/* Login Form */}
        <Box w="100%">
          <LoginForm onSuccess={handleLoginSuccess} />
        </Box>

        {/* Additional Info */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
      </VStack>
    </Container>
  );
}
