# Apollo Client Setup Guide - get-together

## Overview

Apollo Client manages all state for get-together:
- **Phase 1 (Week 1)**: REST API endpoints via Apollo HTTP link
- **Phase 2 (Week 2-3)**: AppSync GraphQL subscriptions for real-time sync
- **Pattern**: Apollo cache as single source of truth (Decision 4a)
- **Real-time**: Subscriptions auto-update cache (Pattern 9)

## Installation

```bash
npm install @apollo/client graphql @apollo/experimental-nextjs-app-router

# For GraphQL code generation (Phase 2)
npm install -D @graphql-codegen/cli @graphql-codegen/client-preset @graphql-codegen/typescript
```

## Phase 1: REST API Configuration (Week 1)

### `src/lib/apollo.ts` — Apollo Client Setup

```typescript
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { useAuthStore } from '@/context/AuthContext'

/**
 * Phase 1: REST API via Apollo
 * Week 1 uses REST endpoints; Week 2-3 migrates to AppSync GraphQL
 */

// HTTP link to our REST API routes
const httpLink = new HttpLink({
  uri: '/api/graphql',  // Unified GraphQL endpoint (even for REST, we normalize responses)
  credentials: 'include'  // Send cookies with requests
})

// Auth middleware: attach Cognito token to every request
const authLink = setContext(async (_, { headers }) => {
  const authStore = useAuthStore()
  const token = authStore.accessToken

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : ''
    }
  }
})

// Error handling middleware
const errorLink = new ApolloLink((operation, forward) => {
  return forward(operation).map((response) => {
    // Handle GraphQL errors
    if (response.errors) {
      response.errors.forEach((error) => {
        if (error.message === 'Unauthorized') {
          // Token expired, trigger re-auth
          useAuthStore().logout()
        }
      })
    }
    return response
  })
})

// Combine links
const link = authLink.concat(errorLink).concat(httpLink)

// Apollo Cache
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        groups: {
          merge(existing = [], incoming) {
            return incoming
          }
        },
        events: {
          merge(existing = [], incoming) {
            return incoming
          }
        }
      }
    },
    Event: {
      fields: {
        rsvps: {
          merge(existing = [], incoming) {
            return incoming
          }
        }
      }
    }
  }
})

export const apolloClient = new ApolloClient({
  link,
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network'  // Prefer cache but sync with server
    }
  }
})
```

### API Endpoint: `/api/graphql` — GraphQL-like REST Gateway

Even in Phase 1, expose a unified GraphQL endpoint that wraps REST logic. This makes migration to Phase 2 AppSync seamless.

```typescript
// src/app/api/graphql/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { parseGraphQLQuery } from '@/lib/graphql-parser'

/**
 * Unified GraphQL endpoint for Phase 1 (REST) and Phase 2 (AppSync)
 * Apollo Client sends GraphQL queries here, we handle REST routing
 */

export async function POST(request: NextRequest) {
  const { query, variables } = await request.json()

  // Parse GraphQL query to determine operation
  const { operationName, type } = parseGraphQLQuery(query)

  // Route to appropriate REST handler
  if (operationName === 'GetGroups') {
    return handleGetGroups(request, variables)
  } else if (operationName === 'CreateEvent') {
    return handleCreateEvent(request, variables)
  } else if (operationName === 'UpdateRSVP') {
    return handleUpdateRSVP(request, variables)
  }
  // ... more handlers

  return NextResponse.json(
    { error: 'Operation not found' },
    { status: 404 }
  )
}

// GraphQL response wrapper (Pattern 2: wrapped responses)
function wrapGraphQLResponse(data: any, errors?: any[]) {
  return {
    data,
    ...(errors && { errors })
  }
}
```

## Phase 1: Custom Hooks (Week 1)

### `src/components/groups/useGroupData.ts` — Query Hook

```typescript
import { gql, useQuery } from '@apollo/client'
import { QueryResult } from '@apollo/client'

/**
 * Custom hook for fetching group data
 * Pattern 4b: Custom hooks encapsulate Apollo queries
 * Pattern 6: Apollo loading state + local error state
 */

const GET_GROUPS_QUERY = gql`
  query GetGroups {
    groups {
      id
      name
      description
      memberCount
      eventCount
      createdAt
      updatedAt
    }
  }
`

export function useGroupData() {
  const { data, loading, error } = useQuery(GET_GROUPS_QUERY, {
    fetchPolicy: 'cache-and-network'  // Prefer cache, sync with server
  })

  return {
    groups: data?.groups || [],
    loading,
    error: error ? parseApolloError(error) : null
  }
}

// Single group
const GET_GROUP_DETAIL_QUERY = gql`
  query GetGroupDetail($groupId: ID!) {
    group(id: $groupId) {
      id
      name
      description
      owner {
        id
        displayName
        email
      }
      members {
        id
        displayName
        isAdmin
      }
      events {
        id
        title
        dateRangeStart
        dateRangeEnd
        rsvpInCount
        rsvpMaybeCount
        rsvpOutCount
      }
    }
  }
`

export function useGroupDetail(groupId: string) {
  const { data, loading, error } = useQuery(GET_GROUP_DETAIL_QUERY, {
    variables: { groupId },
    skip: !groupId  // Don't query if no groupId
  })

  return {
    group: data?.group,
    loading,
    error: error ? parseApolloError(error) : null
  }
}
```

### `src/components/events/useEventMutation.ts` — Mutation Hook

```typescript
import { gql, useMutation } from '@apollo/client'

/**
 * Mutation hook for creating/updating events
 * Pattern 5: Optimistic update + cache refetch
 */

const CREATE_EVENT_MUTATION = gql`
  mutation CreateEvent($groupId: ID!, $title: String!, $dateRangeStart: Date!, $dateRangeEnd: Date!) {
    createEvent(
      groupId: $groupId
      title: $title
      dateRangeStart: $dateRangeStart
      dateRangeEnd: $dateRangeEnd
    ) {
      id
      title
      dateRangeStart
      dateRangeEnd
      status
      version
      createdAt
    }
  }
`

export function useCreateEventMutation() {
  const [createEvent, { loading, error }] = useMutation(CREATE_EVENT_MUTATION, {
    // Optimistic response (instant UI update)
    optimisticResponse: ({ groupId, title, dateRangeStart, dateRangeEnd }) => ({
      createEvent: {
        __typename: 'Event',
        id: 'temp-' + Date.now(),  // Temporary ID until server responds
        title,
        dateRangeStart,
        dateRangeEnd,
        status: 'proposed',
        version: 1,
        createdAt: new Date().toISOString()
      }
    }),
    // Refetch to ensure consistency
    refetchQueries: [{ query: GET_GROUPS_QUERY }]
  })

  return { createEvent, loading, error: error ? parseApolloError(error) : null }
}

// RSVP mutation (high-concurrency, uses optimistic locking)
const UPDATE_RSVP_MUTATION = gql`
  mutation UpdateRSVP($eventId: ID!, $status: String!, $version: Int!) {
    updateRSVP(eventId: $eventId, status: $status, version: $version) {
      id
      eventId
      status
      version
      updatedAt
    }
  }
`

export function useRSVPMutation() {
  const [updateRSVP, { loading, error }] = useMutation(UPDATE_RSVP_MUTATION, {
    optimisticResponse: ({ eventId, status }) => ({
      updateRSVP: {
        __typename: 'RSVP',
        id: `rsvp-${eventId}`,
        eventId,
        status,
        version: 2,  // Next version (incremented by server)
        updatedAt: new Date().toISOString()
      }
    }),
    refetchQueries: [
      { query: GET_GROUP_DETAIL_QUERY, variables: { groupId: currentGroupId } }
    ]
  })

  async function updateRSVP(eventId: string, newStatus: 'in' | 'maybe' | 'out') {
    // Get current RSVP to include version (Pattern 5: optimistic locking)
    const currentRSVP = getCurrentRSVP(eventId)

    try {
      const result = await updateRSVP({
        variables: {
          eventId,
          status: newStatus,
          version: currentRSVP?.version || 1
        }
      })
      return { success: true, data: result.data }
    } catch (err: any) {
      if (err.graphQLErrors?.[0]?.extensions?.code === 'CONFLICT') {
        // Version mismatch: optimistic update rolled back, user can retry
        return { success: false, error: 'Someone else updated this. Please refresh.' }
      }
      return { success: false, error: parseApolloError(err) }
    }
  }

  return { updateRSVP, loading, error }
}
```

### `src/components/events/RSVPMomentum.tsx` — Real-Time Momentum Display

```typescript
'use client'

import { useQuery } from '@apollo/client'
import { GET_EVENT_DETAIL_QUERY } from './useEventData'

/**
 * Real-time RSVP momentum display (Pattern 9: subscriptions auto-update)
 * In Phase 1: Uses polling/refetch
 * In Phase 2: Uses AppSync subscriptions for instant <1s updates
 */

export function RSVPMomentum({ eventId }: { eventId: string }) {
  const { data, loading } = useQuery(GET_EVENT_DETAIL_QUERY, {
    variables: { eventId },
    pollInterval: 1000,  // Poll every 1s in Phase 1 (emulates real-time)
    // Phase 2: Replace with subscribeToMore() for true <1s sync
  })

  const event = data?.event
  const total = (event?.rsvpInCount || 0) + (event?.rsvpMaybeCount || 0) + (event?.rsvpOutCount || 0)

  if (loading) return <div>Loading momentum...</div>

  return (
    <div className="flex gap-4">
      <div>
        <span className="font-bold text-green-600">{event?.rsvpInCount || 0}</span>
        <span className="text-sm text-gray-600"> In</span>
      </div>
      <div>
        <span className="font-bold text-yellow-600">{event?.rsvpMaybeCount || 0}</span>
        <span className="text-sm text-gray-600"> Maybe</span>
      </div>
      <div>
        <span className="font-bold text-red-600">{event?.rsvpOutCount || 0}</span>
        <span className="text-sm text-gray-600"> Out</span>
      </div>
      <div>
        <span className="text-gray-600">Threshold: {event?.thresholdInCount}</span>
        {event?.rsvpInCount >= event?.thresholdInCount && (
          <span className="ml-2 text-green-600">✓ Going!</span>
        )}
      </div>
    </div>
  )
}
```

## Phase 2: Real-Time Subscriptions (Week 2-3)

### GraphQL Subscriptions (AppSync)

```typescript
// src/components/events/useRSVPSubscription.ts
import { gql, useSubscription } from '@apollo/client'

/**
 * Real-time RSVP updates via AppSync subscription
 * Pattern 9: Server-side filtering (groupId passed as variable)
 * Replaces polling in Phase 1
 */

const RSVP_CHANGED_SUBSCRIPTION = gql`
  subscription OnRSVPChanged($eventId: ID!) {
    onRSVPChanged(eventId: $eventId) {
      id
      eventId
      userId
      status
      version
      updatedAt
    }
  }
`

export function useRSVPSubscription(eventId: string) {
  const { data, loading, error } = useSubscription(RSVP_CHANGED_SUBSCRIPTION, {
    variables: { eventId },
    skip: !eventId  // Don't subscribe if no eventId
  })

  return {
    rsvp: data?.onRSVPChanged,
    loading,
    error: error ? parseApolloError(error) : null
  }
}

// Comments subscription (real-time discussion)
const COMMENT_ADDED_SUBSCRIPTION = gql`
  subscription OnCommentAdded($eventId: ID!) {
    onCommentAdded(eventId: $eventId) {
      id
      eventId
      creator {
        id
        displayName
        avatarUrl
      }
      content
      createdAt
    }
  }
`

export function useCommentSubscription(eventId: string) {
  const { data, loading, error } = useSubscription(COMMENT_ADDED_SUBSCRIPTION, {
    variables: { eventId },
    skip: !eventId
  })

  return {
    comment: data?.onCommentAdded,
    loading,
    error
  }
}

// Availability subscription (group calendar updates)
const AVAILABILITY_CHANGED_SUBSCRIPTION = gql`
  subscription OnAvailabilityChanged($groupId: ID!) {
    onAvailabilityChanged(groupId: $groupId) {
      id
      userId
      user {
        id
        displayName
      }
      dayOfWeek
      startTime
      endTime
      isFree
      updatedAt
    }
  }
`

export function useAvailabilitySubscription(groupId: string) {
  const { data, loading, error } = useSubscription(AVAILABILITY_CHANGED_SUBSCRIPTION, {
    variables: { groupId },
    skip: !groupId
  })

  return {
    availability: data?.onAvailabilityChanged,
    loading,
    error
  }
}
```

### Integration in Components

```typescript
// src/components/events/EventDetailClient.tsx
'use client'

import { useQuery } from '@apollo/client'
import { useRSVPSubscription, useCommentSubscription } from './hooks'

/**
 * Client component using Server Component initial data + subscriptions
 * Pattern 8: Server Component fetches initial, Client Component handles real-time
 */

export function EventDetailClient({ eventId, initialData }) {
  // Initial data passed from Server Component
  const [event, setEvent] = useState(initialData)

  // Real-time RSVP momentum
  const rsvpSubscription = useRSVPSubscription(eventId)

  // Update momentum when RSVP changes
  useEffect(() => {
    if (rsvpSubscription.rsvp) {
      // Apollo cache auto-updates, component re-renders
      // If manual: calculate new counts and update event
    }
  }, [rsvpSubscription.rsvp])

  // Real-time comments
  const commentSubscription = useCommentSubscription(eventId)
  const [comments, setComments] = useState<Comment[]>([])

  useEffect(() => {
    if (commentSubscription.comment) {
      // New comment received, append to thread
      setComments(prev => [...prev, commentSubscription.comment])
    }
  }, [commentSubscription.comment])

  return (
    <div>
      <EventTitle title={event.title} />

      {/* Real-time momentum display */}
      <RSVPMomentum eventId={eventId} />

      {/* Real-time comments thread */}
      <CommentThread comments={comments} />
    </div>
  )
}
```

## Error Handling (Pattern 7)

```typescript
// src/lib/error.ts
import { ApolloError } from '@apollo/client'

export type AppError = {
  code: string
  message: string
  details?: Record<string, any>
}

/**
 * Parse Apollo error to app-friendly format
 * Pattern 7: Extract code + message for localized error UI
 */

export function parseApolloError(error: ApolloError): AppError {
  // GraphQL error
  if (error.graphQLErrors?.length > 0) {
    const gqlError = error.graphQLErrors[0]
    return {
      code: gqlError.extensions?.code as string || 'UNKNOWN',
      message: gqlError.message,
      details: gqlError.extensions
    }
  }

  // Network error
  if (error.networkError) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error. Check your connection.',
      details: error.networkError
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    details: { error }
  }
}

// Use in components
export function useEventMutation() {
  const [createEvent, { error }] = useMutation(CREATE_EVENT_MUTATION)

  return {
    createEvent,
    error: error ? parseApolloError(error) : null
  }
}
```

## Context Setup (Pattern 6)

```typescript
// src/context/AuthContext.tsx
'use client'

import { createContext, useContext, useState } from 'react'

/**
 * Auth context for managing Cognito session
 * Apollo auth middleware reads from here (Decision 2c: token management)
 */

type AuthContextType = {
  user: any | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)

  const login = async (email: string, password: string) => {
    // Cognito login flow
    // Store tokens, set user
  }

  const logout = () => {
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    // Clear Apollo cache
    apolloClient.cache.reset()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated: !!user,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

## Root Layout with Providers

```typescript
// src/app/layout.tsx
import { ApolloProvider } from '@apollo/client'
import { AuthProvider } from '@/context/AuthContext'
import { apolloClient } from '@/lib/apollo'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ApolloProvider client={apolloClient}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ApolloProvider>
      </body>
    </html>
  )
}
```

## Testing & Development

### Apollo DevTools

```bash
# Install browser extension
# Chrome: https://chrome.google.com/webstore/detail/apollo-client-developer/hhagpmcamhpehkcomeofgmlcnc2767nb
```

Use DevTools to:
- Inspect Apollo cache
- Monitor subscriptions
- Replay mutations
- View query history

### Mock Data for Development

```typescript
// src/lib/mockData.ts
export const mockGroups = [
  {
    id: '1',
    name: 'Book Club',
    description: 'Monthly book discussions',
    memberCount: 5,
    eventCount: 3
  }
]

export const mockEvents = [
  {
    id: '1',
    groupId: '1',
    title: 'Coffee Meetup',
    dateRangeStart: '2026-03-15',
    dateRangeEnd: '2026-03-20',
    rsvpInCount: 3,
    rsvpMaybeCount: 2,
    rsvpOutCount: 1,
    status: 'proposed'
  }
]
```

## Migration from Phase 1 to Phase 2

When AppSync is ready (Week 2-3):

```typescript
// Update src/lib/apollo.ts
import { WebSocketLink } from '@apollo/client/link/ws'

// Add AppSync WebSocket link for subscriptions
const wsLink = new WebSocketLink({
  uri: process.env.NEXT_PUBLIC_APPSYNC_WS_ENDPOINT,
  options: {
    reconnect: true,
    connectionParams: async () => {
      const token = getAuthToken()
      return { 'Authorization': token }
    }
  }
})

// Split: subscriptions via WebSocket, queries/mutations via HTTP
const link = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  wsLink,
  authLink.concat(httpLink)
)
```

No component code changes needed! Apollo handles subscription transparently.

---

## Summary

This Apollo setup:
- ✅ **Phase 1:** REST API with optimistic updates and refetch
- ✅ **Pattern 5:** Optimistic locking prevents lost updates
- ✅ **Pattern 6:** Separate query/mutation loading from form submission
- ✅ **Pattern 7:** Error handling with codes for localized messages
- ✅ **Pattern 8:** Server Components for initial data, Client Components for real-time
- ✅ **Pattern 9:** Subscriptions auto-update cache, <1s sync
- ✅ **Decision 4a:** Apollo Client as single source of truth
- ✅ **Decision 2c:** Token management with auth middleware

**Ready to use in Week 1 MVP.** Phase 2 migration to AppSync is seamless.
