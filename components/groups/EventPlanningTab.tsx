'use client';

import { Box, VStack } from '@chakra-ui/react';
import { EventChecklist } from './EventChecklist';
import { EventPhotoGrid } from './EventPhotoGrid';
import { EventTimeline } from './EventTimeline';
import { EventLogistics } from './EventLogistics';
import { EventPolls } from './EventPolls';

interface EventPlanningTabProps {
  eventId: string;
  groupId: string;
}

export function EventPlanningTab({ eventId, groupId }: EventPlanningTabProps) {
  return (
    <Box p={6}>
      <VStack spacing={8} align="stretch">
        <EventPhotoGrid eventId={eventId} groupId={groupId} />
        <EventChecklist eventId={eventId} groupId={groupId} />
        <EventTimeline eventId={eventId} groupId={groupId} />
        <EventLogistics eventId={eventId} groupId={groupId} />
        <EventPolls eventId={eventId} groupId={groupId} />
      </VStack>
    </Box>
  );
}

export default EventPlanningTab;
