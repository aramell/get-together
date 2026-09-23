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
