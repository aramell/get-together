-- Story 3.6: Sync Google Free/Busy into Soft Calendar
--
-- Cached Google-sourced free/busy data, kept in a table separate from the existing
-- manual `availabilities` table (Architecture Decision 6c). The two sources are never
-- combined into one row -- the soft calendar read path merges them at read time
-- (see lib/availability/mergeAvailability.ts). Replaced wholesale per sync (delete +
-- reinsert for that user's synced window), not diffed (AC5).
--
-- Only start_time/end_time/user_id are ever stored -- never event title, location, or
-- description -- enforcing NFR12 at the schema level (AC6): there are simply no columns
-- for that data.
-- No FK from user_id to users(id): same reasoning as calendar_connections.user_id
-- (Story 3.5) -- user_id here is a Cognito sub, not a users.id FK target.

CREATE TABLE IF NOT EXISTS google_calendar_busy_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(128) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_busy_blocks_user_start ON google_calendar_busy_blocks(user_id, start_time);

ALTER TABLE google_calendar_busy_blocks ENABLE ROW LEVEL SECURITY;
