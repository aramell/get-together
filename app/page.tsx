'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Heading, Text, Button, VStack, HStack, Spinner } from '@chakra-ui/react';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Auto-redirect authenticated users to /groups dashboard
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/groups');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <Container maxW="lg" py={{ base: '12', md: '24' }}>
        <VStack spacing={4} justify="center" minH="400px">
          <Spinner size="lg" color="blue.500" />
          <Text>Loading...</Text>
        </VStack>
      </Container>
    );
  }

  // Show loading when authenticated (before redirect)
  if (isAuthenticated) {
    return (
      <Container maxW="lg" py={{ base: '12', md: '24' }}>
        <VStack spacing={4} justify="center" minH="400px">
          <Spinner size="lg" color="blue.500" />
          <Text>Redirecting to your groups...</Text>
        </VStack>
      </Container>
    );
  }

  // Landing page for unauthenticated users
  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="lg" py={{ base: '16', md: '24' }}>
        <VStack spacing={{ base: '12', md: '16' }} align="stretch">
          {/* Header */}
          <VStack spacing="4" textAlign="center">
            <Heading as="h1" size="2xl">
              Get Together
            </Heading>
            <Text fontSize="lg" color="gray.600" maxW="2xl">
              Plan group events with ease. Mark your availability and coordinate with friends instantly.
            </Text>
          </VStack>

          {/* Features */}
          <Box bg="white" borderRadius="lg" p={{ base: '6', md: '8' }} boxShadow="sm">
            <VStack spacing="8" align="stretch">
              <VStack spacing="4">
                <Heading size="md">Features</Heading>
                <VStack spacing="3" align="start" pl="4">
                  <Text>✓ Create and manage groups</Text>
                  <Text>✓ Mark your availability on a soft calendar</Text>
                  <Text>✓ See when group members are free</Text>
                  <Text>✓ Plan events when everyone is available</Text>
                </VStack>
              </VStack>

              {/* CTA Buttons */}
              <HStack spacing="4" justify="center" pt="4">
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={() => router.push('/auth/login')}
                >
                  Sign In
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push('/auth/signup')}
                >
                  Create Account
                </Button>
              </HStack>
            </VStack>
          </Box>

          {/* Footer text */}
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Join your friends and start planning together
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
