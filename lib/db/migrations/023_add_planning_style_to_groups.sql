-- Migration: Add planning_style setting to groups
--
-- Story 2.8: Per-Group Planning Style Setting (FR71). Admins choose whether
-- the group's default landing view is Availability-first or Proposals-first.
-- NOT NULL DEFAULT backfills existing rows to 'availability-first' as part
-- of the ALTER TABLE itself, satisfying AC5 without a separate UPDATE step.

ALTER TABLE groups
  ADD COLUMN planning_style VARCHAR(20) NOT NULL DEFAULT 'availability-first'
  CHECK (planning_style IN ('availability-first', 'proposals-first'));
