'use client';

import { Box, Heading, Text, VStack } from '@chakra-ui/react';

export function EventPlanningTab() {
  return (
    <Box p={6} textAlign="center">
      <VStack spacing={2}>
        <Heading size="md" color="ink.700">
          Planning tools coming soon
        </Heading>
        <Text color="ink.500">
          Photos, checklists, a timeline, and coordination tools will live here.
        </Text>
      </VStack>
    </Box>
  );
}

export default EventPlanningTab;
