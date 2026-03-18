-- Migration: Add wishlist_comments table for Epic 6 (Comments & Lightweight Discussion)
-- Story: 6-2-comment-on-wishlist
-- Date: 2026-03-18
-- Description: Create table to store comments on wishlist items with soft delete support

CREATE TABLE wishlist_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_item_id UUID NOT NULL REFERENCES wishlist_items(id) ON DELETE CASCADE,
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
CREATE INDEX idx_wishlist_comments_item_id ON wishlist_comments(wishlist_item_id);
CREATE INDEX idx_wishlist_comments_group_id ON wishlist_comments(group_id);
CREATE INDEX idx_wishlist_comments_created_by ON wishlist_comments(created_by);
CREATE INDEX idx_wishlist_comments_not_deleted ON wishlist_comments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_wishlist_comments_item_not_deleted ON wishlist_comments(wishlist_item_id, created_at) WHERE deleted_at IS NULL;
