---
workflowType: correct-course
project_name: get-together
user_name: Andrewramell
date: "2026-08-19"
status: approved
mode: incremental
---

# Sprint Change Proposal — get-together

**Author:** John (PM), facilitated with Andrewramell
**Date:** 2026-08-19

## Section 1: Issue Summary

**Problem statement:** get-together's current product identity centers the RSVP/commitment-threshold ("momentum") mechanic as its defining experience — the UX spec's own "Defining Experience" statement is *"Propose an event in 10 seconds and watch your friends respond in real-time with one tap."* The product owner has determined this is no longer the right center of gravity. The real friction in group planning happens **upstream** of proposing an event — people don't propose things because they don't know who's free — and threshold/momentum should become a supporting signal rather than the product's headline mechanic.

**Trigger type:** Strategic pivot / repositioning. Not driven by usage data, user complaints, or a technical failure — this is the product owner's own read on the right direction, made explicitly without waiting for negative evidence on the current mechanic.

**Scope confirmed through discussion:**
1. De-emphasize (not remove) the RSVP threshold/momentum mechanic — it remains fully functional per-event (FR24 already makes it optional), but stops being the primary visual/emotional hook.
2. Make **availability** the front door of the app — a new home screen showing your + friends' availability and what's been proposed against it, replacing the current group-list landing page.
3. Pull forward **Google Calendar sync** (already scoped in the PRD as FR21/FR22, currently tagged Phase 1b / Growth) — Google only for v1, near-real-time refresh instead of the PRD's stated 6-hour cycle. Busy/free only, never event details (already guaranteed by existing NFR12).
4. Surface the already-built Epic 12 planning tools (checklist, photos, timeline, logistics, polls) more prominently — they exist and are wired in today, but are buried behind a second tab most users won't find.
5. Make the **planning style** (availability-first vs. proposals-first) a per-group, admin-configurable setting rather than a forced global change — different groups have different needs (a sports team may care about headcount; a casual friend group may not).

**Evidence gathered:**
- Landing page copy (`app/page.tsx`) is written entirely around momentum ("Watch momentum build," "It locks in — automatically")
- Post-login front door is `/groups` (a group list) — no availability or proposal-feed surface exists today
- `EventPlanningTab` (checklist/photos/timeline/logistics/polls) is fully wired into the live event page but lives behind a second, easy-to-miss "Planning" tab
- UX spec section 2.1/2.2 defines the product's core experience around momentum, confirming this was a deliberate original design choice, not an oversight

## Section 2: Impact Analysis

### Epic Impact

| Epic | Current Status | Impact |
|---|---|---|
| **Epic 2** — Group Creation & Management | done | Light addition: new per-group "Planning style" setting (Availability-first / Proposals-first), alongside the existing (Phase-2-flagged) per-group notification preferences pattern (FR15) |
| **Epic 3** — Soft Calendar & Availability | done → **reopens** | Largest impact. New stories for Google Calendar OAuth connect/disconnect, sync engine merging Google free/busy into the soft calendar, near-real-time refresh, and the new availability-first home screen (folded into this epic rather than split out — both are fundamentally "surface availability") |
| **Epic 4** — Event Proposals & RSVP w/ Momentum | done → **light touch** | No FR changes — RSVP/threshold logic is unchanged. New small stories to visually de-emphasize threshold prominence on event cards/detail view when a group is in Availability-first mode |
| **Epic 9** — SMS Magic Link Auth | not started | No impact. Journey 5 (Morgan) already lands new users directly into an event, which is naturally compatible with availability-first framing |
| **Epic 10** — Social Circles | not started | No impact |
| **Epic 12** — Event Planning Dashboard | in-progress, 6 stories in `review` | New stories to promote "Planning" out from behind the buried tab. **Sequencing dependency:** existing 6 stories should complete code review before more scope is added on top |

No epics are invalidated or removed. No epic renumbering required (per-group toggle joins Epic 2; availability work joins Epic 3).

### Story Impact

New candidate stories (to be authored via `/bmad-bmm-create-story` once this proposal is approved):

- **Epic 3:** Connect Google Calendar (OAuth), Sync Google free/busy into soft calendar, Availability-first home screen (my availability + friends' + active proposals), Disconnect/re-auth flow
- **Epic 2:** Per-group Planning Style setting (Availability-first default / Proposals-first)
- **Epic 4:** De-emphasize threshold display on event card and detail view (conditional on group's Planning Style setting)
- **Epic 12:** Promote Planning surface prominence (exact treatment TBD pending UX pass) — sequenced *after* the existing 6 stories clear code review

### Artifact Conflicts

**PRD (`prd.md`) — needs edits:**
- Executive Summary / "What Makes This Special" — reweight momentum from a headline need to a supporting one; add availability-first framing
- Innovation & Competitive Positioning — "Core Innovation" line changes from "Soft calendar + momentum visualization" to "Soft calendar + persistent planning tools in one place"
- Growth Features (Post-MVP) — remove "Calendar sync integration" (moves to current scope)
- FR22 — wording changes from "syncs every 6 hours" to near-real-time refresh
- **New FR needed:** per-group Planning Style setting (Availability-first / Proposals-first)
- Success Criteria / Measurable Outcomes — the metric *"70%+ of events include at least 1 commitment threshold"* needs revisiting now that threshold prominence is configurable per group; recommend reframing as a segment-specific metric (only measured within Proposals-first groups) rather than an app-wide target, plus adding an availability-engagement metric

**Architecture (`architecture.md`) — needs new decisions, not just edits:**
- "Calendar Integration Layer" is listed as an anticipated component but has no actual decision entry (no OAuth token storage/refresh pattern, no sync-mechanism decision). **Requires architect involvement before Epic 3 stories are written.**
- Pre-existing, independent of this change but worth naming: the document already diverges from the real system (Supabase-hosted Postgres per Story 11.1 vs. documented Aurora; Epic 12's client-side polling vs. documented AppSync subscriptions). Calendar sync will likely extend the polling pattern rather than adding AppSync subscriptions. Recommend a follow-up architecture doc reconciliation pass — out of scope for this proposal.

**UX Design Spec (`ux-design-specification.md`) — needs a design pass, not just edits:**
- Section 2.1 "Defining Experience" and 2.2 "User Mental Model" directly contradict the pivot and need rewriting around availability-first
- The spec's single-screen event Information Architecture already doesn't match the live Details/Planning tab implementation — pre-existing drift, same story as the architecture doc
- The availability-first home screen has **no existing UX section** — net-new design work. **Requires Sally (UX Designer) before stories are written.**

### Technical Impact

- New external integration: Google Calendar OAuth (new env vars/secrets: client ID/secret; deployment docs need updating)
- New sync mechanism: pending architect decision, likely short-interval polling consistent with Epic 12's existing pattern rather than push/webhooks (avoids Google push-channel renewal complexity)
- New monitoring: OAuth token refresh failures should log to CloudWatch per Epic 8's existing pattern
- No CI/CD pipeline changes required

## Section 3: Recommended Approach

**Selected approach: Option 1 — Direct Adjustment, with a small MVP-scope amendment.**

All affected epics (2, 3, 4, 12) are extended, not reverted — nothing here undoes working functionality. The only scope-boundary change is formally pulling Google Calendar sync forward from "Growth Features (Post-MVP)" into current work, which the product owner has explicitly requested (Google-only, near-real-time).

**Rejected alternatives:**
- *Rollback* — not applicable; no failed approach exists to revert
- *Full MVP scope review* — unnecessary; nothing is being cut, and the additions are targeted rather than a wholesale re-scope

**Effort estimate:** Medium-High overall — the Google OAuth integration and the net-new availability-first home screen are the two substantial chunks of work; the per-group toggle and threshold de-emphasis are small.

**Risk assessment:** Medium — concentrated in two places: (1) OAuth token lifecycle edge cases (expiry, revocation, re-auth), and (2) the sync-freshness mechanism, which needs an architect decision before implementation to avoid an ad hoc choice getting baked into Epic 3 stories.

**Sequencing recommendation:**
1. Finish code review on Epic 12's existing 6 stories (already implemented, just unreviewed) — don't stack new scope on unreviewed code
2. PM edits PRD sections listed above
3. Architect (Winston) decides the calendar sync mechanism and documents the Calendar Integration Layer properly
4. UX Designer (Sally) designs the availability-first home screen and updates the Defining Experience / Mental Model sections
5. SM creates stories for Epic 3 (calendar sync + home screen), Epic 2 (planning style setting), Epic 4 (threshold de-emphasis), Epic 12 (planning surface promotion)
6. Dev implements in that order

## Section 4: Detailed Change Proposals

### PRD Changes

**Section: Executive Summary**
> OLD: "Get-together eliminates this friction by providing: ... Event proposals with real-time RSVP tracking and configurable commitment thresholds ... Momentum visualization (e.g., "5 in, 2 maybe, 1 out") that accelerates group decisions"
>
> NEW (direction): Lead with shared soft calendar / availability-first discovery; keep momentum visualization in the list but as a supporting mechanic, not the second bullet. Full copy to be drafted during PRD edit pass.
>
> **Rationale:** Aligns stated product identity with the confirmed pivot.

**Section: Innovation & Competitive Positioning**
> OLD: "Core Innovation: Soft calendar + momentum visualization creates a gap no existing tool fills."
>
> NEW (direction): "Core Innovation: Soft calendar + persistent planning tools in one place creates a gap no existing tool fills." Momentum remains a differentiator, folded in as supporting detail.
>
> **Rationale:** Momentum is no longer the flagship differentiator; needs a replacement claim that's still true and defensible.

**Section: Growth Features (Post-MVP)**
> OLD: Lists "Calendar sync integration — Connect Google, Apple, Outlook calendars; soft calendar automatically populated with free/busy blocks" as deferred.
>
> NEW: Remove from Growth Features; becomes current scope (Google only for v1; Apple/Outlook remain deferred).
>
> **Rationale:** Explicit product owner request to pull this forward now.

**Requirement: FR22**
> OLD: "System automatically syncs native calendar availability every 6 hours [Phase 1b]"
>
> NEW: "System syncs Google Calendar availability on a near-real-time basis (exact cadence pending architect decision on push vs. polling mechanism)"
>
> **Rationale:** Product owner explicitly wants "easy to see what's available," not a 6-hour-stale cache.

**New Requirement (Epic 2 — Group Management)**
> NEW FR: "Group admins can set the group's default Planning Style (Availability-first or Proposals-first), which determines the group's default landing view"
>
> **Rationale:** Different groups have different needs — a sports team may want headcount-first, a casual friend group may not.

**Section: Success Criteria / Measurable Outcomes**
> OLD: "Feature-level: 70%+ of events include at least 1 commitment threshold"
>
> NEW (direction, pending final approval): Reframe as segment-specific (measured only within Proposals-first groups) and add a new availability-engagement metric (e.g., "% of proposals created from the availability view"). Exact wording TBD during PRD edit pass — flagging here that this line item needs revisiting, not proposing final numbers unilaterally.
>
> **Rationale:** A blanket 70% target no longer makes sense once threshold prominence is configurable per group.

### Architecture Changes (flagged for architect, not decided here)

- New Decision entry needed: Calendar Integration Layer — OAuth token storage/refresh strategy, sync mechanism (push vs. polling), data model for cached free/busy blocks
- Recommend documenting the pre-existing architecture.md-vs-reality drift (Supabase, polling-not-AppSync) as a separate follow-up, not blocking this work

### UX Design Changes (flagged for UX designer, not decided here)

- Rewrite Section 2.1 "Defining Experience" and 2.2 "User Mental Model" around availability-first
- New section: Availability-first home screen design (net-new, no prior art in the spec)
- Note existing single-screen-vs-tabs drift for awareness; not required to resolve as part of this change

## Section 5: Implementation Handoff

**Change scope classification: Major**

Rationale: this touches the PRD's core narrative (Executive Summary, Innovation positioning, a Success Criteria metric), requires new architectural decisions before implementation, and requires net-new UX design work — not something dev can pick up directly from existing docs.

**Handoff plan:**

| Role | Responsibility |
|---|---|
| **PM (John)** | Edit PRD per Section 4 above (Executive Summary, Innovation, Growth Features, FR22, new FR, Success Criteria metric) |
| **Architect (Winston)** | Decide Calendar Integration Layer (OAuth pattern, sync mechanism); document as new Architecture Decisions |
| **UX Designer (Sally)** | Design availability-first home screen; rewrite Defining Experience / Mental Model sections of UX spec |
| **Scrum Master (Bob)** | Once PRD/Architecture/UX updates land, create stories for Epic 2, 3, 4, 12 per the candidate list in Section 2; update `sprint-status.yaml` |
| **Dev (Amelia)** | Finish Epic 12 code reviews first (sequencing dependency), then implement in the order above |

**Success criteria for this change:**
- PRD, Architecture, and UX spec no longer contradict each other or the live app on the "what is the core experience" question
- Epic 3 stories exist and are buildable without further architect/UX clarification
- Epic 12's existing 6 stories are reviewed and marked done before new Epic 12 scope begins
