---
story_key: "3-6-sync-google-availability"
epic: "3"
story: "6"
title: "Sync Google Free/Busy into Soft Calendar"
status: "ready-for-dev"
created_date: "2026-08-27"
---

# Story 3.6: Sync Google Free/Busy into Soft Calendar

**Epic:** 3 - Soft Calendar & Availability
**Story Key:** 3-6-sync-google-availability
**Created:** 2026-08-27
**Status:** ready-for-dev

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
- [ ] Create `google_calendar_busy_blocks` table: `id`, `user_id` (FK), `start_time` (TIMESTAMPTZ), `end_time` (TIMESTAMPTZ), `synced_at` (TIMESTAMPTZ)
- [ ] Index on `(user_id, start_time)` to support the merge query efficiently

**Task 2: Sync Worker**
- [ ] Determine and confirm the scheduling mechanism with the team before implementing — the original architecture.md assumed AWS Lambda/CloudWatch Events, but this project is actually deployed with Supabase-hosted Postgres (per Story 11.1); confirm whether a Vercel Cron Job, Supabase Edge Function on a schedule, or another mechanism is the right fit for the current deployment target before building against an assumption
- [ ] Implement `calendarSyncService.ts`: `syncUserAvailability(userId)` — refreshes token if needed, calls `freebusy.query`, replaces that user's busy-block rows
- [ ] Implement the job runner that iterates all rows in `calendar_connections` where `needs_reauth = false`, calling `syncUserAvailability` per user with try/catch isolation (AC4)

**Task 3: Token Refresh Integration**
- [ ] Use Google's client library auto-refresh (credentials set from stored refresh token); on refresh failure, set `calendar_connections.needs_reauth = true`

**Task 4: Merge Logic**
- [ ] Implement `mergeAvailability(manualEntries, syncedBlocks)` used by the soft calendar read path — applies the precedence rule from AC2
- [ ] Update existing soft calendar query/service (from Epic 3's original stories) to call this merge function instead of reading only manual entries

**Task 5: Testing**
- [ ] Unit tests: merge logic precedence (all 4 cases: Google busy, manual busy only, manual free only, no data)
- [ ] Unit tests: wholesale replace behavior (old rows deleted, new rows inserted)
- [ ] Integration test: sync job run with mocked Google API responses, including one failing user among several succeeding
- [ ] Integration test: token refresh failure sets `needs_reauth`

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

---

## Next Steps

1. **Resolve scheduling mechanism** with the team/architect before starting Task 2
2. **Dev Agent:** Invoke `/bmad-bmm-dev-story` with this story file
3. **Code Review:** Run `/bmad-bmm-code-review` after implementation, with attention to the merge precedence logic and per-user failure isolation
4. **Next Story:** 3-7-availability-home-screen (depends on this story's merged availability data)
