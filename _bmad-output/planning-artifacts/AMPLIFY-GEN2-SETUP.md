# Amplify Gen 2 Setup Guide - get-together

Amplify Gen 2 uses TypeScript-first backend configuration. Much cleaner than Gen 1!

## Installation & Initialization

### Step 1: Create Next.js Project

```bash
npx create-next-app@latest get-together-web \
  --typescript \
  --tailwind \
  --app \
  --eslint

cd get-together-web
```

### Step 2: Add Amplify Gen 2

```bash
# Install Amplify
npm install aws-amplify @aws-amplify/auth @aws-amplify/ui-react

# Initialize Amplify Gen 2
npx amplify@latest init
```

You'll see:

```
√ What kind of app are you building · javascript
√ What javascript framework are you using · next
√ In which directory is your app code located · . (current directory)
√ Where would you like to store your Amplify app definition · amplify/
√ Create a new backend · Yes
√ Backend environment name · dev
√ AWS profile · default
```

This creates `amplify/` directory with TypeScript backend definition.

---

## Project Structure After Init

```
get-together-web/
├── amplify/
│   ├── auth.ts                 # Authentication (Cognito)
│   ├── data.ts                 # Database (using AWS AppSync)
│   ├── backend.ts              # Backend definition
│   └── .gitignore
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── ...
├── package.json
└── next.config.js
```

---

## Setup Step 1: Configure Authentication (Cognito)

### `amplify/auth.ts`

```typescript
import { defineAuth } from '@aws-amplify/backend'

/**
 * Define authentication with Cognito
 * Decision 2c: 30-minute access tokens, 7-day refresh tokens
 */

export const auth = defineAuth({
  loginWith: {
    email: {
      // Email/password login (Decision 2c)
      userAttributes: {
        // Custom attributes for user profile
        email: {
          mutable: true,
          required: true
        },
        displayName: {
          mutable: true
        }
      }
    }
  },
  // Token configuration (Decision 2c)
  accessTokenExpiration: {
    minutes: 30  // Short-lived access token
  },
  refreshTokenExpiration: {
    days: 7      // Refresh token valid 7 days
  },
  // MFA optional for production
  mfa: {
    status: 'off'  // Can enable later
  }
})
```

### Features:
- ✅ Email/password authentication via Cognito
- ✅ User attributes (email, displayName)
- ✅ Token expiration matching Decision 2c
- ✅ Ready to enable MFA later

---

## Setup Step 2: Configure Database

### Option A: Use Aurora via RDS Proxy (Recommended)

If you've already created Aurora, connect it via RDS Proxy:

```typescript
// amplify/data.ts
import { defineData } from '@aws-amplify/backend'
import { Schema } from './resource'

/**
 * Connect to existing Aurora database
 * Amplify Gen 2 can proxy to RDS
 */

export const data = defineData({
  authorizationModes: {
    defaultAuthorizationMode: 'userPool'  // Cognito auth
  },
  // Custom SQL resolver pointing to Aurora
  customSqlResolvers: {
    getEvents: {
      sql: `
        SELECT * FROM events_active
        WHERE group_id = $1
        ORDER BY date_range_start ASC
      `,
      requestMappingTemplate: `
        {
          "statements": [
            "SELECT * FROM events_active WHERE group_id = '$context.identity.sub' AND deleted_at IS NULL"
          ]
        }
      `
    }
  }
})
```

### Option B: Use AppSync + DynamoDB (Easier for Amplify)

For faster setup, use Amplify's built-in AppSync + DynamoDB:

```typescript
// amplify/data.ts
import { defineData, type GraphQLAPI } from '@aws-amplify/backend'
import { Schema } from './resource'

export const data = defineData({
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    // Allow unauthenticated read for public event links (optional)
    apiKeyAuthorizationMode: {
      expiresInMinutes: 30
    }
  },
  schema: Schema
})
```

**Recommendation for Week 1:**
- Use **Option B** (DynamoDB) for faster MVP
- Migrate to Aurora in Week 2 when you have more time
- Both support your architecture patterns

---

## Setup Step 3: Define GraphQL Schema

### `amplify/resource.ts`

```typescript
import { a, defineSchema } from '@aws-amplify/backend'

/**
 * GraphQL Schema for get-together
 * Aligned with database schema patterns
 * Pattern 1: camelCase for API (matches TypeScript)
 * Pattern 9: Real-time subscriptions enabled
 */

const schema = a.schema({
  // User type
  User: a
    .model({
      id: a.id(),
      email: a.email().required(),
      displayName: a.string(),
      avatarUrl: a.url(),
      timezone: a.string().default('UTC'),
      notificationPreferences: a.json().default('{}'),
      version: a.int().default(1)  // Optimistic locking (Decision 1c)
    })
    .authorization(allow => [
      allow.owner()  // Users can only read their own profile
    ]),

  // Group type
  Group: a
    .model({
      id: a.id(),
      name: a.string().required(),
      description: a.string(),
      inviteCode: a.string().required(),
      ownerId: a.id().required(),
      owner: a.belongsTo('User', 'ownerId'),
      isPublic: a.boolean().default(false),
      maxMembers: a.int().default(100),
      members: a.hasMany('GroupMembership', 'groupId'),
      events: a.hasMany('Event', 'groupId'),
      version: a.int().default(1)  // Optimistic locking (Decision 1c)
    })
    .authorization(allow => [
      allow.owner(),  // Owner can manage
      allow.private()  // Members can read (custom logic in resolver)
    ]),

  // Group Membership
  GroupMembership: a
    .model({
      id: a.id(),
      userId: a.id().required(),
      user: a.belongsTo('User', 'userId'),
      groupId: a.id().required(),
      group: a.belongsTo('Group', 'groupId'),
      isAdmin: a.boolean().default(false),
      joinedAt: a.datetime(),
      lastActivityAt: a.datetime(),
      version: a.int().default(1)  // Optimistic locking (Decision 1c)
    })
    .authorization(allow => [
      allow.owner()
    ]),

  // Event (Event Proposal)
  Event: a
    .model({
      id: a.id(),
      groupId: a.id().required(),
      group: a.belongsTo('Group', 'groupId'),
      creatorId: a.id().required(),
      creator: a.belongsTo('User', 'creatorId'),
      title: a.string().required(),
      description: a.string(),
      dateRangeStart: a.date().required(),
      dateRangeEnd: a.date().required(),
      thresholdInCount: a.int().default(3),
      finalizedDate: a.date(),
      status: a.enum(['proposed', 'scheduled', 'completed']).default('proposed'),
      rsvpInCount: a.int().default(0),  // Denormalized (Pattern 5)
      rsvpMaybeCount: a.int().default(0),
      rsvpOutCount: a.int().default(0),
      rsvps: a.hasMany('RSVP', 'eventId'),
      comments: a.hasMany('Comment', 'eventId'),
      version: a.int().default(1)  // Optimistic locking (Decision 1c)
    })
    .authorization(allow => [
      allow.owner()  // Creator owns
    ]),

  // RSVP (Event Response) - High concurrency
  RSVP: a
    .model({
      id: a.id(),
      eventId: a.id().required(),
      event: a.belongsTo('Event', 'eventId'),
      userId: a.id().required(),
      user: a.belongsTo('User', 'userId'),
      status: a.enum(['in', 'maybe', 'out']).required(),
      version: a.int().default(1)  // CRITICAL: Optimistic locking (Decision 1c)
    })
    .authorization(allow => [
      allow.owner()  // User can only manage own RSVP
    ])
    .primaryKey(['eventId', 'userId']),  // Composite key: one RSVP per user per event

  // Availability (Soft Calendar)
  Availability: a
    .model({
      id: a.id(),
      groupId: a.id().required(),
      group: a.belongsTo('Group', 'groupId'),
      userId: a.id().required(),
      user: a.belongsTo('User', 'userId'),
      dayOfWeek: a.int().required(),  // 0-6
      startTime: a.string().required(),  // HH:MM:SS
      endTime: a.string().required(),
      isFree: a.boolean().required(),
      recurrsWeekly: a.boolean().default(true),
      expiresAt: a.datetime(),
      version: a.int().default(1)  // Optimistic locking (Decision 1c)
    })
    .authorization(allow => [
      allow.owner()
    ]),

  // Wishlist Item
  WishlistItem: a
    .model({
      id: a.id(),
      groupId: a.id().required(),
      group: a.belongsTo('Group', 'groupId'),
      creatorId: a.id().required(),
      creator: a.belongsTo('User', 'creatorId'),
      title: a.string().required(),
      description: a.string(),
      imageUrl: a.url(),
      linkUrl: a.url(),
      category: a.string(),
      interestCount: a.int().default(0),  // Denormalized
      convertedToEventId: a.id(),
      interests: a.hasMany('WishlistInterest', 'wishlistItemId'),
      version: a.int().default(1)  // Optimistic locking (Decision 1c)
    })
    .authorization(allow => [
      allow.owner()
    ]),

  // Wishlist Interest
  WishlistInterest: a
    .model({
      id: a.id(),
      wishlistItemId: a.id().required(),
      wishlistItem: a.belongsTo('WishlistItem', 'wishlistItemId'),
      userId: a.id().required(),
      user: a.belongsTo('User', 'userId'),
      version: a.int().default(1)
    })
    .authorization(allow => [
      allow.owner()
    ])
    .primaryKey(['wishlistItemId', 'userId']),

  // Comment
  Comment: a
    .model({
      id: a.id(),
      groupId: a.id().required(),
      group: a.belongsTo('Group', 'groupId'),
      creatorId: a.id().required(),
      creator: a.belongsTo('User', 'creatorId'),
      content: a.string().required(),
      eventId: a.id(),  // Comment on event OR
      event: a.belongsTo('Event', 'eventId'),
      wishlistItemId: a.id(),  // Comment on wishlist item
      wishlistItem: a.belongsTo('WishlistItem', 'wishlistItemId'),
      version: a.int().default(1)
    })
    .authorization(allow => [
      allow.owner()
    ])
})

export type Schema = typeof schema
```

---

## Setup Step 4: Backend Definition

### `amplify/backend.ts`

```typescript
import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth'
import { data } from './data'

/**
 * Define the complete backend
 * Combines authentication + database
 */

defineBackend({
  auth,
  data
})
```

---

## Setup Step 5: Configure Frontend

### `amplify.json` (created by init, may need adjustments)

```json
{
  "projectName": "get-together",
  "version": "1",
  "defaultEditorMode": "codeEditor"
}
```

### `.env.local`

```bash
# Amplify will generate these after deployment
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_USER_POOL_ID=us-east-1_xxxxx
NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID=xxxxx
NEXT_PUBLIC_COGNITO_DOMAIN=get-together-dev.auth.us-east-1.amazoncognito.com
```

---

## Step 6: Connect Frontend to Backend

### `src/app/layout.tsx`

```typescript
'use client'

import { Amplify } from 'aws-amplify'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import outputs from '@/../amplify_outputs.json'

// Configure Amplify with backend outputs
Amplify.configure(outputs)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Authenticator>
          {({ signOut, user }) => (
            <main>
              {children}
            </main>
          )}
        </Authenticator>
      </body>
    </html>
  )
}
```

### `src/app/page.tsx`

```typescript
'use client'

import { useAuthenticator } from '@aws-amplify/ui-react'
import { useEffect } from 'react'

export default function Home() {
  const { user, signOut } = useAuthenticator()

  return (
    <div>
      <h1>Welcome, {user?.username}!</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

---

## Step 7: Deploy & Create Backend

```bash
# Deploy the backend
amplify deploy

# Choose:
# ? Continue? Yes
# ? Do you want to generate code for your newly created GraphQL API? Yes
```

This will:
1. Create Cognito user pool
2. Create AppSync GraphQL API
3. Create DynamoDB tables
4. Generate TypeScript types in `amplify/` folder
5. Create `amplify_outputs.json` with configuration

---

## Step 8: Run Locally

```bash
# Start dev server with Amplify backend
npm run dev

# Amplify will use:
# - Local DynamoDB if installed (npx amplify sandbox)
# - Or live AWS services during development
```

---

## Using Amplify Data in Components

### Example: Fetch Groups (using generated types)

```typescript
'use client'

import { generateClient } from 'aws-amplify/api'
import { listGroups } from '@/../amplify/graphql/queries'  // Auto-generated
import { useQuery } from '@tanstack/react-query'

const client = generateClient()

export function GroupList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await client.graphql({
        query: listGroups
      })
      return response.data.listGroups.items
    }
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {data?.map(group => (
        <div key={group.id}>
          <h3>{group.name}</h3>
        </div>
      ))}
    </div>
  )
}
```

### Example: Create Event with Optimistic Locking (Decision 1c)

```typescript
'use client'

import { generateClient } from 'aws-amplify/api'
import { createEvent } from '@/../amplify/graphql/mutations'  // Auto-generated
import { useMutation } from '@tanstack/react-query'

const client = generateClient()

export function CreateEventForm() {
  const mutation = useMutation({
    mutationFn: async (input: CreateEventInput) => {
      return await client.graphql({
        query: createEvent,
        variables: { input }
      })
    },
    onSuccess: (response) => {
      // Optimistic update succeeded
      console.log('Event created:', response.data.createEvent)
    },
    onError: (error) => {
      // Handle conflict (409) from version mismatch
      if (error.message.includes('version')) {
        // Refetch and retry
      }
    }
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      mutation.mutate({
        groupId: 'group-123',
        title: 'Coffee Meetup',
        dateRangeStart: '2026-03-15',
        dateRangeEnd: '2026-03-20',
        thresholdInCount: 3,
        version: 1  // For optimistic locking (Decision 1c)
      })
    }}>
      {/* Form fields */}
    </form>
  )
}
```

---

## Real-Time Subscriptions (Pattern 9)

### Subscribe to RSVP Changes

```typescript
'use client'

import { generateClient } from 'aws-amplify/api'
import { onCreateRSVP, onUpdateRSVP } from '@/../amplify/graphql/subscriptions'  // Auto-generated
import { useEffect, useState } from 'react'

const client = generateClient()

export function RSVPMomentum({ eventId }: { eventId: string }) {
  const [rsvps, setRSVPs] = useState<any[]>([])

  useEffect(() => {
    // Subscribe to new RSVPs
    const subscription1 = client.graphql({
      query: onCreateRSVP
    }).subscribe({
      next: ({ data }) => {
        if (data.onCreateRSVP.eventId === eventId) {
          setRSVPs(prev => [...prev, data.onCreateRSVP])
        }
      }
    })

    // Subscribe to RSVP updates
    const subscription2 = client.graphql({
      query: onUpdateRSVP
    }).subscribe({
      next: ({ data }) => {
        if (data.onUpdateRSVP.eventId === eventId) {
          setRSVPs(prev =>
            prev.map(r => r.id === data.onUpdateRSVP.id ? data.onUpdateRSVP : r)
          )
        }
      }
    })

    return () => {
      subscription1.unsubscribe()
      subscription2.unsubscribe()
    }
  }, [eventId])

  const inCount = rsvps.filter(r => r.status === 'in').length
  const maybeCount = rsvps.filter(r => r.status === 'maybe').length
  const outCount = rsvps.filter(r => r.status === 'out').length

  return (
    <div className="flex gap-4">
      <div>
        <span className="font-bold text-green-600">{inCount}</span> In
      </div>
      <div>
        <span className="font-bold text-yellow-600">{maybeCount}</span> Maybe
      </div>
      <div>
        <span className="font-bold text-red-600">{outCount}</span> Out
      </div>
    </div>
  )
}
```

---

## Amplify Gen 2 vs Gen 1

| Feature | Gen 1 | Gen 2 |
|---------|-------|-------|
| Configuration | Interactive CLI | TypeScript code |
| Learning curve | Moderate | Steep (but worth it) |
| Type safety | Partial | Complete |
| Backend as code | No | Yes ✅ |
| Version control | Config in git | Everything in git ✅ |
| Local development | sandbox | amplify sandbox |
| Flexibility | Limited | High ✅ |

**Gen 2 is better for:**
- Type-safe backend definition
- Version control of infrastructure
- Complex authorization rules
- Long-term maintainability ✅

---

## Common Amplify Gen 2 Commands

```bash
# Deploy to AWS
amplify deploy

# Local development with sandbox
amplify sandbox

# Watch for changes and redeploy
amplify watch

# Pull backend from AWS (if created elsewhere)
amplify pull

# Remove backend
amplify delete

# Check status
amplify status
```

---

## Architecture Alignment

✅ **Pattern 1**: TypeScript definitions auto-generated from GraphQL schema
✅ **Pattern 2**: Amplify responses wrapped automatically
✅ **Decision 1c**: Version field on all models for optimistic locking
✅ **Decision 2a**: Cognito user pool + custom authorization rules
✅ **Decision 2c**: Token management configured in auth.ts
✅ **Pattern 9**: Real-time subscriptions built-in
✅ **Decision 4a**: Apollo Client / Amplify Client as single source of truth

---

## Next Steps

1. **Run amplify init** and follow prompts
2. **Copy schema definition** from `amplify/resource.ts` above
3. **Deploy:** `amplify deploy`
4. **Connect frontend:** Update layout.tsx with Authenticator
5. **Build components** using generated queries/mutations

All done! You now have production infrastructure + type safety + real-time subscriptions ready for Week 1 MVP. 🚀
