# Epic 14 Context: Flexible Event Dashboard

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let any group run any kind of event (trip, dinner, game night, team practice) on the same dashboard. Widgets, wording and logistics categories fit the event without a code change per kind of event. Flexibility comes from a code registry plus presets that admins choose from and arrange, not fully user-defined sections. Note: the Epic 14 architecture addendum is still pending the architect; decisions below are `[ASSUMPTION]`s from the 2026-10-06 sprint change proposal, and PRD requirements FR79-FR84 are not yet in the PRD.

## Stories

- Story 14.1: Widget Registry
- Story 14.2: Generic Item Comments
- Story 14.3: Comments on Timeline Items
- Story 14.4: Comments on Polls
- Story 14.5: Per-Event Layout
- Story 14.6: Configurable Logistics Categories and Labels
- Story 14.7: Event Types and Presets
- Story 14.8: Terminology and Copy Neutralization
- Story 14.9: Notes and Links Widget

## Requirements & Constraints

- Admins can choose which widgets appear for an event and their order; an event can have its own layout separate from the group default.
- Users pick an event type at creation; it sets starting layout, logistics categories, wording and starter items. Admins can set a default event type per group.
- Admins can rename, add and remove logistics categories, each behaving as "one person claims" or "limited seats".
- Members can comment on any commentable item (checklist, logistics, timeline, poll) with identical behavior everywhere.
- 14.1 and 14.2 are behavior-preserving refactors: no visible change, no regression in dashboard, public-link or comment behavior.
- A new widget type must be addable through the registry alone, with no schema change (proved by 14.9).
- Two events in one group can differ in layout, categories and wording; an event created from a Dinner preset shows no trip-specific wording.

## Technical Decisions

- **Widget registry:** code registry (`lib/dashboard/widgetRegistry.ts`) holding key, label, renderer, commentable flag and public-view flag. Drop the `widget_key IN (...)` and `position BETWEEN 1 AND 5` CHECKs; validate keys in application code. Layout rows get an instance identity so one event can hold several widgets of a type. Optional per-widget title override is a plain column; no free-form config blob (no-JSONB convention).
- **Layout resolution:** event override, then group default, then event-type preset, then system default. New `event_dashboard_widgets` table (same shape as the group table plus `event_id`, cascade delete); an event gets rows only once customized. The no-login view resolves the same way.
- **Generic comments (supersedes per-type tables):** one `item_comments` table with `item_type`, `item_id`, `event_id` (FK, cascade), `group_id` and the standard comment columns. No per-item FK; cleanup on item delete happens in the service layer. Existing checklist and logistics comment tables are migrated in, then dropped. Rename "Checklist"-prefixed comment components to generic names.
- **Event types and presets:** nullable `event_type` on `event_proposals`, validated against a code registry. A preset is data (widget list and order, logistics categories, label overrides, starter items), applied by copying values at creation; later preset changes don't alter existing events.
- **Logistics categories:** per-group `logistics_categories` table (key, label, `mode`), seeded from the preset. `mode` is one of two fixed behaviors: single claimant (today's bring) or seats (today's carpool). Replaces the `category` CHECK with a reference; existing rows backfilled.

## UX & Interaction Patterns

- Customize mode asks "this event only" or "all events in this group"; a first per-event customization shows a "customized for this event" indicator with "reset to group default".
- New surfaces: event-type picker with preview at creation, logistics category editor, "Add widget" control (including a second widget of the same kind). Built from existing Chakra primitives; no visual identity change.
- Wording comes from the event type's labels; current trip wording becomes the Trip preset's labels.

## Cross-Story Dependencies

- Order: 14.1, 14.2, then 14.3 and 14.4 in parallel with 14.5 and 14.6, then 14.7 (needs 14.5 and 14.6), 14.8, 14.9.
- 14.1 rewrites internals of Epic 13's 13.4 (customizable layout) and 13.5 (no-login view) while preserving behavior; 14.2 migrates 13.7/13.8 comment tables.
- Open item before 14.2: confirm whether migrations 034 and 035 were applied to production.
