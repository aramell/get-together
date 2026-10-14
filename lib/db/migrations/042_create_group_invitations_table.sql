-- Corrects an omission: lib/db/queries/invitations.ts (Story 2.5) has always
-- read and wrote group_invitations, but no migration ever created it.
-- Schema follows story-2-5-invite-users-spec.md, with two deliberate changes:
--  * user columns are VARCHAR(128), not UUID (users.id is the Cognito sub string)
--  * no FK to users(id), same reasoning as 014/015: users rows were not
--    guaranteed for every authenticated user until login started upserting them
-- UNIQUE(group_id, invited_user_id, status) allows one row per status, so a
-- user can be re-invited after declining but has at most one pending invite.
-- RLS is enabled with zero policies (app connects as table owner).

CREATE TABLE IF NOT EXISTS group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_user_id VARCHAR(128) NOT NULL,
  invited_by_user_id VARCHAR(128) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  UNIQUE (group_id, invited_user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_invitations_user_status
  ON group_invitations(invited_user_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_group_status
  ON group_invitations(group_id, status);

ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
