'use client';

import React from 'react';
import { Box, Container, Heading, Text, Stack, VStack } from '@chakra-ui/react';
import PhoneMagicLinkForm from '@/components/auth/PhoneMagicLinkForm';

export default function PhoneMagicLinkPage() {
  return (
    <Container maxW="md" py={{ base: '12', md: '24' }}>
      <VStack spacing={{ base: '8', md: '10' }}>
        <Stack spacing="2" textAlign="center">
          <Heading size="lg">Log in with your phone</Heading>
          <Text color="fg.muted">Enter your phone number and we&apos;ll text you a one-time link</Text>
        </Stack>

        <Box w="100%">
          <PhoneMagicLinkForm />
        </Box>
      </VStack>
    </Container>
  );
}
