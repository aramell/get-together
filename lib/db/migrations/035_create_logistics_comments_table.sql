-- Story 13.8: Comments on Logistics Items
-- Dedicated per-item-type comments table (not polymorphic), mirroring
-- checklist_comments (034): created_by is VARCHAR(128) (users.id is the
-- Cognito sub string), edited_at / updated_count included up front, and RLS
-- enabled with zero policies (app connects as table owner).

CREATE TABLE IF NOT EXISTS logistics_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logistics_item_id UUID NOT NULL REFERENCES event_logistics_items(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ DEFAULT NULL,
  updated_count INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT logistics_comments_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT logistics_comments_content_length_limit CHECK (length(content) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_logistics_comments_item_id ON logistics_comments(logistics_item_id);
CREATE INDEX IF NOT EXISTS idx_logistics_comments_group_id ON logistics_comments(group_id);
CREATE INDEX IF NOT EXISTS idx_logistics_comments_created_by ON logistics_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_logistics_comments_item_not_deleted
  ON logistics_comments(logistics_item_id, created_at) WHERE deleted_at IS NULL;

ALTER TABLE logistics_comments ENABLE ROW LEVEL SECURITY;
