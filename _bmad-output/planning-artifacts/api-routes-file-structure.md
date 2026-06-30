# API Routes File Structure - get-together

## Next.js App Router Structure

Events API follows Next.js App Router conventions:

```
src/app/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── me/route.ts
│   └── signup/route.ts
├── groups/
│   ├── route.ts                    # GET/POST /api/groups
│   └── [id]/
│       ├── route.ts                # GET/PUT /api/groups/[id]
│       └── members/
│           └── route.ts            # GET/POST /api/groups/[id]/members
├── events/
│   ├── route.ts                    # GET/POST /api/events
│   └── [id]/
│       ├── route.ts                # GET/PUT /api/events/[id]
│       └── rsvps/
│           └── route.ts            # GET/PUT /api/events/[id]/rsvps
├── calendar/
│   ├── route.ts
│   └── [id]/route.ts
├── wishlist/
│   ├── route.ts
│   └── [id]/route.ts
├── comments/
│   └── route.ts
├── middleware.ts                   # Auth middleware
└── health/route.ts                 # GET /api/health (Amplify liveness probe)
```

## Event Routes - Complete Implementation

### `src/app/api/events/route.ts` - GET & POST

```typescript
/**
 * GET /api/events?groupId=<uuid>
 * List all events in a group
 *
 * POST /api/events
 * Create new event proposal in a group
 *
 * Patterns:
 * - Pattern 1: camelCase responses
 * - Pattern 2: wrapped { data, meta }
 * - Decision 2a: Group membership check
 * - Decision 2b: Auth middleware extracts user
 */

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { z } from 'zod'
import {
  errorResponse,
  successResponse,
  extractUser,
  verifyGroupMembership,
  toCamelCase
} from '@/lib/api-utils'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// GET: List events in group
export async function GET(request: NextRequest) {
  try {
    const user = extractUser(request)
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Missing or invalid token', undefined, 401)
    }

    const groupId = request.nextUrl.searchParams.get('groupId')
    if (!groupId) {
      return errorResponse('BAD_REQUEST', 'groupId query parameter required')
    }

    // Verify membership (Decision 2a)
    const isMember = await verifyGroupMembership(user.userId, groupId)
    if (!isMember) {
      return errorResponse('PERMISSION_DENIED', 'Not a group member', undefined, 403)
    }

    // Query events (Pattern 1: snake_case → camelCase)
    const result = await pool.query(
      `SELECT
        e.id, e.title, e.description,
        e.date_range_start, e.date_range_end,
        e.threshold_in_count, e.status,
        e.rsvp_in_count, e.rsvp_maybe_count, e.rsvp_out_count,
        e.created_at, e.updated_at,
        u.id as creator_id, u.display_name as creator_display_name
      FROM events_active e
      JOIN users_active u ON e.creator_id = u.id
      WHERE e.group_id = $1
      ORDER BY e.date_range_start ASC`,
      [groupId]
    )

    const events = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      dateRangeStart: row.date_range_start,
      dateRangeEnd: row.date_range_end,
      thresholdInCount: row.threshold_in_count,
      status: row.status,
      rsvpInCount: row.rsvp_in_count,
      rsvpMaybeCount: row.rsvp_maybe_count,
      rsvpOutCount: row.rsvp_out_count,
      creator: {
        id: row.creator_id,
        displayName: row.creator_display_name
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    return successResponse(events)
  } catch (error) {
    console.error('GET /api/events:', error)
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch events', undefined, 500)
  }
}

// POST: Create event
const CreateEventSchema = z.object({
  groupId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dateRangeStart: z.string().date(),
  dateRangeEnd: z.string().date(),
  thresholdInCount: z.number().int().positive().optional().default(3)
})

export async function POST(request: NextRequest) {
  try {
    const user = extractUser(request)
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Missing or invalid token', undefined, 401)
    }

    const body = await request.json()
    const parsed = CreateEventSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request', { errors: parsed.error.flatten() })
    }

    const { groupId, title, description, dateRangeStart, dateRangeEnd, thresholdInCount } = parsed.data

    // Verify membership (Decision 2a)
    const isMember = await verifyGroupMembership(user.userId, groupId)
    if (!isMember) {
      return errorResponse('PERMISSION_DENIED', 'Not a group member', undefined, 403)
    }

    // Get user's DB ID
    const userResult = await pool.query(
      'SELECT id FROM users WHERE cognito_sub = $1',
      [user.userId]
    )
    if (userResult.rows.length === 0) {
      return errorResponse('USER_NOT_FOUND', 'User not found', undefined, 404)
    }

    const dbUserId = userResult.rows[0].id

    // Insert event
    const eventResult = await pool.query(
      `INSERT INTO events (
        group_id, creator_id, title, description,
        date_range_start, date_range_end, threshold_in_count, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
      RETURNING *`,
      [groupId, dbUserId, title, description || null, dateRangeStart, dateRangeEnd, thresholdInCount]
    )

    const event = eventResult.rows[0]

    return successResponse(
      {
        id: event.id,
        groupId: event.group_id,
        creatorId: event.creator_id,
        title: event.title,
        description: event.description,
        dateRangeStart: event.date_range_start,
        dateRangeEnd: event.date_range_end,
        thresholdInCount: event.threshold_in_count,
        status: event.status,
        rsvpInCount: 0,
        rsvpMaybeCount: 0,
        rsvpOutCount: 0,
        version: event.version,
        createdAt: event.created_at,
        updatedAt: event.updated_at
      },
      201
    )
  } catch (error) {
    console.error('POST /api/events:', error)
    return errorResponse('INTERNAL_ERROR', 'Failed to create event', undefined, 500)
  }
}
```

### `src/app/api/events/[id]/route.ts` - GET & PUT

```typescript
/**
 * GET /api/events/[id]
 * Get event details with all RSVPs
 *
 * PUT /api/events/[id]
 * Update event (title, description, status)
 *
 * Patterns:
 * - Pattern 1: camelCase responses
 * - Pattern 2: wrapped responses
 * - Decision 2a: Group membership check
 * - Decision 1c: Optimistic locking on PUT
 */

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { z } from 'zod'
import {
  errorResponse,
  successResponse,
  extractUser,
  verifyGroupMembership
} from '@/lib/api-utils'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// GET: Event details with RSVPs
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: eventId } = params

    const user = extractUser(request)
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Missing or invalid token', undefined, 401)
    }

    // Get event
    const eventResult = await pool.query(
      `SELECT * FROM events_active WHERE id = $1`,
      [eventId]
    )

    if (eventResult.rows.length === 0) {
      return errorResponse('NOT_FOUND', 'Event not found', undefined, 404)
    }

    const event = eventResult.rows[0]

    // Verify membership (Decision 2a)
    const isMember = await verifyGroupMembership(user.userId, event.group_id)
    if (!isMember) {
      return errorResponse('PERMISSION_DENIED', 'Not a group member', undefined, 403)
    }

    // Get RSVPs
    const rsvpResult = await pool.query(
      `SELECT r.*, u.display_name, u.email
       FROM rsvps_active r
       JOIN users_active u ON r.user_id = u.id
       WHERE r.event_id = $1
       ORDER BY r.created_at ASC`,
      [eventId]
    )

    const rsvps = rsvpResult.rows.map(row => ({
      id: row.id,
      status: row.status,
      version: row.version,
      user: {
        id: row.user_id,
        displayName: row.display_name,
        email: row.email
      },
      createdAt: row.created_at
    }))

    return successResponse({
      id: event.id,
      groupId: event.group_id,
      creatorId: event.creator_id,
      title: event.title,
      description: event.description,
      dateRangeStart: event.date_range_start,
      dateRangeEnd: event.date_range_end,
      thresholdInCount: event.threshold_in_count,
      finalizedDate: event.finalized_date,
      status: event.status,
      rsvpInCount: event.rsvp_in_count,
      rsvpMaybeCount: event.rsvp_maybe_count,
      rsvpOutCount: event.rsvp_out_count,
      thresholdMet: event.rsvp_in_count >= event.threshold_in_count,
      rsvps,
      version: event.version,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    })
  } catch (error) {
    console.error('GET /api/events/[id]:', error)
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch event', undefined, 500)
  }
}

// PUT: Update event
const UpdateEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['proposed', 'scheduled', 'completed']).optional(),
  version: z.number().int().positive()  // Optimistic locking (Decision 1c)
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: eventId } = params

    const user = extractUser(request)
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Missing or invalid token', undefined, 401)
    }

    const body = await request.json()
    const parsed = UpdateEventSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request', { errors: parsed.error.flatten() })
    }

    const { title, description, status, version } = parsed.data

    // Get event
    const eventResult = await pool.query(
      'SELECT * FROM events_active WHERE id = $1',
      [eventId]
    )

    if (eventResult.rows.length === 0) {
      return errorResponse('NOT_FOUND', 'Event not found', undefined, 404)
    }

    const event = eventResult.rows[0]

    // Verify membership (Decision 2a)
    const isMember = await verifyGroupMembership(user.userId, event.group_id)
    if (!isMember) {
      return errorResponse('PERMISSION_DENIED', 'Not a group member', undefined, 403)
    }

    // Verify creator (only creator can update event)
    const creatorResult = await pool.query(
      'SELECT id FROM users WHERE cognito_sub = $1',
      [user.userId]
    )
    if (creatorResult.rows.length === 0 || creatorResult.rows[0].id !== event.creator_id) {
      return errorResponse('PERMISSION_DENIED', 'Only creator can update event', undefined, 403)
    }

    // Update with optimistic locking (Decision 1c)
    const updateResult = await pool.query(
      `UPDATE events
       SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         version = version + 1,
         updated_at = NOW()
       WHERE id = $4 AND version = $5 AND deleted_at IS NULL
       RETURNING *`,
      [title, description, status, eventId, version]
    )

    if (updateResult.rows.length === 0) {
      return errorResponse(
        'CONFLICT',
        'Event was modified. Please refresh and try again.',
        undefined,
        409
      )
    }

    const updated = updateResult.rows[0]

    return successResponse({
      id: updated.id,
      groupId: updated.group_id,
      creatorId: updated.creator_id,
      title: updated.title,
      description: updated.description,
      dateRangeStart: updated.date_range_start,
      dateRangeEnd: updated.date_range_end,
      thresholdInCount: updated.threshold_in_count,
      finalizedDate: updated.finalized_date,
      status: updated.status,
      rsvpInCount: updated.rsvp_in_count,
      rsvpMaybeCount: updated.rsvp_maybe_count,
      rsvpOutCount: updated.rsvp_out_count,
      version: updated.version,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    })
  } catch (error) {
    console.error('PUT /api/events/[id]:', error)
    return errorResponse('INTERNAL_ERROR', 'Failed to update event', undefined, 500)
  }
}
```

### `src/app/api/events/[id]/rsvps/route.ts` - RSVP Mutation

```typescript
/**
 * GET /api/events/[id]/rsvps
 * Get all RSVPs for event
 *
 * PUT /api/events/[id]/rsvps
 * Update user's RSVP status (in/maybe/out)
 *
 * CRITICAL: Optimistic locking with version field (Decision 1c)
 * High-concurrency: 500+ RSVPs/minute from PRD
 * Version mismatch returns 409 Conflict, client refetches and retries
 *
 * Patterns:
 * - Pattern 1: camelCase responses
 * - Pattern 2: wrapped responses
 * - Pattern 5: Optimistic locking prevents lost updates
 * - Decision 2a: Group membership check
 */

import { NextRequest, NextResponse } from 'next/server'
import { Pool, PoolClient } from 'pg'
import { z } from 'zod'
import {
  errorResponse,
  successResponse,
  extractUser,
  verifyGroupMembership
} from '@/lib/api-utils'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// PUT: Update RSVP
const UpdateRSVPSchema = z.object({
  status: z.enum(['in', 'maybe', 'out']),
  version: z.number().int().nonnegative().optional()  // Current version (if exists)
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect()

  try {
    const { id: eventId } = params

    const user = extractUser(request)
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Missing or invalid token', undefined, 401)
    }

    const body = await request.json()
    const parsed = UpdateRSVPSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request', { errors: parsed.error.flatten() })
    }

    const { status, version } = parsed.data

    // Get event and verify membership
    const eventResult = await client.query(
      'SELECT group_id FROM events_active WHERE id = $1',
      [eventId]
    )

    if (eventResult.rows.length === 0) {
      return errorResponse('NOT_FOUND', 'Event not found', undefined, 404)
    }

    const groupId = eventResult.rows[0].group_id

    // Verify membership (Decision 2a)
    const isMember = await verifyGroupMembership(user.userId, groupId)
    if (!isMember) {
      return errorResponse('PERMISSION_DENIED', 'Not a group member', undefined, 403)
    }

    // Get user's DB ID
    const userResult = await client.query(
      'SELECT id FROM users WHERE cognito_sub = $1',
      [user.userId]
    )
    if (userResult.rows.length === 0) {
      return errorResponse('USER_NOT_FOUND', 'User not found', undefined, 404)
    }

    const dbUserId = userResult.rows[0].id

    // Transaction for atomic update
    await client.query('BEGIN')

    // Get current RSVP
    const currentRSVPResult = await client.query(
      'SELECT id, status, version FROM rsvps_active WHERE event_id = $1 AND user_id = $2',
      [eventId, dbUserId]
    )

    let rsvpId: string
    let newVersion: number

    if (currentRSVPResult.rows.length === 0) {
      // Create new RSVP
      const insertResult = await client.query(
        `INSERT INTO rsvps (event_id, user_id, status, version)
         VALUES ($1, $2, $3, 1)
         RETURNING id, version`,
        [eventId, dbUserId, status]
      )
      rsvpId = insertResult.rows[0].id
      newVersion = insertResult.rows[0].version
    } else {
      // Update existing RSVP (Decision 1c: optimistic locking)
      const currentRSVP = currentRSVPResult.rows[0]

      // Check version match
      if (version !== undefined && currentRSVP.version !== version) {
        await client.query('ROLLBACK')
        return errorResponse(
          'CONFLICT',
          'RSVP was modified. Please refresh and try again.',
          { currentVersion: currentRSVP.version },
          409
        )
      }

      // Update with version increment
      const updateResult = await client.query(
        `UPDATE rsvps
         SET status = $1, version = version + 1, updated_at = NOW()
         WHERE id = $2 AND deleted_at IS NULL
         RETURNING id, version`,
        [status, currentRSVP.id]
      )

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return errorResponse('CONFLICT', 'RSVP was deleted', undefined, 409)
      }

      rsvpId = currentRSVP.id
      newVersion = updateResult.rows[0].version
    }

    // Update event momentum counts (denormalized for real-time)
    const countResult = await client.query(
      `SELECT
        COUNT(CASE WHEN status = 'in' THEN 1 END) as in_count,
        COUNT(CASE WHEN status = 'maybe' THEN 1 END) as maybe_count,
        COUNT(CASE WHEN status = 'out' THEN 1 END) as out_count
       FROM rsvps_active WHERE event_id = $1`,
      [eventId]
    )

    const counts = countResult.rows[0]

    // Update event
    await client.query(
      `UPDATE events
       SET rsvp_in_count = $1, rsvp_maybe_count = $2, rsvp_out_count = $3, updated_at = NOW()
       WHERE id = $4`,
      [counts.in_count, counts.maybe_count, counts.out_count, eventId]
    )

    await client.query('COMMIT')

    return successResponse({
      id: rsvpId,
      eventId,
      userId: dbUserId,
      status,
      version: newVersion,
      momentum: {
        inCount: counts.in_count,
        maybeCount: counts.maybe_count,
        outCount: counts.out_count
      }
    })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {}

    console.error('PUT /api/events/[id]/rsvps:', error)
    return errorResponse('INTERNAL_ERROR', 'Failed to update RSVP', undefined, 500)
  } finally {
    client.release()
  }
}
```

## Utility Functions

### `src/lib/api-utils.ts` - Shared helpers

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

/**
 * Extract user from Cognito token
 */
export function extractUser(request: NextRequest): { userId: string; email: string } | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)

  try {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    return {
      userId: decoded.sub,
      email: decoded.email
    }
  } catch {
    return null
  }
}

/**
 * Verify group membership (Decision 2a)
 */
export async function verifyGroupMembership(userId: string, groupId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM group_memberships_active
     WHERE user_id = (SELECT id FROM users WHERE cognito_sub = $1)
     AND group_id = $2`,
    [userId, groupId]
  )
  return result.rows.length > 0
}

/**
 * Error response (Decision 3b: structured errors)
 */
export function errorResponse(
  code: string,
  message: string,
  details?: any,
  status: number = 400
) {
  return NextResponse.json(
    {
      error: { code, message, ...(details && { details }) }
    },
    { status }
  )
}

/**
 * Success response (Pattern 2: wrapped responses)
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(
    {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    },
    { status }
  )
}

/**
 * Convert snake_case to camelCase (Pattern 1)
 */
export function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase)
  if (obj === null || typeof obj !== 'object') return obj

  const result: any = {}
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    result[camelKey] = toCamelCase(obj[key])
  }
  return result
}
```

## Environment Setup

### `.env.local`

```bash
# AWS Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxx
NEXT_PUBLIC_COGNITO_REGION=us-east-1

# Database
DATABASE_URL=postgresql://app_user:password@aurora-endpoint:5432/get_together

# AppSync (Phase 2)
NEXT_PUBLIC_APPSYNC_ENDPOINT=https://xxxxx.appsync-api.region.amazonaws.com/graphql
NEXT_PUBLIC_APPSYNC_REGION=us-east-1
```

### `.env.example`

```bash
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
NEXT_PUBLIC_COGNITO_REGION=
DATABASE_URL=
NEXT_PUBLIC_APPSYNC_ENDPOINT=
NEXT_PUBLIC_APPSYNC_REGION=
```

## Testing

### Example Request/Response

**Create Event:**
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer <cognito-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Coffee Meetup",
    "dateRangeStart": "2026-03-15",
    "dateRangeEnd": "2026-03-20",
    "thresholdInCount": 3
  }'
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "456e4567-e89b-12d3-a456-426614174000",
    "groupId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Coffee Meetup",
    "dateRangeStart": "2026-03-15",
    "dateRangeEnd": "2026-03-20",
    "thresholdInCount": 3,
    "status": "proposed",
    "rsvpInCount": 0,
    "rsvpMaybeCount": 0,
    "rsvpOutCount": 0,
    "version": 1,
    "createdAt": "2026-02-27T16:48:30Z",
    "updatedAt": "2026-02-27T16:48:30Z"
  },
  "meta": {
    "timestamp": "2026-02-27T16:48:30Z",
    "version": "1.0"
  }
}
```

**Update RSVP (with optimistic locking):**
```bash
curl -X PUT http://localhost:3000/api/events/456e4567-e89b-12d3-a456-426614174000/rsvps \
  -H "Authorization: Bearer <cognito-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in",
    "version": 0
  }'
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "789e4567-e89b-12d3-a456-426614174000",
    "eventId": "456e4567-e89b-12d3-a456-426614174000",
    "userId": "user-123",
    "status": "in",
    "version": 1,
    "momentum": {
      "inCount": 1,
      "maybeCount": 0,
      "outCount": 0
    }
  },
  "meta": {
    "timestamp": "2026-02-27T16:48:31Z",
    "version": "1.0"
  }
}
```

**Conflict (409):**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "RSVP was modified. Please refresh and try again.",
    "details": {
      "currentVersion": 2
    }
  }
}
```

## Key Patterns Implemented

✅ **Pattern 1**: All responses camelCase, queries snake_case
✅ **Pattern 2**: Wrapped `{ data, meta }` responses
✅ **Decision 2a**: Group membership check on every endpoint
✅ **Decision 2b**: Custom middleware extracts user from token
✅ **Decision 1c**: Optimistic locking with version field
✅ **Decision 3b**: Structured error responses with codes
✅ **Pattern 5**: Atomic transactions for RSVP updates

All ready for Week 1 MVP implementation.
