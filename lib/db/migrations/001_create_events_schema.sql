-- Migration: Create event_proposals and rsvps tables for Epic 4
-- Created: 2026-03-16
-- Purpose: Support event proposal creation and RSVP tracking

-- Create event_proposals table
CREATE TABLE IF NOT EXISTS event_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  threshold INT,
  status VARCHAR(50) NOT NULL DEFAULT 'proposal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT threshold_positive CHECK (threshold IS NULL OR threshold > 0),
  CONSTRAINT date_in_future CHECK (date > NOW()),
  CONSTRAINT valid_status CHECK (status IN ('proposal', 'confirmed', 'cancelled'))
);

-- Create indexes for event_proposals
CREATE INDEX IF NOT EXISTS idx_event_proposals_group_id ON event_proposals(group_id);
CREATE INDEX IF NOT EXISTS idx_event_proposals_created_by ON event_proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_event_proposals_group_date ON event_proposals(group_id, date);
CREATE INDEX IF NOT EXISTS idx_event_proposals_status ON event_proposals(group_id, status);

-- Create rsvps table
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(event_id, user_id),
  CONSTRAINT rsvp_status_valid CHECK (status IN ('in', 'maybe', 'out'))
);

-- Create indexes for event_rsvps
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON event_rsvps(event_id, status);
