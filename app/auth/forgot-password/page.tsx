'use client';

import React from 'react';
import { Box, Container, Heading, Text, Stack, VStack } from '@chakra-ui/react';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <Container maxW="md" py={{ base: '12', md: '24' }}>
      <VStack spacing={{ base: '8', md: '10' }}>
        <Stack spacing="2" textAlign="center">
          <Heading size="lg">Reset your password</Heading>
          <Text color="fg.muted">Enter your email address and we'll send you a link to reset your password</Text>
        </Stack>

        <Box w="100%">
          <ForgotPasswordForm />
        </Box>
      </VStack>
    </Container>
  );
}
