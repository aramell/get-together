'use client';

import React, { Suspense } from 'react';
import { Container, Heading, Text, Stack, VStack, Spinner } from '@chakra-ui/react';
import ResetPasswordFormContent from '@/components/auth/ResetPasswordFormContent';

export default function ResetPasswordPage() {
  return (
    <Container maxW="md" py={{ base: '12', md: '24' }}>
      <VStack spacing={{ base: '8', md: '10' }}>
        <Stack spacing="2" textAlign="center">
          <Heading size="lg">Create new password</Heading>
          <Text color="fg.muted">Enter your new password below</Text>
        </Stack>

        <Suspense fallback={<Spinner />}>
          <ResetPasswordFormContent />
        </Suspense>
      </VStack>
    </Container>
  );
}
