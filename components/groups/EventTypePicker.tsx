'use client';

import React from 'react';
import { Box, FormControl, FormLabel, RadioGroup, Radio, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { EVENT_TYPES, EventTypeDefinition, getWidgetLabel } from '@/lib/events/eventTypes';

interface EventTypePickerProps {
  value: string;
  onChange: (key: string) => void;
  isDisabled?: boolean;
}

function widgetNames(type: EventTypeDefinition): string {
  return type.widgets
    .filter((w) => w.visible)
    .map((w) => getWidgetLabel(type.key, w.widget_key))
    .join(', ');
}

/**
 * Event type picker (Story 14.7): radio cards for each registry type, with a
 * preview of the widgets, logistics categories and starter checklist items
 * the selected type starts the event with.
 */
export const EventTypePicker: React.FC<EventTypePickerProps> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  const selected = EVENT_TYPES.find((t) => t.key === value) ?? EVENT_TYPES[0];

  return (
    <FormControl as="fieldset">
      <FormLabel as="legend">Event type</FormLabel>
      <RadioGroup value={selected.key} onChange={onChange} isDisabled={isDisabled}>
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
          {EVENT_TYPES.map((type) => (
            <Box
              key={type.key}
              borderWidth="1px"
              borderRadius="md"
              p={3}
              borderColor={type.key === selected.key ? 'teal.500' : 'gray.200'}
              bg={type.key === selected.key ? 'teal.50' : 'white'}
            >
              <Radio value={type.key} aria-label={type.label}>
                <Text fontWeight="semibold">{type.label}</Text>
              </Radio>
              <Text fontSize="xs" color="gray.600" ml={6}>
                {type.description}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </RadioGroup>

      <VStack
        align="stretch"
        spacing={1}
        mt={3}
        p={3}
        bg="gray.50"
        borderRadius="md"
        fontSize="xs"
        color="gray.700"
        data-testid="event-type-preview"
      >
        <Text>
          <strong>Widgets:</strong> {widgetNames(selected)}
        </Text>
        <Text>
          <strong>Logistics categories:</strong> {selected.categories.map((c) => c.label).join(', ')}
        </Text>
        <Text>
          <strong>Starter checklist:</strong>{' '}
          {selected.starterItems.length > 0 ? selected.starterItems.join(', ') : 'None'}
        </Text>
      </VStack>
    </FormControl>
  );
};

export default EventTypePicker;
