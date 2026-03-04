-- Migration: Add recurring availability support
-- Story 3.2: Mark Availability as Busy (with recurring support)
-- Date: 2026-03-04

-- Add columns to support recurring availability patterns
ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS recurring_pattern VARCHAR(20) DEFAULT NULL;
ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS recurring_end_date TIMESTAMPTZ DEFAULT NULL;

-- Add constraint: recurring_pattern must be valid
ALTER TABLE availabilities ADD CONSTRAINT valid_recurring_pattern
  CHECK (recurring_pattern IS NULL OR recurring_pattern IN ('daily', 'weekly'));

-- Add constraint: if recurring_pattern is set, recurring_end_date must also be set and be in future
ALTER TABLE availabilities ADD CONSTRAINT valid_recurring_dates
  CHECK (
    (recurring_pattern IS NULL AND recurring_end_date IS NULL) OR
    (recurring_pattern IS NOT NULL AND recurring_end_date IS NOT NULL AND recurring_end_date > start_time)
  );

-- Add comment explaining the columns
COMMENT ON COLUMN availabilities.recurring_pattern IS 'Recurring pattern: daily, weekly, or NULL for one-time entries';
COMMENT ON COLUMN availabilities.recurring_end_date IS 'Last date for recurring availability - NULL for one-time entries';
