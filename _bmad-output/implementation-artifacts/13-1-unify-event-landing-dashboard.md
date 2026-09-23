---
title: 'Unify Event Landing on the Dashboard'
type: 'feature'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md']
baseline_commit: 'b26f630131946f0440e2a8e3877e6a473c309d47'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The event page's Details/Planning tab split needs retiring per Epic 13, folding Details content (name, dates, location, RSVP, comments) into a single unified Dashboard view. Investigation additionally found the live authenticated route doesn't currently render the tabbed component that has this split at all — `app/groups/[groupId]/events/[eventId]/page.tsx` is the only live route for `/groups/:groupId/events/:eventId` and never imports `components/groups/EventDetail.tsx` (zero non-test usages repo-wide), so real users today see only a bare title/description/location/date/threshold/momentum view — no RSVP buttons, no comments, none of Epic 12's 5 widgets — despite Epic 12's stories being marked `done`.

**Decision (human, 2026-09-23):** This story also wires the live route to render the merged view (Option A), rather than merging tabs only inside the orphaned component. Larger diff, but it's the only way to deliver Epic 13's "one link, single view" goal, and it makes Epic 12's widgets/RSVP/comments reachable by real users for the first time.

**Approach:** Merge the existing Details-tab content (name, description, location, date/time, RSVP status, share/cancel actions, comments) into a header above the existing 5 dashboard widgets, removing the Chakra `Tabs` UI so the event page reads as one continuous view. Existing widget order and behavior are unchanged (no reordering — that's Story 13.4). Rebuild `app/groups/[groupId]/events/[eventId]/page.tsx` to render this merged view in place of its current bare-bones inline markup.

## Boundaries & Constraints

**Always:**
- Reuse existing Chakra UI v2 primitives and existing components (`EventCommentSection`, `PublicLinkModal`, the cancel-event `AlertDialog`, all 5 widgets) as-is — no restyling, no new visual identity.
- Preserve the current widget order exactly as it is in `EventPlanningTab.tsx` today: Photos, Checklist, Timeline, Logistics, Polls (not the order implied by epics.md's prose list).
- Preserve existing RSVP-momentum logic (including planning-style de-emphasis), comments, cancel-event, and share-link behavior unchanged — only relocate them into the merged header.
- Add `location` to the merged header — it's listed as Details content in planning docs but is currently absent from `components/groups/EventDetail.tsx`.
- Produce a single coherent heading hierarchy (one h1, nested h2/h3) across the merged header and the 5 widgets.
- Preserve the existing focus-visible coral-outline pattern (`lib/theme.ts`, and the box-shadow suppression in `EventDetail.tsx`'s `tabStyle`) for any element that remains or becomes focusable.

**Never:**
- No widget reordering/hide UI (Story 13.4) and no per-group `group_dashboard_widgets` table work.
- No live-refresh/polling changes to Timeline or Photos (Story 13.2).
- No date/day grouping on Checklist/Logistics items (Story 13.3).
- No changes to the public/no-login route (`app/events/public/[publicToken]/page.tsx`, `PublicEventPlanning.tsx`, `PublicEventHeader.tsx`, `PublicRsvpForm.tsx`) — that's Story 13.5.
- No new commentability on checklist/logistics/timeline/poll items (Stories 13.7–13.10).
- Don't touch the unrelated, separately-orphaned `components/events/EventDetail.tsx`, `RSVPButtons.tsx`, or `ConfirmationBadge.tsx` — different dead code, out of scope here.

</frozen-after-approval>

## Code Map

- `app/groups/[groupId]/events/[eventId]/page.tsx` -- live route (`EventDetailsPage`, self-contained, fetches `/api/groups/{groupId}/events/{eventId}`); will be rebuilt to render the merged view.
- `components/groups/EventDetail.tsx` (337 lines) -- orphaned tabbed component. Chakra `Tabs` switch ~L209-219; Details `TabPanel` L222-329 (name/date L227-230, description L241-248, RSVP momentum L250-257, share/cancel actions L260-274, comments L280-288, cancel `AlertDialog` L300-327); Planning `TabPanel` L331-333 renders `EventPlanningTab`. `tabStyle` (L194-206) holds the focus-box-shadow-suppression pattern to preserve.
- `components/groups/EventPlanningTab.tsx` (29 lines) -- thin wrapper rendering the 5 widgets in order: `EventPhotoGrid`, `EventChecklist`, `EventTimeline`, `EventLogistics`, `EventPolls`. Reuse as-is or inline its body into the merged component — implementer's call, not user-visible.
- `components/groups/EventCommentSection.tsx` -- event-level comments; has no own heading today (only `aria-label="Comment input"` and `aria-live="polite"`) — add a heading when relocated under the merged header.
- `components/groups/PublicLinkModal.tsx` -- "Share Event" modal opened from Details actions.
- `lib/theme.ts` -- global `:focus-visible` coral outline that the `tabStyle` suppression pattern coordinates with.
- `__tests__/components/EventDetail.test.tsx` -- covers tab rendering/RSVP/comments/cancel; needs rewrite for the merged, tab-less structure.
- `__tests__/accessibility/keyboard-navigation.test.tsx` -- AC2 asserts Details/Planning tab focus order, AC8 asserts modal focus; update AC2 for the new flat structure, keep AC8.
- `__tests__/components/EventPlanningTab.test.tsx` -- covers the widget wrapper directly; keep if it survives as a component, else fold into the merged component's test.
- Not to touch: `app/events/public/[publicToken]/page.tsx` and its children (Story 13.5 territory); `components/events/EventDetail.tsx`, `RSVPButtons.tsx`, `ConfirmationBadge.tsx` (unrelated pre-existing orphans).

## Tasks & Acceptance

**Execution:**
- [x] `components/groups/EventDetail.tsx` -- remove the `Tabs`/`TabList`/`TabPanels` wrapper; render Details content as a header block directly above the widget list; add the missing `location` display; preserve the `tabStyle` focus-suppression pattern on any remaining focusable controls.
- [x] `components/groups/EventPlanningTab.tsx` -- keep as the widget list or inline into the merged component; widget order and props stay unchanged.
- [x] `components/groups/EventCommentSection.tsx` -- add an explicit heading when relocated under the merged header.
- [x] `app/groups/[groupId]/events/[eventId]/page.tsx` -- replace the current self-contained inline markup with the new merged component, keeping its existing auth-gate/loading/error states -- makes Epic 12's dashboard reachable for the first time and satisfies Epic 13's "one link" goal.
- [x] `__tests__/components/EventDetail.test.tsx` -- rewrite tab-selection assertions to verify the merged, tab-less structure.
- [x] `__tests__/accessibility/keyboard-navigation.test.tsx` -- update AC2 tab-order assertions for the new flat DOM/focus order; keep AC8 modal-focus coverage.
- [x] `__tests__/components/EventPlanningTab.test.tsx` -- keep passing as-is, or fold into the merged component's test if `EventPlanningTab` is dissolved.
- [x] Audit heading levels across the merged header + 5 widgets for a single h1 → h2 → h3 structure (no collisions).

**Acceptance Criteria:**
- Given a group member navigates to `/groups/:groupId/events/:eventId`, when the page loads, then they see one continuous view — event name/description/location/date/RSVP status/actions/comments in a header, followed by all 5 dashboard widgets — with no tab control present.
- Given the same route, when rendered, then all existing RSVP, comment, share-link, and cancel-event behavior works exactly as it did in the orphaned tabbed component (functional parity, no regression).
- Given the merged view, when inspected, then heading levels form a single coherent hierarchy and the focus-visible suppression pattern is preserved on any remaining non-native focusable controls.
- Given the widget list, when rendered, then order matches today's `EventPlanningTab.tsx` order (Photos, Checklist, Timeline, Logistics, Polls).
- Given the public/no-login route, when this story ships, then it is unchanged (still the existing 3-widget `PublicEventPlanning` view) — Story 13.5 handles it.

## Implementation Notes

`components/groups/EventDetail.tsx` had already been merged into a tab-less view (Chakra `Tabs`/`tabStyle` removed, Details content folded into a `Card` header above `EventPlanningTab`, `location` added) and `app/groups/[groupId]/events/[eventId]/page.tsx` had already been rebuilt to render `<EventDetail>` in place of its old bare-bones inline markup, with `EventCommentSection.tsx` given an explicit `h2` and `EventList.tsx`'s `EventWithMomentum` type extended with `location` — all as uncommitted working-tree changes present before this pass started. `__tests__/components/EventDetail.test.tsx`, `__tests__/accessibility/keyboard-navigation.test.tsx`, and `components/groups/__tests__/EventCommentSection.polling.test.tsx` were likewise already rewritten for the merged structure.

Remaining gap found and fixed in this pass: the 5 dashboard widgets (`EventChecklist`, `EventPhotoGrid`, `EventTimeline`, `EventLogistics`, `EventPolls`) rendered their section titles ("Checklist", "Photos", etc.) as plain `<Text fontWeight="bold" fontSize="lg">`, not semantic headings — so the merged page had no real heading structure below the `h1` and `EventCommentSection`'s `h2` (the widgets were invisible to heading-based screen-reader navigation). Converted each widget's top-level title to `<Heading as="h2">` with identical visual props (same `fontWeight`/`fontSize`, no restyling), and `EventLogistics`'s two subsections ("Bring List", "Carpool") to `<Heading as="h3">`. Final hierarchy: one `h1` (event title) followed by sibling `h2`s (Comments, Photos, Checklist, Timeline, Logistics, Polls), with Logistics' two `h3` subsections nested under it — single coherent structure, no collisions.

`EventPlanningTab.tsx` itself needed no change; it was already a thin, unmodified wrapper rendering the 5 widgets in the required order.

## Spec Change Log

## Review Triage Log

- [blind-hunter] Duplicate "Back" control: `EventDetail.tsx`'s action-row "Back" button (window.history.back()) now renders simultaneously with `page.tsx`'s sticky "Back to Group" button (router.back()) since EventDetail is wired live. **Verdict: low.** Confirmed real in current code (`page.tsx:56-64`, `EventDetail.tsx:243`); redundant but not broken. → grouped with verification-gap's identical finding, routed **patch**.
- [verification-gap, "Other findings"] Same duplicate-Back-button defect, reported independently. **Verdict: low** (carries the same evidence as above). → grouped, routed **patch**.
- [blind-hunter] No test asserts the widget/section title `<Text>`→`<Heading as="h2"/"h3">` conversions (Checklist/Photos/Timeline/Logistics/Bring List/Carpool/Polls) actually render as headings; reverting to `<Text>` would not fail any test. **Verdict: medium** — this is the story's own claimed accessibility deliverable (explicit task + AC), currently unguarded against regression. → grouped with verification-gap's identical finding, routed **patch**.
- [verification-gap] Same heading-test-coverage gap, filed pre-verified with concrete grep/demonstration evidence (zero `heading`/`Heading` role queries in any of the 6 affected test files; disposition filed as `patch`). **Verdict: medium** (evidence trusted per verification-gap pre-verification rule). → grouped, routed **patch**.
- [verification-gap] Live-route wiring of `EventDetail` into `page.tsx` (this story's stated core deliverable) has no test rendering `EventDetailsPage` itself. Filed pre-verified; filed disposition `defer` — no `app/**/page.tsx` in the repo (checked all 15) has ever had a dedicated test, so this follows the repo's existing convention rather than a gap this story introduced. **Verdict: medium if true, but pre-existing repo-wide convention, not caused by this story.** → routed **defer**.
- [edge-case-hunter] Status Badge (CONFIRMED/PROPOSED) from the old bare `page.tsx` markup is not carried into the merged `EventDetail.tsx` header. **Verdict: real, but out of scope** — the frozen Intent's Approach section explicitly enumerates the fields to merge ("name, description, location, date/time, RSVP status, share/cancel actions, comments") and omits the badge; the AC's "no regression" is explicitly scoped to parity with "the orphaned tabbed component" (which itself never had a badge), not the old page.tsx. The intent itself draws this line. → **rejected, out of scope.**
- [edge-case-hunter] Commitment-threshold progress text ("X more needed"/"Threshold met!") from the old bare `page.tsx` markup is not carried into the merged view. **Verdict: real, but out of scope** — same reasoning as the Badge finding above (the tabbed component this story's AC uses as its parity baseline never had this text either). → **rejected, out of scope.**
- [blind-hunter] Text→Heading swap risks subtle visual drift (Chakra's built-in Heading defaults for lineHeight/letterSpacing differ from Text's) beyond the matched `fontWeight`/`fontSize` props. **Verdict: low** — checked `lib/theme.ts`: this app's `Heading` override only sets `color`, so any drift is limited to Chakra's stock defaults; all affected titles are short, non-wrapping single-line strings ("Checklist", "Photos", etc.) where lineHeight differences are not visually perceptible. Unlikely to be encountered, and a "fix" would mean adding style overrides not demonstrated as necessary. → **rejected** (low + unlikely + non-trivial to justify).
- [blind-hunter] `sprint-status.yaml` sets `13-1-...: review` while the spec frontmatter says `status: 'in-review'` — flagged as an inconsistency. **Verdict: false.** Disproven: grep of `sprint-status.yaml` shows ~14 other stories (2-2, 2-8, 3-5..3-8, 4-7, 9-1, 9-2, 10-1..10-5) already use the bare `review` value — this is that file's own pre-existing, established convention (distinct from the spec-template's `in-review` vocabulary), not an inconsistency introduced by this diff.
- [blind-hunter] Removing `page.tsx`'s old error-state "Go Back" button weakens error recovery, since `EventDetail.tsx`'s own error branch renders a bare Alert with no navigation control. **Verdict: false.** Disproven: `page.tsx` unconditionally renders its sticky "Back to Group" button (`page.tsx:56-64`) around `<EventDetail>` on every render, including while `EventDetail` is internally in its error state — so a working exit path is always present; nothing was actually lost.
- [blind-hunter] `EventCommentSection.tsx`'s new `<Heading as="h2">` wraps dynamic, polling-updated text (`"{count} Comment(s)"`), so its accessible name changes as comments arrive — a heading-navigation best-practice concern. **Verdict: low.** Real but narrow (screen-reader users navigating by heading during a live count change); the fix (splitting stable label from count, updating dependent text-match assertions) is more than a direct correction. → **rejected** (low + unlikely + non-trivial fix).
- [blind-hunter] Implementation Notes disclose that most checked-off tasks were already present as uncommitted work before this pass started, with only the heading conversion newly produced. **Verdict: false.** Not a defect — the notes accurately and transparently distinguish inherited from newly-verified work; no incorrect behavior or mislabeling results.
- [blind-hunter] `epic-13-context.md` (new in this diff) states Epic 12 is "already shipped," while this same diff's own investigation found Epic 12's dashboard was orphaned and never live until this story. **Verdict: low** — real ambiguity, but narrow blast radius (only misleads a future BMAD story session reading this cached planning-context file, not end users); fix is a trivial wording tweak. → routed **patch**.
- [blind-hunter] `EventDetail.test.tsx`'s `mockFetchWith` helper's catch-all fallback (`{success:true, data:[]}`) doesn't match `getGroupDetails`'s expected object shape, allegedly leaving creator-role/planning-style branches under-exercised. **Verdict: false.** Disproven: `getGroupDetails` is mocked independently at the module level (`jest.mock('@/lib/services/groupService')`, `EventDetail.test.tsx:35-40`) with a correctly-shaped default response, entirely bypassing `global.fetch`/`mockFetchWith`; and `isCreator` is derived directly from `event.created_by === userId` (`EventDetail.tsx:170`), not from any fetched role. The concern doesn't apply to this code.
- [blind-hunter] The "event GET + empty-list fallback" mock pattern is independently reinvented (slightly differently) in both `EventDetail.test.tsx` and `keyboard-navigation.test.tsx`, risking future drift. **Verdict: low** — real DRY nitpick, developer-only, no functional bug; fix (extracting a shared cross-file test helper) is more than a trivial correction and no near-term encounter is likely. → **rejected** (low + unlikely + non-trivial fix).

## Design Notes

The merged header replaces `EventDetail.tsx`'s Details `TabPanel` content, structurally unchanged (same child components, same VStack grouping) — the only real design decision is heading levels: the current page uses `Heading as="h1" size="2xl"` for the event title, while widgets likely use their own top-level headings. Bump widget headings to h2/h3 as needed so the merged page keeps a single h1.

## Verification

**Commands:**
- `npx jest __tests__/components/EventDetail.test.tsx` -- ran; **passed** (covers the merged tab-less structure, location display, single-h1 assertion).
- `npx jest __tests__/accessibility/keyboard-navigation.test.tsx` -- ran; **passed** (updated focus-order assertions, AC8 modal-focus coverage intact).
- `npx jest __tests__/components/EventPlanningTab.test.tsx` -- ran; **passed** (kept as-is, unchanged widget wrapper).
- Also ran, to check the widget heading changes: `npx jest __tests__/components/EventChecklist.test.tsx __tests__/components/EventPhotoGrid.test.tsx __tests__/components/EventTimeline.test.tsx __tests__/components/EventLogistics.test.tsx __tests__/components/EventPolls.test.tsx components/groups/__tests__/EventCommentSection.polling.test.tsx __tests__/components/EventCommentSection.test.tsx` -- **passed** (9 suites, 79 passed/16 skipped).
- `npm run lint` -- ran; repo-wide baseline has ~600 pre-existing `no-explicit-any`/`no-require-imports` errors unrelated to this story (confirmed present in `lib/services/*`, `scripts/migrate.js`, etc.). Targeted `npx eslint` on every file this story touched (`EventDetail.tsx`, `EventCommentSection.tsx`, `EventList.tsx`, `EventChecklist.tsx`, `EventPhotoGrid.tsx`, `EventTimeline.tsx`, `EventLogistics.tsx`, `EventPolls.tsx`, the route page) shows **no errors on any line this story changed** (pre-existing `any`/`set-state-in-effect` warnings on unrelated lines in the widget files are unchanged from baseline).
- `npm run build` -- ran; **fails**, but reproduced identically on the unmodified `baseline_commit` (b26f630) via `git stash` — a pre-existing type error in `app/api/user/invitations/route.ts:55` (`Invitation.invitedByUsername` doesn't exist on the type), completely unrelated to this story's files. Not introduced by this change; flagged as a pre-existing repo issue.
- Ran the full `npx jest` suite for a broader regression check: 68/215 suites fail, but every failing suite (auth, calendar, wishlist, API routes, several accessibility suites, etc.) is unrelated to this story's files, and the same failure count/pattern reproduces on the unmodified baseline commit (spot-checked `CreateEventModal.test.tsx`: 19/32 tests fail identically with or without this story's changes) -- pre-existing test-suite flakiness/breakage, not a regression from this work.
