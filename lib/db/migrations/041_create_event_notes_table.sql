-- Story 14.9: Notes and Links widget
-- Free-form shared notes/links for an event's dashboard. Proves a new widget
-- type needs no layout-table change: no CHECK on widget keys anywhere.
-- No FK from created_by to users(id), same reasoning as event_checklist_items (014).

CREATE TABLE IF NOT EXISTS event_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  url TEXT,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_notes_event_id ON event_notes(event_id);

ALTER TABLE event_notes ENABLE ROW LEVEL SECURITY;
