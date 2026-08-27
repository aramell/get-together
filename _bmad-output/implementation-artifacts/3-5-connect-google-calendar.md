---
story_key: "3-5-connect-google-calendar"
epic: "3"
story: "5"
title: "Connect Google Calendar (OAuth)"
status: "ready-for-dev"
created_date: "2026-08-27"
---

# Story 3.5: Connect Google Calendar (OAuth)

**Epic:** 3 - Soft Calendar & Availability
**Story Key:** 3-5-connect-google-calendar
**Created:** 2026-08-27
**Status:** ready-for-dev

---

## Story

As a user,
I want to connect my Google Calendar via OAuth,
So that my real availability syncs into the group's soft calendar without manual marking.

---

## Acceptance Criteria

**AC1: Initiate OAuth Connect**
- **Given** a logged-in user viewing calendar/availability settings
- **When** they tap "Connect Google Calendar"
- **Then** they are redirected to Google's OAuth consent screen with `access_type=offline` and `prompt=consent`
- **And** a CSRF-protecting `state` parameter is included and validated on callback

**AC2: Store Refresh Token Securely**
- **Given** a user completes the OAuth consent flow
- **When** Google redirects back with an authorization code
- **Then** the app exchanges the code for an access token and refresh token
- **And** the refresh token is stored encrypted in a `calendar_connections` table, scoped to that user
- **And** the access token itself is never persisted — only refreshed on demand during sync (Story 3.6)

**AC3: Reflect Connected State**
- **Given** a user has successfully connected Google Calendar
- **When** they view calendar/availability settings
- **Then** they see "Google Calendar Connected" with the connected account's email
- **And** the "Connect" action is replaced with "Disconnect" (Story 3.8)

**AC4: Handle Consent Denial**
- **Given** a user starts the OAuth flow
- **When** they deny consent on Google's screen
- **Then** they are redirected back with a clear message ("Calendar connection was not completed")
- **And** no partial connection record is created

**AC5: Re-Connect Updates Existing Record**
- **Given** a user already has a connected Google Calendar
- **When** they go through the connect flow again
- **Then** the existing `calendar_connections` row is updated (new refresh token) rather than duplicated

---

## Requirements Mapped

**Functional Requirements:**
- FR21: Users can connect their Google Calendar via OAuth to populate availability

**Non-Functional Requirements:**
- NFR12: Calendar data from external providers never stored — only free/busy blocks cached, never event details (this story only handles the connection; enforced at the data layer in Story 3.6)

**Architecture Decisions:**
- Decision 6b (Calendar Integration — OAuth Token Management): `access_type=offline` + `prompt=consent`, refresh token stored encrypted in the existing Supabase Postgres database, scoped per user

---

## Tasks / Subtasks

**Task 1: Database Schema**
- [ ] Create `calendar_connections` table: `id`, `user_id` (FK, unique), `provider` (`'google'`), `refresh_token_encrypted`, `connected_email`, `needs_reauth` (boolean, default false), `created_at`, `updated_at`
- [ ] Encrypt `refresh_token_encrypted` at the application layer before insert (Postgres encryption-at-rest alone isn't sufficient for a credential this sensitive — extends the managed-encryption pattern from Architecture Decision 2d)

**Task 2: OAuth Initiation Endpoint**
- [ ] `GET /api/calendar/google/connect` — generate Google OAuth consent URL with `access_type=offline`, `prompt=consent`, a signed `state` param (CSRF), redirect user

**Task 3: OAuth Callback Endpoint**
- [ ] `GET /api/calendar/google/callback` — validate `state`, exchange `code` for tokens via Google's token endpoint, encrypt refresh token, upsert `calendar_connections` row, redirect to settings with success/denial message

**Task 4: Settings UI**
- [ ] "Connect Google Calendar" button in calendar/availability settings
- [ ] Connected state display (email + "Disconnect" action, wired to Story 3.8)
- [ ] Consent-denial and error message handling

**Task 5: Environment Configuration**
- [ ] New env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — document in `.env.example` and deployment config (new external dependency, per sprint-change-proposal's Technical Impact section)

**Task 6: Testing**
- [ ] Unit tests: token exchange service, encryption/decryption round-trip
- [ ] API tests: connect redirect, callback success, callback with denied consent, callback with invalid `state`
- [ ] Component tests: connect button, connected-state display
- [ ] Integration test: full connect flow (mocked Google OAuth endpoints)

---

## Dev Notes

### Architecture Context

- OAuth pattern is standard Google offline-access: `access_type=offline` + `prompt=consent` returns a refresh token on first authorization only — if a user disconnects and reconnects without fully revoking Google-side access, Google may not return a new refresh token unless `prompt=consent` forces re-consent (already included above; keep it).
- Per Architecture Decision 6b, refresh tokens live in the **same Supabase Postgres database** as everything else — no separate secrets store. Encrypt the column value at the application layer regardless of Postgres's own at-rest encryption.
- Access tokens are never stored — Google's client library auto-refreshes using the stored refresh token when a sync (Story 3.6) needs one.

### Project Structure Notes

- New: `lib/services/calendarConnectionService.ts` — `initiateConnect()`, `handleCallback()`, `getConnectionStatus(userId)`
- New: `app/api/calendar/google/connect/route.ts`, `app/api/calendar/google/callback/route.ts`
- New: settings UI component, likely alongside existing profile/group settings patterns from Epic 2

### References

- [Source: prd.md#FR21](../planning-artifacts/prd.md)
- [Architecture: Decision 6b — OAuth Token Management](../planning-artifacts/architecture.md#decision-6b-oauth-token-management)
- [Google OAuth 2.0 offline access docs](https://developers.google.com/identity/protocols/oauth2)

---

## Dev Agent Record

### Workflow Execution
- Created via Scrum Master story-preparation pass following the approved sprint-change-proposal-2026-08-19 and Architecture Decisions 6a-6c

### Story Quality Checklist
- ✅ Acceptance criteria cover happy path, consent denial, re-connect, and security (CSRF state param)
- ✅ Database schema specified with encryption requirement called out explicitly
- ✅ API endpoints specified
- ✅ New environment variables identified for deployment
- ✅ Testing strategy covers unit, API, component, and integration levels

### Implementation Readiness
- **Ready for Dev:** Yes
- **Dependencies:** None blocking — can be built independently of Stories 3.6/3.7/3.8, though it's the prerequisite for all three
- **Blocking Issues:** None

---

## Next Steps

1. **Dev Agent:** Invoke `/bmad-bmm-dev-story` with this story file
2. **Coordinate:** Provision `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in Google Cloud Console before implementation
3. **Code Review:** Run `/bmad-bmm-code-review` after implementation, with particular attention to the CSRF `state` param and encryption of the refresh token
4. **Next Story:** 3-6-sync-google-availability (depends on this story's `calendar_connections` table)
