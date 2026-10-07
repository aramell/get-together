'use client';

import React, { createContext, useContext } from 'react';
import { getWidgetLabel } from '@/lib/events/eventTypes';
import { WidgetKey } from '@/lib/dashboard/widgetRegistry';

// Event type whose labels the dashboard widgets use for their headings
// (Story 14.8). Null (no provider, no type, Trip) resolves to registry labels.
const EventLabelsContext = createContext<string | null>(null);

interface EventLabelsProviderProps {
  eventType: string | null | undefined;
  children: React.ReactNode;
}

export function EventLabelsProvider({ eventType, children }: EventLabelsProviderProps) {
  return (
    <EventLabelsContext.Provider value={eventType ?? null}>{children}</EventLabelsContext.Provider>
  );
}

export function useWidgetLabel(widgetKey: WidgetKey): string {
  return getWidgetLabel(useContext(EventLabelsContext), widgetKey);
}
