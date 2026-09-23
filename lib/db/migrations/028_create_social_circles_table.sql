-- Story 10.1: Create a Social Circle
--
-- A social circle is a named, reusable contact list owned by a single user,
-- independent of any group or event (FR64, FR70). Membership (which contacts
-- belong to a circle) is added in Story 10.2's circle_contacts table; this
-- migration only creates the circle shell itself.

CREATE TABLE IF NOT EXISTS social_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(128) NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_circles_user_id ON social_circles(user_id);

ALTER TABLE social_circles ENABLE ROW LEVEL SECURITY;
