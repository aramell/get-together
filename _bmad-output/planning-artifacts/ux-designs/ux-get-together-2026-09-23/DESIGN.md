---
name: get-together
description: Group trip/event planning app. This pass is a structural and behavioral refinement (event dashboard, no-login quick access) — deliberately no visual identity change.
status: final
updated: 2026-09-23
---

# get-together — Design Spine

> This session scoped visual identity out entirely: the user chose to keep the existing look as-is and focus on structure and behavior. No new or overridden color, typography, spacing, or shape tokens are introduced here. `get-together` inherits Chakra UI v2 defaults wholesale, as it already does in shipped code (`components/groups/*`). If a future UX pass wants a real visual identity, author it here as brand-layer deltas over Chakra, the way `design-example-shadcn.md` does for shadcn — don't restate Chakra's defaults, only the overrides.

## Brand & Style

No brand-layer changes in this pass. The Event Dashboard (see `EXPERIENCE.md`) is built entirely from existing Chakra UI v2 primitives and existing app components (`EventChecklist`, `EventTimeline`, `EventLogistics`, `EventPhotoGrid`, `EventPolls`), rearranged into a new layout — not restyled. Any new UI this work requires (the widget-reorder control, the "Today" grouping header, the read-only quick-access banner) should be built from Chakra's existing component set and current app conventions, not new visual patterns.

## Components

| Component | Note |
|---|---|
| Dashboard widget | New composition, not a new visual language — reuse the existing card treatment already used for Checklist/Logistics/Polls sections in `EventPlanningTab.tsx`. |
| Checklist / Logistics item | No new visual treatment — existing item-row styling, plus a small date/day badge using existing Chakra badge conventions already used elsewhere in the app. |
| Widget reorder control | No spec here — behavior only, see `EXPERIENCE.md.Interaction Primitives`. Use standard Chakra interactive affordances (e.g. existing icon-button conventions in the app), not a new control style. |
| Read-only banner | Reuse whatever informational/banner treatment the app already uses elsewhere (e.g. Chakra `Alert`/`Badge` patterns already in use) rather than introducing a new visual pattern. |
| Item comment popover / modal | Chakra `Popover` for the hover/focus preview, Chakra `Modal` for the full thread — both stock components, no new visual pattern. The comment indicator icon should match whatever icon set the app already uses (`react-icons`, per `package.json`). |
