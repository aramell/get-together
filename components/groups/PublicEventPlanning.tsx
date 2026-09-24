'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, VStack, HStack, Spinner, Text } from '@chakra-ui/react';
import { EventChecklist } from './EventChecklist';
import { EventPhotoGrid } from './EventPhotoGrid';
import { EventTimeline } from './EventTimeline';
import { EventLogistics } from './EventLogistics';
import { EventPolls } from './EventPolls';
import {
  WidgetKey,
  WidgetLayoutItem,
  defaultWidgetLayout,
  isValidWidgetLayoutResponse,
} from '@/lib/utils/dashboardWidgets';

interface PublicEventPlanningProps {
  publicToken: string;
  eventId: string;
  // Opens the public page's login-in-place modal -- passed down to every
  // widget's disabled-control handlers (Story 13.5).
  requestLogin: () => void;
}

interface GuestWidgetProps {
  eventId: string;
  publicToken: string;
  requestLogin: () => void;
}

// Maps each fixed widget_key to the component that renders it, mirroring
// EventPlanningTab.tsx's WIDGET_COMPONENTS -- the same 5 real widget
// components render for guests too (each has its own guest-mode branch),
// so guest and member rendering stay identical by construction.
const WIDGET_COMPONENTS: Record<WidgetKey, React.ComponentType<GuestWidgetProps>> = {
  photos: EventPhotoGrid,
  checklist: EventChecklist,
  timeline: EventTimeline,
  logistics: EventLogistics,
  polls: EventPolls,
};

/**
 * Read-only, layout-driven view of an event's dashboard widgets for a
 * logged-out visitor on the public link (Story 13.5). Renders the same 5
 * widgets, in the same order/visibility, that the group's configured
 * Dashboard layout produces for authenticated members -- gated by
 * public_token instead of accessToken. A guest's first attempted
 * interactive action opens the login modal via requestLogin; on success the
 * relevant widget upgrades to interactive in place (see each widget's
 * resolvedGroupId logic).
 */
export const PublicEventPlanning: React.FC<PublicEventPlanningProps> = ({
  publicToken,
  eventId,
  requestLogin,
}) => {
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(defaultWidgetLayout());
  const [loading, setLoading] = useState(true);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  const fetchLayout = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const response = await fetch(`/api/events/public/${publicToken}/dashboard-widgets`);
      if (!response.ok) return;
      const data = await response.json();
      // Same defensive shape check EventPlanningTab.tsx uses -- a
      // malformed/truncated response can't blank out or corrupt the page.
      if (data.success && isValidWidgetLayoutResponse(data.data)) {
        setLayout(data.data);
      }
    } catch (err) {
      console.error('Error fetching public dashboard widget layout:', err);
      // Fall back to the default order already in state; no toast for a
      // background polling failure (matches every other widget).
    } finally {
      isFetchingRef.current = false;
    }
  }, [publicToken]);

  useEffect(() => {
    setLoading(true);
    fetchLayout().finally(() => setLoading(false));

    // Other members' hide/reorder changes (Story 13.4) reach this guest via
    // the same ~5s poll every widget uses (Story 13.2).
    pollingIntervalRef.current = setInterval(() => {
      fetchLayout();
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicToken]);

  if (loading) {
    return (
      <HStack justify="center" py={4}>
        <Spinner size="sm" />
        <Text fontSize="sm" color="gray.500">
          Loading trip details...
        </Text>
      </HStack>
    );
  }

  const orderedVisibleWidgets = [...layout]
    .filter((w) => w.visible)
    .sort((a, b) => a.position - b.position);

  if (orderedVisibleWidgets.length === 0) return null;

  return (
    <VStack spacing={8} align="stretch" bg="white" borderRadius="lg" boxShadow="sm" p={{ base: 4, md: 6 }}>
      {orderedVisibleWidgets.map((widget) => {
        const WidgetComponent = WIDGET_COMPONENTS[widget.widget_key];
        return (
          <Box key={widget.widget_key}>
            <WidgetComponent eventId={eventId} publicToken={publicToken} requestLogin={requestLogin} />
          </Box>
        );
      })}
    </VStack>
  );
};

export default PublicEventPlanning;
