'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, VStack, HStack, IconButton, Spinner, Text } from '@chakra-ui/react';
import { EditIcon, CheckIcon } from '@chakra-ui/icons';
import { EventChecklist } from './EventChecklist';
import { EventPhotoGrid } from './EventPhotoGrid';
import { EventTimeline } from './EventTimeline';
import { EventLogistics } from './EventLogistics';
import { EventPolls } from './EventPolls';
import { DashboardWidgetCustomizer } from './DashboardWidgetCustomizer';
import { useAuth } from '@/lib/contexts/AuthContext';
import { WidgetKey, WidgetLayoutItem, defaultWidgetLayout, isValidWidgetLayoutResponse } from '@/lib/utils/dashboardWidgets';

interface EventPlanningTabProps {
  eventId: string;
  groupId: string;
}

// Maps each fixed widget_key to the component that renders it. Order here
// is irrelevant -- render order comes from the group's configured layout,
// not this object's key order.
const WIDGET_COMPONENTS: Record<WidgetKey, React.ComponentType<{ eventId: string; groupId: string }>> = {
  photos: EventPhotoGrid,
  checklist: EventChecklist,
  timeline: EventTimeline,
  logistics: EventLogistics,
  polls: EventPolls,
};

export function EventPlanningTab({ eventId, groupId }: EventPlanningTabProps) {
  const { accessToken } = useAuth();
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(defaultWidgetLayout());
  const [loading, setLoading] = useState(true);
  const [customizing, setCustomizing] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);
  // Set while DashboardWidgetCustomizer has a PATCH in flight, so a poll
  // response landing mid-save can't overwrite the optimistic change (or, if
  // the save is about to fail and revert, get immediately clobbered again
  // by a stale poll result before the revert lands).
  const isSavingRef = useRef(false);

  const fetchLayout = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const response = await fetch(`/api/groups/${groupId}/dashboard-widgets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      // The real endpoint always returns exactly the 5 fixed widgets
      // (defaulting server-side for a group with no rows yet). Validate the
      // shape defensively so a malformed/truncated response can't blank out
      // or corrupt the dashboard, and skip applying it entirely while a
      // customize-mode save is still pending.
      if (data.success && isValidWidgetLayoutResponse(data.data) && !isSavingRef.current) {
        setLayout(data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard widget layout:', err);
      // Fall back to the default order already in state; don't show a toast
      // for a background polling failure (matches EventChecklist/EventLogistics).
    } finally {
      isFetchingRef.current = false;
    }
  }, [groupId, accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    setLoading(true);
    fetchLayout().finally(() => setLoading(false));

    // Other members' hide/reorder changes only reach this viewer via the
    // same ~5s poll every other widget uses (Story 13.2) -- the acting
    // member's own change is already reflected optimistically by
    // DashboardWidgetCustomizer, but this is what propagates it to everyone
    // else, per the spec's "Always" boundary and the I/O matrix's "other
    // viewers see it within ~5s" rows.
    pollingIntervalRef.current = setInterval(() => {
      fetchLayout();
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, groupId, accessToken]);

  if (loading) {
    return (
      <HStack justify="center" py={6}>
        <Spinner size="sm" />
        <Text fontSize="sm" color="ink.500">
          Loading dashboard...
        </Text>
      </HStack>
    );
  }

  const orderedVisibleWidgets = [...layout]
    .filter((w) => w.visible)
    .sort((a, b) => a.position - b.position);

  return (
    <Box p={6}>
      <HStack justify="flex-end" mb={customizing ? 0 : 4}>
        <IconButton
          aria-label={customizing ? 'Done customizing dashboard layout' : 'Customize dashboard layout'}
          icon={customizing ? <CheckIcon /> : <EditIcon />}
          size="sm"
          variant="ghost"
          onClick={() => setCustomizing((prev) => !prev)}
        />
      </HStack>

      {customizing && (
        <DashboardWidgetCustomizer
          groupId={groupId}
          layout={layout}
          onLayoutChange={setLayout}
          onSavingChange={(isSaving) => {
            isSavingRef.current = isSaving;
          }}
        />
      )}

      {orderedVisibleWidgets.length === 0 ? (
        <Text color="ink.500" fontSize="sm">
          All widgets are hidden — use Customize to show one.
        </Text>
      ) : (
        <VStack spacing={8} align="stretch">
          {orderedVisibleWidgets.map((widget) => {
            const WidgetComponent = WIDGET_COMPONENTS[widget.widget_key];
            return <WidgetComponent key={widget.widget_key} eventId={eventId} groupId={groupId} />;
          })}
        </VStack>
      )}
    </Box>
  );
}

export default EventPlanningTab;
