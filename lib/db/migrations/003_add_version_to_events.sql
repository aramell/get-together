-- Migration: Add version column for optimistic locking in event_proposals
-- Created: 2026-03-16
-- Purpose: Support optimistic locking for concurrent threshold updates

-- Add version column to event_proposals
ALTER TABLE IF EXISTS event_proposals ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- Add threshold_max constraint if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'event_proposals' AND constraint_name = 'threshold_max'
  ) THEN
    ALTER TABLE event_proposals ADD CONSTRAINT threshold_max CHECK (threshold IS NULL OR threshold <= 1000);
  END IF;
END $$;
