-- Create wishlist_interests table for tracking user interest signals on wishlist items
-- Supports marking/unmarking interest with soft delete for data integrity

CREATE TABLE wishlist_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(128) NOT NULL,
  wishlist_item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,

  -- Prevent duplicate interests from same user on same item
  UNIQUE(user_id, wishlist_item_id),

  -- Foreign key constraints
  CONSTRAINT fk_wishlist_interests_item FOREIGN KEY (wishlist_item_id)
    REFERENCES wishlist_items(id) ON DELETE CASCADE
);

-- Index for fast count queries by item
CREATE INDEX idx_wishlist_interests_item ON wishlist_interests(wishlist_item_id);

-- Index for checking if user is interested in an item
CREATE INDEX idx_wishlist_interests_user_item ON wishlist_interests(user_id, wishlist_item_id);

-- Comment for documentation
COMMENT ON TABLE wishlist_interests IS 'Tracks user interest signals on wishlist items. Uses soft delete (deleted_at) to maintain data integrity for analytics.';
COMMENT ON COLUMN wishlist_interests.deleted_at IS 'Soft delete timestamp. NULL means interest is active, non-NULL means interest was removed.';
