'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Heading, Text, Button, VStack, HStack, Spinner } from '@chakra-ui/react';
import { useAuth } from '@/lib/contexts/AuthContext';

const PINNED_NOTES: Array<{ label: string; rotate: string; color: string }> = [
  { label: 'Mark when you’re free', rotate: '-2deg', color: 'cork.400' },
  { label: 'Watch momentum build', rotate: '1.5deg', color: 'marigold.500' },
  { label: 'It locks in — automatically', rotate: '-1deg', color: 'meadow.500' },
];

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
          <Spinner size="lg" color="coral.500" />
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
          <Spinner size="lg" color="coral.500" />
          <Text>Redirecting to your groups...</Text>
        </VStack>
      </Container>
    );
  }

  // Landing page for unauthenticated users
  return (
    <Box minH="100vh" bg="paper.200">
      <Container maxW="lg" py={{ base: '16', md: '24' }}>
        <VStack spacing={{ base: '12', md: '16' }} align="stretch">
          {/* Hero */}
          <VStack spacing="4" textAlign="center">
            <Heading as="h1" fontSize={['36px', '48px']} color="ink.800">
              Get Together
            </Heading>
            <Text fontSize="lg" color="ink.600" maxW="2xl">
              No more "does Tuesday work?" threads. Everyone pins their availability,
              you watch the plan firm up, and it confirms itself the moment enough
              people are in.
            </Text>
          </VStack>

          {/* How it works — three pinned notes, each less "soft" than the last */}
          <HStack
            spacing={{ base: '4', md: '6' }}
            justify="center"
            align="stretch"
            flexWrap="wrap"
          >
            {PINNED_NOTES.map((note, i) => (
              <Box
                key={note.label}
                bg="white"
                borderRadius="lg"
                borderLeft="6px solid"
                borderColor={note.color}
                boxShadow="0 3px 10px rgba(42, 33, 64, 0.08)"
                p={5}
                minW={{ base: '100%', sm: '220px' }}
                maxW="260px"
                transform={`rotate(${note.rotate})`}
                transition="transform 0.2s"
                _hover={{ transform: 'rotate(0deg)' }}
              >
                <Text fontFamily="mono" fontSize="xs" color="ink.400" mb={2}>
                  step {i + 1}
                </Text>
                <Text fontWeight="600" color="ink.800">
                  {note.label}
                </Text>
              </Box>
            ))}
          </HStack>

          {/* CTA */}
          <VStack spacing="4">
            <HStack spacing="4" justify="center">
              <Button
                colorScheme="coral"
                size="lg"
                onClick={() => router.push('/auth/login')}
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                colorScheme="coral"
                size="lg"
                onClick={() => router.push('/auth/signup')}
              >
                Create Account
              </Button>
            </HStack>
            <Text fontSize="sm" color="ink.500" textAlign="center">
              Join your friends and start planning together
            </Text>
          </VStack>
        </VStack>
      </Container>
    </Box>
  );
}
