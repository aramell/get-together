-- get-together Database Schema
-- PostgreSQL 14+
-- Architecture Patterns: Pattern 1 (snake_case), Decision 1c (optimistic locking), Decision 1d (soft deletes)
-- All timestamps UTC, all IDs UUID, all with created_at/updated_at/deleted_at

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Table
-- ============================================================================
-- Stores user account information. Passwords managed by AWS Cognito.
-- Soft deletes enabled for GDPR compliance (Decision 1d).

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cognito_sub TEXT UNIQUE NOT NULL,              -- Cognito user ID
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{
    "email_on_rsvp": true,
    "email_on_comment": true,
    "push_on_event_changes": true
  }',
  version INTEGER DEFAULT 1,                     -- Optimistic locking (Decision 1c)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                        -- Soft delete (Decision 1d)
  CONSTRAINT users_valid_email CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX idx_users_cognito_sub ON users(cognito_sub);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- ============================================================================
-- Groups Table
-- ============================================================================
-- Stores group definitions. Groups are the primary organizing unit.
-- All data in get-together is group-scoped (Decision 2a: group-based authorization).

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  invite_code VARCHAR(50) UNIQUE NOT NULL,       -- Public invite link code
  owner_id UUID NOT NULL REFERENCES users(id),
  is_public BOOLEAN DEFAULT FALSE,               -- Whether invite link is public
  max_members INTEGER DEFAULT 100,
  version INTEGER DEFAULT 1,                     -- Optimistic locking (Decision 1c)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                        -- Soft delete (Decision 1d)
  CONSTRAINT groups_valid_name CHECK (char_length(name) > 0 AND char_length(name) <= 255)
);

CREATE INDEX idx_groups_owner_id ON groups(owner_id);
CREATE INDEX idx_groups_invite_code ON groups(invite_code);
CREATE INDEX idx_groups_deleted_at ON groups(deleted_at);

-- ============================================================================
-- Group Memberships Table
-- ============================================================================
-- Tracks users in groups and their roles.
-- Admin role enforced here (Decision 2a: group-based authorization).

CREATE TABLE group_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  group_id UUID NOT NULL REFERENCES groups(id),
  is_admin BOOLEAN DEFAULT FALSE,                -- Admin can remove members
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ,                  -- Track engagement
  version INTEGER DEFAULT 1,                     -- Optimistic locking (Decision 1c)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                        -- Soft delete (Decision 1d)
  UNIQUE(user_id, group_id),
  CONSTRAINT different_user_group CHECK (user_id != group_id)
);

CREATE INDEX idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_admin ON group_memberships(is_admin) WHERE NOT deleted_at IS NOT NULL;
CREATE INDEX idx_group_memberships_deleted_at ON group_memberships(deleted_at);

-- ============================================================================
-- Events (Event Proposals) Table
-- ============================================================================
-- Event proposals with RSVP tracking and momentum mechanic.
-- Title, date range, and threshold from PRD (12 FR for Event Proposal & RSVP).
-- Status tracks if event is "proposed", "scheduled", or "completed".

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date_range_start DATE NOT NULL,                -- First possible date for event
  date_range_end DATE NOT NULL,                  -- Last possible date for event
  threshold_in_count INTEGER DEFAULT 3,          -- Minimum "in" votes to schedule
  finalized_date DATE,                           -- If scheduled, the chosen date
  status VARCHAR(20) DEFAULT 'proposed',         -- 'proposed', 'scheduled', 'completed'
  rsvp_in_count INTEGER DEFAULT 0,
  rsvp_maybe_count INTEGER DEFAULT 0,
  rsvp_out_count INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,                     -- Optimistic locking (Decision 1c)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                        -- Soft delete (Decision 1d)
  CONSTRAINT events_valid_date_range CHECK (date_range_start <= date_range_end),
  CONSTRAINT events_valid_status CHECK (status IN ('proposed', 'scheduled', 'completed'))
);

CREATE INDEX idx_events_group_id ON events(group_id);
CREATE INDEX idx_events_creator_id ON events(creator_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_deleted_at ON events(deleted_at);

-- ============================================================================
-- RSVPs Table (Event Responses)
-- ============================================================================
-- Tracks RSVP status (in/maybe/out) for each user on each event.
-- Optimistic locking prevents lost updates in high-concurrency scenarios (Decision 1c).
-- Real-time momentum display via AppSync subscription (Pattern 9).

CREATE TABLE rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id),
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL,                   -- 'in', 'maybe', 'out'
  version INTEGER DEFAULT 1,                     -- Optimistic locking (Decision 1c)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                        -- Soft delete (Decision 1d)
  UNIQUE(event_id, user_id),
  CONSTRAINT rsvps_valid_status CHECK (status IN ('in', 'maybe', 'out'))
);

CREATE INDEX idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX idx_rsvps_user_id ON rsvps(user_id);
CREATE INDEX idx_rsvps_status ON rsvps(status);
CREATE INDEX idx_rsvps_deleted_at ON rsvps(deleted_at);

-- ============================================================================
-- Availability Table (Soft Calendar)
-- ============================================================================
-- Tracks free/busy time blocks for users in a group.
-- Does NOT store actual calendar event details (privacy requirement from PRD).
-- Only stores free/busy blocks, max 6 hours old (Decision 1d from architecture).
-- Real-time updates via AppSync subscription (Pattern 9).

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id),
  user_id UUID NOT NULL REFERENCES users(id),
  day_of_week INTEGER NOT NULL,                  -- 0-6 (Monday-Sunday)
  start_time TIME NOT NULL,                      -- e.g., '09:00:00'
  end_time TIME NOT NULL,                        -- e.g., '17:00:00'
  is_free BOOLEAN NOT NULL,                      -- TRUE = free, FALSE = busy
  recurs_weekly BOOLEAN DEFAULT TRUE,            -- Mark as recurring pattern
  expires_at TIMESTAMPTZ,                        -- Optional expiration
  version INTEGER DEFAULT 1,                     -- Optimistic locking (Decision 1c)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                        -- Soft delete (Decision 1d)
  UNIQUE(group_id, user_id, day_of_week, start_time, end_time),
  CONSTRAINT availability_valid_day CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT availability_valid_time CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_group_id ON availability(group_id);
CREATE INDEX idx_availability_user_id ON availability(user_id);
CREATE INDEX idx_availability_day_of_week ON availability(day_of_week);
CREATE INDEX idx_availability_deleted_at ON availability(deleted_at);

-- ============================================================================
-- Wishlist Items Table
-- ============================================================================
-- Items on the group's wishlist.
-- Can optionally include links (8 FR for Wishlist & Discovery).
-- Can be converted to events later (eventService handles conversion).

CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,                                 -- Optional: external link
  category VARCHAR(50),                          -- e.g., 'restaurant', 'activity', 'movie'
  interest_count INTEGER DEFAULT 0,              -- Denormalized for performance
  converted_to_event_id UUID REFERENCES events(id),
  version INTEGER DEFAULT 1,                     -- Optimistic locking (Decision 1c)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                        -- Soft delete (Decision 1d)
  CONSTRAINT wishlist_items_valid_url CHECK (
    link_url IS NULL OR link_url ~ '^https?://'
  )
);

CREATE INDEX idx_wishlist_items_group_id ON wishlist_items(group_id);
CREATE INDEX idx_wishlist_items_creator_id ON wishlist_items(creator_id);
CREATE INDEX idx_wishlist_items_category ON wishlist_items(category);
CREATE INDEX idx_wishlist_items_interest_count ON wishlist_items(interest_count DESC);
CREATE INDEX idx_wishlist_items_deleted_at ON wishlist_items(deleted_at);

-- ============================================================================
-- Wishlist Interests Table
-- ============================================================================
-- Tracks which users are interested in which wishlist items.
-- Interest signals help with discovery (8 FR for Wishlist & Discovery).

CREATE TABLE wishlist_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_item_id UUID NOT NULL REFERENCES wishlist_items(id),
  user_id UUID NOT NULL REFERENCES users(id),
  version INTEGER DEFAULT 1,                     -- Optimistic locking (Decision 1c)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                        -- Soft delete (Decision 1d)
  UNIQUE(wishlist_item_id, user_id)
);

CREATE INDEX idx_wishlist_interests_item_id ON wishlist_interests(wishlist_item_id);
CREATE INDEX idx_wishlist_interests_user_id ON wishlist_interests(user_id);
CREATE INDEX idx_wishlist_interests_deleted_at ON wishlist_interests(deleted_at);

-- ============================================================================
-- Comments Table
-- ============================================================================
-- Comments on events and wishlist items (6 FR for Comments & Discussion).
-- Can edit/delete own comments.
-- Real-time visibility via AppSync subscription (Pattern 9).

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  event_id UUID REFERENCES events(id),           -- NULL if comment on wishlist item
  wishlist_item_id UUID REFERENCES wishlist_items(id), -- NULL if comment on event
  version INTEGER DEFAULT 1,                     -- Optimistic locking (Decision 1c)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                        -- Soft delete (Decision 1d)
  CONSTRAINT comments_has_target CHECK (
    (event_id IS NOT NULL AND wishlist_item_id IS NULL) OR
    (event_id IS NULL AND wishlist_item_id IS NOT NULL)
  )
);

CREATE INDEX idx_comments_group_id ON comments(group_id);
CREATE INDEX idx_comments_creator_id ON comments(creator_id);
CREATE INDEX idx_comments_event_id ON comments(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_comments_wishlist_item_id ON comments(wishlist_item_id) WHERE wishlist_item_id IS NOT NULL;
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_deleted_at ON comments(deleted_at);

-- ============================================================================
-- Audit Triggers (for updated_at timestamps)
-- ============================================================================
-- Automatically update the updated_at timestamp on row modification.

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_update_timestamp BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER groups_update_timestamp BEFORE UPDATE ON groups
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER group_memberships_update_timestamp BEFORE UPDATE ON group_memberships
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER events_update_timestamp BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER rsvps_update_timestamp BEFORE UPDATE ON rsvps
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER availability_update_timestamp BEFORE UPDATE ON availability
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER wishlist_items_update_timestamp BEFORE UPDATE ON wishlist_items
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER wishlist_interests_update_timestamp BEFORE UPDATE ON wishlist_interests
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER comments_update_timestamp BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- Query Optimization: Default Filters for Soft Deletes
-- ============================================================================
-- These views automatically exclude deleted rows, enforcing soft delete pattern (Pattern 1).
-- Use in SELECT queries: SELECT * FROM users_active instead of users.

CREATE VIEW users_active AS
SELECT * FROM users WHERE deleted_at IS NULL;

CREATE VIEW groups_active AS
SELECT * FROM groups WHERE deleted_at IS NULL;

CREATE VIEW group_memberships_active AS
SELECT * FROM group_memberships WHERE deleted_at IS NULL;

CREATE VIEW events_active AS
SELECT * FROM events WHERE deleted_at IS NULL;

CREATE VIEW rsvps_active AS
SELECT * FROM rsvps WHERE deleted_at IS NULL;

CREATE VIEW availability_active AS
SELECT * FROM availability WHERE deleted_at IS NULL;

CREATE VIEW wishlist_items_active AS
SELECT * FROM wishlist_items WHERE deleted_at IS NULL;

CREATE VIEW wishlist_interests_active AS
SELECT * FROM wishlist_interests WHERE deleted_at IS NULL;

CREATE VIEW comments_active AS
SELECT * FROM comments WHERE deleted_at IS NULL;

-- ============================================================================
-- Helpful Views for API Queries
-- ============================================================================

-- Get group with member count and event stats
CREATE VIEW groups_with_stats AS
SELECT
  g.id,
  g.name,
  g.description,
  g.owner_id,
  g.invite_code,
  g.is_public,
  COUNT(DISTINCT gm.user_id) as member_count,
  COUNT(DISTINCT e.id) as event_count,
  g.created_at,
  g.updated_at
FROM groups_active g
LEFT JOIN group_memberships_active gm ON g.id = gm.group_id
LEFT JOIN events_active e ON g.id = e.group_id
GROUP BY g.id, g.name, g.description, g.owner_id, g.invite_code, g.is_public, g.created_at, g.updated_at;

-- Get event with RSVP momentum (real-time display via Pattern 9)
CREATE VIEW events_with_momentum AS
SELECT
  e.id,
  e.group_id,
  e.creator_id,
  e.title,
  e.date_range_start,
  e.date_range_end,
  e.threshold_in_count,
  e.status,
  e.rsvp_in_count,
  e.rsvp_maybe_count,
  e.rsvp_out_count,
  (e.rsvp_in_count >= e.threshold_in_count) as threshold_met,
  e.created_at,
  e.updated_at
FROM events_active e;

-- Get user's groups with membership info
CREATE VIEW user_groups AS
SELECT
  u.id as user_id,
  g.id as group_id,
  g.name,
  g.description,
  gm.is_admin,
  gm.joined_at,
  gm.last_activity_at
FROM users_active u
JOIN group_memberships_active gm ON u.id = gm.user_id
JOIN groups_active g ON gm.group_id = g.id;

-- ============================================================================
-- Initial Data (Optional: for development/testing)
-- ============================================================================
-- Uncomment to seed with test data

-- INSERT INTO users (cognito_sub, email, display_name) VALUES
-- ('test-user-1', 'alice@example.com', 'Alice'),
-- ('test-user-2', 'bob@example.com', 'Bob'),
-- ('test-user-3', 'charlie@example.com', 'Charlie');

-- INSERT INTO groups (name, description, owner_id, invite_code)
-- VALUES ('Book Club', 'Monthly book discussions', (SELECT id FROM users WHERE email = 'alice@example.com'), 'book-club-123');
