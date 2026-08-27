---
story_key: "4-7-deemphasize-threshold"
epic: "4"
story: "7"
title: "De-Emphasize Threshold Display in Availability-First Groups"
status: "ready-for-dev"
created_date: "2026-08-27"
---

# Story 4.7: De-Emphasize Threshold Display in Availability-First Groups

**Epic:** 4 - Event Proposals & RSVP with Real-Time Momentum
**Story Key:** 4-7-deemphasize-threshold
**Created:** 2026-08-27
**Status:** ready-for-dev

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
- [ ] Add a `deemphasized` visual variant (or `size="small"` + reduced-saturation prop, per the existing `MomentumCounter` component's `size` prop) to `MomentumCounter` and the threshold progress bar
- [ ] Do not create a second component — extend the existing one with a variant/prop, per the UX spec's "reuse, don't duplicate" principle

**Task 2: Conditional Rendering**
- [ ] `EventCard` and event detail view read the event's group's `planning_style` (Story 2.8) and pass the appropriate variant to `MomentumCounter`/threshold display

**Task 3: Visual Design**
- [ ] De-emphasized variant: smaller font size (per existing `size="small"` token, 14px vs. 20-24px default), reduced background saturation, moved to a less prominent position in the card layout (e.g., below the title/date meta line rather than its own large card section)
- [ ] Keep color + icon + text accessibility pattern intact in both variants (no regression on WCAG AA color-independence requirement)

**Task 4: Testing**
- [ ] Component tests: `MomentumCounter` renders both variants correctly
- [ ] Component tests: `EventCard` selects the correct variant based on group's `planning_style`
- [ ] Visual regression check: Proposals-first groups render identically to before this story (AC3)
- [ ] Accessibility test: de-emphasized variant still passes color-contrast and color-independence checks

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

---

## Next Steps

1. **Dev Agent:** Invoke `/bmad-bmm-dev-story` with this story file
2. **Code Review:** Run `/bmad-bmm-code-review` after implementation, with attention to AC3's regression check
3. **Epic 4 note:** This is a small addition to an already-`done` epic — no epic-level retrospective re-trigger needed, just this one story
