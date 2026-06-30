'use client';

import { Badge, Tooltip, HStack, Text } from '@chakra-ui/react';

interface ConfirmationBadgeProps {
  status: 'proposal' | 'confirmed';
  confirmedAt?: string | null;
}

/**
 * Badge component to display event status (Proposed or Confirmed)
 * Shows color-coded badge with optional confirmation timestamp
 */
export function ConfirmationBadge({ status, confirmedAt }: ConfirmationBadgeProps) {
  const isConfirmed = status === 'confirmed';

  // Format confirmation timestamp for tooltip
  const formatConfirmedAt = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        dayPeriod: 'short',
      });
    } catch {
      return 'Recently confirmed';
    }
  };

  return (
    <Tooltip
      label={
        isConfirmed && confirmedAt
          ? `Confirmed on ${formatConfirmedAt(confirmedAt)}`
          : 'Event is proposed and awaiting confirmations'
      }
      placement="top"
      hasArrow
    >
      <Badge
        colorScheme={isConfirmed ? 'green' : 'yellow'}
        variant="solid"
        fontSize="xs"
        px={2}
        py={1}
        borderRadius="full"
        display="flex"
        alignItems="center"
        gap={1}
      >
        {isConfirmed ? '✅ Confirmed' : '📋 Proposed'}
      </Badge>
    </Tooltip>
  );
}
