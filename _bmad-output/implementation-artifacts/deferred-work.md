- source_spec: `_bmad-output/implementation-artifacts/13-1-unify-event-landing-dashboard.md`
  summary: Add a test rendering `EventDetailsPage` (`app/groups/[groupId]/events/[eventId]/page.tsx`) directly to cover its wiring of `<EventDetail>` into the live route, including the "Invalid group or event ID" branch's lost "Go Back" affordance relative to the pre-existing pattern.
  evidence: Verification-gap review found no test anywhere renders `EventDetailsPage` itself (only `<EventDetail>` directly, with hardcoded props) — a silent logic-only regression (bad import, dropped condition) would ship undetected. Deferred rather than fixed in this story because no `app/**/page.tsx` in the repo (checked all 15) has a dedicated test; closing this would introduce a new test pattern rather than follow the repo's existing convention.

- source_spec: `_bmad-output/implementation-artifacts/13-2-consistent-live-refresh-widgets.md`
  summary: The shared `isFetchingRef` in-flight guard blocks a widget's own post-mutation refresh call if a background poll happens to be in flight at the same instant, silently delaying the mutating user's own refresh by up to 5s.
  evidence: Blind-hunter review confirmed `EventTimeline.tsx`'s `handleAddItem`/`handleSaveEdit` `await fetchItems()` calls (and pre-existing, identically-shaped calls in `EventLogistics.tsx:257`, `EventPolls.tsx:189`) all share one `isFetchingRef` with the polling interval, so a same-instant poll no-ops the mutation's own refresh. Bounded/self-healing (next poll tick fixes it within 5s) but real. A proper fix needs to touch all 4 polling widgets consistently (e.g. a separate flag or a bypass parameter for caller-initiated refreshes), not just the one this story happened to add.

- source_spec: `_bmad-output/implementation-artifacts/13-2-consistent-live-refresh-widgets.md`
  summary: None of the 4 polling widgets (`EventChecklist`, `EventLogistics`, `EventPolls`, and now `EventTimeline`/`EventPhotoGrid`) guard against a request resolving after unmount (no `isMountedRef`/`AbortController`), and none of their tests assert `clearInterval` actually fires on unmount.
  evidence: Blind-hunter review found this gap in the newly-polling widgets, but it's pre-existing and identical across the 3 widgets this story's pattern was copied from (confirmed via grep — no widget's test file asserts unmount cleanup). `clearInterval` on unmount already bounds exposure to at most one in-flight request per unmount, not a standing risk, so this is a minor, cross-cutting hardening item for the whole polling-widget family, not unique to this story.

- source_spec: `_bmad-output/implementation-artifacts/13-2-consistent-live-refresh-widgets.md`
  summary: No test across any of the 4 polling widgets exercises a poll landing while a user is mid-edit (focus in an input) to confirm the epic's "no stolen focus/scroll on live updates" requirement actually holds.
  evidence: Blind-hunter review found this gap for the new Timeline/PhotoGrid polling tests; confirmed via grep that the 3 pre-existing polling widgets' tests never covered this either. A codebase-wide, epic-level a11y verification gap predating this story, not something this story's narrow scope (extend the existing pattern consistently) introduced.

- source_spec: `_bmad-output/implementation-artifacts/spec-13-3-date-day-context-checklist-logistics.md`
  summary: Visually distinguish overdue (past-dated) checklist/logistics items from future-dated ones — both currently render the same neutral `Badge colorScheme="cork"`.
  evidence: Blind-hunter review confirmed there's no visual "overdue" cue. Deferred rather than fixed in this story because `epic-13-context.md` (this story's loaded context) states "No visual identity changes this pass — everything built from existing primitives ... not restyled," which forecloses introducing a new distinguishing color this pass.

- source_spec: `_bmad-output/implementation-artifacts/spec-13-4-customizable-widget-layout.md`
  summary: `EventPlanningTab` never checks `useAuth()`'s `isLoading`/`isAuthenticated` flags, only `accessToken` truthiness — an expired/refresh-failed session could show an indefinite "Loading dashboard..." spinner instead of an auth/error state.
  evidence: Blind-hunter review found this, but confirmed it's identical to `EventChecklist.tsx`'s own `if (!accessToken) return` gate — a pre-existing, app-wide pattern across every polling widget, not something this story introduced. A proper fix needs to be applied consistently across all of them at once.

- source_spec: `_bmad-output/implementation-artifacts/spec-13-4-customizable-widget-layout.md`
  summary: No concurrency/conflict handling on the shared per-group dashboard widget layout — `PATCH` is a full-replace with no version/timestamp check, so two members customizing simultaneously silently last-write-wins.
  evidence: Blind-hunter review confirmed there's no versioning/conflict-detection pattern anywhere in this codebase to build the correct fix on (no shared per-group setting has one). Bounded risk — no data corruption, self-heals on the next ~5s poll — customize mode is already an infrequent action, and simultaneous conflicting edits from two members are rarer still.

- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-no-login-quick-access-dashboard-link.md`
  summary: `isValidWidgetLayoutResponse` (`lib/utils/dashboardWidgets.ts`) checks shape/length of a widget-layout response but not uniqueness of `widget_key`/`position` — a malformed response with duplicate keys would pass validation and could produce duplicate React keys / silently dropped widgets.
  evidence: Edge-case-hunter review found this gap, but the validator is unmodified by this story and already used identically by `EventPlanningTab.tsx` since Story 13.4 (this story's `PublicEventPlanning.tsx` just reuses it) — pre-existing, not introduced here.

- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-no-login-quick-access-dashboard-link.md`
  summary: No test renders the real `app/events/public/[publicToken]/page.tsx` to confirm `requestLogin`/`useDisclosure`/`LoginInPlaceModal` are actually wired together end-to-end — each half (the click trigger in `PublicEventPlanning.test.tsx`, the modal's own success/failure behavior in `LoginInPlaceModal.test.tsx`) is only tested in isolation.
  evidence: Verification-gap review confirmed no test imports/renders this page component (consistent with the repo's existing convention of no `app/**/page.tsx` tests, per Story 13.1's own Verification section). A wiring mistake here is a thin two-line `useDisclosure` regression, not deep logic, so deferred rather than introducing a new page-test pattern for this story alone.

- source_spec: `_bmad-output/implementation-artifacts/spec-13-6-general-trip-comment-access.md`
  summary: No tests cover exception/error paths for EventCommentSection rendering or polling failures (comment API unavailable, malformed response).
  evidence: Blind-hunter review flagged missing error/exception scenario testing. Dev-only impact — no user-facing risk, because existing EventCommentSection component's error handling (existing `if (!response.ok) return;` pattern, silent fall-through) is already tested in EventCommentSection's own test suite. Deferred as cosmetic hardening, not unique to modal presentation.

- source_spec: `_bmad-output/implementation-artifacts/spec-13-6-general-trip-comment-access.md`
  summary: No explicit test for modal focus management (Escape key, backdrop focus restoration) — relies on Chakra UI's built-in Modal behavior.
  evidence: Blind-hunter review noted Escape key close and focus restoration not explicitly tested. Chakra's Modal component provides and tests this behavior; this story only moved EventCommentSection into a Modal wrapper (no new focus-related code). Deferred as cosmetic coverage gap — the actual focus/Escape behavior is guaranteed by Chakra's own test suite, not this story's responsibility.
- source_spec: `_bmad-output/implementation-artifacts/spec-14-1-widget-registry.md`
  summary: Enforce the registry's `publicView` flag in the public dashboard view and type member vs guest widget props as a discriminated union.
  evidence: Review found `publicView` is declared but read by no code, and `WidgetRendererProps` is all-optional; harmless while all widgets are public, but a non-public widget would leak to guests.
- source_spec: `_bmad-output/implementation-artifacts/spec-14-1-widget-registry.md`
  summary: Run migration 036 against a real Postgres (with 033 applied) to confirm both CHECKs drop and widget_key widens.
  evidence: Unverified: the migration was written but never executed, since no database was available or authorized in the build.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-2-generic-item-comments.md`
  summary: Migration 037 (copy 034/035 into item_comments, then drop them) has only text-level tests and has never run against Postgres.
  evidence: Repo has no DB test harness; unverified severity is high (data loss if the copy is wrong). Settle by running it on a copy with seeded 034/035 rows and checking ids, deleted_at, event_id and that the old tables are gone.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-3-comments-on-timeline-items.md`
  summary: Item comment routes (checklist, logistics, timeline, member and public) may return 500 instead of 404 when `itemId` is not a valid UUID.
  evidence: Edge review of 14.3 flagged it; the lookup query runs with the raw id and Postgres rejects invalid UUIDs. Pre-existing across all item comment routes. Unverified; settle with a route test passing a non-UUID id.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-4-comments-on-polls.md`
  summary: Poll comment routes (member and public) may return 500 instead of 404 when `pollId` is not a valid UUID.
  evidence: Same pre-existing behavior as the checklist/logistics/timeline comment routes (see the 14.3 entry above); the lookup runs with the raw id. Unverified; settle together with the 14.3 entry using a route test with a non-UUID id.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-5-per-event-layout.md`
  summary: Dashboard-widgets routes return 500 instead of 400 on malformed JSON or a null body.
  evidence: The new event route copies the group route's `request.json()` handling; both throw into the outer catch.
- source_spec: `_bmad-output/implementation-artifacts/spec-14-5-per-event-layout.md`
  summary: Non-UUID `eventId`/`groupId` reaches Postgres and surfaces as 500 rather than 404/400.
  evidence: Same behavior as the other item routes; not caused by this story.

- source_spec: `_bmad-output/implementation-artifacts/spec-14-6-configurable-logistics-categories-labels.md`
  summary: Malformed JSON or null body on the logistics-categories PATCH returns 500 instead of 400.
  evidence: Same behavior exists in the other group routes; pre-existing pattern, found in 14.6 review.

## Deferred from: code review of spec-14-9-notes-and-links-widget (2026-10-07)

- Migration 041 (event_notes) was never run against a database. Unverified severity: high if it fails. Settle by applying it to a dev database. gen_random_uuid() is already used by migration 001.

## Deferred from: code review of spec-14-7-event-types-and-presets (2026-10-07)

- Deploy order for Story 14.7: group queries select `groups.default_event_type`, so migration 040 must be applied before this code is deployed or every group read and write fails. Check whether 040 has been applied to production.
- `__tests__/components/CreateEventModal.test.tsx` submit tests assert on a mocked `createEvent` while the modal submits via `fetch` (19 of 32 tests fail). Pre-existing, not touched by 14.7.


## Deferred from: code review of spec-14-1-widget-registry (2026-10-09)

- `publicView` and `commentable` registry flags have no consumer; `PublicEventPlanning` renders every renderer entry, so a future widget with `publicView: false` would reach guests. Fix when the first non-public widget is added.
- Confirm migrations 033-036 are applied to production before deploying Epic 14 code. Migration 036 was never run against Postgres (AC3 unverified). Unverified severity: high if the CHECK drop fails. Settle by applying it to a dev database and inserting a key outside the old set and a position above 5.

## Deferred from: code review of spec-14-2-generic-item-comments (2026-10-09)

- Migration 037 (item_comments) has only source-text tests and was never run against a database; it drops `checklist_comments` and `logistics_comments` after copying. Unverified severity: high if the copy is wrong. Settle by running it on a dev database seeded with 034/035 comments and comparing row counts before and after.
