'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Select,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import type { Contact } from './ContactList';

export interface CircleOption {
  id: string;
  name: string;
  contactCount: number;
}

interface CircleSelectorProps {
  onSelectionChange: (circleId: string | null, excludedContactIds: string[]) => void;
  isDisabled?: boolean;
}

function contactLabel(count: number): string {
  return `${count} contact${count === 1 ? '' : 's'}`;
}

/**
 * Optional circle picker + contact preview for the Create Group form
 * (Story 10.4, AC1, AC2, AC8, AC9). Reports the selected circleId and any
 * deselected contact ids up to the parent, which sends them with the group
 * creation request; this component never modifies the circle itself (AC6).
 */
export const CircleSelector: React.FC<CircleSelectorProps> = ({
  onSelectionChange,
  isDisabled = false,
}) => {
  const [circles, setCircles] = useState<CircleOption[]>([]);
  const [loadingCircles, setLoadingCircles] = useState(true);

  const [selectedCircleId, setSelectedCircleId] = useState<string>('');
  const [selectedCircleName, setSelectedCircleName] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    fetch('/api/circles')
      .then((res) => res.json())
      .then((result) => {
        if (!cancelled && result.success) {
          setCircles(result.data || []);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCircles(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCircleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const circleId = e.target.value;
    setSelectedCircleId(circleId);
    setExcludedIds(new Set());

    if (!circleId) {
      setContacts([]);
      setSelectedCircleName('');
      onSelectionChange(null, []);
      return;
    }

    const circle = circles.find((c) => c.id === circleId);
    setSelectedCircleName(circle?.name || '');
    setLoadingContacts(true);

    fetch(`/api/circles/${circleId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setContacts(result.data.contacts || []);
        }
      })
      .finally(() => setLoadingContacts(false));

    onSelectionChange(circleId, []);
  };

  const handleToggleContact = (contactId: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      onSelectionChange(selectedCircleId, Array.from(next));
      return next;
    });
  };

  const includedCount = contacts.length - excludedIds.size;

  return (
    <FormControl isDisabled={isDisabled}>
      <FormLabel htmlFor="circle-selector">Invite a circle (optional)</FormLabel>

      {!loadingCircles && circles.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          No circles yet — create one in your profile
        </Text>
      ) : (
        <>
          <Select
            id="circle-selector"
            placeholder={loadingCircles ? 'Loading circles...' : 'None'}
            value={selectedCircleId}
            onChange={handleCircleChange}
            isDisabled={isDisabled || loadingCircles}
          >
            {circles.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.name} ({contactLabel(circle.contactCount)})
              </option>
            ))}
          </Select>
          <FormHelperText>
            Bulk-add a social circle&apos;s contacts as invitees to this group.
          </FormHelperText>
        </>
      )}

      {selectedCircleId && (
        <Box mt={3}>
          {loadingContacts ? (
            <HStack>
              <Spinner size="sm" />
              <Text fontSize="sm" color="gray.500">
                Loading contacts...
              </Text>
            </HStack>
          ) : (
            <VStack align="stretch" spacing={2} data-testid="circle-contact-preview">
              <Text fontSize="sm" fontWeight="medium" aria-live="polite">
                Inviting {includedCount} contact{includedCount === 1 ? '' : 's'} from{' '}
                {selectedCircleName}
              </Text>
              {contacts.map((contact) => (
                <HStack key={contact.id} as="label" spacing={2} minHeight="44px">
                  <input
                    type="checkbox"
                    checked={!excludedIds.has(contact.id)}
                    onChange={() => handleToggleContact(contact.id)}
                    aria-label={`Remove ${contact.displayName} from invite list`}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <Text>{contact.displayName}</Text>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>
      )}
    </FormControl>
  );
};

export default CircleSelector;
