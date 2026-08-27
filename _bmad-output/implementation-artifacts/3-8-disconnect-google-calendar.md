---
story_key: "3-8-disconnect-google-calendar"
epic: "3"
story: "8"
title: "Disconnect / Re-Auth Google Calendar"
status: "ready-for-dev"
created_date: "2026-08-27"
---

# Story 3.8: Disconnect / Re-Auth Google Calendar

**Epic:** 3 - Soft Calendar & Availability
**Story Key:** 3-8-disconnect-google-calendar
**Created:** 2026-08-27
**Status:** ready-for-dev

---

## Story

As a user with a connected Google Calendar,
I want to disconnect it, or reconnect if the connection breaks,
So that I control my calendar data and can recover from expired or revoked access.

---

## Acceptance Criteria

**AC1: Manual Disconnect**
- **Given** a user has connected Google Calendar
- **When** they tap "Disconnect" in settings
- **Then** the stored refresh token is deleted from `calendar_connections`
- **And** all cached rows in `google_calendar_busy_blocks` for that user are deleted immediately
- **And** the UI reflects "Not Connected"

**AC2: Confirm Before Disconnect**
- **Given** a user taps "Disconnect"
- **When** the action would delete synced availability data
- **Then** a confirmation dialog appears before proceeding, consistent with the existing delete-confirmation pattern used elsewhere in the app (e.g., group/member removal)

**AC3: Automatic Re-Auth Flagging**
- **Given** a user's stored refresh token has been revoked or expired
- **When** a sync attempt (Story 3.6, AC3) fails to refresh the access token
- **Then** `calendar_connections.needs_reauth` is set to `true`
- **And** that user's stale busy blocks are NOT immediately deleted (avoid flipping someone to "fully available" just because sync broke — leave last-known data until they reconnect or explicitly disconnect)

**AC4: Re-Auth Prompt Surfaced to User**
- **Given** a connection is flagged `needs_reauth = true`
- **When** the user opens the Availability view (Story 3.7)
- **Then** they see a prompt: "Your Google Calendar connection needs to be reconnected" with a "Reconnect" action

**AC5: Re-Auth Flow Reuses Connect Flow**
- **Given** a user taps "Reconnect"
- **When** they complete the OAuth consent flow
- **Then** it follows the same flow as Story 3.5, replacing the stale token and clearing `needs_reauth`

---

## Requirements Mapped

**Architecture Decisions:**
- Decision 6b (Calendar Integration — OAuth Token Management): disconnect must delete both the token and cached busy blocks; failed refresh triggers the re-auth flow

---

## Tasks / Subtasks

**Task 1: Disconnect Endpoint**
- [ ] `DELETE /api/calendar/google/disconnect` — deletes the user's `calendar_connections` row and cascades deletion of their `google_calendar_busy_blocks` rows (single transaction)

**Task 2: Disconnect UI**
- [ ] "Disconnect" action in calendar/availability settings (from Story 3.5's connected-state display)
- [ ] Confirmation dialog reusing the existing `ConfirmDialog` component pattern

**Task 3: Needs-Reauth Handling**
- [ ] Ensure Story 3.6's sync job sets `needs_reauth = true` on refresh failure (this may already be covered by Story 3.6 — verify, don't duplicate)
- [ ] On `needs_reauth`, explicitly do NOT delete existing busy blocks (AC3) — only a full disconnect clears data

**Task 4: Re-Auth Prompt UI**
- [ ] Banner/prompt in the Availability view (Story 3.7) when `needs_reauth = true` for the current user
- [ ] "Reconnect" action routes into the same OAuth flow as Story 3.5

**Task 5: Testing**
- [ ] API test: disconnect deletes both the connection and cached blocks
- [ ] API test: `needs_reauth` flag does not trigger data deletion
- [ ] Component test: confirmation dialog blocks disconnect until confirmed
- [ ] Integration test: full disconnect → data cleanup → UI reflects "Not Connected"
- [ ] Integration test: simulated refresh failure → `needs_reauth` set → prompt appears → reconnect clears it

---

## Dev Notes

### Architecture Context

- This story is the safety-net half of the Calendar Integration Layer — Story 3.5 connects, Story 3.6 syncs, this story handles both graceful teardown (disconnect) and graceful failure recovery (re-auth).
- The distinction in AC1 vs. AC3 matters: an intentional disconnect should feel complete (data gone), but an unintentional sync failure shouldn't silently erase someone's availability data — that would be a confusing, unexplained UX regression for their groupmates.

### Project Structure Notes

- New: `app/api/calendar/google/disconnect/route.ts`
- Update: `calendarConnectionService.ts` (from Story 3.5) to add `disconnect(userId)`
- Update: Availability view (Story 3.7) to conditionally render the re-auth banner

### References

- [Architecture: Decision 6b — OAuth Token Management](../planning-artifacts/architecture.md#decision-6b-oauth-token-management)
- [Source: 3-5-connect-google-calendar.md](./3-5-connect-google-calendar.md)
- [Source: 3-6-sync-google-availability.md](./3-6-sync-google-availability.md) — AC3, the failure path this story completes
- [Source: 2-6-remove-members.md](./2-6-remove-members.md) — existing confirmation-dialog pattern to reuse

---

## Dev Agent Record

### Workflow Execution
- Created via Scrum Master story-preparation pass following Architecture Decision 6b's cascading implications

### Story Quality Checklist
- ✅ Explicit distinction between intentional disconnect (data deleted) and sync-failure re-auth (data preserved) — a real product decision, not left to dev's guess
- ✅ Reuses existing confirmation-dialog pattern rather than inventing a new one
- ✅ Cross-references Story 3.6 to avoid duplicating the `needs_reauth`-setting logic

### Implementation Readiness
- **Ready for Dev:** Yes
- **Dependencies:** Story 3.5 (calendar_connections table), Story 3.6 (needs_reauth flag origin), Story 3.7 (surface for the re-auth prompt)
- **Blocking Issues:** None, but should be sequenced after 3.5/3.6 land since it extends their data model

---

## Next Steps

1. **Dev Agent:** Invoke `/bmad-bmm-dev-story` with this story file
2. **Code Review:** Run `/bmad-bmm-code-review` after implementation
3. **Epic 3 Complete:** After this story, all 4 new Epic 3 stories (3.5-3.8) plus the original 4 (3.1-3.4) are done — consider an epic-3 retrospective
