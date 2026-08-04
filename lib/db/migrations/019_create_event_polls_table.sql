-- Story 12.6: Quick Polls
-- The poll question for an event's Planning tab.
-- No FK from created_by to users(id): same reasoning as event_logistics_items.created_by
-- (see Stories 12.2-12.5) — nothing in this app currently guarantees a users row
-- exists for every authenticated user.

CREATE TABLE IF NOT EXISTS event_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by VARCHAR(128) NOT NULL,
  question VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_polls_event_id ON event_polls(event_id);

ALTER TABLE event_polls ENABLE ROW LEVEL SECURITY;
