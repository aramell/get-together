-- Migration: Create availabilities table for Soft Calendar feature
-- Story 3.1: Mark Availability as Free
-- Date: 2026-03-04

CREATE TABLE IF NOT EXISTS availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('free', 'busy')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: end_time must be after start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),

  -- Prevent duplicate availability entries for same user/group/time
  CONSTRAINT unique_user_availability UNIQUE (user_id, group_id, start_time, end_time)
);

-- Indexes for efficient querying
CREATE INDEX idx_availabilities_group_id_start_time ON availabilities(group_id, start_time ASC);
CREATE INDEX idx_availabilities_user_id_group_id ON availabilities(user_id, group_id);
CREATE INDEX idx_availabilities_group_id_date_range ON availabilities(group_id, start_time, end_time);

-- Comment explaining the table
COMMENT ON TABLE availabilities IS 'User availability time blocks (free/busy) for Soft Calendar feature. Supports optimistic locking via version column.';
COMMENT ON COLUMN availabilities.status IS 'Availability status: free or busy';
COMMENT ON COLUMN availabilities.version IS 'Version for optimistic locking - incremented on each update';
