-- Migration: Create group_invitations table for Story 2-5
-- Purpose: Track invitations sent by admins to users to join groups
-- Date: 2026-03-02

CREATE TABLE IF NOT EXISTS group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  UNIQUE(group_id, invited_user_id, status)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_group_invitations_user_status
  ON group_invitations(invited_user_id, status);

CREATE INDEX IF NOT EXISTS idx_group_invitations_group_status
  ON group_invitations(group_id, status);

CREATE INDEX IF NOT EXISTS idx_group_invitations_expires_at
  ON group_invitations(expires_at);

-- Add comment for context
COMMENT ON TABLE group_invitations IS
'Tracks user invitations to join groups. Admins can invite existing users.
Invitations expire after 30 days if not responded to.
Only one pending invitation allowed per (group, user) pair.';

COMMENT ON COLUMN group_invitations.status IS
'Status of invitation: pending (not yet responded), accepted (user joined), declined (user rejected)';

COMMENT ON COLUMN group_invitations.expires_at IS
'Invitation expires at this time. Expired invitations cannot be accepted.';
