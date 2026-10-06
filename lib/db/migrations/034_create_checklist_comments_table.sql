-- Story 13.7: Comments on Checklist Items
-- Dedicated per-item-type comments table (not polymorphic), mirroring
-- event_comments / wishlist_comments (008/009) with their later fixes baked
-- in from the start:
--   * created_by is VARCHAR(128) (users.id is the Cognito sub string, not a
--     UUID) -- see migration 022 which had to fix this on the sibling tables.
--   * edited_at / updated_count included up front -- see migration 010.
-- RLS is enabled with zero policies (app connects as table owner), matching
-- migrations 012 and 033.

CREATE TABLE IF NOT EXISTS checklist_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id UUID NOT NULL REFERENCES event_checklist_items(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ DEFAULT NULL,
  updated_count INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT checklist_comments_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT checklist_comments_content_length_limit CHECK (length(content) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_checklist_comments_item_id ON checklist_comments(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_checklist_comments_group_id ON checklist_comments(group_id);
CREATE INDEX IF NOT EXISTS idx_checklist_comments_created_by ON checklist_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_checklist_comments_item_not_deleted
  ON checklist_comments(checklist_item_id, created_at) WHERE deleted_at IS NULL;

ALTER TABLE checklist_comments ENABLE ROW LEVEL SECURITY;
