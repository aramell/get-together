'use client';

import React from 'react';
import { SignupForm } from '@/components/auth/SignupForm';
import { Box, Container, Heading, Text, VStack, Link as ChakraLink } from '@chakra-ui/react';
import NextLink from 'next/link';

export default function SignupPage() {
  const handleSignupSuccess = (email: string) => {
    console.log('Signup successful for:', email);
    // In a real app, you might redirect to email verification page
    // router.push(`/auth/verify-email?email=${email}`);
  };

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
