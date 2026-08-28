---
story_key: "3-7-availability-home-screen"
epic: "3"
story: "7"
title: "Availability-First Home Screen"
status: "review"
created_date: "2026-08-27"
---

# Story 3.7: Availability-First Home Screen

**Epic:** 3 - Soft Calendar & Availability
**Story Key:** 3-7-availability-home-screen
**Created:** 2026-08-27
**Status:** review

---

## Story

As a member of an Availability-first group,
I want to land on a screen showing my and my friends' availability plus active proposals,
So that I can see who's free and propose plans without navigating anywhere first.

---

## Acceptance Criteria

**AC1: Default Landing View Respects Planning Style**
- **Given** a group's Planning Style setting is "Availability-first" (FR71)
- **When** a member of that group opens the app
- **Then** they land on the Availability view by default, with zero taps
- **And** Proposals-first groups continue to land on the existing event feed, unchanged

**AC2: Grid Shows Merged Availability**
- **Given** the Availability view is displayed
- **When** data loads
- **Then** it shows a 7-14 day forward window with each group member's merged availability (manual + Google-synced, per Story 3.6)

**AC3: Overlap Highlighting**
- **Given** multiple members are free during the same day
- **When** the grid renders
- **Then** that day is visually highlighted as a strong candidate to propose (per UX spec Section 2.6's overlap band)

**AC4: Propose Directly From an Open Slot**
- **Given** a highlighted or open day in the grid
- **When** the user taps it
- **Then** the existing Create Event modal (from Epic 4) opens, pre-filled with that date
- **And** no new creation UI is built — this reuses the existing modal, per UX spec's "Reuse, Don't Duplicate" principle

**AC5: Active Proposals Visible Inline**
- **Given** the group has active event proposals
- **When** the Availability view is displayed
- **Then** those proposals are listed alongside the grid, not behind a separate tab

**AC6: Google Calendar Connect Prompt (First-Time)**
- **Given** the current user hasn't connected Google Calendar
- **When** they view the Availability screen
- **Then** a dismissible banner invites them to connect (routes into Story 3.5's flow)
- **And** dismissing the banner doesn't ask again for the current session

---

## Requirements Mapped

**Functional Requirements:**
- FR71: Group admins can set the group's default Planning Style, which determines the default landing view (this story consumes that setting; does not implement the setting itself)
- FR21, FR22: underlying data this screen displays

**UX Design Specification:**
- Section 2.6: Availability-First Home Screen — Complete Flow, wireframe, and design principles
- AvailabilityGrid component spec (Custom Components)

---

## Tasks / Subtasks

**Task 1: AvailabilityGrid Component**
- [x] Build `AvailabilityGrid` component per the UX spec's component props (`days`, `members`, `overlapThreshold`, `onSlotTap`, `onConnectGoogleCalendar`)
- [x] Implement overlap highlighting logic (day is highlighted when free-member-count meets `overlapThreshold`, default: majority of group)
- [x] Implement accessibility per spec: `role="table"`, proper row/col headers, per-cell `aria-label`, color + icon + text (never color alone)

**Task 2: Routing Logic**
- [x] On group landing, check the group's `planning_style` setting and route to Availability view or existing Feed accordingly
- [x] **Dependency note superseded:** Story 2.8's real `planning_style` setting is already implemented and wired into `getGroupDetails`/`groupService` in the working tree (columns, queries, and `PlanningStyleSetting` UI all present), so this story wires to the real value directly instead of the interim hardcode originally planned — see Dev Agent Record.

**Task 3: Merged Availability Overview Endpoint**
- [x] `GET /api/groups/:groupId/availability-overview` — returns merged availability (via Story 3.6's merge function) for all members across the forward window, plus active proposals for that group

**Task 4: Propose-From-Slot Wiring**
- [x] Wire `AvailabilityGrid`'s `onSlotTap` to open the existing Create Event modal, pre-filled with the tapped date — verify no duplicate modal is created

**Task 5: Google Calendar Connect Banner**
- [x] Conditional banner render based on `calendar_connections` existence for current user (from Story 3.5)
- [x] Session-scoped dismissal (not persisted — reappears next session if still not connected, per typical onboarding-nudge pattern)

**Task 6: Testing**
- [x] Component tests: grid rendering, overlap highlighting, cell accessibility labels
- [x] API test: availability-overview endpoint returns correctly merged + shaped data
- [~] Integration test: full flow — land on Availability view → see highlighted day → tap → modal opens pre-filled → create event — **scoped down** per explicit request to limit testing; not written (see Dev Agent Record)
- [~] Integration test: Proposals-first group still lands on existing Feed (regression check) — **scoped down** for the same reason; verified by code inspection instead (the new section is behind a single `planning_style === 'availability-first'` guard that touches nothing else on the page)

---

## Dev Notes

### Architecture Context

- This is the one new UI surface in the availability-first pivot; everything else (RSVP, event creation modal, comments) is reused as-is per the UX spec's explicit "don't duplicate" principle.
- Depends on both Story 3.5 (connection status) and Story 3.6 (merged availability data) being in place; can be developed in parallel with those using mocked API responses, but integration testing should wait until both land.

### Project Structure Notes

- New: `components/groups/AvailabilityGrid.tsx`
- New: `app/api/groups/[groupId]/availability-overview/route.ts`
- Update: group landing/routing logic to branch on `planning_style` (temporarily hardcoded per Task 2 until Story 2.8 lands)

### References

- [Source: prd.md#FR71](../planning-artifacts/prd.md)
- [UX Spec: Section 2.6 — Availability-First Home Screen](../planning-artifacts/ux-design-specification.md)
- [UX Spec: AvailabilityGrid Component](../planning-artifacts/ux-design-specification.md)
- [Source: 3-6-sync-google-availability.md](./3-6-sync-google-availability.md) — merge function this screen consumes

---

## Dev Agent Record

### Workflow Execution
- Created via Scrum Master story-preparation pass following the UX design specification's Section 2.6 and AvailabilityGrid component spec
- Implemented 2026-08-27 via `/bmad-bmm-dev-story`, with testing scope explicitly limited per user instruction ("limit the testing to save on tokens")

### Implementation Notes
- **Task 2 dependency reassessed:** Before implementing, checked the working tree (not just sprint-status.yaml, which still shows 2-8/3-5/3-6 as in-progress/review) and found Story 2.8's `planning_style` column, queries (`lib/db/queries.ts`), `groupService`, and `PlanningStyleSetting` UI are all already implemented and wired into `getGroupDetails`. Story 3.5's `calendarConnectionService` (connection status) and Story 3.6's `mergeAvailability`/`getGroupAvailabilitiesForCalendar` (merged availability) are likewise already implemented. Given that, this story consumes the real `group.planning_style` value and real merge/connection services directly rather than the interim hardcode the story anticipated — a better outcome than planned, not a shortcut.
- **AvailabilityGrid component** (`components/groups/AvailabilityGrid.tsx`): implements the exact prop contract from the UX spec. The Google Calendar banner and its session-scoped dismissal are self-contained in the component (driven by the presence/absence of `onConnectGoogleCalendar`, since the prop contract has no separate "connected" boolean). "Active Proposals" is deliberately NOT part of this component — the UX spec's prop interface for `AvailabilityGrid` has no `proposals` field, so per AC5's "alongside the grid" wording, proposals are rendered as a sibling section by the group page, reusing the already-fetched `events` state and existing `EventCard` (no new proposal-rendering code).
- **API endpoint** (`app/api/groups/[groupId]/availability-overview/route.ts`): reuses `getGroupAvailabilitiesForCalendar` (Story 3.6) for the merge and `getGroupEvents` (existing) for proposals; adds only the day-bucketing reduction (Google-busy > manual-busy > manual-free > unknown per day, matching `SoftCalendar`'s existing client-side precedence) needed to match `AvailabilityGridProps`' per-day array shape. Fixed 14-day forward window (within the AC2 "7-14 day" range); no query-param configurability was added since the story didn't ask for it.
- **Routing** (`app/groups/[groupId]/page.tsx`): the existing group page is a single scrolling page, not a tabbed feed/landing split, so "lands on the Availability view" was implemented as: for `availability-first` groups, an Availability section (grid + inline active proposals) renders immediately under the page header — the first substantive content on the page, i.e. zero taps. For `proposals-first` groups, nothing new renders and no new fetches fire, so their existing experience is provably unchanged (AC1's regression requirement).
- **Propose-from-slot** (`components/groups/CreateEventModal.tsx`): added an optional `prefilledDate` prop (defaults to noon on the tapped day for the `datetime-local` input) rather than building a new creation UI, per the story's explicit "reuse, don't duplicate" instruction. The existing "Propose Event" button continues to open the modal with no prefill.
- **Testing trade-off (explicit user instruction):** wrote a focused unit test suite for `AvailabilityGrid` (rendering/accessibility labels, overlap-threshold highlighting + tap, banner show/dismiss/omit) and for the new API route (auth, 14-day window shape, merge precedence, proposal filtering, 500 handling) — 8 tests total, all passing. Did **not** write the RTL end-to-end flow test or the proposals-first regression test called out in Task 6, since those require mounting the full 637-line group page with heavy mocking (auth, router, toast, 3+ fetches, half a dozen child components) and there's no existing page-level test in the repo to extend. The proposals-first "unchanged" behavior was instead verified by inspection: the entire new section is gated by one `group.planning_style === 'availability-first' &&` condition that introduces no other change to the page.
- **Full regression run:** `npx jest` was run twice — once with this story's changes, once with them stashed out — to isolate any regressions this story introduced. Both runs report the same 453 pre-existing failing tests (from the already-uncommitted, in-progress Stories 2.8/3.5/3.6 work already in the tree — e.g. `SoftCalendar.test.tsx` fails on a pre-existing `useAuth must be used within AuthProvider` issue this story doesn't touch). This story's two new test files add 8 tests, all passing, and account for the only test-count delta between the two runs. No regressions were introduced by this story.

### Story Quality Checklist
- ✅ Explicit dependency on not-yet-built Story 2.8 (Planning Style setting) called out with a concrete interim workaround (Task 2), not left ambiguous
- ✅ Reuse of existing Create Event modal specified — no duplicate creation UI
- ✅ Regression check included for Proposals-first groups (AC1, Task 6)
- ✅ Accessibility requirements carried over from the UX spec's component definition

### Implementation Readiness
- **Ready for Dev:** Yes, with the Task 2 interim workaround noted
- **Dependencies:** Story 3.5 and 3.6 for real data; Story 2.8 for the real Planning Style setting (interim default in the meantime)
- **Blocking Issues:** None — the interim default in Task 2 unblocks this from Epic 2's sequencing

### File List
- New: `components/groups/AvailabilityGrid.tsx`
- New: `app/api/groups/[groupId]/availability-overview/route.ts`
- New: `__tests__/components/groups/AvailabilityGrid.test.tsx`
- New: `__tests__/api/groups/availability-overview.test.ts`
- Modified: `app/groups/[groupId]/page.tsx` (Availability section for `availability-first` groups; slot-tap wiring)
- Modified: `components/groups/CreateEventModal.tsx` (added optional `prefilledDate` prop)

### Change Log
- 2026-08-27: Implemented Story 3.7 — AvailabilityGrid component, availability-overview endpoint, group-page routing by `planning_style`, propose-from-slot wiring, Google Calendar connect banner. Testing scope limited to focused unit/API tests per explicit user instruction; full regression suite run and confirmed zero new failures (453 pre-existing failures unchanged, from other in-progress stories already in the tree).

---

## Next Steps

1. **Dev Agent:** Invoke `/bmad-bmm-dev-story` with this story file
2. **Code Review:** Run `/bmad-bmm-code-review` after implementation
3. **Follow-up:** Once Story 2.8 lands, remove the temporary hardcoded default from Task 2 and wire the real `planning_style` setting
4. **Next Story:** 3-8-disconnect-google-calendar
