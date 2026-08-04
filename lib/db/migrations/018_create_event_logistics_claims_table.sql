-- Story 12.5: Logistics Coordination
-- Join table tracking who has claimed a seat on a 'carpool' event_logistics_items row.
-- A proper join table (not a comma-separated column) so capacity ("N people can claim
-- up to capacity seats") is queryable and constrainable — the UNIQUE constraint below
-- prevents the same person double-claiming the same carpool item, for free.
-- No FK from user_id to users(id): same reasoning as event_logistics_items.created_by.

CREATE TABLE IF NOT EXISTS event_logistics_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logistics_item_id UUID NOT NULL REFERENCES event_logistics_items(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(logistics_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_logistics_claims_logistics_item_id ON event_logistics_claims(logistics_item_id);

ALTER TABLE event_logistics_claims ENABLE ROW LEVEL SECURITY;
