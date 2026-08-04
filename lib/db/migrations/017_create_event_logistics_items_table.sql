-- Story 12.5: Logistics Coordination
-- "Bring" items (a single person brings something) and "carpool" items
-- (a driver offers N seats, other members claim them) for an event's Planning tab.
-- No FK from created_by/assigned_to to users(id): same reasoning as
-- event_checklist_items.created_by and event_photos.uploaded_by (see Stories 12.2/12.3).

CREATE TABLE IF NOT EXISTS event_logistics_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by VARCHAR(128) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('bring', 'carpool')),
  title VARCHAR(255) NOT NULL,
  assigned_to VARCHAR(128),
  capacity INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carpool_requires_capacity CHECK (category != 'carpool' OR capacity IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_event_logistics_items_event_id ON event_logistics_items(event_id);

ALTER TABLE event_logistics_items ENABLE ROW LEVEL SECURITY;
