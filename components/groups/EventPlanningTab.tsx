'use client';

import { Box, VStack } from '@chakra-ui/react';
import { EventChecklist } from './EventChecklist';

interface EventPlanningTabProps {
  eventId: string;
  groupId: string;
}

export function EventPlanningTab({ eventId, groupId }: EventPlanningTabProps) {
  return (
    <Box p={6}>
      <VStack spacing={8} align="stretch">
        <EventChecklist eventId={eventId} groupId={groupId} />
      </VStack>
    </Box>
  );
}

export default EventPlanningTab;
