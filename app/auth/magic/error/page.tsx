'use client';

import React, { Suspense } from 'react';
import { Container } from '@chakra-ui/react';
import MagicLinkErrorContent from '@/components/auth/MagicLinkErrorContent';

export default function MagicLinkErrorPage() {
  return (
    <Container maxW="md" py={{ base: '12', md: '24' }}>
      <Suspense fallback={null}>
        <MagicLinkErrorContent />
      </Suspense>
    </Container>
  );
}
