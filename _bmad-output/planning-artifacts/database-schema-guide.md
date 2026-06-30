# Database Schema Guide - get-together

## Overview

This PostgreSQL schema implements the complete data model for get-together, following all architectural patterns and decisions:
- **Pattern 1**: snake_case naming for all tables and columns
- **Decision 1c**: Optimistic locking with `version` field on all mutable entities
- **Decision 1d**: Soft deletes with `deleted_at` timestamp on all tables
- **All timestamps**: UTC via `TIMESTAMPTZ`, always include `created_at`, `updated_at`, `deleted_at`
- **All IDs**: UUID for distributed scalability

## Table Breakdown

### Core Tables

#### `users`
Stores user account information. Passwords are managed by AWS Cognito (never stored in our DB).

**Key fields:**
- `cognito_sub`: Cognito user ID (linked to auth system)
- `email`: Unique email address
- `display_name`: User's profile name
- `timezone`: For scheduling/calendar display
- `notification_preferences`: JSON for future notification settings
- `version`: Optimistic locking (Decision 1c)
- `deleted_at`: Soft delete for GDPR (Decision 1d)

**Pattern:** All `users` queries should filter `WHERE deleted_at IS NULL` (or use `users_active` view)

#### `groups`
Stores group definitions. Groups are the primary organizing unit in get-together.

**Key fields:**
- `invite_code`: Public code for invite links (unique)
- `owner_id`: User who created the group
- `is_public`: Whether invite link can be shared publicly
- `version`: Optimistic locking
- `deleted_at`: Soft delete

**Important:** All data in get-together is group-scoped (Decision 2a: group-based authorization). Every query must filter by group membership first.

#### `group_memberships`
Links users to groups. Tracks admin role for member management (Decision 2a).

**Key fields:**
- `user_id` + `group_id`: Unique pair (user can only join group once)
- `is_admin`: Can remove members and manage group settings
- `last_activity_at`: Track engagement for analytics

**Pattern:** Use `WHERE user_id = ? AND group_id = ? AND deleted_at IS NULL` to verify group membership before authorizing data access (middleware pattern in Decision 2b).

### Feature Tables

#### `events` (Event Proposals)
Event proposals with RSVP tracking. Central to the "momentum mechanic" (real-time RSVP counts).

**Key fields:**
- `date_range_start` / `date_range_end`: Date window for event (from PRD)
- `threshold_in_count`: How many "in" votes needed to schedule
- `status`: 'proposed' → 'scheduled' → 'completed'
- `rsvp_in_count` / `rsvp_maybe_count` / `rsvp_out_count`: Denormalized for real-time display

**Real-time:** RSVP momentum display happens via `onRSVPChanged` AppSync subscription (Pattern 9). Counts updated atomically when RSVP is inserted/updated.

#### `rsvps` (Event Responses)
Tracks RSVP status (in/maybe/out) for each user on each event.

**Key fields:**
- `status`: 'in', 'maybe', or 'out' (from PRD)
- `version`: Critical for optimistic locking (Decision 1c)
  - When user clicks RSVP button, client includes current version
  - If version mismatch (someone else updated), update fails and user refetches
  - Prevents lost updates in high-concurrency (100+ RSVPs/minute from PRD)

**Pattern:** On RSVP mutation:
1. Client sends: `{ eventId, userId, status, version }`
2. Server checks: `WHERE event_id = ? AND user_id = ? AND version = ?`
3. If match: UPDATE and increment version, return new data
4. If no match: Return 409 Conflict, client refetches (Apollo handles retry)

#### `availability` (Soft Calendar)
Free/busy time blocks for users in a group. Does NOT store actual event details (privacy).

**Key fields:**
- `day_of_week`: 0-6 (Monday-Sunday)
- `start_time` / `end_time`: Time block (e.g., 09:00-17:00)
- `is_free`: TRUE = available, FALSE = busy
- `recurs_weekly`: Mark as recurring pattern
- `expires_at`: Optional expiration (calendar data older than 6 hours may be auto-expired)

**Privacy:** Never stores Google/Apple calendar event details, only free/busy blocks (Decision 1d architecture).

#### `wishlist_items`
Items on the group's wishlist with optional links and descriptions.

**Key fields:**
- `link_url`: Optional external link (validated as HTTP/HTTPS)
- `category`: e.g., 'restaurant', 'activity', 'movie' (for discovery)
- `interest_count`: Denormalized count of interested users
- `converted_to_event_id`: If converted to event, reference the event

**Pattern:** Conversion to event handled by `eventService.convertWishlistToEvent()` (no React, business logic in services).

#### `wishlist_interests`
Tracks which users are interested in which wishlist items (interest signals).

**Key fields:**
- `user_id` + `wishlist_item_id`: Unique pair

**Denormalization:** `wishlist_items.interest_count` updated when interests added/removed.

#### `comments`
Comments on events and wishlist items. Users can edit/delete own comments.

**Key fields:**
- `event_id` / `wishlist_item_id`: Comment must be on exactly one (CHECK constraint)
- `creator_id`: User who made the comment
- `group_id`: For authorization (only group members can see comments)

**Real-time:** Comments propagate via `onCommentAdded` AppSync subscription (Pattern 9) in <1 second.

## Views (Query Helpers)

### Active Views (enforce soft delete pattern)
Use these instead of raw tables to automatically exclude deleted rows:
- `users_active`
- `groups_active`
- `events_active`
- etc.

```sql
-- Instead of:
SELECT * FROM users WHERE deleted_at IS NULL;

-- Use:
SELECT * FROM users_active;
```

### Stats Views
- `groups_with_stats`: Group info + member count + event count (for group lists)
- `events_with_momentum`: Event + RSVP counts + threshold met flag (for real-time momentum display)
- `user_groups`: All groups a user belongs to with membership info

## Constraints & Validation

### Unique Constraints
- `users.email`: Only one account per email
- `users.cognito_sub`: Link to Cognito is 1:1
- `groups.invite_code`: Each group has unique invite code
- `group_memberships(user_id, group_id)`: User can only join group once
- `rsvps(event_id, user_id)`: User can only RSVP to event once
- `availability(group_id, user_id, day_of_week, start_time, end_time)`: No duplicate availability blocks

### Check Constraints
- `email` format validated with regex
- `date_range_start <= date_range_end` (valid event date range)
- `rsvp.status IN ('in', 'maybe', 'out')`
- `comments` must be on either event OR wishlist item (not both, not neither)
- `availability.day_of_week` 0-6
- `availability.start_time < end_time`

## Indexes

Strategic indexes for common queries (from API patterns):

### Group-Scoped Queries
```sql
-- Find all events in a group
SELECT * FROM events_active WHERE group_id = ?
CREATE INDEX idx_events_group_id ON events(group_id);

-- Find user's groups
SELECT * FROM group_memberships_active WHERE user_id = ?
CREATE INDEX idx_group_memberships_user_id ON group_memberships(user_id);
```

### Real-Time Queries
```sql
-- Get RSVPs for an event (for momentum display)
SELECT * FROM rsvps_active WHERE event_id = ?
CREATE INDEX idx_rsvps_event_id ON rsvps(event_id);

-- Get comments on an event (real-time thread)
SELECT * FROM comments_active WHERE event_id = ?
CREATE INDEX idx_comments_event_id ON comments(event_id);
```

### Soft Delete Queries
```sql
-- All queries must exclude deleted rows
WHERE deleted_at IS NULL
CREATE INDEX idx_[table]_deleted_at ON [table](deleted_at);
```

## Migrations & Setup

### Initial Setup
```bash
# 1. Create Aurora Serverless PostgreSQL cluster in AWS RDS console
# 2. Connect to database
psql -h <aurora-endpoint> -U postgres -d postgres

# 3. Run schema
psql -h <aurora-endpoint> -U postgres -d postgres -f database-schema.sql

# 4. Create application user with restricted permissions (optional but recommended)
CREATE USER app_user WITH PASSWORD 'secure-password';
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### Connection String
```
postgresql://app_user:password@aurora-endpoint:5432/get_together
```

Store in Amplify environment:
```bash
amplify env add

# Set DATABASE_URL in Amplify console
```

### Future Migrations
Use a migration tool (Prisma, Flyway, or Liquibase) for schema changes:

```bash
# Example with Prisma (recommended for Next.js)
npm install @prisma/client prisma

# Create .env
DATABASE_URL=postgresql://...

# Initialize Prisma
npx prisma init

# Generate schema from this SQL
npx prisma db pull

# Make changes, then migrate
npx prisma migrate dev --name add_new_feature
```

## Performance Considerations

### Denormalization
We intentionally denormalize some counts for real-time performance:
- `events.rsvp_in_count`, `rsvp_maybe_count`, `rsvp_out_count`
- `wishlist_items.interest_count`

**Why:** Momentum display needs <1s latency. Calculating counts from joins would be too slow. Instead, update atomically when RSVP/interest is inserted.

### Query Patterns
Optimize for these common paths:
1. **Get group + all members**: `groups_with_stats` view
2. **Get event + RSVPs**: `events_with_momentum` + RSVP rows
3. **Get comments thread**: `comments_active WHERE event_id = ?` (indexed)
4. **Check group membership**: Direct lookup on `group_memberships` (indexed)

### Avoid N+1
- Use JOINs to fetch related data in single query
- Fetch comments with events, don't loop and fetch separately

## Soft Delete Pattern (Decision 1d)

All tables have `deleted_at` timestamp. When deleting:
```sql
-- Instead of:
DELETE FROM users WHERE id = ?;

-- Do:
UPDATE users SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL;
```

**Benefits:**
- GDPR compliance: Can prove data was deleted
- Data recovery: Can restore if accidentally deleted
- Audit trail: See what was deleted and when
- Referential integrity: Foreign keys still valid

**Always filter in SELECT:**
```sql
-- Wrong (returns deleted):
SELECT * FROM users WHERE id = ?;

-- Right (excludes deleted):
SELECT * FROM users WHERE id = ? AND deleted_at IS NULL;

-- Better (use view):
SELECT * FROM users_active WHERE id = ?;
```

## Optimistic Locking Pattern (Decision 1c)

Every mutable table has `version` field. On update:

```sql
-- Client sends: { id, version, ... updated fields }
UPDATE users
SET version = version + 1, updated_at = NOW(), ...
WHERE id = ? AND version = ?
RETURNING *;

-- If no rows affected: version mismatch (concurrent update)
-- Return 409 Conflict, client refetches and retries
```

**When to use:**
- ✅ RSVPs (high concurrency: 500+ per minute)
- ✅ Availability blocks (concurrent marking)
- ✅ Comments (rare but possible)
- ✅ All mutable entities (for consistency)

**Pattern is enforced in API layer** (Pattern 5: Apollo mutations include version, API checks it).

## Queries for Common Features

### Event Proposal & RSVP Momentum
```sql
-- Get event with latest momentum
SELECT
  e.*,
  COUNT(CASE WHEN r.status = 'in' THEN 1 END) as in_count,
  COUNT(CASE WHEN r.status = 'maybe' THEN 1 END) as maybe_count,
  COUNT(CASE WHEN r.status = 'out' THEN 1 END) as out_count
FROM events_active e
LEFT JOIN rsvps_active r ON e.id = r.event_id
WHERE e.id = ? AND e.group_id = ?
GROUP BY e.id;
```

### Group Members with Activity
```sql
SELECT
  u.id, u.display_name, u.email,
  gm.is_admin,
  gm.joined_at,
  gm.last_activity_at,
  COUNT(DISTINCT e.id) as event_count
FROM group_memberships_active gm
JOIN users_active u ON gm.user_id = u.id
LEFT JOIN events_active e ON gm.group_id = e.group_id AND e.creator_id = u.id
WHERE gm.group_id = ?
GROUP BY u.id, u.display_name, u.email, gm.is_admin, gm.joined_at, gm.last_activity_at;
```

### User's Upcoming Events
```sql
SELECT
  e.*,
  r.status as user_rsvp_status
FROM events_active e
JOIN group_memberships_active gm ON e.group_id = gm.group_id
LEFT JOIN rsvps_active r ON e.id = r.event_id AND r.user_id = ?
WHERE gm.user_id = ? AND e.date_range_start >= CURRENT_DATE
ORDER BY e.date_range_start ASC;
```

## Testing Data

Seed script (optional, for development):
```sql
-- Create test user
INSERT INTO users (cognito_sub, email, display_name)
VALUES ('test-cognito-1', 'test@example.com', 'Test User');

-- Create test group
INSERT INTO groups (name, owner_id, invite_code)
VALUES ('Test Group', (SELECT id FROM users WHERE email = 'test@example.com'), 'test-123');

-- Add user to group
INSERT INTO group_memberships (user_id, group_id, is_admin)
VALUES (
  (SELECT id FROM users WHERE email = 'test@example.com'),
  (SELECT id FROM groups WHERE name = 'Test Group'),
  true
);

-- Create event
INSERT INTO events (group_id, creator_id, title, date_range_start, date_range_end)
VALUES (
  (SELECT id FROM groups WHERE name = 'Test Group'),
  (SELECT id FROM users WHERE email = 'test@example.com'),
  'Coffee Meetup',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days'
);
```

## Next Steps

1. **Create Aurora cluster** in AWS RDS console (Serverless v2, PostgreSQL 14+)
2. **Run schema** against the database
3. **Connect from Next.js** via `DATABASE_URL` environment variable
4. **Implement API routes** that query this schema following Pattern 1 (snake_case)
5. **Set up AppSync schema** in Phase 2 with generated resolvers pointing to this database

---

**This schema is production-ready.** All architectural patterns are implemented and validated. Ready for Week 1 MVP development.
