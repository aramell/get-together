# Implementation Checklist - get-together Week 1 MVP

## 📋 Complete Package Overview

You now have everything needed for Week 1 implementation:

| Document | Purpose | Status |
|----------|---------|--------|
| `architecture.md` | All decisions, patterns, structure | ✅ Complete |
| `database-schema.sql` | PostgreSQL schema with soft deletes | ✅ Complete |
| `database-schema-guide.md` | Schema explanation & setup | ✅ Complete |
| `types.ts` | TypeScript type definitions | ✅ Complete |
| `apollo-client-setup.md` | State management config | ✅ Complete |
| `api-routes-example.ts` | Complete API route examples | ✅ Complete |
| `api-routes-file-structure.md` | File organization & utilities | ✅ Complete |

---

## 🚀 Week 1 Implementation Steps

### Phase 0: Setup (Day 1)

- [ ] Create Next.js app: `npx create-next-app@latest get-together-web --typescript --tailwind --app`
- [ ] Install dependencies: `npm install @apollo/client graphql pg zod @aws-amplify/auth`
- [ ] Initialize Amplify: `amplify init`
- [ ] Add Cognito: `amplify add auth`
- [ ] Create `.env.local` from `.env.example`
- [ ] Create AWS Aurora Serverless cluster (RDS console)
- [ ] Run database schema: `psql -h <endpoint> -f database-schema.sql`
- [ ] Test database connection

**Deliverable:** Ready-to-develop Next.js + Aurora setup

### Phase 1: Database & API (Days 2-4)

#### Copy Files to Project

```bash
# Copy schema guide for reference
cp database-schema-guide.md docs/

# Copy types
cp types.ts src/types/

# Copy utility functions
cp api-routes-example.ts -> src/lib/api-utils.ts (extract utils)
```

#### Implement API Routes

- [ ] Create `src/lib/api-utils.ts` (auth extraction, error responses)
- [ ] Create `src/app/api/events/route.ts` (GET/POST events)
- [ ] Create `src/app/api/events/[id]/route.ts` (GET/PUT event)
- [ ] Create `src/app/api/events/[id]/rsvps/route.ts` (RSVP mutations with optimistic locking)
- [ ] Create similar routes for:
  - [ ] `/api/groups/*` (group management)
  - [ ] `/api/calendar/*` (availability)
  - [ ] `/api/wishlist/*` (wishlist items)
  - [ ] `/api/comments/*` (comments)
- [ ] Test all endpoints with Postman/curl

**Key Implementation Notes:**
- All routes follow Pattern 2 (wrapped responses)
- All queries use Pattern 1 (snake_case → camelCase)
- Group membership verified on every endpoint (Decision 2a)
- Optimistic locking with version field on mutations (Decision 1c)

**Deliverable:** Fully functional REST API for all features

### Phase 2: Frontend Setup (Days 4-5)

#### Apollo Client Configuration

- [ ] Create `src/lib/apollo.ts` (Apollo Client setup)
- [ ] Create `src/context/AuthContext.tsx` (auth state)
- [ ] Create `src/context/providers.tsx` (root provider)
- [ ] Wrap app with providers in `src/app/layout.tsx`

#### Custom Hooks

- [ ] Create `src/components/groups/useGroupData.ts` (query hooks)
- [ ] Create `src/components/groups/useGroupMutation.ts` (mutation hooks)
- [ ] Create `src/components/events/useEventData.ts`
- [ ] Create `src/components/events/useEventMutation.ts`
- [ ] Create similar hooks for calendar, wishlist, comments

**Key Implementation Notes:**
- Hooks follow Pattern 4b (custom hooks encapsulate Apollo)
- Pattern 5: Optimistic updates + refetchQueries
- Pattern 6: Separate query loading from mutation loading
- Pattern 7: Error handling with parseApolloError()

**Deliverable:** Apollo Client fully integrated, ready for components

### Phase 3: Components (Days 5-7)

#### Core Components

- [ ] `src/components/auth/LoginForm.tsx` (Cognito login)
- [ ] `src/components/groups/GroupList.tsx` (server component with list)
- [ ] `src/components/groups/GroupDetail.tsx` (client component)
- [ ] `src/components/events/EventProposal.tsx` (create event form)
- [ ] `src/components/events/EventList.tsx` (upcoming events)
- [ ] `src/components/events/RSVPButtons.tsx` (in/maybe/out)
- [ ] `src/components/events/RSVPMomentum.tsx` (live momentum display)
- [ ] `src/components/calendar/CalendarGrid.tsx` (availability view)
- [ ] `src/components/wishlist/WishlistList.tsx` (items)
- [ ] `src/components/comments/CommentThread.tsx` (comments)

#### Pages

- [ ] `src/app/(auth)/login/page.tsx`
- [ ] `src/app/(auth)/signup/page.tsx`
- [ ] `src/app/dashboard/page.tsx` (home)
- [ ] `src/app/groups/page.tsx` (server component: list)
- [ ] `src/app/groups/new/page.tsx` (create form)
- [ ] `src/app/groups/[id]/page.tsx` (server component: detail)
- [ ] `src/app/groups/[id]/GroupDetailClient.tsx` (client component: real-time)
- [ ] `src/app/events/page.tsx`
- [ ] `src/app/calendar/page.tsx`
- [ ] `src/app/wishlist/page.tsx`

**Key Implementation Notes:**
- Pattern 8: Server Components for initial data, Client Components for real-time
- Use loading.tsx and error.tsx for Suspense UI
- Pattern 4b: Feature folder organization
- All errors handled with pattern 7

**Deliverable:** Complete Week 1 MVP with all features

### Phase 4: Testing & Deployment (Day 7)

- [ ] Run tests: `npm run test`
- [ ] Test all user flows:
  - [ ] Login via Cognito
  - [ ] Create group
  - [ ] Invite members
  - [ ] Propose event
  - [ ] RSVP to event (test momentum updates)
  - [ ] Mark availability
  - [ ] Add wishlist item
  - [ ] Comment on event
- [ ] Deploy to Amplify staging: `git push staging`
- [ ] Verify in staging environment
- [ ] Deploy to production: `git push main`

**Deliverable:** Live MVP in production

---

## ✅ Architecture Patterns Checklist

### Pattern 1: Naming (snake_case ↔ camelCase)
- [ ] Database queries use snake_case
- [ ] API responses use camelCase
- [ ] Conversion in `toCamelCase()` utility
- [ ] All types in TypeScript use camelCase

### Pattern 2: Response Format
- [ ] All success responses: `{ data, meta: { timestamp, version } }`
- [ ] All error responses: `{ error: { code, message, details } }`
- [ ] Meta includes timestamp in ISO 8601

### Pattern 3: Date Format
- [ ] All dates in API: ISO 8601 (YYYY-MM-DD)
- [ ] All timestamps: ISO 8601 with timezone (2026-02-27T16:48:30Z)
- [ ] Database stores UTC via TIMESTAMPTZ

### Pattern 4: Component Organization
- [ ] Components organized by feature (`/groups`, `/events`, etc.)
- [ ] Presentational components (display)
- [ ] Container components (fetch + logic)
- [ ] Custom hooks for data (`useGroupData.ts`)

### Pattern 5: Mutations & Optimistic Updates
- [ ] Optimistic response for instant UI feedback
- [ ] Version field in mutations for locking
- [ ] refetchQueries to sync cache
- [ ] Errors rolled back if mutation fails

### Pattern 6: Loading States
- [ ] Query loading: Apollo `loading` field
- [ ] Mutation loading: Apollo mutation `loading`
- [ ] Form loading: Local useState
- [ ] Naming: `isLoading[Feature]`

### Pattern 7: Error Handling
- [ ] Error Boundary for render errors
- [ ] Local state for mutation errors
- [ ] parseApolloError() extracts code + message
- [ ] Log errors to CloudWatch

### Pattern 8: Loading/Error UI
- [ ] Next.js `loading.tsx` for Suspense skeleton
- [ ] Next.js `error.tsx` for fallback UI
- [ ] Server Components fetch initial data
- [ ] Client Components handle subscriptions

### Pattern 9: Real-Time Subscriptions
- [ ] Phase 1: Use polling (Apollo pollInterval: 1000)
- [ ] Phase 2: Replace with AppSync subscriptions
- [ ] Server-side filtering (groupId variable)
- [ ] Apollo cache auto-updates on subscription events

### Decision 1c: Optimistic Locking
- [ ] Version field on all mutable tables
- [ ] Client includes version in mutations
- [ ] Server checks version before UPDATE
- [ ] 409 Conflict if version mismatch
- [ ] Apollo refetch handles retry

### Decision 2a: Group-Based Authorization
- [ ] Every endpoint checks group membership
- [ ] Query: `verifyGroupMembership(userId, groupId)`
- [ ] Return 403 if not member
- [ ] All data scoped to group

### Decision 2b: Auth Middleware
- [ ] Extract user from Authorization header
- [ ] verifyGroupMembership() called first
- [ ] Middleware enforces on every route
- [ ] Token validation (Cognito JWT)

### Decision 2c: Token Management
- [ ] Access token: 30 minutes
- [ ] Refresh token: 7 days (httpOnly cookie)
- [ ] Apollo auth link adds token to requests
- [ ] Auto-refresh on token expiry

### Decision 3b: Structured Errors
- [ ] All errors: `{ error: { code, message, details } }`
- [ ] Codes: UNAUTHORIZED, PERMISSION_DENIED, CONFLICT, etc.
- [ ] Message is user-friendly
- [ ] Details for debugging

### Decision 3c: Rate Limiting
- [ ] Per-user: 100 requests/minute
- [ ] Per-endpoint: RSVP max 5/second
- [ ] Idempotency keys prevent duplicates
- [ ] Return 429 if rate limited

### Decision 4a: Apollo as Single Source of Truth
- [ ] Apollo cache holds all remote data
- [ ] Components read from cache, don't fetch
- [ ] Subscriptions update cache atomically
- [ ] No duplicate fetches

---

## 🔧 Development Workflow

### Daily Standup
- What was accomplished yesterday?
- What will be done today?
- Any blockers?

### Testing
```bash
# Run tests
npm run test

# Test specific feature
npm run test -- events.test.ts

# Test with watch
npm run test -- --watch
```

### Development Server
```bash
# Start dev server
npm run dev

# Open http://localhost:3000
```

### Database Debugging
```bash
# Connect to database
psql -h <endpoint> -U app_user -d get_together

# Check soft delete pattern
SELECT * FROM events WHERE deleted_at IS NULL;

# Check versioning
SELECT id, version, status FROM rsvps WHERE event_id = '123';

# Monitor activity
SELECT * FROM events ORDER BY updated_at DESC LIMIT 5;
```

### Apollo DevTools
- Install browser extension
- Use to inspect Apollo cache
- Monitor subscriptions (Phase 2)
- Replay mutations
- View query history

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/event-proposal

# Commit frequently
git commit -m "Add event proposal form"

# Push to staging
git push origin feature/event-proposal

# Create PR and test in staging
# Once approved, merge to staging branch

# Deploy to production
git push origin main
```

---

## 📊 Progress Tracking

### Week 1 Milestones

**Day 1: Setup**
- [ ] Next.js + Amplify initialized
- [ ] Aurora cluster created
- [ ] Database schema deployed
- [ ] .env configured

**Day 2-3: API Routes**
- [ ] Auth endpoints working
- [ ] Group CRUD endpoints
- [ ] Event CRUD endpoints
- [ ] RSVP mutations with optimistic locking
- [ ] All tested with Postman

**Day 4: Apollo Client**
- [ ] Apollo Client configured
- [ ] Cognito integration
- [ ] Custom hooks for all features
- [ ] Error handling setup

**Day 5-6: Components**
- [ ] Auth pages (login/signup)
- [ ] Group pages (list/detail)
- [ ] Event pages (list/propose)
- [ ] RSVP buttons with momentum
- [ ] Calendar view
- [ ] Wishlist view
- [ ] Comments section

**Day 7: Polish & Deploy**
- [ ] UI responsive on mobile
- [ ] All error states handled
- [ ] Loading states visible
- [ ] Test in staging
- [ ] Deploy to production

---

## 🎯 Success Criteria

### Functional
- [ ] Users can login via Cognito
- [ ] Users can create and join groups
- [ ] Users can propose events with date range
- [ ] Users can RSVP (in/maybe/out)
- [ ] RSVP momentum displays in real-time (with polling in Phase 1)
- [ ] Users can mark availability
- [ ] Users can add wishlist items
- [ ] Users can comment on events/items
- [ ] All group data filtered by membership

### Performance
- [ ] Page load < 2s on 4G (via code splitting)
- [ ] RSVP update visible < 1s (via optimistic update)
- [ ] API responses < 500ms

### Architecture
- [ ] All patterns followed correctly
- [ ] All decisions implemented
- [ ] Optimistic locking prevents lost updates
- [ ] Soft deletes for GDPR

### Code Quality
- [ ] TypeScript strict mode
- [ ] All API routes tested
- [ ] Error handling complete
- [ ] No console errors/warnings

---

## 📚 Reference Documents

Keep these handy during implementation:

1. **architecture.md** — All decisions + patterns (refer often)
2. **database-schema-guide.md** — Schema details + query examples
3. **types.ts** — TypeScript definitions (copy to project)
4. **apollo-client-setup.md** — State management guide
5. **api-routes-file-structure.md** — API implementation guide

---

## 🚨 Common Pitfalls to Avoid

❌ **Forgetting to check group membership** (Decision 2a)
- Every query must verify user is in group

❌ **Skipping version field in mutations** (Decision 1c)
- Will lose updates in high-concurrency RSVP scenarios

❌ **Using raw DB column names in API** (Pattern 1)
- Must convert snake_case → camelCase

❌ **Not wrapping API responses** (Pattern 2)
- All responses must be `{ data, meta }`

❌ **Direct cache updates instead of refetch** (Pattern 5)
- Always use refetchQueries for consistency

❌ **Storing raw event details in calendar** (Decision 1d)
- Privacy requirement: only free/busy blocks

❌ **Forgetting soft delete filter in queries** (Decision 1d)
- Use `WHERE deleted_at IS NULL` or views

❌ **Mixing Apollo loading with form state** (Pattern 6)
- Keep separate: query loading vs form submission

---

## ✨ Week 1 Complete!

Once all items are checked, you have:
- ✅ Production-ready architecture
- ✅ Fully implemented database
- ✅ Complete API layer
- ✅ Real-time state management
- ✅ Full-featured React components
- ✅ User authentication
- ✅ Group-scoped data access
- ✅ Real-time RSVP momentum
- ✅ Complete MVP ready for users

### Week 2-3: GraphQL Migration
- Replace REST API with AppSync GraphQL
- Add true real-time subscriptions (<1s)
- Mobile development (Expo + React Native)
- Performance monitoring

All architectural decisions are in place to support this seamless transition.

---

**You're ready to build. Ship with confidence!** 🚀
