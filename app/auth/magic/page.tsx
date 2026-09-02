'use client';

import React, { Suspense } from 'react';
import { Container, Spinner } from '@chakra-ui/react';
import MagicLinkLandingContent from '@/components/auth/MagicLinkLandingContent';

export default function MagicLinkLandingPage() {
  return (
    <Container maxW="md" py={{ base: '12', md: '24' }}>
      <Suspense fallback={<Spinner size="xl" />}>
        <MagicLinkLandingContent />
      </Suspense>
    </Container>
  );
}
