'use client';

import React, { useEffect } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';
import { Box, Container, Heading, Text, VStack, Link as ChakraLink, Spinner } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/groups');
    }
  }, [isAuthenticated, router]);

  const handleSignupSuccess = (email: string) => {
    console.log('Signup successful for:', email);
    // In a real app, you might redirect to email verification page
    // router.push(`/auth/verify-email?email=${email}`);
  };

  // Show loading spinner while checking auth status
  if (isAuthenticated) {
    return (
      <Container maxW="md" py={{ base: '12', md: '24' }}>
        <VStack spacing={4} justify="center" minH="400px">
          <Spinner size="lg" color="blue.500" />
          <Text>Redirecting to your groups...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="lg" py={{ base: '12', md: '24' }}>
        <VStack spacing="8" align="stretch">
          <Box textAlign="center">
            <Heading as="h1" size="2xl" mb="2">
              Welcome to Get Together
            </Heading>
            <Text color="gray.600" fontSize="lg">
              Coordinate group plans effortlessly. Create an account to get started.
            </Text>
          </Box>

          <SignupForm onSuccess={handleSignupSuccess} />

          <Box textAlign="center">
            <Text fontSize="sm" color="gray.600">
              Already have an account?{' '}
              <ChakraLink as={NextLink} href="/auth/login" color="blue.600" fontWeight="medium">
                Log in
              </ChakraLink>
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
