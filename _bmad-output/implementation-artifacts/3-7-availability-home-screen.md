---
story_key: "3-7-availability-home-screen"
epic: "3"
story: "7"
title: "Availability-First Home Screen"
status: "ready-for-dev"
created_date: "2026-08-27"
---

# Story 3.7: Availability-First Home Screen

**Epic:** 3 - Soft Calendar & Availability
**Story Key:** 3-7-availability-home-screen
**Created:** 2026-08-27
**Status:** ready-for-dev

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
- [ ] Build `AvailabilityGrid` component per the UX spec's component props (`days`, `members`, `overlapThreshold`, `onSlotTap`, `onConnectGoogleCalendar`)
- [ ] Implement overlap highlighting logic (day is highlighted when free-member-count meets `overlapThreshold`, default: majority of group)
- [ ] Implement accessibility per spec: `role="table"`, proper row/col headers, per-cell `aria-label`, color + icon + text (never color alone)

**Task 2: Routing Logic**
- [ ] On group landing, check the group's `planning_style` setting and route to Availability view or existing Feed accordingly
- [ ] **Dependency note:** the `planning_style` column/setting doesn't exist yet — it's Story 2.8, not yet built. Until 2.8 lands, gate this behind a temporary default (e.g., hardcode `'availability-first'` or a feature flag) so this story isn't blocked waiting on Epic 2 sequencing

**Task 3: Merged Availability Overview Endpoint**
- [ ] `GET /api/groups/:groupId/availability-overview` — returns merged availability (via Story 3.6's merge function) for all members across the forward window, plus active proposals for that group

**Task 4: Propose-From-Slot Wiring**
- [ ] Wire `AvailabilityGrid`'s `onSlotTap` to open the existing Create Event modal, pre-filled with the tapped date — verify no duplicate modal is created

**Task 5: Google Calendar Connect Banner**
- [ ] Conditional banner render based on `calendar_connections` existence for current user (from Story 3.5)
- [ ] Session-scoped dismissal (not persisted — reappears next session if still not connected, per typical onboarding-nudge pattern)

**Task 6: Testing**
- [ ] Component tests: grid rendering, overlap highlighting, cell accessibility labels
- [ ] API test: availability-overview endpoint returns correctly merged + shaped data
- [ ] Integration test: full flow — land on Availability view → see highlighted day → tap → modal opens pre-filled → create event
- [ ] Integration test: Proposals-first group still lands on existing Feed (regression check)

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

### Story Quality Checklist
- ✅ Explicit dependency on not-yet-built Story 2.8 (Planning Style setting) called out with a concrete interim workaround (Task 2), not left ambiguous
- ✅ Reuse of existing Create Event modal specified — no duplicate creation UI
- ✅ Regression check included for Proposals-first groups (AC1, Task 6)
- ✅ Accessibility requirements carried over from the UX spec's component definition

### Implementation Readiness
- **Ready for Dev:** Yes, with the Task 2 interim workaround noted
- **Dependencies:** Story 3.5 and 3.6 for real data; Story 2.8 for the real Planning Style setting (interim default in the meantime)
- **Blocking Issues:** None — the interim default in Task 2 unblocks this from Epic 2's sequencing

---

## Next Steps

1. **Dev Agent:** Invoke `/bmad-bmm-dev-story` with this story file
2. **Code Review:** Run `/bmad-bmm-code-review` after implementation
3. **Follow-up:** Once Story 2.8 lands, remove the temporary hardcoded default from Task 2 and wire the real `planning_style` setting
4. **Next Story:** 3-8-disconnect-google-calendar
