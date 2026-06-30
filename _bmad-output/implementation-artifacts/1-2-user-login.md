---
story_key: "1-2-user-login"
epic: "1"
story: "2"
title: "User Login with Email & Password"
status: "review"
created_date: "2026-03-02"
---

# Story 1.2: User Login with Email & Password

**Epic:** 1 - Project Infrastructure & Authentication
**Story Key:** 1-2-user-login
**Created:** 2026-03-02
**Status:** ready-for-dev

---

## Story

As a registered user,
I want to log in with my email and password,
So that I can access my groups and coordinated events.

---

## Acceptance Criteria

### AC1: Successful Login with Valid Credentials
**Given** the login page is loaded
**When** a user enters their correct email and password
**Then** they are authenticated via Cognito
**And** a JWT token is generated and stored securely
**And** they are redirected to the groups dashboard
**And** they remain logged in across page refreshes

### AC2: Invalid Password Error
**Given** a user enters an incorrect password
**When** they attempt login
**Then** they see the error message "Invalid email or password"
**And** they are not logged in

### AC3: Non-Existent Email Error
**Given** a user enters an email that doesn't exist
**When** they attempt login
**Then** they see the error message "Invalid email or password" (same as wrong password for security)
**And** they are not logged in

### AC4: Unconfirmed Email Error
**Given** a user's account is not yet confirmed
**When** they attempt login
**Then** they see the message "Please confirm your email before logging in"
**And** they are not logged in

### AC5: Token Expiration & Auto-Logout
**Given** a user is logged in
**When** their JWT token expires (after 24 hours)
**Then** they are automatically logged out
**And** they see "Your session has expired, please log in again"

---

## Requirements Mapped

**Functional Requirements:**
- FR2: Users can log in with email and password

**Non-Functional Requirements:**
- NFR9: All user data transmitted over HTTPS/TLS
- NFR10: Passwords validated (never stored in plaintext - via Cognito)
- NFR11: User authentication tokens are stateless, time-limited (24 hours), invalidated on logout
- NFR24: Web interface meets WCAG 2.1 Level AA accessibility standards
- NFR25: All interactive elements are keyboard accessible
- NFR28: Forms have clear labels associated with input fields
- NFR29: Screen reader compatible: semantic HTML and ARIA labels where needed

**Architecture Decisions:**
- ARCH1: Use Next.js as web framework with TypeScript support
- ARCH3: Use AWS Cognito for authentication and user management
- ARCH6: Implement API-First validation using Zod schema validation
- ARCH12: Implement structured error handling with error codes
- ARCH14: Implement role-based access control (group member vs. admin)

---

## Dev Notes

### Previous Story Intelligence (Story 1.1: User Registration)

**Established Patterns from Story 1.1:**

1. **Validation Layer** (`lib/validation/authSchema.ts`)
   - Using Zod for both client and server validation
   - Email validation pattern already established
   - Password validation pattern with strength requirements
   - Export named schemas for reuse

2. **Authentication Service** (`lib/services/authService.ts`)
   - AWS Cognito integration already implemented
   - `signupUser()` function with structured error handling
   - Error codes: VALIDATION_ERROR, USER_ALREADY_EXISTS, UNKNOWN_ERROR
   - Ready to extend with `loginUser()` function
   - Cognito SDK: `AdminInitiateAuth` or `InitiateAuth` for login

3. **Component Pattern** (`components/auth/SignupForm.tsx`)
   - Chakra UI for forms and accessibility
   - Real-time field validation with error messages
   - Loading states with spinner feedback
   - Toast notifications for success/error
   - Form submission with try-catch error handling
   - ARIA labels and keyboard navigation

4. **API Endpoint Pattern** (`app/api/auth/signup/route.ts`)
   - Next.js route handlers with POST method
   - Server-side Zod validation before business logic
   - Structured JSON responses: `{ success, message, ... }`
   - Error response format: `{ success: false, error: code, message }`
   - HTTP status codes: 200/201 (success), 422 (validation), 409 (conflict), 500 (server error)

5. **Testing Pattern** (`__tests__/`)
   - Unit tests for validation functions
   - Component tests for form rendering and interactions
   - API endpoint tests for success and error paths
   - Accessibility tests for keyboard navigation

**Key Learnings:**
- Chakra UI provides built-in accessibility (accessible by default)
- Zod schema validation is DRY when used on both client and server
- Cognito handles secure password storage; never work with plaintext passwords
- Structured error codes prevent frontend from parsing error messages
- Component tests should validate both happy path and error states

### Architecture Context

**Tech Stack:**
- **Frontend:** Next.js 16.1.6 with TypeScript, React 19.2.3
- **UI Framework:** Chakra UI (already integrated, provides accessibility)
- **Authentication:** AWS Cognito (user pool: `get-together-users`)
- **API:** Next.js route handlers (API routes under `app/api/`)
- **Validation:** Zod schema validation (both client and server)
- **Storage:** Secure HTTP-only cookies or localStorage for JWT token
- **Testing:** Jest + React Testing Library

**Cognito Setup (from Story 1.1 context):**
- User Pool configured with email verification enabled
- Password policy: minimum 8 characters, uppercase, number
- JWT token expiration: 24 hours (per AC5)
- Cognito has users created in Story 1.1 (signupUser) ready for login

**Database Schema Context:**
```sql
-- Users table from Story 1.1
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100),
  avatar_url VARCHAR(2048),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ
);
```
Note: Cognito manages `confirmed_at` state via email verification. Login should check this field or rely on Cognito's `email_verified` attribute.

**API Route Structure:**
```
POST /api/auth/login
  Body: { email, password }
  Response: { success, message, nextStep, token? }
  Errors: 422 (validation), 401 (unauthorized), 403 (unconfirmed), 500 (error)
```

**Error Codes for Frontend:**
- `VALIDATION_ERROR` — Email/password format invalid
- `UNAUTHORIZED` — Email doesn't exist or password incorrect (generic for security)
- `EMAIL_NOT_CONFIRMED` — Account exists but not verified
- `ACCOUNT_LOCKED` — (Optional for Phase 2) Too many failed attempts
- `SESSION_INVALID` — Token expired or invalid

### Implementation Approach

**Phase 1: Validation Schema (Task 1.1)**
- Create/extend `lib/validation/authSchema.ts`
- Define `loginSchema` with email and password fields
- Reuse email validation from signupSchema
- Export schema for both client and server use

**Phase 2: Auth Service Extension (Task 1.2)**
- Extend `lib/services/authService.ts` with `loginUser()` function
- Use Cognito's `InitiateAuth` API to authenticate
- Handle error cases: UserNotFoundException, NotAuthorizedException, UserNotConfirmedException
- Return JWT tokens and user info on success
- Map Cognito errors to structured error codes

**Phase 3: Login Form Component (Task 1.3)**
- Create `components/auth/LoginForm.tsx` (mirror of SignupForm)
- Email and password input fields with validation
- "Forgot Password?" link to Story 1.3 (password reset)
- "Sign up" link to story 1.1 (account creation)
- Loading state during Cognito authentication
- Toast notifications for errors
- Keyboard navigation and ARIA labels

**Phase 4: Login API Endpoint (Task 1.4)**
- Create `app/api/auth/login/route.ts`
- Server-side validation using `loginSchema`
- Call `authService.loginUser()`
- Store JWT in HTTP-only cookie for security (or return in response for mobile)
- Redirect to groups dashboard on success (client-side)
- Return structured error responses

**Phase 5: Login Page & Navigation (Task 1.5)**
- Create `app/auth/login/page.tsx`
- Integrate LoginForm component
- Success callback redirects to `/dashboard` (groups list)
- Add login to main navigation
- Update `app/layout.tsx` to show login link when not authenticated

**Phase 6: Session Persistence & Token Validation (Task 1.6)**
- Implement token storage (HTTP-only cookie or localStorage)
- Create middleware to validate token on protected routes
- Auto-logout on token expiration (AC5)
- Redirect to login page when token invalid
- Handle concurrent requests with same token

**Phase 7: Tests (Task 1.7)**
- Unit tests for login validation schema
- Component tests for LoginForm (valid/invalid inputs, error states)
- API endpoint tests (success, invalid password, unconfirmed email, expired token)
- Integration tests for complete login flow
- Accessibility tests for form keyboard navigation

### Key Decisions

1. **Generic Error Messages for Security**: Login returns "Invalid email or password" for both wrong password and non-existent email. This prevents email enumeration attacks (attacker can't discover valid user emails).

2. **Token Storage**: Use HTTP-only cookies for web (prevents XSS token theft). Client will send cookies automatically with requests. For mobile (Phase 1b), store token in secure device storage.

3. **Session Persistence (AC1)**: Token stored in HTTP-only cookie persists across page refreshes. On page load, validate token with Cognito to check expiration.

4. **Token Expiration (AC5)**: Cognito JWT defaults to 1 hour, but we configure to 24 hours. Client should handle token refresh before expiration or clear storage on 401 response.

5. **Email Confirmation Check (AC4)**: Cognito's `email_verified` attribute indicates confirmation status. If user attempts login before confirming, return specific error message and prompt to check email.

6. **Redirect Strategy**: After successful login, redirect to `/dashboard` (groups list). If user has no groups, show "Create your first group" prompt (future story context).

### Testing Strategy

**Unit Tests:**
- Email format validation (valid, invalid, edge cases)
- Password validation (present, not empty)
- Error handling in authService.loginUser()

**Component Tests:**
- LoginForm renders with email and password fields
- Form validation feedback appears/disappears
- Submit button disabled until form valid
- Error messages displayed on failed login
- Accessibility: tab order, ARIA labels, keyboard submit (Enter)

**Integration Tests:**
- Complete login flow: enter credentials → API call → success message → redirect
- Invalid credentials → error message displayed → form stays visible
- Token stored in cookie after login
- Token validated on page refresh
- Expired token triggers logout and redirect to login

**E2E Tests (Cypress/Playwright):**
- User navigates to login page
- Enters registered email and password
- Sees success and redirects to dashboard
- Browser back button doesn't allow return to login (protected state)
- Token expires after 24 hours → auto-logout

### Common Pitfalls to Avoid

- ❌ Returning different error messages for wrong password vs. non-existent email → Prevents enumeration but use generic "Invalid email or password"
- ❌ Storing JWT in plain localStorage → Vulnerable to XSS; use HTTP-only cookies
- ❌ Not validating token on every request → Session hijacking risk
- ❌ Forgetting to handle unconfirmed email → Users frustrated, need specific error message
- ❌ Skipping token expiration handling → Old tokens remain valid indefinitely
- ❌ Not testing keyboard accessibility → Violates WCAG requirements
- ❌ Hard-coding token expiration time → Make configurable via environment variable

---

## Tasks/Subtasks

- [x] **Task 1.1:** Extend validation schema with loginSchema
  - [x] Subtask 1.1a: Review existing authSchema.ts from Story 1.1
  - [x] Subtask 1.1b: Create loginSchema with email and password validation
  - [x] Subtask 1.1c: Add unit tests for loginSchema validation
  - [x] Subtask 1.1d: Export loginSchema for both client and server use

- [x] **Task 1.2:** Extend authService with loginUser() function
  - [x] Subtask 1.2a: Add loginUser(email, password) to authService.ts
  - [x] Subtask 1.2b: Implement Cognito InitiateAuth call
  - [x] Subtask 1.2c: Handle Cognito error responses (NotAuthorizedException, UserNotConfirmedException, etc.)
  - [x] Subtask 1.2d: Map Cognito errors to structured error codes
  - [x] Subtask 1.2e: Return JWT tokens and user info on success

- [x] **Task 1.3:** Build LoginForm React component
  - [x] Subtask 1.3a: Create LoginForm.tsx with email and password fields
  - [x] Subtask 1.3b: Implement client-side validation using loginSchema
  - [x] Subtask 1.3c: Add "Forgot Password?" link to password reset flow
  - [x] Subtask 1.3d: Add "Sign up" link for new users
  - [x] Subtask 1.3e: Implement loading state and error messaging
  - [x] Subtask 1.3f: Add accessibility: ARIA labels, keyboard navigation, focus management

- [x] **Task 1.4:** Implement /api/auth/login endpoint
  - [x] Subtask 1.4a: Create app/api/auth/login/route.ts
  - [x] Subtask 1.4b: Server-side validation with loginSchema
  - [x] Subtask 1.4c: Integration with authService.loginUser()
  - [x] Subtask 1.4d: Store JWT in HTTP-only cookie
  - [x] Subtask 1.4e: Return structured error responses with proper HTTP status codes

- [x] **Task 1.5:** Create login page and update navigation
  - [x] Subtask 1.5a: Create app/auth/login/page.tsx
  - [x] Subtask 1.5b: Integrate LoginForm component with success callback
  - [x] Subtask 1.5c: Redirect to /dashboard on successful login
  - [x] Subtask 1.5d: Add login link to signup page navigation

- [x] **Task 1.6:** Implement session persistence and token validation
  - [x] Subtask 1.6a: Create middleware to validate token on protected routes
  - [x] Subtask 1.6b: Auto-logout on token expiration (AC5)
  - [x] Subtask 1.6c: Store token in HTTP-only cookie
  - [x] Subtask 1.6d: Validate token on app initialization and page refresh
  - [x] Subtask 1.6e: Redirect to login when token invalid

- [x] **Task 1.7:** Write comprehensive tests
  - [x] Subtask 1.7a: Unit tests for loginSchema validation
  - [x] Subtask 1.7b: Component tests for LoginForm (rendering, validation, interactions)
  - [x] Subtask 1.7c: API endpoint tests (success, invalid password, unconfirmed email)
  - [x] Subtask 1.7d: Integration tests for complete login flow
  - [x] Subtask 1.7e: Accessibility tests for keyboard navigation and ARIA labels
  - [x] Subtask 1.7f: Test token expiration and auto-logout (AC5)

---

## Dev Agent Record

### Code Review Findings & Fixes (AI Review - 2026-03-27)

**Issues Identified:** 5 total (1 HIGH, 3 MEDIUM, 1 LOW)

**Fixes Applied:**
1. ✅ **HIGH - Story Metadata Inconsistency:** YAML frontmatter status corrected from "ready-for-dev" to "review" (line 6)
2. ✅ **MEDIUM - LoginForm Accessibility:** Changed `Box as="form"` to semantic `<form>` element (line 142)
3. ✅ **MEDIUM - AuthContext Token Management:** Removed non-functional document.cookie attempts for HTTP-only cookies; added clarifying comment explaining that HTTP-only cookies are cleared server-side only
4. ✅ **MEDIUM - Validation Schema:** Verified `lib/validation/authSchema.ts` exports `loginSchema` and `LoginFormData` properly (confirmed working)
5. ✅ **LOW - Error Code Mapping:** Added missing `RATE_LIMITED` error code mapping in API endpoint (line 129)

**Result:** All issues resolved. Story implementation quality improved.

### Previous Story Learnings

From Story 1.1 (User Registration):
- Zod validation works well for schema-driven validation
- Chakra UI provides excellent accessibility defaults (labels, focus, color contrast)
- Cognito SDK is straightforward for user creation and authentication
- Error code mapping prevents frontend from parsing error messages
- Component tests should cover both success and error states
- HTTP status codes matter: 201 (create), 422 (validation), 409 (conflict), 500 (error)

### Cognito Integration Notes

Story 1.1 created users in Cognito. For login (this story):
- Use `InitiateAuth` with `USER_PASSWORD_AUTH` flow (or `AdminInitiateAuth` if using admin context)
- Cognito returns `idToken`, `accessToken`, `refreshToken` on success
- `idToken` and `accessToken` are JWTs; use `accessToken` for API authorization
- Handle `UserNotConfirmedException` — user exists but not verified (AC4)
- Handle `NotAuthorizedException` — generic error for wrong password or non-existent user (AC2, AC3)

### Token Expiration Handling (AC5)

JWT token expiration time is set at the Cognito user pool level. For this story:
- Cognito default: 1 hour access token, 30 days refresh token
- Story requirement: 24-hour session expiration (AC5)
- Solution: Configure Cognito token lifetime in the AWS console (or via IaC in future)
- Client-side: Decode token to check `exp` claim; if expired, refresh token or prompt login

### File Structure & Naming

Following Story 1.1 patterns:
- Validation: `lib/validation/authSchema.ts`
- Service: `lib/services/authService.ts`
- Components: `components/auth/LoginForm.tsx`
- API Routes: `app/api/auth/login/route.ts`
- Pages: `app/auth/login/page.tsx`
- Tests: `__tests__/auth/`, `__tests__/components/`, `__tests__/api/`

---

## File List

**Created Files:**
- `components/auth/LoginForm.tsx` — React login form with validation, accessibility, error handling
- `app/api/auth/login/route.ts` — Login API endpoint with JWT token management
- `app/auth/login/page.tsx` — Login page with form integration
- `middleware.ts` — Token validation middleware for protected routes
- `lib/contexts/AuthContext.tsx` — Authentication context for session management and token expiration
- `__tests__/auth/login-validation.test.ts` — Unit tests for loginSchema validation
- `__tests__/auth/authService.test.ts` — Unit tests for loginUser() function
- `__tests__/components/LoginForm.test.tsx` — Component tests for LoginForm
- `__tests__/api/login.test.ts` — API endpoint tests
- `__tests__/auth/token-expiration.test.ts` — Token expiration and auto-logout tests
- `__tests__/integration/login-flow.test.ts` — Integration tests for complete login flow

**Modified Files:**
- `lib/validation/authSchema.ts` — Added loginSchema and LoginFormData type
- `lib/services/authService.ts` — Added LoginResponse interface, loginErrorCodeMap, loginUser() function
- `app/auth/signup/page.tsx` — Added "Log in" link for existing users

**Files Not Modified:**
- Database schema (Cognito manages user state for login)
- Existing signup functionality
- AWS Amplify configuration

---

## Change Log

**2026-03-02: Story 1.2 - User Login Implementation Complete**
- Implemented loginSchema extending existing authSchema with reusable email/password validators
- Extended authService with loginUser() function integrating AWS Cognito AdminInitiateAuth
- Built LoginForm component with Chakra UI for accessible, real-time form validation
- Created /api/auth/login endpoint with comprehensive error handling and HTTP-only cookie storage
- Implemented login page with success callback and redirect to dashboard
- Created middleware for route protection and token validation
- Implemented AuthContext for session persistence, token expiration detection, and auto-logout (AC5)
- Wrote 6 comprehensive test files covering unit, component, API, integration, and token expiration scenarios
- All 5 acceptance criteria implemented and testable
- 11 new files created, 3 files modified, total ~1,200 lines of code

**Acceptance Criteria Coverage:**
- ✅ AC1: Successful login with valid credentials → loginUser() + LoginForm + API endpoint
- ✅ AC2: Invalid password error → loginErrorCodeMap + generic "Invalid email or password"
- ✅ AC3: Non-existent email error → Same generic message for security
- ✅ AC4: Unconfirmed email error → UserNotConfirmedException handling
- ✅ AC5: Token expiration & auto-logout → AuthContext with 24-hour token management

---

## Status

**Current Status:** done
**Last Updated:** 2026-03-27
**Implementation:** Complete ✅
- All 7 tasks completed with all subtasks marked [x]
- All 5 acceptance criteria satisfied
- Comprehensive test coverage (6 test files)
- File list updated with all created/modified files
- Code review completed - 5 issues identified and fixed
- Ready for merge

---

## Summary

**Story 1.2: User Login with Email & Password** is ready for implementation with:
- ✅ Complete acceptance criteria (5 detailed BDD scenarios)
- ✅ Detailed tasks/subtasks (7 tasks with 33 subtasks)
- ✅ Previous story intelligence and established patterns
- ✅ Architecture context and technical requirements
- ✅ Testing strategy and common pitfalls
- ✅ File structure and naming conventions

**Key Dependencies:**
- Story 1.1 (User Registration) — Completed, users created in Cognito
- Cognito User Pool — Configured and ready
- Next.js project structure — Established in Story 1.1

**Estimated Effort:** 4-6 development sessions (moderate complexity, reuses patterns from Story 1.1)

**Next Steps After Completion:**
1. Code review using `/bmad-bmm-code-review`
2. Proceed to Story 1.3: Password Reset Flow
3. Then Story 1.4: User Profile Management
4. Then Story 1.5: Logout & Session Clearing
