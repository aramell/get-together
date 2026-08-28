'use client';

import React, { Suspense } from 'react';
import { Container, VStack, Spinner } from '@chakra-ui/react';
import UserProfile from '@/components/auth/UserProfile';
import CalendarConnectionSetting from '@/components/settings/CalendarConnectionSetting';

export default function ProfilePage() {
  return (
    <VStack spacing={{ base: '8', md: '10' }} align="stretch">
      <UserProfile />
      <Container maxW="md">
        <Suspense fallback={<Spinner />}>
          <CalendarConnectionSetting />
        </Suspense>
      </Container>
    </VStack>
  );
}
