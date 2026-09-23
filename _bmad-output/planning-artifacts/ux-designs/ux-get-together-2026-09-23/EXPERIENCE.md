---
name: get-together
status: final
sources:
  - {planning_artifacts}/prd.md
  - {planning_artifacts}/epics.md
updated: 2026-09-23
---

# get-together — Experience Spine

> Refinement pass on shipped functionality (Epic 6 Comments, Epic 12 Event Planning Dashboard — both `done`), not greenfield design. Problem, per the PRD's Executive Summary: "friend groups coordinate outings through group texts: ideas scatter, responses trickle in asynchronously... follow-ups are manual and repetitive." That pain extends to email threads specifically, and to the *during-the-trip* moment the PRD's existing journeys don't fully cover: needing a fast, low-friction answer to "what's the plan / who's doing what" without digging through a thread. `DESIGN.md` is unchanged this pass (existing Chakra UI v2 look kept as-is) — every decision here is structural and behavioral. Mockups in `mockups/` illustrate; this spine and `DESIGN.md` are the contract and win on any conflict with a mock.

## Foundation

Single-surface responsive web (Next.js + Chakra UI v2). This pass is scoped to the web app only — the PRD's mobile app (React Native/Expo) is out of scope here. `DESIGN.md` is the visual identity reference (currently a no-op: inherits Chakra wholesale). Each event belongs to a group; a viewer is either an authenticated group member or an unauthenticated visitor holding a dashboard link.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Event Dashboard | Opening an event from the group's event list | Default (and only) landing view for an event. Header = former "Details" content (event name, dates, location, RSVP status, Comments). Below the header: the group's widgets (Checklist, Timeline, Logistics, Photos, Polls) in their configured order. ([mock](mockups/key-dashboard-authenticated.html)) |
| Event Dashboard — quick access (no-login) | Shareable dashboard link, any group member | Same header + same widget set/order as the group's configured Dashboard, rendered read-only. No login prompt to view. ([mock](mockups/key-dashboard-readonly.html)) |
| Widget customize mode | "Customize" control on Dashboard (authenticated) | Reorder and show/hide widgets. One shared layout per group — a change here is visible to every member and to the no-login link. ([mock](mockups/key-dashboard-customize.html)) |

This supersedes three things in the current build: the "Details" / "Planning" tab split (`EventDetail.tsx`), the flat fixed-order 5-section scroll in `EventPlanningTab.tsx`, and the reduced 3-section view in `PublicEventPlanning.tsx` (which omitted Photos/Polls) — the no-login view now mirrors the full configured Dashboard instead of a hardcoded subset.

## Voice and Tone

Brand voice itself is out of scope this pass (no DESIGN.md changes). The one behavioral commitment from this session: the no-login read-only state should read as normal, not restrictive — it's the expected way to "just check," not a locked-out state.

| Do | Don't |
|---|---|
| "Viewing — log in to check things off" | "You must log in to interact with this event" |
| "No checklist items yet" | "This section is empty. Add an item to get started!" |

## Component Patterns

Behavioral. Visual specs stay whatever Chakra/the current components already render (`DESIGN.md` has no overrides this pass).

| Component | Use | Behavioral rules |
|---|---|---|
| Dashboard widget | Dashboard, all five (Checklist, Timeline, Logistics, Photos, Polls) | Self-contained card. Order and visibility follow the group's shared layout config. Every widget live-updates (see State Patterns) — previously only Checklist/Logistics/Polls did this; Timeline and Photos join that pattern in this pass. |
| Checklist / Logistics item | Checklist widget, Logistics widget (Bring List, Carpool) | Gains an optional date (or day-of-trip) field — neither item type has one today. An item dated for the current day surfaces in a "Today" group at the top of its widget; undated or other-day items stay in the general list below. |
| Widget reorder control | Dashboard, authenticated, customize mode | Reorders / hides a widget for the whole group at once. Must offer a non-drag equivalent (see Accessibility Floor). |
| Read-only banner | Dashboard, no-login quick access | States plainly that this is a read-only view; no login prompt unless the visitor attempts an interactive action (check a box, claim a seat, upload a photo, vote). |
| Item comment indicator | Checklist items, Logistics items (Bring List, Carpool), Timeline items, Polls | Hover or keyboard focus on an item shows a lightweight popover preview of its existing comments (nothing renders if there are none). Clicking opens a small modal with the full comment thread for that item — view existing comments and add a new one. Same treatment across all four item types. |
| General trip comment | Dashboard header | Not a new capability — surfaces the existing Epic 6 event-level comment thread (today attached to the event, previously reachable via the old "Details" tab) from the new Dashboard header, so trip-wide discussion still has a home now that Details is folded in. |

**Open items:** Photos wasn't confirmed as in scope for item comments — the user's "all of them" answered a question that listed only Polls/Checklist/Logistics/Timeline, so Photos is left out here pending confirmation. Separately, Comments (Epic 6, FR43–48) currently only attach to events and wishlist items — Checklist, Logistics, and Timeline items, and Polls, aren't commentable entities in today's data model, so per-item comments require new entity support, the same category of gap as the date field addition above.

Any group member can enter customize mode — not restricted to the organizer/owner, consistent with the no-login link's "any group member" audience.

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Cold load, no data in a widget | Dashboard | Header always renders regardless of widget data. Each empty widget shows its own lightweight empty prompt (see Voice and Tone) rather than the widget disappearing — a group that hasn't used a feature yet shouldn't see a shorter, seemingly-broken dashboard. |
| Live update from another member | Dashboard, all widgets | Content updates in place without the viewer taking any action. Applies uniformly across all five widgets now (closing the gap where Timeline/Photos only fetched once on mount and could go silently stale). |
| Today group empty | Checklist / Logistics widgets | If nothing is dated for today, the "Today" group simply doesn't render — falls back to the widget's normal empty/list state, no separate "nothing today" placeholder needed. |
| Read-only (no-login) | Dashboard quick access | Renders identically to the authenticated view, minus interactive controls (checkboxes, claim buttons, reorder handles, upload button). An attempted interactive action prompts login rather than doing nothing. |
| Widget hidden from shared layout | Dashboard, no-login and authenticated | A hidden widget doesn't render for anyone, including on the no-login link — this is a real, group-wide consequence of the shared-layout decision, not a bug. |
| Reorder in progress | Dashboard, authenticated, customize mode | Optimistic: the acting member's own screen updates immediately. Other members (and the no-login view) pick up the new order on their next live update, the same way widget content already propagates. |
| Item has comments / no comments | Checklist, Logistics, Timeline items, Polls | An item with at least one comment shows the comment indicator; an item with none shows nothing extra — no empty-state affordance cluttering every item by default. |
| New comment arrives while viewing | Checklist, Logistics, Timeline items, Polls | Live, same as the rest of the dashboard: the indicator (and an open comment modal, if that item's thread is currently open) updates without the viewer refreshing. |

## Interaction Primitives

- Customization is explicit: a member enters customize mode deliberately; the layout never reorders itself based on usage, recency, or any inferred signal.
- No-login access is strictly read-only. The first interactive tap prompts login; the view itself never blocks or degrades before that point.
- Widget reorder/hide must be operable without a mouse (see Accessibility Floor) — not drag-only.
- Logging in from the no-login dashboard link upgrades that same page in place to the full interactive view — it does not redirect into a separate authenticated app flow. The URL and layout stay put; only the available actions change.
- Item comments are discoverable without committing to opening them: hover/focus previews, click commits to the full thread. The popover is a preview, not an editable surface — adding a comment happens in the modal.
- In the no-login read-only view, comment popovers still work (viewing is read-only, not comment-blind); attempting to add a comment from the modal prompts login, same as any other interactive action.

## Accessibility Floor

Behavioral; inherits Epic 8's existing shipped responsive/accessibility baseline. This reorg must not regress it.

- Semantic heading structure per widget; DOM/focus order follows the group's configured widget order, not a fixed source order.
- Widget reorder/hide is keyboard-operable (e.g. move-up/move-down controls per widget), not drag-and-drop only.
- The no-login read-only state is announced to assistive tech (not communicated by a visual banner alone).
- Live-updating widgets (now all five) must not steal focus or shift scroll position when new data arrives mid-view — a requirement Timeline and Photos didn't previously have to satisfy, since they never updated live before this pass.
- The comment popover must trigger on keyboard focus, not hover alone, and the comment modal must trap focus and be dismissible with Escape, per standard modal conventions.

## Key Flows

### Flow 1 — Quick check mid-trip (Andrew, day 2 of a multi-day group trip, 5pm)

[mock: read-only dashboard](mockups/key-dashboard-readonly.html)

1. Andrew's about to head out and can't remember who's on dinner duty tonight. He doesn't want to hunt for the app or log in — he taps the group's saved dashboard link from earlier.
2. The page loads straight into the Event Dashboard. No tab to find, no login screen. Header shows the trip name, dates, and location.
3. Below it, the group's widgets in their configured order — this group keeps Timeline and Checklist near the top.
4. The Checklist widget's "Today" group is right there: "Make dinner — assigned to Priya," dated tonight.
5. **Climax:** Andrew has his answer in one glance — no scrolling past Photos, no login prompt, no thread to dig through. He didn't need to act on anything, so the read-only state never got in his way.
6. Because all widgets are live now, if Priya's assignment changes five minutes later, Andrew's already-open page updates on its own — same as it would for a logged-in member.

Failure: if the group had hidden the Checklist widget from the shared layout, Andrew wouldn't see it at all here — a direct, expected consequence of one shared layout for the whole group, not a bug to design around.

### Flow 2 — Setting up the shared dashboard (Priya, organizer, two days before the trip)

[mock: customize mode](mockups/key-dashboard-customize.html)

1. Priya creates the event's plan ahead of the trip. The group doesn't use Polls much and Photos won't matter until the trip's underway, so she opens customize mode on the Dashboard.
2. She hides the Polls widget and moves Checklist and Timeline above Logistics and Photos.
3. **Climax:** She saves. There's no per-person setup after this — the next time any member (or anyone using the no-login link) opens the Dashboard, they see the same trimmed, reordered layout Priya just set, automatically.
4. Later, when Andrew opens his saved link (Flow 1), he's seeing the exact layout Priya configured — that consistency is what makes the no-login link reliable enough to bookmark ahead of the trip.

Failure: Priya hides a widget another member was relying on (e.g. Photos, if someone wanted to check a shared packing photo). Because the layout is shared, not per-user, there's no individual override — surfacing this as a real tradeoff of the "one shared layout" decision, not something this spec resolves further.
