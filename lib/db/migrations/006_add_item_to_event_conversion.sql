-- Migration: Add item_to_event_id column to wishlist_items table for conversion tracking
-- This enables linking wishlist items to events they've been converted to

ALTER TABLE wishlist_items
ADD COLUMN item_to_event_id UUID REFERENCES event_proposals(id) ON DELETE SET NULL;

-- Create index for efficient conversion tracking and filtering
CREATE INDEX idx_wishlist_items_conversion
  ON wishlist_items(item_to_event_id)
  WHERE item_to_event_id IS NOT NULL;

-- Create index for filtering converted items by group
CREATE INDEX idx_wishlist_items_group_conversion
  ON wishlist_items(group_id, item_to_event_id DESC);
