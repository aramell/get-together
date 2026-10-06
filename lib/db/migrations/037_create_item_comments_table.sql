-- Story 14.2: Generic Item Comments
-- One item_comments table keyed by (item_type, item_id) replaces the
-- per-type checklist_comments (034) and logistics_comments (035) tables.
-- item_type is validated in application code (COMMENT_ITEM_TYPES), not by a
-- CHECK, so new commentable types need no schema change. There is no per-item
-- FK: the service layer deletes an item's comments when the item is deleted.
-- Event/group deletes cascade via event_id / group_id.
-- created_by is VARCHAR(128) (users.id is the Cognito sub string). RLS is
-- enabled with zero policies (app connects as table owner).

CREATE TABLE IF NOT EXISTS item_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type VARCHAR(30) NOT NULL,
  item_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ DEFAULT NULL,
  updated_count INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT item_comments_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT item_comments_content_length_limit CHECK (length(content) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_item_comments_item_not_deleted
  ON item_comments(item_type, item_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_comments_event_id ON item_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_item_comments_group_id ON item_comments(group_id);

ALTER TABLE item_comments ENABLE ROW LEVEL SECURITY;

-- Copy existing rows (same id / timestamps / deleted_at) and drop the old
-- tables. Guarded by to_regclass so databases that never applied 034/035
-- (e.g. production) simply get an empty item_comments table.
DO $$
BEGIN
  IF to_regclass('public.checklist_comments') IS NOT NULL THEN
    INSERT INTO item_comments (
      id, item_type, item_id, event_id, group_id, created_by, content,
      created_at, updated_at, edited_at, updated_count, deleted_at
    )
    SELECT cc.id, 'checklist', cc.checklist_item_id, i.event_id, cc.group_id, cc.created_by, cc.content,
           cc.created_at, cc.updated_at, cc.edited_at, cc.updated_count, cc.deleted_at
    FROM checklist_comments cc
    JOIN event_checklist_items i ON i.id = cc.checklist_item_id
    ON CONFLICT (id) DO NOTHING;

    DROP TABLE checklist_comments;
  END IF;

  IF to_regclass('public.logistics_comments') IS NOT NULL THEN
    INSERT INTO item_comments (
      id, item_type, item_id, event_id, group_id, created_by, content,
      created_at, updated_at, edited_at, updated_count, deleted_at
    )
    SELECT lc.id, 'logistics', lc.logistics_item_id, i.event_id, lc.group_id, lc.created_by, lc.content,
           lc.created_at, lc.updated_at, lc.edited_at, lc.updated_count, lc.deleted_at
    FROM logistics_comments lc
    JOIN event_logistics_items i ON i.id = lc.logistics_item_id
    ON CONFLICT (id) DO NOTHING;

    DROP TABLE logistics_comments;
  END IF;
END $$;
