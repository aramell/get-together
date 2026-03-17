-- Migration: Create wishlist_items table for Epic 5
-- Created: 2026-03-16
-- Purpose: Support wishlist items for group members to share ideas

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  link VARCHAR(2048),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT link_format CHECK (link IS NULL OR (link ~ '^https?://'))
);

-- Create indexes for wishlist_items
CREATE INDEX IF NOT EXISTS idx_wishlist_items_group_id ON wishlist_items(group_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_created_by ON wishlist_items(created_by);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_created_at ON wishlist_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_group_date ON wishlist_items(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_group_active ON wishlist_items(group_id, deleted_at);
