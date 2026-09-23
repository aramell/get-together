'use client';

import React, { useCallback, useRef } from 'react';
import { Box, VStack, HStack, Heading, Text, IconButton, Badge, useToast } from '@chakra-ui/react';
import { ArrowUpIcon, ArrowDownIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import { WIDGET_LABELS, WidgetKey, WidgetLayoutItem } from '@/lib/utils/dashboardWidgets';

interface DashboardWidgetCustomizerProps {
  groupId: string;
  layout: WidgetLayoutItem[];
  onLayoutChange: (layout: WidgetLayoutItem[]) => void;
  // Lets the parent (EventPlanningTab) know a save is in flight, so its 5s
  // poll can skip applying a stale response over this optimistic change.
  onSavingChange?: (isSaving: boolean) => void;
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
export function DashboardWidgetCustomizer({ groupId, layout, onLayoutChange, onSavingChange }: DashboardWidgetCustomizerProps) {
  const { accessToken } = useAuth();
  const toast = useToast();

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
        const response = await fetch(`/api/groups/${groupId}/dashboard-widgets`, {
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
      } catch (err: any) {
        onLayoutChange(previousLayout);
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
    [groupId, accessToken, onLayoutChange, toast, onSavingChange]
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

    onLayoutChange(nextSorted);
    saveLayout(nextSorted, previousLayout);

    // Moving a widget to the top/bottom disables the up/down button the
    // user just activated, stranding focus on a now-disabled control.
    // Refocus this row's visibility toggle -- it's always enabled.
    visibilityButtonRefs.current[widgetKey]?.focus();
  };

  const handleToggleVisible = (widgetKey: WidgetKey) => {
    const previousLayout = layout;
    const nextLayout = layout.map((w) => (w.widget_key === widgetKey ? { ...w, visible: !w.visible } : w));

    onLayoutChange(nextLayout);
    saveLayout(nextLayout, previousLayout);
  };

  return (
    <Box borderWidth="1px" borderColor="cork.200" borderRadius="md" p={4} mb={6} bg="cork.50">
      <Heading as="h3" fontWeight="semibold" fontSize="md" mb={3}>
        Customize dashboard layout
      </Heading>
      <VStack spacing={2} align="stretch">
        {sorted.map((widget, index) => {
          const label = WIDGET_LABELS[widget.widget_key];
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
