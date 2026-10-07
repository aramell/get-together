'use client';

import React, { useState } from 'react';
import { Box, FormControl, FormLabel, Select, Text, useToast } from '@chakra-ui/react';
import { updateGroupSettings } from '@/lib/services/groupService';
import { EVENT_TYPES, isEventTypeKey } from '@/lib/events/eventTypes';

interface DefaultEventTypeSettingProps {
  groupId: string;
  defaultEventType: string | null | undefined;
  onChanged?: (defaultEventType: string | null) => void;
}

/**
 * Default event type select (Story 14.7). Rendered inside the admin-only
 * settings; the PATCH is also admin-only server-side. "No default" clears it.
 */
export const DefaultEventTypeSetting: React.FC<DefaultEventTypeSettingProps> = ({
  groupId,
  defaultEventType,
  onChanged,
}) => {
  const toast = useToast();
  const [current, setCurrent] = useState<string>(
    isEventTypeKey(defaultEventType) ? defaultEventType : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === current) return;

    const previous = current;
    setCurrent(next);
    setIsSaving(true);
    try {
      const result = await updateGroupSettings(groupId, { default_event_type: next || null });
      if (!result.success) {
        throw new Error(result.error || 'Failed to update default event type');
      }
      toast({
        title: 'Default event type updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      onChanged?.(next || null);
    } catch {
      setCurrent(previous);
      toast({
        title: 'Error',
        description: 'Failed to update default event type',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <FormControl>
        <FormLabel htmlFor="default-event-type">Default event type</FormLabel>
        <Select
          id="default-event-type"
          value={current}
          onChange={handleChange}
          isDisabled={isSaving}
          bg="white"
        >
          <option value="">No default (Trip)</option>
          {EVENT_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </Select>
        <Text fontSize="xs" color="gray.500" mt={1}>
          Preselected when someone proposes an event, and used when a wishlist item becomes an event.
        </Text>
      </FormControl>
    </Box>
  );
};

export default DefaultEventTypeSetting;
