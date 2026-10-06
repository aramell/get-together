import type React from 'react';
import { EventChecklist } from './EventChecklist';
import { EventPhotoGrid } from './EventPhotoGrid';
import { EventTimeline } from './EventTimeline';
import { EventLogistics } from './EventLogistics';
import { EventPolls } from './EventPolls';
import type { WidgetKey } from '@/lib/dashboard/widgetRegistry';

// Props every dashboard widget accepts. Member renders pass groupId; guest
// (no-login) renders pass publicToken + requestLogin instead (Story 13.5).
export interface WidgetRendererProps {
  eventId: string;
  groupId?: string;
  publicToken?: string;
  requestLogin?: () => void;
}

// Maps each registry widget key to the component that renders it, shared by
// the member Dashboard and the public view so both render identically by
// construction. Render order comes from the layout, not this object's key
// order. A new widget type needs an entry here and one in widgetRegistry.ts.
export const WIDGET_RENDERERS: Record<WidgetKey, React.ComponentType<WidgetRendererProps>> = {
  photos: EventPhotoGrid,
  checklist: EventChecklist,
  timeline: EventTimeline,
  logistics: EventLogistics,
  polls: EventPolls,
};
