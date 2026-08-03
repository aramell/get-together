-- Story 12.3: Event Checklists
-- Shared/assignable to-do items for an event's Planning tab.
-- No FK from created_by/assigned_to/checked_by to users(id): nothing in this
-- app currently guarantees a users row exists for every authenticated user
-- (createUserProfile in lib/services/userService.ts has zero callers), so a
-- hard FK here could break inserts for legitimate users. Same reasoning as
-- event_photos.uploaded_by (see Story 12.2).

CREATE TABLE IF NOT EXISTS event_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by VARCHAR(128) NOT NULL,
  assigned_to VARCHAR(128),
  title VARCHAR(255) NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by VARCHAR(128),
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_checklist_items_event_id ON event_checklist_items(event_id);

ALTER TABLE event_checklist_items ENABLE ROW LEVEL SECURITY;
