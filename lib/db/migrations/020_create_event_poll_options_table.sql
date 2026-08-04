-- Story 12.6: Quick Polls
-- The 2+ choices for an event_polls row.

CREATE TABLE IF NOT EXISTS event_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES event_polls(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  display_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_event_poll_options_poll_id ON event_poll_options(poll_id);

ALTER TABLE event_poll_options ENABLE ROW LEVEL SECURITY;
