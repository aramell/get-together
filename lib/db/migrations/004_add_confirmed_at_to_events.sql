-- Migration: Add confirmed_at timestamp to event_proposals
-- Created: 2026-03-16
-- Purpose: Track when events transition from proposed to confirmed status

BEGIN;

-- Add confirmed_at column to event_proposals table
ALTER TABLE event_proposals
ADD COLUMN confirmed_at TIMESTAMPTZ;

-- Add comment explaining the column
COMMENT ON COLUMN event_proposals.confirmed_at IS 'Timestamp when event was confirmed (status changed to confirmed)';

-- Update confirmed_at for any existing confirmed events (for data integrity)
UPDATE event_proposals
SET confirmed_at = updated_at
WHERE status = 'confirmed' AND confirmed_at IS NULL;

-- Create index for filtering confirmed events by date
CREATE INDEX IF NOT EXISTS idx_event_proposals_confirmed_at ON event_proposals(confirmed_at);
CREATE INDEX IF NOT EXISTS idx_event_proposals_group_confirmed ON event_proposals(group_id, confirmed_at);

COMMIT;
