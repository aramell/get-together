-- Story 12.2: Pre-Event Photo Uploads
-- Reference/moodboard images for an event's Planning tab.
-- No FK from uploaded_by to users(id): nothing in this app currently
-- guarantees a users row exists for every authenticated user
-- (createUserProfile in lib/services/userService.ts has zero callers), so a
-- hard FK here could break inserts for legitimate users. Same reasoning as
-- event_checklist_items.created_by/assigned_to (see Story 12.3).

CREATE TABLE IF NOT EXISTS event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  uploaded_by VARCHAR(128) NOT NULL,
  s3_key VARCHAR(512) NOT NULL,
  url TEXT NOT NULL,
  caption VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);

ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
