# Epic 13 Context: Event Dashboard Refinement

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Turn the existing Event Planning tab into the actual one-stop, customizable dashboard a group lives in before and during a trip. A group member should be able to open one link — logged in or not — and get a single, current, group-customized view of everything about the trip (tasks, schedule, who's bringing what, open decisions, discussion) instead of piecing it together from a chat thread or separate app tabs. This epic was added ad hoc post-UX-review, extending Epic 6 (Comments) and Epic 12 (Event Planning Dashboard), both marked done in tracking, though Epic 12's dashboard component was never wired into the live route until Story 13.1.

## Stories

- Story 13.1: Unify Event Landing on the Dashboard
- Story 13.2: Consistent Live Refresh Across All Widgets
- Story 13.3: Date/Day Context on Checklist & Logistics Items
- Story 13.4: Customizable Widget Layout
- Story 13.5: No-Login Quick-Access Dashboard Link
- Story 13.6: General Trip Comment Access from Dashboard Header
- Story 13.7: Comments on Checklist Items
- Story 13.8: Comments on Logistics Items
- Story 13.9: Comments on Timeline Items
- Story 13.10: Comments on Polls

## Requirements & Constraints

- Non-logged-in users must be able to view (and interact where already supported) via a public link — this epic extends that existing capability so the no-login link mirrors the full configured dashboard rather than a reduced subset.
- Real-time propagation: all group members must see changes without refreshing, and this must now apply uniformly across every dashboard widget, not just some.
- The reorg must not regress the app's existing responsive/accessibility baseline — semantic heading structure, keyboard-operable controls, no stolen focus/scroll on live updates, screen-reader-announced read-only state.
- Read-only (no-login) access must read as the normal way to "just check," not a locked-out state — copy and UX should avoid restrictive/blocking language.
- Comments already exist for events and wishlist items (add/view/edit own/delete own, real-time); this epic extends commentability to new entity types (checklist, logistics, timeline, poll items) using the same behavioral rules, but not to photos (explicitly out of scope).
- Success is a single glanceable view: a group member gets their answer (e.g. "who's on dinner duty") without hunting through tabs, scrolling past irrelevant sections, or hitting a login wall.

## Technical Decisions

- The Dashboard becomes the only landing view for an event; the "Details"/"Planning" tab split is retired, with former Details content (name, dates, location, RSVP, comments) folded into the Dashboard header.
- The ~5s polling live-update pattern already used by Checklist/Logistics/Polls is extended to Timeline and Photos too — no new sync mechanism, just wider application of the existing one.
- Checklist and Logistics items gain an optional date (or day-of-trip) field, additive to the schema, plus a "Today" grouping query; items dated for the current day surface in a "Today" group, others stay in the general list.
- Widget layout is new per-group (not per-user) state: a dedicated `group_dashboard_widgets` table, one row per (group, widget) — columns `group_id`, `widget_key`, `position`, `visible`, primary key `(group_id, widget_key)`, `group_id` FK `ON DELETE CASCADE`. `widget_key` is constrained to the fixed widget set (checklist/timeline/logistics/photos/polls). Existing groups get backfilled with default order and `visible = true`. This is a deliberate departure from a JSONB-on-`groups` approach, to stay consistent with how every other per-group setting in the schema is modeled (plain relational columns/tables, not JSON blobs). Both the authenticated Dashboard and the no-login view read this same table (no-login reads it read-only).
- Comments on the four new item types use four new dedicated tables (`checklist_comments`, `logistics_comments`, `timeline_comments`, `poll_comments`) — not a shared/polymorphic comments table. Each mirrors the existing `event_comments`/`wishlist_comments` pattern: same column set (`id`, `{parent}_id` FK `ON DELETE CASCADE`, `group_id` FK, `created_by`, `content`, `created_at`, `updated_at`, `deleted_at`), same content-not-empty/length CHECK constraints, same partial index (`WHERE deleted_at IS NULL`). Photos remains non-commentable — no fifth table.
- Note: the codebase's actual comments implementation already diverged from this project's original architecture doc (which describes one polymorphic `comments` table) — the dedicated-table pattern above matches what's actually in production (`lib/db/migrations/008`, `009`), not the older planning doc.
- The no-login quick-access view supersedes the current hardcoded 3-widget public view; it must read the same per-group widget config as the authenticated Dashboard, rendered read-only.
- One reusable comment popover/modal UI component is built once (Story 13.7) and reused against Logistics, Timeline, and Poll items (Stories 13.8–13.10) rather than built four separate times.

## UX & Interaction Patterns

- No visual identity changes this pass — everything is built from existing Chakra UI v2 primitives and existing app components/conventions (card treatment, badges, icon-button patterns, `Popover`/`Modal`), rearranged and behaviorally extended, not restyled.
- Each widget is a self-contained card; DOM/focus order follows the group's configured widget order, not a fixed source order. Empty widgets show their own lightweight empty prompt rather than disappearing.
- Any group member can enter widget customize mode (not restricted to organizer/owner). Reorder/hide must offer a non-drag, keyboard-operable equivalent (e.g. move-up/move-down controls). Reordering is optimistic for the acting member; other viewers (including the no-login link) pick it up on their next live update.
- A hidden widget doesn't render for anyone, including the no-login link — a real, group-wide consequence of the shared layout, not a bug.
- No-login view renders identically to the authenticated view minus interactive controls (checkboxes, claim buttons, reorder handles, upload button). The first attempted interactive action prompts login in place; logging in upgrades the same page/URL in place rather than redirecting into a separate flow.
- Item comment indicator: shows only when an item has at least one comment; hover or keyboard focus reveals a popover preview (must trigger on focus, not hover alone); click opens a modal with the full thread and lets the user add a comment. In the no-login view, viewing comments still works read-only; attempting to add one prompts login.
- Live-updating widgets must not steal focus or shift scroll position when new data arrives mid-view.

## Cross-Story Dependencies

- Story 13.1 (unify landing on the Dashboard) is foundational — later stories build on the merged header/widget layout it establishes.
- Stories 13.4 (customizable layout) and 13.5 (no-login link) both depend on the new `group_dashboard_widgets` table; 13.5 reads it read-only and must stay in sync with whatever 13.4 writes.
- Story 13.7 builds the reusable comment popover/modal component that Stories 13.8, 13.9, and 13.10 reuse for Logistics, Timeline, and Poll items respectively — 13.7 should land first among the comment stories.
- Story 13.2 (live refresh) generalizes the polling pattern that Stories 13.3 and the comment stories (13.7–13.10) build their own live-updating behavior on top of.
- This epic extends Epic 6 (Comments) and Epic 12 (Event Planning Dashboard), both marked done in tracking, though Epic 12's dashboard component was never wired into the live route until Story 13.1 — no changes expected to those epics' own stories, only to the entities/tables they introduced.
