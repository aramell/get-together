-- Story 3.5: Connect Google Calendar (OAuth)
--
-- Per-user Google Calendar OAuth connection. One row per user (unique user_id),
-- since connections are per-user, not per-group (Architecture Decision 6b).
-- refresh_token_encrypted is encrypted at the application layer (lib/encryption/crypto.ts)
-- before insert -- Postgres at-rest encryption alone isn't sufficient for a credential
-- this sensitive. The access token itself is never persisted (AC2), only refreshed
-- on demand during sync (Story 3.6) using the stored refresh token.
-- No FK from user_id to users(id): same reasoning as event_poll_votes.user_id
-- (Story 12.6) -- user_id here is a Cognito sub, not a users.id FK target.

CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(128) NOT NULL UNIQUE,
  provider VARCHAR(20) NOT NULL DEFAULT 'google' CHECK (provider IN ('google')),
  refresh_token_encrypted TEXT NOT NULL,
  connected_email VARCHAR(255) NOT NULL,
  needs_reauth BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
