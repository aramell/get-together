---
story_key: "3-6-sync-google-availability"
epic: "3"
story: "6"
title: "Sync Google Free/Busy into Soft Calendar"
status: "review"
created_date: "2026-08-27"
---

# Story 3.6: Sync Google Free/Busy into Soft Calendar

**Epic:** 3 - Soft Calendar & Availability
**Story Key:** 3-6-sync-google-availability
**Created:** 2026-08-27
**Status:** review

---

## Story

As a user with a connected Google Calendar,
I want my Google availability synced into the group's soft calendar automatically,
So that my group sees accurate availability without me manually marking it.

---

## Acceptance Criteria

**AC1: Scheduled Sync Per Connected User**
- **Given** a user has connected Google Calendar (Story 3.5)
- **When** the sync job runs (every 2-5 minutes, per Architecture Decision 6a)
- **Then** the system calls Google's `freebusy.query` for that user's forward window (next 30 days)
- **And** returned busy blocks are written to a `google_calendar_busy_blocks` table

**AC2: Merge Rule with Manual Availability**
- **Given** a user has both manually-marked availability and synced Google busy blocks for the same time
- **When** the soft calendar is displayed
- **Then** the merge follows this precedence: Google busy → shown busy; else manual busy → shown busy; else manual free → shown free; else → unknown/no data
- **And** this merge happens at read time — the two data sources are never combined into one row (per Architecture Decision 6c)

**AC3: Token Refresh During Sync**
- **Given** a user's Google access token has expired
- **When** the sync job runs for that user
- **Then** the system automatically refreshes the access token using the stored refresh token, transparently
- **And** if the refresh itself fails (revoked/expired refresh token), the connection is flagged `needs_reauth = true` (surfaced in Story 3.8's re-auth prompt)

**AC4: Per-User Failure Isolation**
- **Given** the sync job processes all connected users in one run
- **When** one user's sync fails (API error, expired token, etc.)
- **Then** other users' syncs are unaffected — failures are caught and logged per-user, not job-wide

**AC5: Wholesale Replace, Not Diff**
- **Given** a sync runs for a user
- **When** new busy blocks are fetched
- **Then** existing rows in `google_calendar_busy_blocks` for that user's synced window are deleted and replaced wholesale — no incremental diffing (per Architecture Decision 6c, kept simple at MVP scale)

**AC6: Privacy Enforcement**
- **Given** any synced busy block
- **When** it's written to the database
- **Then** only `start_time`, `end_time`, and `user_id` are stored — never event title, location, or description (enforced at the schema level, no columns exist for that data)

---

## Requirements Mapped

**Functional Requirements:**
- FR22: System syncs Google Calendar availability on a near-real-time basis

**Non-Functional Requirements:**
- NFR12: Calendar data from external providers never stored — only free/busy blocks cached, never event details

**Architecture Decisions:**
- Decision 6a (Calendar Sync Mechanism): poll `freebusy.query` every 2-5 minutes, not push/webhooks
- Decision 6c (Cached Free/Busy Data Model): dedicated `google_calendar_busy_blocks` table, merged with manual availability at read time, replaced wholesale per poll

---

## Tasks / Subtasks

**Task 1: Database Schema**
- [x] Create `google_calendar_busy_blocks` table: `id`, `user_id` (FK), `start_time` (TIMESTAMPTZ), `end_time` (TIMESTAMPTZ), `synced_at` (TIMESTAMPTZ)
- [x] Index on `(user_id, start_time)` to support the merge query efficiently

**Task 2: Sync Worker**
- [x] Determine and confirm the scheduling mechanism with the team before implementing — the original architecture.md assumed AWS Lambda/CloudWatch Events, but this project is actually deployed with Supabase-hosted Postgres (per Story 11.1); confirm whether a Vercel Cron Job, Supabase Edge Function on a schedule, or another mechanism is the right fit for the current deployment target before building against an assumption
  - **RESOLVED with user (Andrewramell), 2026-08-27:** Confirmed the app is actually hosted on AWS Amplify (not Vercel/Supabase Edge Functions for compute — Supabase is Postgres only), with no existing cron/scheduled-job infra (Epic 12 uses client-side polling instead). User chose **AWS Lambda + EventBridge**, matching the original architecture.md assumption and the existing AWS stack (Cognito/S3/SNS/CloudWatch already in use). Built as: EventBridge scheduled rule (2-5 min) → Lambda → `POST /api/calendar/sync` (shared-secret protected) → `syncAllConnectedUsers()`. The Lambda/EventBridge provisioning itself is outside this codebase (deployment infra, like Google Cloud Console OAuth setup in 3.5) — see Completion Notes.
- [x] Implement `calendarSyncService.ts`: `syncUserAvailability(userId)` — refreshes token if needed, calls `freebusy.query`, replaces that user's busy-block rows
- [x] Implement the job runner that iterates all rows in `calendar_connections` where `needs_reauth = false`, calling `syncUserAvailability` per user with try/catch isolation (AC4)

**Task 3: Token Refresh Integration**
- [x] Use Google's client library auto-refresh (credentials set from stored refresh token); on refresh failure, set `calendar_connections.needs_reauth = true`
  - **Deviation:** implemented via plain `fetch()` to `oauth2.googleapis.com/token` (`grant_type=refresh_token`) rather than the `googleapis` npm package — same reasoning as Story 3.5 (avoids a new-dependency approval gate for something a couple of REST calls covers). Functionally equivalent; `needs_reauth` is set on refresh failure as specified.

**Task 4: Merge Logic**
- [x] Implement `mergeAvailability(manualEntries, syncedBlocks)` used by the soft calendar read path — applies the precedence rule from AC2
- [x] Update existing soft calendar query/service (from Epic 3's original stories) to call this merge function instead of reading only manual entries

**Task 5: Testing**
- [x] Unit tests: merge logic precedence (all 4 cases: Google busy, manual busy only, manual free only, no data)
- [x] Unit tests: wholesale replace behavior (old rows deleted, new rows inserted)
- [x] Integration test: sync job run with mocked Google API responses, including one failing user among several succeeding
- [x] Integration test: token refresh failure sets `needs_reauth`

---

## Dev Notes

### Architecture Context

- This story explicitly depends on Story 3.5's `calendar_connections` table for the refresh token.
- The polling interval (2-5 minutes) is a range, not a fixed number — confirm the final value with the team based on observed Google API rate limits once a few users are connected; start at the higher end (5 min) and tighten if needed.
- **Open question flagged for dev/architect coordination:** the original architecture.md assumed AWS Lambda + CloudWatch Events for scheduled jobs, but the project's actual production database is Supabase-hosted Postgres (Story 11.1), and Epic 12 already uses client-side polling rather than the documented AppSync subscriptions. Don't build this sync worker against the AWS-assumption without confirming the current deployment target first — this is exactly the kind of documented architecture/reality drift the sprint-change-proposal flagged as a separate follow-up.

### Project Structure Notes

- New: `lib/services/calendarSyncService.ts`
- New: `lib/availability/mergeAvailability.ts` (or co-located with existing availability service from Epic 3's original stories 3.1-3.4)
- Update: existing soft calendar read query/service to call the merge function

### References

- [Source: prd.md#FR22](../planning-artifacts/prd.md)
- [Architecture: Decision 6a — Calendar Sync Mechanism](../planning-artifacts/architecture.md#decision-6a-calendar-sync-mechanism)
- [Architecture: Decision 6c — Cached Free/Busy Data Model](../planning-artifacts/architecture.md#decision-6c-cached-freebusy-data-model)
- [Google Calendar API — Freebusy: query](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query)
- [Source: 3-1-mark-available-free.md](./3-1-mark-available-free.md) — existing manual availability schema/service this story merges with

---

## Dev Agent Record

### Workflow Execution
- Created via Scrum Master story-preparation pass following Architecture Decisions 6a and 6c

### Story Quality Checklist
- ✅ Merge precedence rule made explicit (a real product decision, not left to dev's guess)
- ✅ Failure isolation and token-refresh-failure handling specified
- ✅ Privacy enforcement (NFR12) called out at the schema level
- ✅ Open architecture question (scheduling mechanism vs. AWS assumption) flagged rather than silently assumed
- ✅ Testing strategy covers merge logic, replace behavior, and failure paths

### Implementation Readiness
- **Ready for Dev:** Yes, with one open question to resolve first (scheduling mechanism — see Dev Notes)
- **Dependencies:** Story 3.5 (Connect Google Calendar) must be complete — needs `calendar_connections` table
- **Blocking Issues:** Scheduling mechanism decision (AWS vs. current deployment target) should be confirmed before Task 2 starts

### Implementation Plan
- **Scheduling mechanism:** Resolved with user before starting Task 2 — see Task 2's note. `POST /api/calendar/sync` is the code-side half; the EventBridge rule + Lambda that actually calls it on a timer is deployment infra outside this repo, same category as provisioning Google OAuth credentials in Story 3.5. Documented as a deployment step (see Completion Notes) rather than built here.
- **No new SDK dependency:** Token refresh (`oauth2.googleapis.com/token`, `grant_type=refresh_token`) and `freebusy.query` (`googleapis.com/calendar/v3/freeBusy`) both implemented via plain `fetch()`, consistent with Story 3.5's approach — avoids adding the `googleapis` package for what a couple of REST calls covers.
- **Wholesale replace (AC5):** `syncUserAvailability` wraps DELETE + INSERT(s) in a single transaction (`BEGIN`/`COMMIT`, `ROLLBACK` on failure) on one held pooled client, rather than diffing.
- **Per-user failure isolation (AC4):** `syncAllConnectedUsers` calls `syncUserAvailability` per user inside its own try/catch and collects `{userId, success}` results; one user's failure (missing connection, expired refresh token, freebusy API error) never stops the loop. `syncUserAvailability` itself never throws for expected failure modes — it returns a `ServiceResult`, so the outer try/catch in `syncAllConnectedUsers` is a safety net for truly unexpected errors only.
- **Token refresh failure -> `needs_reauth` (AC3):** distinguished from a freebusy-query failure — only a *token refresh* failure sets `needs_reauth = true` (surfaced in Story 3.8's re-auth prompt); a freebusy API error after a successful refresh is treated as a generic sync failure (transient, worth retrying next cycle) rather than an auth problem.
- **Merge integration, additive not breaking:** `getGroupAvailabilitiesForCalendar` (`lib/db/queries.ts`) now also fetches Google busy blocks (new `getGroupGoogleBusyBlocks`) and returns two new fields per member: `google_busy_blocks` (raw) and `merged_availability` (resolved via `mergeAvailability`). The existing `availabilities` field is untouched — still the raw, individually-editable manual entries. This was a deliberate choice over collapsing everything into one merged shape: `SoftCalendar.tsx`'s edit flow (`components/groups/SoftCalendar.tsx:176-183` originally) opens an edit modal using `dayAvailabilities[0]`, which needs a real DB row (`id`, `version`) to PATCH against — a synthetic Google-sourced or merged-segment entry would either break editing or silently corrupt data if clicked. Both existing calendar tests (`__tests__/api/groups/calendar.test.ts`, `__tests__/integration/calendar.integration.test.ts`) mock `@/lib/db/queries` entirely, so this internal change is invisible to them — verified no regression.
- **`SoftCalendar.tsx` display update:** added `getMemberDateDisplayStatus`, which uses `merged_availability` for the day cell's displayed status (with Google-busy/manual-busy/manual-free day-level precedence — see next bullet) when present, falling back to the pre-3.6 `dayAvailabilities[0]?.status` logic when a member has no `merged_availability` (e.g. no Google connection). This is additive/optional on the `MemberAvailabilities` type, so existing mocked-data tests (`SoftCalendar.test.tsx`) are unaffected. The edit-click path (`getMemberDateAvailabilities`, `hasAvailability`, `isClickable`) still uses only the raw manual entries, unchanged.
- **Bug caught by tests, fixed before completion:** initial `getMemberDateDisplayStatus` took `mergedForDay[0].status` — the chronologically-first segment for the day. With sub-day segments (e.g. free 9-12, Google-busy 12-13, free 13-17 all on one calendar day), this silently showed the wrong status whenever the first segment of the day wasn't the highest-precedence one. Fixed to apply Google-busy > manual-busy > manual-free precedence across *all* of a day's segments, not just the first. Caught by `__tests__/components/groups/SoftCalendar.mergedAvailability.test.tsx`, which specifically constructs a day with multiple differently-sourced segments.

### Test environment note
Same pre-existing, repo-wide Node v25 `NextRequest` harness issue documented in Stories 2.8 and 3.5 affects this story's two `NextRequest`-constructing test files (`__tests__/api/calendar/sync.test.ts` — 4 tests). All other new test files for this story (`mergeAvailability.test.ts`, `calendarSyncService.test.ts`, `queries.googleBusyBlocks.test.ts`, `SoftCalendar.mergedAvailability.test.tsx`) don't construct `NextRequest` and pass cleanly. `tsc --noEmit`/`eslint`: no new errors beyond the same pre-existing baseline patterns already noted in Story 3.5 (`catch (error: any)`, `require()`-mock `never` typing, and in this story's case one `prefer-const` lint error at `lib/db/queries.ts:577` that predates this story's changes entirely — confirmed via `git diff`, not part of this story's edits).

### Completion Notes
- All tasks (1-5) fully implemented and tested. All 6 ACs implemented: AC1 (scheduled sync via the new `/api/calendar/sync` endpoint, real trigger is deployment infra — see below), AC2 (merge precedence, `mergeAvailability` + wired into the calendar read path), AC3 (token refresh with `needs_reauth` flagging on failure), AC4 (per-user failure isolation), AC5 (wholesale replace in a transaction), AC6 (busy-blocks table has no columns for anything beyond start/end/user_id).
- **Deployment follow-up (not part of this codebase change):** an EventBridge scheduled rule (2-5 min interval, per Architecture Decision 6a) needs to be provisioned pointing at a Lambda that calls `POST /api/calendar/sync` with the `x-sync-secret` header matching `CALENDAR_SYNC_SECRET`. This is infrastructure provisioning outside this repo (same category as Story 3.5's Google Cloud Console OAuth app setup) — flagging for whoever handles deployment, not left silently undone.
- Story moved to `review` — no forward-dependency blockers like Stories 2.8/3.5 hit; all tasks are genuinely complete.

### File List
- `lib/db/migrations/025_create_google_calendar_busy_blocks_table.sql` (new)
- `lib/availability/mergeAvailability.ts` (new)
- `lib/services/calendarSyncService.ts` (new)
- `app/api/calendar/sync/route.ts` (new)
- `lib/db/queries.ts` (modified — added `getGroupGoogleBusyBlocks`; `getGroupAvailabilitiesForCalendar` now also returns `google_busy_blocks` and `merged_availability` per member)
- `components/groups/SoftCalendar.tsx` (modified — displays merged status via `getMemberDateDisplayStatus`, with fallback; edit-click flow unchanged)
- `.env.local.example` (modified — added `CALENDAR_SYNC_SECRET`)
- `__tests__/lib/availability/mergeAvailability.test.ts` (new)
- `__tests__/services/calendarSyncService.test.ts` (new)
- `__tests__/api/calendar/sync.test.ts` (new)
- `__tests__/db/queries.googleBusyBlocks.test.ts` (new)
- `__tests__/components/groups/SoftCalendar.mergedAvailability.test.tsx` (new)

### Change Log
- 2026-08-27: Implemented all tasks (DB migration, merge function, sync service, sync API route, calendar read-path integration, SoftCalendar display update, tests) for Google Calendar availability sync. Scheduling mechanism resolved with user (AWS Lambda + EventBridge); actual Lambda/EventBridge provisioning flagged as a deployment follow-up. Story moved to `review`.

---

## Next Steps

1. **Resolve scheduling mechanism** with the team/architect before starting Task 2 — done 2026-08-27, see Implementation Plan
2. **Dev Agent:** Invoke `/bmad-bmm-dev-story` with this story file — done 2026-08-27
3. **Code Review:** Run `/bmad-bmm-code-review` after implementation, with attention to the merge precedence logic and per-user failure isolation
4. **Deployment:** Provision the EventBridge -> Lambda -> `/api/calendar/sync` trigger (see Completion Notes) before this actually runs in production
5. **Next Story:** 3-7-availability-home-screen (depends on this story's merged availability data) — in progress next, same session
