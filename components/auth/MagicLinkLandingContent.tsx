'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VStack, Spinner, Text, Heading } from '@chakra-ui/react';

export default function MagicLinkLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('t');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/auth/magic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (cancelled) return;

        if (response.ok && data.success) {
          router.push(data.redirectPath || '/groups');
        } else if (response.status === 410) {
          const params = new URLSearchParams({ reason: data.reason || 'invalid' });
          if (data.targetType) params.set('targetType', data.targetType);
          if (data.targetId) params.set('targetId', data.targetId);
          params.set('t', token);
          router.push(`/auth/magic/error?${params.toString()}`);
        } else {
          setError(data.message || 'Something went wrong. Please try again.');
        }
      } catch {
        if (!cancelled) {
          setError('Something went wrong. Please try again.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (!token) {
    return (
      <VStack spacing={4} textAlign="center" role="alert" aria-live="polite">
        <Heading size="md">We couldn&apos;t sign you in</Heading>
        <Text color="fg.muted">This link is missing its token. Please request a new one.</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack spacing={4} textAlign="center" role="alert" aria-live="polite">
        <Heading size="md">We couldn&apos;t sign you in</Heading>
        <Text color="fg.muted">{error}</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={4} textAlign="center" role="status" aria-live="polite">
      <Spinner size="xl" />
      <Text fontSize="lg">Signing you in...</Text>
    </VStack>
  );
}
