-- Story 14.7: Event Types and Presets
-- Nullable event type on each event and nullable default event type per
-- group. Keys are validated in application code against the registry in
-- lib/events/eventTypes.ts, so there are no CHECK constraints. A null event
-- type behaves exactly as before. No backfill.

ALTER TABLE event_proposals ADD COLUMN IF NOT EXISTS event_type VARCHAR(30);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS default_event_type VARCHAR(30);
