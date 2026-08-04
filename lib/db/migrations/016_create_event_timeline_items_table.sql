-- Story 12.4: Event Timeline/Agenda
-- Run-of-show agenda items for an event's Planning tab.
-- No FK from created_by to users(id): same reasoning as event_checklist_items.created_by
-- and event_photos.uploaded_by (see Stories 12.2/12.3) — nothing in this app currently
-- guarantees a users row exists for every authenticated user.

CREATE TABLE IF NOT EXISTS event_timeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by VARCHAR(128) NOT NULL,
  item_time TIMESTAMPTZ NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_timeline_items_event_id ON event_timeline_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_timeline_items_event_id_item_time ON event_timeline_items(event_id, item_time);

ALTER TABLE event_timeline_items ENABLE ROW LEVEL SECURITY;
