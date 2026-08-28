'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { DeleteConfirmationDialog } from '@/components/groups/DeleteConfirmationDialog';

interface ConnectionStatus {
  connected: boolean;
  connectedEmail?: string;
  needsReauth?: boolean;
}

/**
 * CalendarConnectionSetting (Story 3.5 / FR21, Disconnect: Story 3.8)
 * Lets a user connect, view, or disconnect their Google Calendar connection.
 */
export const CalendarConnectionSetting: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [callbackMessage, setCallbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch('/api/calendar/google/status');
        const result = await response.json();
        if (result.success) {
          setStatus(result.data);
        }
      } catch (error) {
        console.error('Error loading Google Calendar connection status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, []);

  useEffect(() => {
    const calendarStatus = searchParams.get('calendar_status');
    if (!calendarStatus) return;

    if (calendarStatus === 'connected') {
      setCallbackMessage({ type: 'success', text: 'Google Calendar connected' });
    } else if (calendarStatus === 'denied') {
      setCallbackMessage({ type: 'error', text: 'Calendar connection was not completed' });
    } else if (calendarStatus === 'error') {
      const message = searchParams.get('calendar_message');
      setCallbackMessage({ type: 'error', text: message || 'Failed to connect Google Calendar' });
    }

    // Strip the calendar_status/calendar_message query params so the message doesn't
    // reappear on refresh or re-render.
    router.replace(pathname);
    // Runs once on mount only: this reads the OAuth-callback redirect's query params
    // one time. Depending on `router`/`searchParams` here would re-fire this effect
    // whenever those (test-mocked or otherwise non-referentially-stable) values change,
    // which -- since it calls setState -- can trigger a render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/calendar/google/connect';
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/calendar/google/disconnect', { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setStatus({ connected: false });
        setCallbackMessage(null);
      } else {
        setCallbackMessage({ type: 'error', text: result.message || 'Failed to disconnect Google Calendar' });
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      setCallbackMessage({ type: 'error', text: 'Failed to disconnect Google Calendar' });
    } finally {
      setIsDisconnecting(false);
      setIsDisconnectDialogOpen(false);
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={{ base: '6', md: '8' }} bg="white">
      <VStack align="stretch" spacing={4}>
        <Box>
          <Heading size="md" mb={2}>
            Google Calendar
          </Heading>
          <Text color="gray.600" fontSize="sm">
            Connect your Google Calendar so your real availability syncs into your groups automatically.
          </Text>
        </Box>

        {callbackMessage && (
          <Alert status={callbackMessage.type === 'success' ? 'success' : 'error'} borderRadius="md">
            <AlertIcon />
            <Text>{callbackMessage.text}</Text>
          </Alert>
        )}

        {loading ? (
          <HStack>
            <Spinner size="sm" />
            <Text fontSize="sm" color="gray.500">
              Checking connection status...
            </Text>
          </HStack>
        ) : status?.connected ? (
          <HStack justify="space-between" data-testid="calendar-connected-state">
            <HStack>
              <Badge colorScheme="green">Google Calendar Connected</Badge>
              <Text fontSize="sm" color="gray.600">
                {status.connectedEmail}
              </Text>
            </HStack>
            <Button
              size="sm"
              variant="outline"
              colorScheme="red"
              onClick={() => setIsDisconnectDialogOpen(true)}
              aria-label="Disconnect from Google Calendar"
            >
              Disconnect
            </Button>
          </HStack>
        ) : (
          <Button colorScheme="blue" alignSelf="flex-start" onClick={handleConnect} aria-label="Connect Google Calendar">
            Connect Google Calendar
          </Button>
        )}
      </VStack>

      <DeleteConfirmationDialog
        isOpen={isDisconnectDialogOpen}
        onClose={() => setIsDisconnectDialogOpen(false)}
        onConfirm={handleDisconnect}
        isLoading={isDisconnecting}
        title="Disconnect Google Calendar"
        message="This will delete your synced availability data. Groupmates will no longer see it in the merged calendar until you reconnect."
        confirmLabel="Disconnect"
        confirmLoadingLabel="Disconnecting..."
      />
    </Box>
  );
};

export default CalendarConnectionSetting;
