'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, VStack, HStack, Heading, Text, IconButton, Badge, Radio, RadioGroup, Stack, useToast } from '@chakra-ui/react';
import { ArrowUpIcon, ArrowDownIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import { WidgetKey, WidgetLayoutItem, isValidWidgetLayoutResponse } from '@/lib/utils/dashboardWidgets';
import { getWidgetLabel } from '@/lib/events/eventTypes';

type CustomizeScope = 'event' | 'group';

interface DashboardWidgetCustomizerProps {
  groupId: string;
  eventId: string;
  // Event type whose labels name the widgets (Story 14.8); null = registry labels.
  eventType?: string | null;
  // True when the event already has its own layout (Story 14.5).
  customized: boolean;
  // `layout` is the event's effective layout (event override, else group).
  layout: WidgetLayoutItem[];
  onLayoutChange: (layout: WidgetLayoutItem[]) => void;
  // Lets the parent (EventPlanningTab) know a save is in flight, so its 5s
  // poll can skip applying a stale response over this optimistic change.
  onSavingChange?: (isSaving: boolean) => void;
  // Called after the first "This event only" save, so the parent can show
  // the customized indicator without waiting for the next poll.
  onCustomizedChange?: (customized: boolean) => void;
}

/**
 * Customize-mode controls for the Dashboard's per-group widget layout
 * (Story 13.4). Lists all 5 widgets, visible or hidden, so a hidden one can
 * still be found and re-shown -- unlike the Dashboard itself, which never
 * renders a hidden widget's card for anyone. Move-up/move-down + show/hide
 * are optimistic for the acting member, reverting the whole layout array on
 * request failure (not a per-item revert -- there's one PATCH per change,
 * carrying the full 5-widget layout). No drag-and-drop -- every control is
 * a plain, keyboard-operable IconButton.
 */
export function DashboardWidgetCustomizer({
  groupId,
  eventId,
  eventType = null,
  customized,
  layout: eventLayout,
  onLayoutChange,
  onSavingChange,
  onCustomizedChange,
}: DashboardWidgetCustomizerProps) {
  const { accessToken } = useAuth();
  const toast = useToast();

  // Defaults to "This event only" when the event is already customized.
  const [scope, setScope] = useState<CustomizeScope>(customized ? 'event' : 'group');
  // Group layout shown/edited in "All events" scope while the event has its
  // own override (the event's own layout is displayed elsewhere and must not
  // change). When the event is not customized, the event layout IS the group
  // layout, so edits flow through the parent's state instead.
  const [groupLayout, setGroupLayout] = useState<WidgetLayoutItem[] | null>(null);
  const editingGroupSeparately = scope === 'group' && customized;
  const layout = editingGroupSeparately ? groupLayout ?? [] : eventLayout;
  const setLayout = editingGroupSeparately ? (next: WidgetLayoutItem[]) => setGroupLayout(next) : onLayoutChange;

  useEffect(() => {
    if (!editingGroupSeparately) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}/dashboard-widgets`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) throw new Error('Failed to load group layout');
        const data = await response.json();
        if (!cancelled && data.success && isValidWidgetLayoutResponse(data.data)) {
          setGroupLayout(data.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          toast({ title: 'Error', description: err.message || 'Failed to load group layout', status: 'error', duration: 3000, isClosable: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingGroupSeparately, groupId, accessToken]);

  const sorted = [...layout].sort((a, b) => a.position - b.position);

  // Counts saves currently in flight so overlapping moves/toggles don't
  // clear the "saving" flag while a different save is still pending.
  const pendingSaveCountRef = useRef(0);
  // Always-enabled control per row (the visibility toggle) to refocus after
  // a move that may disable the button the user just activated.
  const visibilityButtonRefs = useRef<Partial<Record<WidgetKey, HTMLButtonElement | null>>>({});

  const saveLayout = useCallback(
    async (nextLayout: WidgetLayoutItem[], previousLayout: WidgetLayoutItem[]) => {
      pendingSaveCountRef.current += 1;
      onSavingChange?.(true);

      try {
        const url =
          scope === 'event'
            ? `/api/groups/${groupId}/events/${eventId}/dashboard-widgets`
            : `/api/groups/${groupId}/dashboard-widgets`;
        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ widgets: nextLayout }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update dashboard layout');
        }
        if (scope === 'event' && !customized) {
          onCustomizedChange?.(true);
        }
      } catch (err: any) {
        setLayout(previousLayout);
        toast({
          title: 'Error',
          description: err.message || 'Failed to update dashboard layout',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        pendingSaveCountRef.current -= 1;
        if (pendingSaveCountRef.current === 0) {
          onSavingChange?.(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupId, eventId, scope, customized, accessToken, editingGroupSeparately, onLayoutChange, toast, onSavingChange, onCustomizedChange]
  );

  const handleMove = (widgetKey: WidgetKey, direction: 'up' | 'down') => {
    const index = sorted.findIndex((w) => w.widget_key === widgetKey);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= sorted.length) return;

    const previousLayout = layout;
    const nextSorted = [...sorted];
    const currentPosition = nextSorted[index].position;
    const targetPosition = nextSorted[targetIndex].position;
    nextSorted[index] = { ...nextSorted[index], position: targetPosition };
    nextSorted[targetIndex] = { ...nextSorted[targetIndex], position: currentPosition };

    setLayout(nextSorted);
    saveLayout(nextSorted, previousLayout);

    // Moving a widget to the top/bottom disables the up/down button the
    // user just activated, stranding focus on a now-disabled control.
    // Refocus this row's visibility toggle -- it's always enabled.
    visibilityButtonRefs.current[widgetKey]?.focus();
  };

  const handleToggleVisible = (widgetKey: WidgetKey) => {
    const previousLayout = layout;
    const nextLayout = layout.map((w) => (w.widget_key === widgetKey ? { ...w, visible: !w.visible } : w));

    setLayout(nextLayout);
    saveLayout(nextLayout, previousLayout);
  };

  return (
    <Box borderWidth="1px" borderColor="cork.200" borderRadius="md" p={4} mb={6} bg="cork.50">
      <Heading as="h3" fontWeight="semibold" fontSize="md" mb={3}>
        Customize dashboard layout
      </Heading>
      <RadioGroup aria-label="Layout scope" value={scope} onChange={(value) => {
          setGroupLayout(null);
          setScope(value as CustomizeScope);
        }} mb={3}>
        <Stack direction={{ base: 'column', sm: 'row' }} spacing={4}>
          <Radio value="event">This event only</Radio>
          <Radio value="group">All events in this group</Radio>
        </Stack>
      </RadioGroup>
      <VStack spacing={2} align="stretch">
        {sorted.map((widget, index) => {
          // Group scope edits every event in the group, so use the neutral
          // registry labels rather than this one event's type labels.
          const label = getWidgetLabel(scope === 'group' ? null : eventType, widget.widget_key);
          return (
            <HStack key={widget.widget_key} justify="space-between" py={1}>
              <HStack spacing={3}>
                <Text fontWeight="medium" color={widget.visible ? 'ink.800' : 'ink.400'}>
                  {label}
                </Text>
                {!widget.visible && (
                  <Badge colorScheme="cork" fontSize="xs">
                    Hidden
                  </Badge>
                )}
              </HStack>
              <HStack spacing={1}>
                <IconButton
                  aria-label={`Move ${label} up`}
                  icon={<ArrowUpIcon />}
                  size="sm"
                  variant="ghost"
                  isDisabled={index === 0}
                  onClick={() => handleMove(widget.widget_key, 'up')}
                />
                <IconButton
                  aria-label={`Move ${label} down`}
                  icon={<ArrowDownIcon />}
                  size="sm"
                  variant="ghost"
                  isDisabled={index === sorted.length - 1}
                  onClick={() => handleMove(widget.widget_key, 'down')}
                />
                <IconButton
                  ref={(el) => {
                    visibilityButtonRefs.current[widget.widget_key] = el;
                  }}
                  aria-label={widget.visible ? `Hide ${label}` : `Show ${label}`}
                  icon={widget.visible ? <ViewIcon /> : <ViewOffIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleVisible(widget.widget_key)}
                />
              </HStack>
            </HStack>
          );
        })}
      </VStack>
    </Box>
  );
}

export default DashboardWidgetCustomizer;
