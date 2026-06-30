import React from 'react';
import { Container } from '@chakra-ui/react';
import { EventDetail } from '@/components/groups/EventDetail';
import { AuthProvider } from '@/lib/contexts/AuthContext';

export default function EventDetailPage({
  params,
}: {
  params: { groupId: string; eventId: string };
}) {
  return (
    <AuthProvider>
      <Container maxW="container.md" py={8}>
        <EventDetail
          groupId={params.groupId}
          eventId={params.eventId}
        />
      </Container>
    </AuthProvider>
  );
}
