---
story_key: "4-7-deemphasize-threshold"
epic: "4"
story: "7"
title: "De-Emphasize Threshold Display in Availability-First Groups"
status: "review"
created_date: "2026-08-27"
---

# Story 4.7: De-Emphasize Threshold Display in Availability-First Groups

**Epic:** 4 - Event Proposals & RSVP with Real-Time Momentum
**Story Key:** 4-7-deemphasize-threshold
**Created:** 2026-08-27
**Status:** review

---

## Story

As a member of an Availability-first group,
I want the commitment threshold/momentum display to be visually secondary rather than the headline of an event,
So that the event card matches my group's chosen planning style instead of pushing momentum as the primary hook.

---

## Acceptance Criteria

**AC1: No Functional Change**
- **Given** any event with a commitment threshold set
- **When** RSVPs come in
- **Then** all existing threshold/momentum logic (auto-confirm, real-time counter, FR23-34) behaves exactly as before — this story is presentation-only, no FR or business logic changes

**AC2: De-Emphasized Display in Availability-First Groups**
- **Given** a group's Planning Style is `'availability-first'` (Story 2.8)
- **When** an event card or detail view renders
- **Then** the momentum counter (e.g., "5 in, 2 maybe, 1 out") is shown in a smaller, secondary visual position rather than the prominent large card treatment from the original design
- **And** the threshold progress bar, if present, is similarly de-emphasized (smaller, less saturated color treatment)

**AC3: Unchanged Display in Proposals-First Groups**
- **Given** a group's Planning Style is `'proposals-first'`
- **When** an event card or detail view renders
- **Then** the momentum counter and threshold display remain exactly as originally designed (full prominence, per the existing MomentumCounter component) — no regression for groups that want the original experience

**AC4: RSVP Buttons Unaffected**
- **Given** either Planning Style
- **When** the event card renders
- **Then** the RSVP buttons (In/Maybe/Out) remain equally prominent and functional in both modes — only the momentum *display*, not the RSVP *action*, is de-emphasized

---

## Requirements Mapped

**Source:** Sprint-change-proposal-2026-08-19, Section 2 (Epic Impact — Epic 4: "light touch") and Section 4 (Detailed Change Proposals). Not tied to a new FR — existing FR23-34 are unchanged; this is a presentation-layer variant.

---

## Tasks / Subtasks

**Task 1: Component Variant**
- [x] Add a `deemphasized` visual variant to the momentum/threshold display — implemented as a `planningStyle` prop on `EventCard` (defaults to `'proposals-first'`, the original full-prominence treatment) rather than a variant on `MomentumCounter`. See Completion Notes: `MomentumCounter` is dead code, not rendered by any page — the actual momentum/threshold markup lives inline in `EventCard.tsx` and `EventDetail.tsx`. Confirmed with user (Andrewramell) 2026-08-27 before implementing.
- [x] Reused the existing inline markup with conditional rendering rather than creating a second component/second markup block

**Task 2: Conditional Rendering**
- [x] `EventCard` (both call sites in `app/groups/[groupId]/page.tsx`) and `EventDetail` (Details tab) read the event's group's `planning_style` (Story 2.8) — `EventCard` via a new `planningStyle` prop passed from the group page's already-loaded `group.planning_style`; `EventDetail` via extending its existing `getGroupDetails` call (previously used only for `userRole`) — and conditionally render the de-emphasized variant

**Task 3: Visual Design**
- [x] De-emphasized variant: smaller font size (`xs`, 12px vs. 14-16px default), reduced/removed background saturation (plain text vs. colored `Box`, `colorScheme="gray"` vs. blue/green on the threshold bar), moved to a less prominent position (below the title/date meta line in the card header, rather than its own large `CardBody` section)
- [x] Color + text accessibility pattern intact in both variants: momentum/threshold counts are always rendered as plain text (never color-only), unchanged by this story

**Task 4: Testing**
- [x] `MomentumCounter` component tests not applicable — component confirmed unused/dead code (see Task 1 note); no variant added to it, so no new tests needed there
- [x] Component tests: `EventCard` selects the correct variant based on `planningStyle` prop (6 new tests in `__tests__/components/EventCard.test.tsx`)
- [x] Component tests: `EventDetail` selects the correct variant based on group's `planning_style` (3 new tests in `__tests__/components/EventDetail.test.tsx`)
- [x] Regression check: proposals-first / default (no prop passed) renders identically to before this story (AC3) — covered by existing test suites (28 `EventCard` + 12 `EventCard.mobile` tests, all passing unmodified) plus new explicit default-variant tests
- [x] Accessibility: de-emphasized variant asserted to convey momentum/threshold info as text, not color alone (color-independence); no automated contrast-checking tool (e.g. jest-axe) exists elsewhere in this repo, so none was introduced for this presentation-only story — see Completion Notes

---

## Dev Notes

### Architecture Context

- This is a pure UI/presentation story — no new database columns, no new API surface beyond reading the `planning_style` value already added by Story 2.8.
- Depends on Story 2.8 for the `planning_style` value to branch on; can be stubbed with a hardcoded value for development until 2.8 lands, similar to Story 3.7's interim approach.

### Project Structure Notes

- Update: `components/EventCard.tsx` (or wherever the original `EventCard` from the UX spec's Custom Components lives)
- Update: `MomentumCounter` component — add variant/size handling if not already sufficient via the existing `size` prop
- Update: event detail view — same conditional variant logic

### References

- [UX Spec: MomentumCounter Component](../planning-artifacts/ux-design-specification.md) — existing `size` prop (`small`/`medium`/`large`) this story likely extends rather than replaces
- [Source: sprint-change-proposal-2026-08-19.md, Section 2 — Epic 4 impact](../planning-artifacts/sprint-change-proposal-2026-08-19.md)
- [Source: 2-8-planning-style-setting.md](./2-8-planning-style-setting.md) — source of the `planning_style` value this story branches on

---

## Dev Agent Record

### Workflow Execution
- Created via Scrum Master story-preparation pass following the sprint-change-proposal-2026-08-19's Epic 4 "light touch" impact note

### Story Quality Checklist
- ✅ Explicitly scoped as presentation-only, no FR/logic changes (AC1) — prevents scope creep into re-litigating momentum mechanics
- ✅ Regression protection for Proposals-first groups made an explicit AC (AC3), not just implied
- ✅ Reuses existing `MomentumCounter` component's variant pattern rather than creating a parallel component

### Implementation Readiness
- **Ready for Dev:** Yes
- **Dependencies:** Story 2.8 for the real `planning_style` value (can stub in the meantime)
- **Blocking Issues:** None

### Implementation Plan
- **Scope correction (flagged to user before implementing, confirmed 2026-08-27):** The story's Dev Notes assumed `MomentumCounter` is the component `EventCard`/event-detail-view render for momentum. It isn't — `MomentumCounter.tsx` and `components/events/RSVPButtons.tsx`/`components/events/EventDetail.tsx` are dead code, imported only by their own test files, not by any page. The live momentum/threshold markup is inline JSX inside `components/groups/EventCard.tsx` and `components/groups/EventDetail.tsx` (used from `app/groups/[groupId]/page.tsx` and `app/groups/[groupId]/events/[eventId]/page.tsx`). Implemented the de-emphasized variant in those live components instead of in the unused `MomentumCounter`, since that's what actually changes what users see. `MomentumCounter.tsx` was left untouched.
- **`EventCard`:** Added an optional `planningStyle?: 'availability-first' | 'proposals-first'` prop, defaulting to `'proposals-first'` (the original, unchanged treatment — satisfies AC3 for any caller that doesn't pass the prop, including the existing test suites). When `'availability-first'`, the momentum text + a small threshold progress bar render in the `CardHeader`, below the title/date line, using `fontSize="xs"`, `color="ink.400"`, and `colorScheme="gray"` on the progress bar; the original large `CardBody` momentum `Box` and threshold `Box` are suppressed in that mode. Both group-page call sites (`app/groups/[groupId]/page.tsx`, the "Active Proposals" list and the main "Events" list) now pass `planningStyle={group.planning_style}`.
- **`EventDetail` (Details tab):** Extended the component's existing `getGroupDetails` call (previously used only to derive `userRole` for comment authorization) to also read `data.group.planning_style` into a new `planningStyle` state (default `'proposals-first'`). Added the same de-emphasized text line under the title/date in `CardHeader`, and gated the existing momentum `Box` in `CardBody` behind `!isDeemphasized`. `EventDetail` has no threshold progress bar today (only a momentum count), so there was nothing to de-emphasize there beyond the momentum text.
- **AC4 (RSVP buttons unaffected):** Investigated and found there are currently no live, clickable RSVP In/Maybe/Out buttons for authenticated group members anywhere in the app — `components/events/RSVPButtons.tsx` is dead code, and neither `EventCard`, `EventDetail`, nor `EventPlanningTab` wire it up. The only working RSVP flow is the public (non-member) link (`PublicRsvpForm.tsx`). This is a pre-existing gap unrelated to this story; noted here rather than fixed, since AC1 scopes this story as presentation-only. AC4 is satisfied vacuously for the code this story touches (nothing there was de-emphasized), and the existing "Your RSVP: ..." status indicator in `EventCard` was left untouched in both variants.
- **Testing:** Added 6 new tests to `__tests__/components/EventCard.test.tsx` and 3 to `__tests__/components/EventDetail.test.tsx` covering both variants, the default (AC3), the missing-threshold case, and color-independence (text always conveys the counts, not color alone). No `jest-axe`/automated contrast tool exists anywhere else in this repo, so none was introduced for this presentation-only change.
- **Verification:** `npx tsc --noEmit` and `npx eslint` on all changed files show the identical pre-existing error/warning set as an unmodified checkout (verified via `git stash` diff — no new issues). Full repo test suite: 2864 passed / 458 failed / 26 skipped (71 failed suites), vs. baseline (unmodified tree) of 2855 passed / same 458 failed / same 71 failed suites — the +9 passing tests are exactly this story's new tests; all pre-existing failures are the repo's known Node v25 `NextRequest`/`jest.setup.js` harness incompatibility (see Story 2.8's Implementation Plan note), unrelated to this story.

### Completion Notes
- All 4 tasks complete. AC1 (no functional change — no FR/business logic touched), AC2 (de-emphasized display in availability-first groups), AC3 (unchanged full-prominence display in proposals-first groups / default), and AC4 (RSVP status indicator unaffected; no live RSVP action buttons exist to de-emphasize — see Implementation Plan) are all implemented and covered by tests.
- Key scope correction from the story's Dev Notes: implemented against the actually-live `EventCard`/`EventDetail` components rather than the dead-code `MomentumCounter`, confirmed with user before starting (see Implementation Plan).
- `tsc --noEmit` and `eslint` show no new errors/warnings vs. baseline. Full test suite: +9 new passing tests, 0 regressions (458 pre-existing failures unchanged, same Node v25 harness issue noted in Story 2.8).

### File List
- `components/groups/EventCard.tsx` (modified — added `planningStyle` prop and de-emphasized variant)
- `components/groups/EventDetail.tsx` (modified — reads group `planning_style` via existing `getGroupDetails` call, added de-emphasized variant)
- `app/groups/[groupId]/page.tsx` (modified — passes `planningStyle={group.planning_style}` to both `EventCard` call sites)
- `__tests__/components/EventCard.test.tsx` (modified — added "Planning Style Variant (Story 4.7)" test suite, 6 tests)
- `__tests__/components/EventDetail.test.tsx` (modified — added "Planning Style Variant (Story 4.7)" test suite + `getGroupDetails` mock, 3 tests)

### Change Log
- 2026-08-27: Implemented Story 4.7 — de-emphasized momentum/threshold display for availability-first groups in `EventCard` and `EventDetail`. Reinterpreted Task 1's target from the unused `MomentumCounter` component to the live inline markup in `EventCard`/`EventDetail` (confirmed with user). 9 new tests added, 0 regressions. Status moved to `review`.

---

## Next Steps

1. ~~**Dev Agent:** Invoke `/bmad-bmm-dev-story` with this story file~~ — done 2026-08-27
2. **Code Review:** Run `/bmad-bmm-code-review` after implementation, with attention to AC3's regression check and the Task 1/AC4 scope notes above
3. **Epic 4 note:** This is a small addition to an already-`done` epic — no epic-level retrospective re-trigger needed, just this one story
4. **Follow-up (not this story):** No group member currently has a working RSVP button in the app UI (see AC4 note above) — worth filing as its own story if intentional gap needs closing
