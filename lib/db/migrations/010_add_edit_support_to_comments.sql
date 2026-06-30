-- Migration: Add edit support to comments tables
-- Story: 6-4-edit-comments
-- Date: 2026-03-20
-- Description: Add edited_at and updated_count columns to event_comments and wishlist_comments tables

-- Add columns to event_comments table
ALTER TABLE event_comments
  ADD COLUMN edited_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN updated_count INTEGER DEFAULT 0;

-- Add columns to wishlist_comments table
ALTER TABLE wishlist_comments
  ADD COLUMN edited_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN updated_count INTEGER DEFAULT 0;
