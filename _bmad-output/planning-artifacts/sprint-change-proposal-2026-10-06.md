---
workflowType: correct-course
project_name: get-together
user_name: Andrewramell
date: "2026-10-06"
status: approved
mode: incremental
scope: major
---

# Sprint Change Proposal — Flexible Event Dashboard

**Date:** 2026-10-06
**Facilitated with:** Andrewramell
**Trigger story:** 13.8 (Comments on Logistics Items), commits `a631296`, `f7d1e78`, `6f58332`

## Section 1: Issue Summary

**Problem statement:** The event dashboard is built for one shape of event (a group trip) and its flexibility is hard-wired. The product owner wants it reusable across different groups and different event types, with as much flexibility as possible.

**Trigger type:** New requirement from the product owner, surfaced while finishing 13.8. Not a defect in earlier work.

**Evidence (verified in the repo):**
- `group_dashboard_widgets.widget_key` is constrained to `photos | checklist | timeline | logistics | polls` and `position` to `BETWEEN 1 AND 5` (migration 033). `EventPlanningTab.tsx`, `DashboardWidgetCustomizer.tsx`, `PublicEventPlanning.tsx`, `dashboardWidgetsService.ts` and `lib/utils/dashboardWidgets.ts` all depend on the fixed set.
- Logistics `category` is constrained to `bring | carpool`; that logic lives in `eventLogisticsService.ts`, `publicPlanningService.ts`, `EventLogistics.tsx` and three route files.
- Dashboard layout is stored per group only; there is no per-event layout.
- No event type exists on `event_proposals` or anywhere else in the schema; there are no templates or presets.
- Comments use one table per item type (`checklist_comments` 034, `logistics_comments` 035). Stories 13.9 and 13.10 would add two more.
- Planning docs and UI copy are trip-flavored.

**Decisions from the product owner (2026-10-06):**
- Flexibility axes wanted: per-event layout, event-type presets, new/custom widgets, custom logistics categories and labels.
- Control model: a code registry plus presets that admins choose from and arrange. Not fully user-defined sections.
- 13.9 and 13.10 are paused and re-scoped onto a generic comments mechanism.

## Section 2: Impact Analysis

**Epic impact**
- Epic 13: cannot finish as planned. 13.9 and 13.10 move out; Epic 13 closes at 13.8 (all stories in `review`) and can go to a retrospective.
- New Epic 14: Flexible Event Dashboard.
- Epics 12 and 13: behavior preserved, no changes to their delivered stories.

**Story impact**
- 13.9 → 14.3, 13.10 → 14.4 (re-scoped to wire timeline and poll items onto generic comments).
- 13.4 (widget layout) and 13.5 (no-login view): rewritten internally by 14.1 and 14.5 to read from the registry and the layout resolution order; behavior preserved.
- 13.7 and 13.8: their per-type comment tables are migrated into the generic table by 14.2.

**Artifact conflicts**
- PRD: no conflict; adds FR79–FR84 (last existing is FR78).
- Architecture: Decision 13a (per-type comment tables) and 13b's fixed widget set are superseded by Epic 14 decisions.
- UX (`EXPERIENCE.md`, `DESIGN.md`): new surfaces (event-type picker, customize scope toggle, category editor, add-widget control).

**Technical impact**
- New migrations: drop widget CHECKs, add instance identity to layout rows, `event_dashboard_widgets`, `item_comments` (plus migration and drop of 034/035), `event_type` on `event_proposals`, `logistics_categories`.
- Registry code, layout resolution, generic comment routes and components, preset definitions.
- Open item to confirm before 14.2: whether migrations 034 and 035 have been applied to production.

## Section 3: Recommended Approach

**Path: Direct Adjustment (new Epic 14, re-scope 13.9/13.10).** Effort: high. Risk: medium.

- Rollback of 13.7/13.8 comment work: not viable or needed; migrating two small tables is cheaper than reverting.
- MVP review: not applicable; this is post-MVP and the MVP is unaffected.

**Rationale:** the registry (14.1) and generic comments (14.2) are behavior-preserving refactors that put the risk first and keep every later story small. The flexibility the product owner chose (registry plus presets) needs no per-type schema and no user-defined field storage.

**MVP impact:** none.

## Section 4: Detailed Change Proposals (all approved)

### Proposal 1 — `epics.md`: add Epic 14 (approved)

**Epic 14: Flexible Event Dashboard.** Any group can run any kind of event on the same dashboard. Widgets, wording and logistics categories fit the event without a code change per event kind.

| Story | Title | Summary |
|-------|-------|---------|
| 14.1 | Widget Registry | Behavior-preserving. Drop the CHECK constraints; widget types come from a code registry; refactor the dashboard, customizer, public view and layout service. |
| 14.2 | Generic Item Comments | One comments table keyed by item type and ID. Migrate checklist and logistics comments. Rename the "Checklist"-prefixed comment components to generic names. |
| 14.3 | Comments on Timeline Items | Moved from 13.9, built on 14.2. |
| 14.4 | Comments on Polls | Moved from 13.10, built on 14.2. |
| 14.5 | Per-Event Layout | Event override with fallback to the group default; customize asks "this event" or "group default". |
| 14.6 | Configurable Logistics Categories and Labels | Admin-editable categories, each single-claimant or seats. |
| 14.7 | Event Types and Presets | Event type on events; presets set widgets, categories, labels and starter items; optional group default type. |
| 14.8 | Terminology and Copy Neutralization | Trip-flavored wording comes from the preset's labels. |
| 14.9 | Notes and Links Widget (candidate) | A new widget added through the registry only, to prove no schema change is needed. |

Sequence: 14.1 → 14.2 → (14.3, 14.4) in parallel with (14.5, 14.6) → 14.7 → 14.8 → 14.9. 14.7 depends on 14.5 and 14.6.

### Proposal 2 — `epics.md` and `sprint-status.yaml`: move 13.9/13.10 (approved)

- Remove 13.9 and 13.10 from Epic 13 with a note that they moved to 14.3 and 14.4.
- `sprint-status.yaml`: remove `13-9-comments-on-timeline-items` and `13-10-comments-on-polls`; add `epic-14: backlog` and `14-1` to `14-9` as `backlog`.
- Mark Decision 13a superseded in `architecture.md`.

### Proposal 3 — `architecture.md`: Epic 14 Addendum (approved; all `[ASSUMPTION]`, architect to confirm)

- **14a Widget registry (supersedes 13b's fixed set):** code registry (`lib/dashboard/widgetRegistry.ts`) with key, label, renderer, commentable flag, public-view flag. Drop `widget_key IN (...)` and `position BETWEEN 1 AND 5`; validate keys in application code. Layout rows get an instance identity so an event can hold multiple widgets of one type. Optional per-widget title override as a plain column; no free-form config blob (consistent with 13b's no-JSONB convention).
- **14b Layout resolution:** event override → group default → event-type preset → system default. New `event_dashboard_widgets` table (same shape as the group table plus `event_id`, cascade delete). An event gets rows only once customized for that event. The no-login view resolves layout the same way.
- **14c Generic item comments (supersedes 13a):** one `item_comments` table: `item_type`, `item_id`, `event_id` (FK, cascade), `group_id`, standard comment columns. Gives up a per-item FK; cleanup on event delete via cascade, on item delete in the service layer. 034 and 035 are migrated into it, then dropped.
- **14d Event types and presets:** nullable `event_type` on `event_proposals`, validated against a code registry of presets; optional group default type. A preset is data: widget list and order, logistics categories, label overrides, starter items. Applied at creation by copying values; later preset changes do not alter existing events.
- **14e Logistics categories:** `logistics_categories` per group (key, label, `mode`), seeded from the preset. `mode` is one of two fixed behaviors: single claimant (today's bring) or seats (today's carpool). Replaces the `category` CHECK with a reference to this table; existing bring and carpool rows are backfilled.

### Proposal 4 — `prd.md`: add Event Dashboard Flexibility, FR79–FR84 (approved)

- FR79: a group admin can choose which dashboard widgets appear for an event, and in what order, from the available widget types.
- FR80: an event can have its own dashboard layout, separate from the group's default.
- FR81: a user can pick an event type when creating an event; the type sets a starting layout, logistics categories, wording and starter items.
- FR82: a group admin can set a default event type for the group.
- FR83: a group admin can rename, add and remove logistics categories, each behaving as either "one person claims" or "limited seats".
- FR84: members can comment on any commentable dashboard item (checklist, logistics, timeline, poll) with the same behavior everywhere.
- Add a post-MVP growth line for event-type flexibility, and an Epic 14 entry in the FR coverage map.

### Proposal 5 — UX spec updates (approved; affected sections marked `draft` pending a UX pass)

- `EXPERIENCE.md` Information Architecture: layout resolves per event with group-default fallback; customize asks "this event only" or "all events in this group".
- Voice and Tone: terminology comes from the event type's labels; current trip wording becomes the Trip preset's labels.
- Component Patterns: event-type picker at creation with a preview of what each preset sets up; logistics category editor; "Add widget" control in customize mode, including a second widget of the same kind.
- Key Flows: a variant of "Setting up the shared dashboard" starting from event-type selection; a short flow for customizing one event without changing the group default.
- State Patterns: a first per-event customization shows a "customized for this event" indicator with "reset to group default".
- `DESIGN.md` Components: event-type picker card, category editor row, customize-scope toggle (existing Chakra primitives; no visual identity change).

## Section 5: Implementation Handoff

**Scope: Major.** Fundamental architecture changes plus a new epic.

| Order | Recipient | Responsibility |
|-------|-----------|----------------|
| 1 | Architect (Winston, `bmad-agent-architect` / `bmad-architecture`) | Confirm or correct decisions 14a–14e and write the Epic 14 addendum; supersede 13a and 13b. |
| 2 | PM (John, `bmad-agent-pm` / `bmad-prd`) | Add FR79–FR84 and the coverage entry to the PRD. |
| 3 | UX (Sally, `bmad-agent-ux-designer` / `bmad-ux`) | Update `EXPERIENCE.md` and `DESIGN.md`; resolve the draft sections. |
| 4 | PM / `bmad-create-epics-and-stories` | Break Epic 14 into full stories with acceptance criteria. |
| 5 | Dev (`bmad-sprint-planning` then `bmad-build`) | Build 14.1 onward in the stated order. |

**Applied at approval:** the Epic 14 entries in `epics.md` and the `sprint-status.yaml` changes (Proposals 1 and 2). Proposals 3–5 are specified in full above for the owning agents to apply, because they carry decisions that need those roles' judgment.

**Success criteria**
- 14.1 and 14.2 ship with no user-visible change and no regression in existing dashboard, public-link or comment behavior.
- A new widget type can be added through the registry alone, with no schema change (proved by 14.9).
- Two events in the same group can have different layouts, categories and wording.
- An event created from the Dinner preset shows none of the trip-specific wording.

**Open items**
- Confirm whether migrations 034 and 035 were applied to production before 14.2 is planned.
- 14.9's widget choice (Notes and Links) is a candidate and can be swapped.
- Epic 13 retrospective is unblocked once 13.7 and 13.8 pass review.
