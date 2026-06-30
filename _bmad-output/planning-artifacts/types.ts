/**
 * TypeScript Type Definitions for get-together
 * Matches database schema exactly (Pattern 1: snake_case in DB, camelCase in TS)
 * Used throughout API routes, components, and GraphQL
 */

/**
 * User - AWS Cognito managed, our DB stores reference
 */
export type User = {
  id: string  // UUID
  cognitoSub: string  // AWS Cognito user ID (from auth token)
  email: string
  displayName?: string
  avatarUrl?: string
  timezone: string  // e.g., 'America/New_York'
  notificationPreferences: {
    emailOnRsvp: boolean
    emailOnComment: boolean
    pushOnEventChanges: boolean
  }
  version: number  // Optimistic locking (Decision 1c)
  createdAt: string  // ISO 8601
  updatedAt: string  // ISO 8601
  deletedAt?: string  // Soft delete (Decision 1d)
}

/**
 * Group - Primary organizing unit
 * All data in get-together is group-scoped (Decision 2a)
 */
export type Group = {
  id: string  // UUID
  name: string
  description?: string
  inviteCode: string  // Public code for invite links
  ownerId: string  // User ID
  isPublic: boolean  // Whether invite link is publicly shareable
  maxMembers: number
  version: number  // Optimistic locking
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * Group with relationship data (from query with JOINs)
 */
export type GroupDetail = Group & {
  owner: User
  members: GroupMember[]
  events: Event[]
  memberCount: number
  eventCount: number
}

/**
 * GroupMembership - Links users to groups
 * Tracks role (admin can remove members)
 */
export type GroupMembership = {
  id: string  // UUID
  userId: string
  groupId: string
  isAdmin: boolean  // Admin role (Decision 2a)
  joinedAt: string
  lastActivityAt?: string
  version: number
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * GroupMember - Membership with user details (from JOIN)
 */
export type GroupMember = GroupMembership & {
  user: User
}

/**
 * RSVP Status
 */
export type RSVPStatus = 'in' | 'maybe' | 'out'

/**
 * Event / Event Proposal
 * Central to momentum mechanic (real-time RSVP counts)
 */
export type Event = {
  id: string  // UUID
  groupId: string  // All events are group-scoped
  creatorId: string  // User who proposed
  title: string
  description?: string
  dateRangeStart: string  // Date (YYYY-MM-DD)
  dateRangeEnd: string  // Date (YYYY-MM-DD)
  thresholdInCount: number  // How many "in" votes to schedule
  finalizedDate?: string  // If scheduled, the chosen date
  status: 'proposed' | 'scheduled' | 'completed'
  // Denormalized for real-time performance (Pattern 5)
  rsvpInCount: number
  rsvpMaybeCount: number
  rsvpOutCount: number
  version: number  // Optimistic locking
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * Event with relationship data
 */
export type EventDetail = Event & {
  creator: User
  rsvps: RSVP[]
  comments: Comment[]
  thresholdMet: boolean  // Computed: rsvpInCount >= thresholdInCount
}

/**
 * RSVP - Event Response tracking
 * High-concurrency: 500+ RSVPs/minute (PRD)
 * Uses optimistic locking to prevent lost updates (Decision 1c)
 */
export type RSVP = {
  id: string  // UUID
  eventId: string
  userId: string
  status: RSVPStatus
  version: number  // CRITICAL: Optimistic locking (Decision 1c)
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * RSVP with user details
 */
export type RSVPWithUser = RSVP & {
  user: User
}

/**
 * Availability - Free/busy time blocks (Soft Calendar)
 * Does NOT store event details (privacy requirement)
 * Only stores free/busy blocks
 */
export type Availability = {
  id: string  // UUID
  groupId: string  // All availability is group-scoped
  userId: string
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6  // Monday-Sunday
  startTime: string  // Time (HH:MM:SS), e.g., '09:00:00'
  endTime: string  // Time (HH:MM:SS), e.g., '17:00:00'
  isFree: boolean  // true = available, false = busy
  recurrsWeekly: boolean  // Recurring pattern
  expiresAt?: string  // Optional expiration (max 6 hours old)
  version: number
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * Availability with user details
 */
export type AvailabilityWithUser = Availability & {
  user: User
}

/**
 * Wishlist Item
 * Can be converted to events
 */
export type WishlistItem = {
  id: string  // UUID
  groupId: string
  creatorId: string
  title: string
  description?: string
  imageUrl?: string
  linkUrl?: string  // Optional: external link (validated HTTP/HTTPS)
  category?: string  // e.g., 'restaurant', 'activity', 'movie'
  interestCount: number  // Denormalized count
  convertedToEventId?: string  // If converted, link to event
  version: number
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * Wishlist Item with creator details
 */
export type WishlistItemDetail = WishlistItem & {
  creator: User
  interests: WishlistInterest[]
}

/**
 * Wishlist Interest - User interested in item
 */
export type WishlistInterest = {
  id: string  // UUID
  wishlistItemId: string
  userId: string
  version: number
  createdAt: string
  deletedAt?: string
}

/**
 * Wishlist Interest with user details
 */
export type WishlistInterestWithUser = WishlistInterest & {
  user: User
}

/**
 * Comment
 * Comments on events and wishlist items
 * Real-time updates via AppSync subscription (Pattern 9)
 */
export type Comment = {
  id: string  // UUID
  groupId: string  // For authorization
  creatorId: string
  content: string
  eventId?: string  // Comment on event (mutually exclusive with wishlistItemId)
  wishlistItemId?: string  // Comment on wishlist item
  version: number
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * Comment with creator details
 */
export type CommentDetail = Comment & {
  creator: User
}

/**
 * API Response Wrapper (Pattern 2)
 * All successful API responses wrapped in this format
 */
export type APIResponse<T> = {
  data: T
  meta: {
    timestamp: string  // ISO 8601
    version?: string  // API version
    page?: number  // For paginated responses
    pageSize?: number
    total?: number
  }
}

/**
 * API Error Response
 * Structured errors (Pattern 7, Decision 3b)
 */
export type APIError = {
  error: {
    code: string  // e.g., 'PERMISSION_DENIED', 'CONFLICT', 'NOT_FOUND'
    message: string  // User-friendly message
    details?: Record<string, any>  // Additional context
  }
}

/**
 * Merged auth + app errors
 */
export type AppError = {
  code: string
  message: string
  details?: Record<string, any>
}

/**
 * Pagination
 */
export type Paginated<T> = {
  data: T[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

/**
 * GraphQL Mutation Input Types (Phase 2)
 */
export namespace GraphQL {
  export type CreateEventInput = {
    groupId: string
    title: string
    dateRangeStart: string  // YYYY-MM-DD
    dateRangeEnd: string  // YYYY-MM-DD
    thresholdInCount?: number
    description?: string
  }

  export type UpdateEventInput = {
    id: string
    title?: string
    description?: string
    thresholdInCount?: number
    version: number  // Optimistic locking (Decision 1c)
  }

  export type UpdateRSVPInput = {
    eventId: string
    status: RSVPStatus
    version: number  // CRITICAL: Optimistic locking (Decision 1c)
  }

  export type CreateCommentInput = {
    content: string
    eventId?: string  // Comment on event
    wishlistItemId?: string  // Or on wishlist item
  }

  export type UpdateAvailabilityInput = {
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6
    startTime: string
    endTime: string
    isFree: boolean
    recurrsWeekly?: boolean
    expiresAt?: string
  }
}

/**
 * Real-time Subscription Payload Types (Phase 2)
 */
export namespace Subscriptions {
  export type OnRSVPChanged = {
    onRSVPChanged: RSVPWithUser
  }

  export type OnCommentAdded = {
    onCommentAdded: CommentDetail
  }

  export type OnAvailabilityChanged = {
    onAvailabilityChanged: AvailabilityWithUser
  }

  export type OnWishlistItemAdded = {
    onWishlistItemAdded: WishlistItemDetail
  }

  export type OnEventStatusChanged = {
    onEventStatusChanged: Event & {
      newStatus: Event['status']
    }
  }
}

/**
 * Context types
 */
export type AuthContextType = {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  signup: (email: string, password: string, displayName: string) => Promise<void>
}

/**
 * Hook return types
 */
export type QueryState<T> = {
  data: T | null
  loading: boolean
  error: AppError | null
}

export type MutationState<T> = {
  mutate: (...args: any[]) => Promise<T>
  loading: boolean
  error: AppError | null
}
