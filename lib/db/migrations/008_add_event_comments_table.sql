-- Migration: Add event_comments table for Epic 6 (Comments & Lightweight Discussion)
-- Story: 6-1-comment-on-events
-- Date: 2026-03-18
-- Description: Create table to store comments on event proposals with soft delete support

CREATE TABLE event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  -- Constraints
  CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT content_length_limit CHECK (length(content) <= 2000)
);

-- Indexes for common queries
CREATE INDEX idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX idx_event_comments_group_id ON event_comments(group_id);
CREATE INDEX idx_event_comments_created_by ON event_comments(created_by);
CREATE INDEX idx_event_comments_not_deleted ON event_comments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_event_comments_event_not_deleted ON event_comments(event_id, created_at) WHERE deleted_at IS NULL;
