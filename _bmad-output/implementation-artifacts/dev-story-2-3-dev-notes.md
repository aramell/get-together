# Story 2-3: View Group Details - Dev Notes

**Narrative:** As a group member, I want to see detailed information about a group I belong to, including a member list and my role in the group.

**Status:** Task 1.1 Complete - Database Layer Setup ✅

## Task 1.1: Setup Database Queries and Services

### Subtask 1.1a: Database Schema Verification ✅
- **Created:** Two SQL migration files for group management
  - `migrations/001_create_groups_table.sql` - Groups table with UUID primary key, name, description, invite code, timestamps
  - `migrations/002_create_group_memberships_table.sql` - Group memberships with role (admin/member), foreign key constraints

### Subtask 1.1b: Database Connection Layer ✅
- **Created:** `lib/db/client.ts` - PostgreSQL connection pool using `pg` driver
  - Implements `query()`, `queryOne()`, and `getClient()` functions
  - Handles connection pooling, error logging, and query metrics
  - Marked with `'use server'` to prevent client-side imports

### Subtask 1.1c: Database Query Functions ✅
- **Created:** `lib/db/queries.ts` - Server-side query functions
  - `createGroupWithMembership()` - Create group and add creator as admin (transactional)
  - `getGroupById()` - Fetch group by ID
  - `getGroupDetailsWithMembers()` - Fetch group with member list and user's role
  - `getGroupsByUserId()` - Fetch all groups for user with member count
  - `getUserGroupRole()` - Check user's role in group
  - `getGroupByInviteCode()` - Fetch group by invite code
  - `addUserToGroup()` - Add user to group with role
  - `removeUserFromGroup()` - Remove user from group
  - `updateGroup()` - Update group details
  - `deleteGroup()` - Delete group (cascade deletes memberships)

### Subtask 1.1d: Service Layer Integration ✅
- **Created:** `lib/services/groupServerService.ts` - Server-only group service
  - `getGroupDetailsFromDb()` - Wrapper for database query with authorization checks
  - Returns structured response with success/error details
  - Handles permissions: 401 (auth), 403 (not member), 404 (not found), 500 (error)

### Subtask 1.1e: Environment Configuration ✅
- **Created:** `.env.database.example` - Database configuration template
  - `DATABASE_HOST` - PostgreSQL server address
  - `DATABASE_PORT` - PostgreSQL port (5432)
  - `DATABASE_NAME` - Database name (gettogether)
  - `DATABASE_USER` - Database user
  - `DATABASE_PASSWORD` - Database password
  - `DATABASE_SSL` - SSL connection flag (for Aurora RDS)

### Subtask 1.1f: Dependencies ✅
- **Installed:** `pg@8.x` and `@types/pg`
  - PostgreSQL client for Node.js database connections
  - Type definitions for TypeScript support

## Implementation Details

### Database Schema

**Groups Table:**
```sql
- id (UUID PK, auto-generated)
- name (VARCHAR 100, required)
- description (TEXT, optional)
- created_by (UUID FK to users)
- invite_code (VARCHAR 16, unique, cryptographically random)
- created_at (TIMESTAMPTZ, auto-set)
- updated_at (TIMESTAMPTZ, auto-set)
- Indexes: created_by, invite_code, created_at
```

**Group Memberships Table:**
```sql
- id (UUID PK, auto-generated)
- group_id (UUID FK to groups, cascades on delete)
- user_id (UUID, references Cognito user ID)
- role (VARCHAR 20: 'admin' or 'member')
- joined_at (TIMESTAMPTZ, auto-set)
- Unique constraint: (group_id, user_id)
- Indexes: group_id, user_id, role
```

### Error Handling

The service layer uses consistent error codes:
- `VALIDATION_ERROR` - Invalid input parameters (422)
- `NOT_FOUND` - Group doesn't exist (404)
- `FORBIDDEN` - User is not a member of group (403)
- `UNAUTHORIZED` - User not authenticated (401)
- `INTERNAL_ERROR` - Unexpected database or server error (500)

### Architecture Decisions

1. **'use server' Directives:** Database modules are explicitly marked server-only to prevent accidental client-side imports
2. **Transactional Operations:** Group creation uses database transactions to ensure atomicity (create group + add creator as admin)
3. **Permission Checks:** Authorization happens at query time (check user membership) rather than API route
4. **Connection Pooling:** Uses pg Pool for efficient connection reuse
5. **Structured Responses:** All service functions return consistent `{ success, message, data?, error?, errorCode? }` format

## Next Steps

- **Task 1.2:** Implement API endpoint `GET /api/groups/:groupId`
- **Task 1.3:** Create page component `/groups/[groupId]/page.tsx`
- **Task 1.4:** Build member list component
- **Task 1.5:** Implement admin controls (if user is admin)
- **Task 1.6:** Add pagination for member lists
- **Task 1.7:** Write comprehensive integration tests

## Files Created

```
lib/db/
├── client.ts           (PostgreSQL connection pool)
└── queries.ts          (Database query functions)

lib/services/
├── groupService.ts     (Updated - removed server imports)
└── groupServerService.ts (New - server-only service)

migrations/
├── 001_create_groups_table.sql
└── 002_create_group_memberships_table.sql

.env.database.example  (Database configuration template)
```

## Testing Notes

- Connection pool handles concurrent requests efficiently
- Transaction support prevents race conditions during group creation
- Permission checks prevent unauthorized access to groups
- All functions include error logging for debugging
- Migration files can be run against PostgreSQL directly with psql or via migration tool
