-- Story 12.6: Quick Polls
-- One vote per user per poll. poll_id is deliberately denormalized (also
-- derivable via option_id's FK) so the UNIQUE(poll_id, user_id) constraint and
-- vote-count-by-poll queries don't need a join through options — a documented
-- choice, not an oversight. No FK from user_id to users(id): same reasoning as
-- event_logistics_claims.user_id (see Story 12.5).

CREATE TABLE IF NOT EXISTS event_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES event_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES event_poll_options(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_poll_votes_poll_id ON event_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_event_poll_votes_option_id ON event_poll_votes(option_id);

ALTER TABLE event_poll_votes ENABLE ROW LEVEL SECURITY;
