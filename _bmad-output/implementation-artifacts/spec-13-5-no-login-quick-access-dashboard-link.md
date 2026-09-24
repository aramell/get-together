---
title: 'No-Login Quick-Access Dashboard Link'
type: 'feature'
created: '2026-09-24'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md']
baseline_commit: 'db340ac8c4bc4d4cb9db65a504f255d08c7db983'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The public/no-login event link (`PublicEventPlanning.tsx`) is a hand-maintained reimplementation exposing only 3 of the 5 dashboard widgets (no Photos, no Polls), ignores each group's Story-13.4 widget order/visibility config, and has no way for a logged-out visitor to act without leaving the page.

**Approach:** Give the 5 real widget components (`EventPhotoGrid`, `EventChecklist`, `EventTimeline`, `EventLogistics`, `EventPolls`) a guest/read-only rendering path — gated by the event's `public_token` instead of `accessToken` — driven by the same `group_dashboard_widgets` layout the authenticated Dashboard reads, so guest and member views stay identical by construction. Replace `PublicEventPlanning.tsx`'s hardcoded markup with a render loop over those widgets (mirroring `EventPlanningTab.tsx`). Add a login modal, reusing the existing `LoginForm`, opened by a guest's first interactive attempt; on success it calls `AuthContext.login(tokens)` and closes — no navigation, same URL, the widget becomes interactive in place.

## Boundaries & Constraints

**Always:**
- No-login view renders the event's group's full configured Dashboard (same widget set, order, visibility from `group_dashboard_widgets`, resolved via the event's `public_token` → `group_id`) exactly as the authenticated view does, minus interactive controls.
- Reuse the same 5 widget components for both authenticated and guest rendering by adding a guest-mode path inside each — not a second set of components.
- A guest's first attempted interactive action (checkbox, claim, upload, vote, reorder) opens a login modal wrapping the existing `LoginForm`; on success, call `useAuth().login(tokens)` and close it — no navigation, no URL change, the just-attempted widget becomes fully interactive in place.
- Hidden widgets stay hidden for guests too. Keep the existing first-name-only identity convention (`firstNameOf()`) for any guest-visible assignee/claimant/voter/uploader.
- Preserve the no-group-leakage stance (Story 7.3): no new public response exposes `group_id`, group name, or other members' info beyond first names already shown today.
- Guest mode gets the same ~5s live-refresh poll (Story 13.2) every widget already has.

**Never:**
- No new guest capability beyond viewing — upload/claim/checkbox/vote/reorder stay disabled/absent until login.
- No SMS magic-link flow inside the login modal — password only via the existing `LoginForm`; a guest wanting magic-link login uses the existing full `/auth` pages.
- No rate limiting added to public routes — pre-existing, out of scope.
- No changes to `PublicRsvpForm.tsx`, `PublicEventHeader.tsx`, `public_token` generation/revocation, or comment work (Stories 13.6–13.10).
- If the account that logs in via the modal isn't a member of the event's group, its interactive action is still rejected by the existing any-member auth checks (403) — do not add new group-join/auto-membership logic.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Guest opens link, group has a custom layout | Valid `public_token`, `group_dashboard_widgets` rows exist | Visible widgets render read-only, in configured order; hidden ones absent | N/A |
| Guest opens link, group has no layout rows yet | No `group_dashboard_widgets` rows | Falls back to default order, all visible (matches authenticated fallback) | N/A |
| Guest clicks a disabled control | No `accessToken` | Login modal opens in place | N/A |
| Guest logs in via modal | Valid credentials | Modal closes; page re-renders with interactive controls, no navigation | N/A |
| Login attempt fails | Invalid credentials | Existing `LoginForm` inline error; modal stays open | Existing `LoginForm` validation |
| Logged-in-via-modal user isn't a group member | Authenticated, no group role | Action rejected | 403 FORBIDDEN, toast, stays read-only |
| `public_token` invalid/revoked/event deleted | Token < 32 chars or no match | 404 (unchanged) | Existing 404 handling |

</frozen-after-approval>

## Code Map

- `lib/db/queries.ts:1470-1487` `getEventByPublicToken` -- already returns `group_id`; resolve it here for every new public read.
- `lib/services/dashboardWidgetsService.ts:25-59` `getWidgetLayout(groupId)` -- reuse directly; no auth check inside it today (auth lives at the route layer, same as `publicPlanningService.ts`'s existing pattern).
- `components/groups/EventPlanningTab.tsx:23-29` `WIDGET_COMPONENTS` map, `:45-93` fetch/poll effect, `:106-108` visible+position filter/sort, `:139-143` render loop -- mirror this shape for the guest version, sourcing layout from a public endpoint instead of `/api/groups/{groupId}/dashboard-widgets`.
- `components/groups/EventChecklist.tsx:114`, `EventLogistics.tsx:127`, `EventTimeline.tsx:93`, `EventPhotoGrid.tsx:71`, `EventPolls.tsx:97` -- each widget's `if (!accessToken) return;` fetch gate; each needs a guest branch (fetch a public endpoint by `publicToken`, skip member-only calls like `EventChecklist.tsx`'s `fetchMembers` at `/api/groups/${groupId}` -- guest data comes pre-name-resolved from `publicPlanningService`, not raw user IDs -- and hide interactive controls).
- `lib/services/publicPlanningService.ts:51-138` `getPublicEventPlanning`, `:45-49` `firstNameOf()` -- existing checklist/logistics/timeline public queries and the first-name-only convention; add equivalent photos/polls queries (mirror `lib/services/eventPhotoService.ts`, `lib/services/eventPollService.ts`'s underlying tables) respecting the same privacy stance.
- `app/api/events/public/[publicToken]/planning/route.ts` -- existing public planning GET (404/410/500 handling to mirror); extend or add sibling routes for photos/polls and for widget layout.
- `components/groups/PublicEventPlanning.tsx` (198 lines) -- today's hardcoded 3-widget reimplementation; replaced by a layout-driven render loop over the 5 real widgets in guest mode.
- `app/events/public/[publicToken]/page.tsx` -- hosts `PublicEventPlanning`; owns the login-modal open state and passes a `requestLogin` callback down.
- `components/auth/LoginForm.tsx` (237 lines, password-only) -- reuse as-is inside a new Modal; its existing `onSuccess(tokens)` callback calls `useAuth().login(tokens)` then closes the modal instead of `router.push`.
- `lib/contexts/AuthContext.tsx:269-275` `login()` -- already synchronous, no navigation; safe to call from the modal.
- `__tests__/services/publicPlanningService.test.ts`, `__tests__/api/public-events.test.tsx`, `app/api/events/public/[publicToken]/planning/__tests__/route.test.ts` -- extend for photos/polls/layout coverage. No test file exists yet for `PublicEventPlanning.tsx` or the public page -- add one.

## Tasks & Acceptance

**Execution:**
- [x] `lib/services/publicPlanningService.ts` -- add photos/polls public queries (group_id-scoped, first-name-only voter/uploader identity) -- completes the 5-widget public data surface
- [x] `app/api/events/public/[publicToken]/planning/route.ts` (or new sibling routes) -- expose photos/polls alongside existing checklist/logistics/timeline
- [x] `app/api/events/public/[publicToken]/dashboard-widgets/route.ts` (new) -- GET only; resolve `group_id` via `getEventByPublicToken`, call `getWidgetLayout`, never return `group_id` itself
- [x] `components/groups/EventChecklist.tsx`, `EventLogistics.tsx`, `EventTimeline.tsx`, `EventPhotoGrid.tsx`, `EventPolls.tsx` -- add a guest-mode path (public-token prop, public endpoint fetch, disabled controls, same 5s poll) alongside the existing `accessToken` path
- [x] `components/groups/PublicEventPlanning.tsx` -- replace hardcoded markup with a fetch of the public widget layout plus a render loop over the 5 widgets in guest mode
- [x] `components/auth/LoginInPlaceModal.tsx` (new) -- wraps `LoginForm` in a Chakra `Modal`; `onSuccess` calls `useAuth().login(tokens)` and closes, no navigation
- [x] `app/events/public/[publicToken]/page.tsx` -- own login-modal state, pass `requestLogin` down to the widgets' disabled-control handlers
- [x] `__tests__/services/publicPlanningService.test.ts` -- cover new photos/polls queries
- [x] `app/api/events/public/[publicToken]/dashboard-widgets/__tests__/route.test.ts` (new) -- GET success/404/no-rows-fallback
- [x] `__tests__/components/PublicEventPlanning.test.tsx` (new) -- layout-driven render, hidden widgets absent, disabled control opens login modal, login success upgrades in place
- [x] Each widget's existing test file -- add guest-mode coverage (read-only render, disabled control calls `requestLogin`)

**Acceptance Criteria:**
- Given a group with a custom widget layout, when a logged-out visitor opens the public link, then they see the same visible widgets in the same order as group members do, read-only.
- Given a guest clicks any interactive control, when clicked, then a login modal opens without navigating away.
- Given a guest logs in successfully via that modal, when login succeeds, then the modal closes and the widgets become interactive in place, without a page reload or URL change.
- Given a widget is hidden in the group's layout, when the public link is viewed, then that widget does not render for guests either.
- Given the public link's underlying data changes, when a guest is viewing, then they see the update within one poll cycle, same as authenticated viewers.

## Implementation Notes

- **Guest → interactive upgrade without navigation, without leaking `group_id` to anonymous requests:** the hardest part of "the just-attempted widget becomes fully interactive in place" is that the client has no `group_id` at all on the public page (by design, per Story 7.3). Solution: `GET /api/events/public/[publicToken]/planning` now optionally honors an `Authorization: Bearer` header (via `getUserIdFromBearerToken`, same helper the authenticated routes use) and, only when it resolves to a verified user, includes `group_id` in the response (`publicPlanningService.getPublicEventPlanning(publicToken, requestingUserId?)`). An anonymous request never gets it. Each widget forwards its `accessToken` (if any) on its guest-mode poll, captures `group_id` into local `resolvedGroupId` state the moment it appears, and treats `effectiveGroupId = groupId ?? resolvedGroupId` + `accessToken` as `interactive`. This is not gated on group membership — membership is still enforced exactly where it always was, at the existing per-group endpoints (`getUserGroupRole` → 403), satisfying the "isn't a member → rejected, 403, toast, stays read-only" edge case via each widget's existing optimistic-update/revert-on-error handling. A side effect: a visitor who is *already* logged in (existing session) when they open a public link upgrades to interactive automatically, without ever opening the modal — this falls out of the same mechanism and seems like the right behavior (an authenticated member shouldn't have to click a login prompt they don't need), but flagging it as a design call in case product intent differs.
- **Each of the 5 widgets gained a guest branch, not a new set of components** (`groupId?`, `publicToken?`, `requestLogin?` added to each props interface; `groupId` changed from required to optional). Guest state (`guestItems`/`guestPhotos`/`guestPolls`) is kept separate from the authenticated `items` state rather than unified, because the guest payload shape is intentionally smaller (first-name-only identity, no `created_by`/raw `assigned_to`) — reusing one shape would have meant either leaking member-only fields into the type or awkwardly optional-izing the authenticated shape.
- All 5 guest widgets read from **one shared endpoint**, `GET /api/events/public/[publicToken]/planning`, each pulling its own slice (`checklist`/`logistics`/`timeline`/`photos`/`polls`) and polling it independently every ~5s (Story 13.2 parity) — simpler than 5 sibling endpoints, at the cost of some redundant payload (each widget fetches all 5 sections' data every poll and uses one). Accepted as consistent with the existing pattern (e.g. `EventChecklist`/`EventLogistics` already independently re-fetch group members).
- New public queries added to `publicPlanningService.ts`: `photos` (id/url/caption only — no `uploaded_by`; a guest can't act on photos, so there's no reason to expose uploader identity at all, tighter than "first name only"). `polls` (question/options/vote_count/total_votes only — no per-voter identity, since even the *authenticated* `EventPolls` widget never exposes who voted, only counts and the caller's own vote).
- Timeline has no guest-triggerable interactive control (its only actions are owner-gated edit/delete, plus the add-item form which guest mode omits entirely) — its guest render is purely informational, and `requestLogin` is accepted but unused (documented in the props comment) for a consistent widget signature.
- Guest "add new item" forms (checklist/logistics/timeline/poll creation) are omitted entirely rather than rendered-disabled, per the spec's "disabled/absent" wording — only per-item controls the I/O matrix explicitly calls out (checkbox, claim, vote, upload) are rendered and wired to `requestLogin`.
- `app/api/events/public/[publicToken]/dashboard-widgets/route.ts` (new, GET-only) mirrors the sibling `planning` route's 404/410/500 handling and reuses `getWidgetLayout` as-is; it deliberately does **not** get the Bearer-token/`group_id` treatment the `planning` route got — the spec's task line for it explicitly says "never return group_id itself," so that route stays anonymous-only in every case.
- `PublicEventPlanning.tsx` is now a thin layout-driven render loop (mirrors `EventPlanningTab.tsx`'s `WIDGET_COMPONENTS` map/fetch/poll/order-filter shape) instead of the old hand-maintained 3-section markup; `app/events/public/[publicToken]/page.tsx` now owns the login modal's open state (`useDisclosure`) and passes `requestLogin`/`eventId` down.
- `LoginInPlaceModal.tsx` is a thin Chakra `Modal` wrapper around the existing `LoginForm`; its `onSuccess` calls `useAuth().login(tokens)` then closes — no new auth logic, matching the spec's Design Notes.
- **Verification-step addition:** `LoginInPlaceModal.tsx` shipped with no dedicated test — the I/O matrix's "Guest logs in via modal" and "Login attempt fails" rows were only indirectly exercised (via `PublicEventPlanning.test.tsx`'s post-login-state simulation), leaving the modal's own success/failure wiring unguarded. Added `__tests__/components/LoginInPlaceModal.test.tsx` (3 tests: renders `LoginForm` with no separate auth UI; successful login calls `AuthContext.login()` and `onClose` with no navigation; failed login surfaces `LoginForm`'s inline error and leaves the modal open). All 3 pass against the real implementation; `npx eslint` clean.

## Spec Change Log

## Review Triage Log

- [verification-gap, edge-case-hunter, blind-hunter] A logged-in user who is **not a member** of the event's group (e.g. an unrelated account, or one that logs in via the modal) is upgraded to the full interactive UI (add-item forms, checkboxes, claim/vote buttons) the moment `group_id` appears in the public planning response — `interactive = Boolean(accessToken && effectiveGroupId)` in each of the 5 widgets has no membership signal, only "authenticated + group_id known." The underlying `fetchItems`/`fetchMembers` calls do 403 server-side and are silently swallowed (`if (!response.ok) return;`), so no data leaks and no write succeeds, but the widget renders as if the guest were a member (empty-state full UI) instead of staying on the read-only guest branch. **Verdict: high.** Confirmed by reading `effectiveGroupId`/`interactive` in all 5 widgets plus `publicPlanningService.ts`'s `group_id` inclusion (any verified Bearer token, no membership check) — this directly contradicts the frozen I/O matrix row "Logged-in-via-modal user isn't a group member → ... stays read-only." No test in the diff exercises a non-member scenario (independently confirmed by all three reviewers). Route: **patch** — the frozen spec is unambiguous, only the code needs to match it; smallest fix is a `membershipConfirmed` flag per widget, set only once the widget's own authenticated fetch actually succeeds, gating `interactive` on that (not on `group_id` resolution alone) for the guest-upgrade path — plus a covering test for "non-member post-login stays read-only."
- [blind-hunter] `EventChecklist.tsx`'s guest checkbox dropped the old `isDisabled` prop, leaving a normal-looking, focusable checkbox wired only to `requestLogin` via `onChange`, with the "log in" cue only in a screen-reader `aria-label` — every other guest widget (logistics/photos/polls) pairs its login-gated control with a visible "Log in to …" button. **Verdict: medium.** Confirmed by reading the diff; re-adding `isDisabled` isn't a valid fix since a disabled native input doesn't fire `onChange` at all, which would silently break the click-to-login trigger. Route: **patch** — give the guest checklist row the same visible affordance pattern (e.g. a "Log in to check off items" button/label) already established by the other 4 widgets in this same diff.
- [blind-hunter] `EventLogistics.tsx`'s guest **Bring List** row always renders "Log in to bring this," even for items that already have an `assignee_first_name` — the authenticated `renderBringRow` hides the claim control once `assigned_to` is set. **Verdict: low.** Confirmed by comparing the guest branch to the authenticated `renderBringRow`'s `assigned_to === null || isSelf` guard; likely encountered (any claimed bring-item), fix is a direct one-line condition mirroring the existing guard. Route: **patch**.
- [blind-hunter, verification-gap ("Other findings")] `EventLogistics.tsx`'s guest **Carpool** row always renders "Log in to claim a seat," even when `claim_count >= capacity` — the authenticated `renderCarpoolRow` disables/relabels via `isDisabled={!hasClaimed && isFull}`. **Verdict: low**, same reasoning as the Bring List finding above. Route: **patch**.
- [edge-case-hunter] A widget rendered with **neither** `groupId` nor `publicToken` never has any effect set `loading` to `false` (both fetch effects early-return on that precondition), so it spins forever. **Verdict: low** — no current caller (`EventPlanningTab` always passes `groupId`; `PublicEventPlanning` always passes `publicToken`) can trigger this today, but the guard is a trivial one-line addition per widget. Route: **patch** (defensive early-return to a `null`/empty render when neither prop is supplied). A second claim from the same finding — that this state instead falls through to the full interactive UI with `effectiveGroupId` undefined — is **false**: the `if (loading) return <Spinner>` gate always intercepts first since `loading` never flips to `false` in this scenario, so the final unconditional return is never reached.
- [edge-case-hunter] `PublicEventPlanning.tsx` dropped the old `hasAnything`/`!data` check that hid the whole Trip Planning section when checklist/logistics/timeline were all empty; guests on an event with no planning content now see up to 5 empty-state widget sections ("No checklist items yet.," etc.) instead of nothing. **Verdict: false.** This matches Story 13.4's own frozen boundary, which this story's own "renders identically to the authenticated view" boundary requires guest mode to mirror: "a widget that's visible but has zero items still renders its own existing empty-state prompt, never hidden just because it's empty" (`13-4` spec). The old guest-only `hasAnything` short-circuit was itself the inconsistency; removing it is the correct fix for parity, not a regression.
- [edge-case-hunter] `PublicEventPlanning.tsx` reuses `isValidWidgetLayoutResponse` (from `lib/utils/dashboardWidgets`), which checks shape/length but not uniqueness of `widget_key`/`position` — a malformed response with duplicate keys would pass validation. **Verdict: medium if true, pre-existing.** This validator is unmodified in this diff and already used identically by `EventPlanningTab.tsx` since Story 13.4 — not caused by this story. Route: **defer**.
- [verification-gap] No test renders the real `app/events/public/[publicToken]/page.tsx` to confirm `requestLogin`/`useDisclosure`/`LoginInPlaceModal` are actually wired together end-to-end (each half is only tested in isolation). **Verdict: medium if true, but a mis-wiring is a thin, easily-caught regression** (both halves — the click trigger and the modal's own success/failure behavior — already have direct coverage). Route: **defer**.
- [blind-hunter] No guest-mode test in any of the 5 widgets covers a failed/non-ok `fetch` from the public planning endpoint. **Verdict: low.** The actual behavior (`if (!response.ok) return;`, leaving state at its initial empty value, no toast) mirrors the same already-accepted, already-untested convention the authenticated fetch paths use in these same files — not a new or story-specific risk. Route: **reject** (low + unlikely to regress silently, given it's an existing pattern, not new logic).
- [blind-hunter] `fetchGuestPlanning` (URL, header construction, 5s interval, cleanup) and the guest item type declarations (`GuestChecklistItem`, etc.) are duplicated near-verbatim across all 5 widgets instead of a shared hook / type-only imports from `publicPlanningService.ts`. **Verdict: low** (developer-only; a real future-drift risk, but the spec's own Implementation Notes already accepted this shape deliberately, and the story's Design Notes explicitly chose "a branch inside each widget, not a second set of components" for a different, already-weighed reason). Route: **reject** (fix is a multi-file refactor, more than a direct correction, and not unique to this story's risk profile).
- [blind-hunter] `accessToken` hydrating asynchronously from `localStorage` on load can cause an already-logged-in visitor's guest-mode effect to fire once (with `interactive` still `false`) before flipping over, producing an extra loading-spinner flash. **Verdict: low**, cosmetic, self-correcting within one render pass. Route: **reject** (unlikely to be noticed; fix requires coordinating hydration timing across effects, more than a direct correction).
- [blind-hunter] No test exercises `getUserIdFromBearerToken` being given a malformed/garbage `Authorization` header on the now-optionally-authenticated `planning` route. **Verdict: false.** `getUserIdFromBearerToken` is an existing, separately-used-and-tested shared helper; this route's tests correctly mock it at the module boundary and only need to verify this route's own null-vs-resolved branching, not the helper's internal token-parsing behavior.
- [blind-hunter] `sprint-status.yaml` shows `13-5-...: in-progress` while the spec frontmatter is `status: in-review` with all tasks checked. **Verdict: false.** Same established, already-triaged convention as Story 13.4's own Review Triage Log: sprint-status only syncs to `review` during step-05, not before.

## Design Notes

Login-in-place reuses the existing `LoginForm` component (already decomposed with an `onSuccess(tokens)` callback, used today by `/auth/login`) inside a new lightweight `Modal`, instead of building new auth UI/logic — `onSuccess` calls `useAuth().login(tokens)` (already synchronous, no navigation) instead of the page's `router.push`.

Guest mode is added as a branch inside each existing widget component, not a second set of components, so guest and member rendering stay identical by construction rather than by manual parity effort — this directly avoids the drift risk `PublicEventPlanning.tsx`'s current hand-maintained duplicate already has today.

## Verification

**Commands:**
- `npx jest __tests__/components/PublicEventPlanning.test.tsx __tests__/services/publicPlanningService.test.ts __tests__/api/public-events.test.tsx "app/api/events/public/[publicToken]/planning/__tests__/route.test.ts" "app/api/events/public/[publicToken]/dashboard-widgets/__tests__/route.test.ts"` -- expect all passing
- `npx jest __tests__/components/EventChecklist.test.tsx __tests__/components/EventLogistics.test.tsx __tests__/components/EventTimeline.test.tsx __tests__/components/EventPhotoGrid.test.tsx __tests__/components/EventPolls.test.tsx` -- expect all passing (existing + new guest-mode coverage)
- `npx eslint` on every touched file -- expect no new error classes vs baseline
- `npm run build` -- expect the same pre-existing baseline failure (`app/api/user/invitations/route.ts:55`), not a new one

**Results, post-review patch pass (2026-09-24):**
- 13 suites / 98 tests run (all Story 13.5 files plus `EventPlanningTab.test.tsx`/`DashboardWidgetCustomizer.test.tsx` as an authenticated-Dashboard regression check, since `interactive`'s definition changed): 89/89 relevant tests pass. The only failing suite, `__tests__/api/public-events.test.tsx` (9 tests), fails identically on the unmodified `baseline_commit` via `git stash` (`Response.json is not a function`, a pre-existing jsdom issue in an untouched file, `app/api/events/public/[publicToken]/route.ts`) -- confirmed not a regression.
- `npx eslint` across all touched production + test files: only the same two pre-existing error classes already present before this story (`react-hooks/set-state-in-effect`, `@typescript-eslint/no-explicit-any`), more instances of the `membershipConfirmed` effect pattern but no new classes.
- `npm run build`: fails at the same pre-existing `app/api/user/invitations/route.ts:55` TypeScript error, nothing new.
- Confirms all 5 patch findings from the Review Triage Log are correctly fixed: `interactive` now requires either the trusted `groupId` prop or a `membershipConfirmed` flag set only on a successful authenticated fetch (verified in the diff for all 5 widgets); checklist guest row has a visible "Log in to check off" button; Bring List guest button hides once claimed; Carpool guest button disables/relabels "Seats full" when full; all 5 widgets guard against being rendered with neither `groupId` nor `publicToken`.
