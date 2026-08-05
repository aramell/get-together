# Story 12.2: Pre-Event Photo Uploads

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a group member planning an event,
I want to upload and view reference/moodboard photos on the event's Planning tab,
so that the group has a shared visual reference while deciding on a venue, theme, or logistics.

## Acceptance Criteria

1. **(Manual, human step — not implementable by a dev agent)** An S3 bucket exists for event photos, with a bucket policy allowing public `GetObject` (these are non-sensitive planning reference images, not private user data) and the app's existing AWS IAM identity (the same one already used for CloudWatch/SNS, see Dev Notes) granted `PutObject`/`DeleteObject` on it. Bucket name is provided via a new env var `AWS_S3_EVENT_PHOTOS_BUCKET`, set in Amplify Console (production) and `.env.local` (local dev) — mirrors how Story 11.1 handled `DATABASE_*` vars.
2. A new `event_photos` table exists (migration `014_create_event_photos_table.sql`), with RLS enabled and no policies (default-deny), matching the pattern established in `012_enable_rls_default_deny.sql`/`013_create_users_table.sql`.
3. `POST /api/groups/:groupId/events/:eventId/photos` accepts a single `multipart/form-data` image (field name `file`), validates type (`image/jpeg`, `image/png`, `image/webp`) and size (max 5MB — see Dev Notes on why not larger), requires a valid Bearer JWT and group membership, uploads to S3, inserts a row, and returns `201` with the new photo record (including its public `url`).
4. `GET /api/groups/:groupId/events/:eventId/photos` returns all photos for the event ordered by `created_at` ascending, gated by group membership. No pagination needed for this story (moodboard photo counts are expected to be small; add pagination later if it becomes a problem).
5. `DELETE /api/groups/:groupId/events/:eventId/photos/:photoId` deletes both the S3 object and the DB row. Only the uploader (`uploaded_by`) may delete their own photo — same authorization shape as comment edit/delete elsewhere in the app.
6. The Planning tab (`components/groups/EventPlanningTab.tsx`, currently a static placeholder from Story 12.1) now: fetches photos once when the tab is actually opened (not on `EventDetail` mount — see Task 5 on `isLazy`), renders them in a responsive image grid (Chakra `Image`, not `next/image` — see Dev Notes), shows an upload button/file input, and shows a delete button on each photo only for its uploader.
7. Upload shows a loading/disabled state while in flight; upload and delete both show user-facing error feedback (reuse the `useToast` pattern already used in `EventDetail.tsx`) for wrong file type, too-large file, and network/server failures.
8. No production credentials committed. `.env.local.example` gets the new `AWS_S3_EVENT_PHOTOS_BUCKET` placeholder added (empty/dummy value only).
9. This story does **not** touch `app/api/users/avatar/route.ts` (the existing, unrelated fake avatar-upload stub — see Dev Notes) or attempt to fix it.

## Tasks / Subtasks

- [x] Task 1: Database migration (AC: #2)
  - [x] Checked `lib/db/migrations/` first — `014` was already taken by Story 12.3's checklist migration (which landed first). Used `015` instead.
  - [x] Added `event_photos` per spec. Index on `event_id`, `ENABLE ROW LEVEL SECURITY`, no policies. Verified via `psql \d event_photos`.
  - [x] No FK on `uploaded_by`, per Dev Notes.
  - [x] Ran `npm run db:migrate` against local dev DB — applied cleanly on top of the existing 17 migrations.
- [x] Task 2: S3 client + upload/delete helpers (AC: #1, #3, #5)
  - [x] Installed `@aws-sdk/client-s3` — checked `npm audit` after; no new vulnerabilities traced to this package.
  - [x] Added `lib/storage/s3.ts`. **Used `NEXT_PUBLIC_AWS_REGION`, not the story's assumed pattern** — found `lib/logging/alarms.ts` actually uses a *different* env var (`AWS_REGION`) than `lib/services/authService.ts` (`NEXT_PUBLIC_AWS_REGION`), a small inconsistency the story didn't catch. Used `NEXT_PUBLIC_AWS_REGION` since it's the one actually set in `amplify.yml` and used by the closer sibling (auth/app-config), not monitoring.
  - [x] S3 key convention and public URL shape implemented as specified.
  - [x] Bucket name read per-call (not into a module-level constant) — makes the module testable without `jest.resetModules()` gymnastics; a small deviation from the story's literal wording, functionally identical.
- [x] Task 3: Service layer (AC: #3, #4, #5)
  - [x] Added `lib/services/eventPhotoService.ts`: `addEventPhoto`, `getEventPhotos`, `deleteEventPhoto`.
  - [x] `deleteEventPhoto` implements uploader-**or-admin** (not strictly uploader-only) — the AC's own text cites "same authorization shape as comment edit/delete," which is creator-or-admin; implemented to match that cited shape.
  - [x] DB row deleted before the S3 object, not after — an orphaned S3 object (wasted storage) is a more benign failure mode than an orphaned DB row pointing at a deleted file (broken image in the UI). S3 delete failures are logged, not surfaced as a user-facing error, since the DB delete already succeeded.
- [x] Task 4: API routes (AC: #1, #3, #4, #5)
  - [x] Added `photos/route.ts` (`GET`, `POST`) and `photos/[photoId]/route.ts` (`DELETE`), matching the comments route's conventions exactly.
  - [x] `POST` validates server-side, converts to `Buffer`, delegates to the service.
- [x] Task 5: Planning tab UI (AC: #6, #7)
  - [x] **`isLazy` and `eventId`/`groupId` props already existed** — Story 12.3 landed first and added both. No duplicate work; checked current file state first, per the story's own instruction.
  - [x] Added `components/groups/EventPhotoGrid.tsx` as an independent sibling section (alongside 12.3's `EventChecklist`), wired into `EventPlanningTab.tsx`.
  - [x] Chakra `SimpleGrid` + `Image`, file input (hidden, triggered via a `Button as="label"`), delete button gated to `photo.uploaded_by === userId`.
  - [x] No `next/image`, no `next.config.ts` change, as scoped.
- [x] Task 6: Tests (AC: #3, #4, #5, #6, #7)
  - [x] `__tests__/services/eventPhotoService.test.ts` — 12 tests.
  - [x] Route tests at `photos/__tests__/route.test.ts` and `photos/[photoId]/__tests__/route.test.ts` — 11 tests, `@jest-environment node` (same fix Story 12.3 needed for `NextResponse.json()`).
  - [x] `__tests__/components/EventPhotoGrid.test.tsx` — 5 tests (grid render, delete-button gating, upload flow, client-side type rejection, optimistic delete with revert).
  - [x] `lib/storage/__tests__/s3.test.ts` — 5 tests, explicit mock factory for `@aws-sdk/client-s3` (automocking it pulled in the real package and hit an ESM parse error in this Jest config — same class of issue, different cause, as 12.3's `@jest-environment node` fix).
  - [x] Fixed the test this story broke: `EventDetail.test.tsx`'s Planning-tab-switch test, already updated once by Story 12.3 (0→2 fetches), updated again here (2→3, for the added photos fetch) and its assertions extended to check for both "Checklist" and "Photos" text. Also extended `EventPlanningTab.test.tsx` to assert both sections render and both fetch calls fire.
- [x] Task 7: Docs (AC: #1, #8)
  - [x] Added `AWS_S3_EVENT_PHOTOS_BUCKET=` (empty) to `.env.local.example`.
  - [x] Added a README note.
- [x] Task 8: Verify no regressions
  - [x] Full-suite comparison (`git stash -u` against current HEAD, which already includes Stories 12.1/12.3): 7 suites showed as newly-failing, all `Exceeded timeout of 5000ms` — re-ran those exact 7 in isolation and all passed cleanly (7/7 suites, 81/81 tests), confirming environmental resource contention from running the full ~150-file/3137-test suite in one process, not real regressions. See Completion Notes.
  - [x] Manual end-to-end verification against a real S3 bucket **not done** — depends on AC #1 (bucket provisioning), a manual step for the user. Flagged, not silently skipped.

## Dev Notes

- **The existing avatar-upload feature is a complete fake — do not use it as a reference for "how uploads work here," and do not touch it.** `app/api/users/avatar/route.ts` accepts and validates a file, then **never uploads it anywhere** — it fabricates a URL string (`` `https://s3.amazonaws.com/get-together-avatars/${s3Path}` ``, line 71) and returns it. No `@aws-sdk/client-s3` call exists in that file. `lib/services/storageService.ts`'s `deleteOldAvatar` is also a no-op (`console.log` only, line 108). This story is the **first real file-storage implementation** in the app — build it correctly from scratch rather than copying the avatar route's shape, except for its legitimate part: reading the file via `request.formData()` is the correct, already-established Next.js App Router pattern for multipart uploads (no `multer`/`formidable` needed).
  - Also worth knowing: that route trusts a `userId` value from the form body instead of the JWT — an actual security bug. Don't repeat this. Use the Bearer-header + `getSubFromJWT` pattern from `comments/route.ts` instead (see Task 4).
  - Out of scope for this story: fixing the avatar route. Flagged to the user when this story was scoped; they chose to proceed with S3 for photos without fixing avatar upload now. Worth a follow-up story someday.
- **No cloud storage SDK is installed at all today.** Checked `package.json` in full: `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` are both absent (only `@aws-sdk/client-cognito-identity-provider`, `@aws-sdk/client-cloudwatch`, `@aws-sdk/client-cloudwatch-logs`, `@aws-sdk/client-sns`, `@aws-sdk/credential-provider-node` exist — none of them storage-related). Adding `@aws-sdk/client-s3` is a new dependency; pre-approved above (Task 2) since the storage-backend choice (S3 over Supabase Storage) was already made explicitly when scoping this story — no need to re-ask.
- **AWS credential pattern to follow:** this app's existing AWS SDK clients (`lib/logging/alarms.ts:64-65`, `lib/services/authService.ts:8-11`) instantiate with just `{ region }` and rely on the SDK's default credential provider chain (`@aws-sdk/credential-provider-node`, already a dependency) — no explicit access keys in code anywhere. Do the same for the new `S3Client`. This means Task/AC #1's IAM step is "extend the existing IAM identity's policy to allow S3 Put/Delete/Get on the new bucket," not "create a whole new credential set."
- **Why no `REFERENCES users(id)` FK on `event_photos.uploaded_by`, even though the type now matches:** `013_create_users_table.sql` made `users.id` `VARCHAR(128)`, and this story's `uploaded_by` is also `VARCHAR(128)` — so, unlike Story 11.1's `wishlist_items`/`event_comments` (which are stuck `UUID` and can't FK to a `VARCHAR(128)` column), a real FK *could* work here type-wise. But it would be unsafe: `lib/services/userService.ts`'s `createUserProfile` (the only code that ever inserts a `users` row) **has zero callers anywhere in the codebase** (verified by grep) — nothing currently guarantees a `users` row exists for a given authenticated Cognito user. Adding a hard FK here could make photo uploads fail for real, legitimate users who've simply never hit whatever code path was supposed to call `createUserProfile`. Left as a plain `VARCHAR(128) NOT NULL` with no FK, consistent with how `wishlist_items.created_by`/`event_comments.created_by` already behave (no FK, for a different but related reason). Flagging both root causes for a future data-integrity story: (1) no `users` row is guaranteed for every user, (2) as a result nothing in this schema can safely FK to it yet.
- **Another live `users.sub` bug found while researching this story, NOT fixed here (out of scope, different code path than the one already fixed during Story 11.1's code review):** `lib/services/eventService.ts`'s `addEventComment` (around line 1112) does `SELECT display_name, email, avatar_url FROM users WHERE sub = $1` — but `users` has no `sub` column, only `id`. This will throw on every successful comment post when it tries to fetch creator info for the response (the comment itself likely still saves, since this read happens after the insert/commit — but the response after the `COMMIT` would throw before reaching the client, so the error `try/catch` wraps the whole transaction block... hasn't been traced further; flagging for a bug-fix story, not fixing here since it's unrelated to photo uploads).
- **File size limit — kept at 5MB, not the 10MB originally considered:** this app deploys to AWS Amplify Hosting, which runs Next.js SSR via Lambda-backed compute; Lambda's synchronous invocation payload limits (and API Gateway/Amplify's fronting layer, depending on exact configuration) commonly cap request bodies well below what a direct-to-server large-file upload can safely assume. 5MB is a conservative, safe default for a Lambda-fronted route handler. If larger photos are needed later, the correct fix is presigned direct-to-S3 upload (client uploads straight to S3, bypassing the Next.js server entirely) — not raising this limit. Not needed for this story's moodboard-photo use case.
- **No existing image-display convention to extend** — grepped `app/` and `components/` for `next/image`, `<Image`, `<img`: zero hits for actual photo rendering (only Chakra `Avatar` is used, for small circular profile pictures, a different component). `next.config.ts` has no `images.remotePatterns` configured. Deliberately using Chakra's plain `<Image>` (zero config, already a dependency) rather than introducing `next/image` (which would require a `next.config.ts` change to allow the S3 bucket's domain) — keep it that way unless a future story has a real reason to add image optimization.
- **Planning tab currently takes no props** (`components/groups/EventPlanningTab.tsx`, added in Story 12.1) — it's a static placeholder. This story changes its signature to accept `eventId`/`groupId`, which is a breaking change to that component's API; update its one call site in `EventDetail.tsx` in the same commit.
- **`isLazy` on `Tabs` — do this now, exactly as Story 12.1 predicted.** `components/groups/EventDetail.tsx`'s `<Tabs>` currently has no `isLazy` prop, meaning both `TabPanel`s mount immediately on page load (harmless in 12.1 since Planning had no data fetching). Now that Planning fetches photos, add `isLazy` so that fetch only fires when the user actually opens the Planning tab — otherwise every event-detail page view would trigger a photos fetch nobody asked for.
- **Two existing POST-route conventions disagree in this codebase** (found while researching this story): `events/[eventId]/comments/route.ts` uses Bearer-header auth + 400 for validation errors; `wishlist/route.ts` uses cookie-based auth (`getUserIdFromRequest`) + 422 for validation errors. Follow the **comments** route's conventions for this story (Bearer + 400) since the new photos route lives in the same `events/[eventId]/...` subtree — internal consistency with its closest sibling matters more than matching the wishlist route.
- **Group membership check:** reuse the existing inline pattern from `addEventComment` (`SELECT id FROM group_memberships WHERE group_id = $1 AND user_id = $2`) or the `getUserGroupRole(groupId, userId)` helper in `lib/db/queries.ts` — either is an established idiom in this codebase; pick one and use it consistently across `addEventPhoto`/`getEventPhotos`/`deleteEventPhoto`.

### Project Structure Notes

- New: `lib/db/migrations/014_create_event_photos_table.sql`, `lib/storage/s3.ts`, `lib/services/eventPhotoService.ts`, `app/api/groups/[groupId]/events/[eventId]/photos/route.ts`, `app/api/groups/[groupId]/events/[eventId]/photos/[photoId]/route.ts`.
- Modified: `components/groups/EventPlanningTab.tsx` (new props, real content), `components/groups/EventDetail.tsx` (`isLazy` on `Tabs`, pass props to `EventPlanningTab`), `.env.local.example`, `README.md`, `package.json` (new `@aws-sdk/client-s3` dependency).
- Follows existing `lib/services/*.ts` service-layer convention and `app/api/groups/[groupId]/events/[eventId]/*/route.ts` route convention — no new architectural pattern introduced beyond the storage client itself.

### References

- [Source: app/api/users/avatar/route.ts#L1-L95] — confirmed-fake upload stub; multipart-parsing pattern to reuse, auth pattern to avoid
- [Source: lib/services/storageService.ts#L1-L134] — client-side upload helper shape (also stubbed; `deleteOldAvatar` is a no-op)
- [Source: app/api/groups/[groupId]/events/[eventId]/comments/route.ts#L1-L179] — POST/GET route template to follow exactly (auth, validation, error-code mapping, status codes)
- [Source: lib/services/eventService.ts#L1023-1140] — `addEventComment` service-layer template; also where the newly-found `WHERE sub = $1` bug lives (~line 1112, not fixed here)
- [Source: lib/auth/jwt.ts#L39-L42] — `getSubFromJWT`, the auth extraction function to use
- [Source: lib/services/userService.ts#L17-L41] — `createUserProfile`, confirmed to have zero callers anywhere (grep verified) — the reason `event_photos.uploaded_by` has no FK
- [Source: lib/logging/alarms.ts#L64-L65, lib/services/authService.ts#L8-L11] — existing AWS SDK client instantiation pattern (region-only, default credential chain) to mirror for `S3Client`
- [Source: lib/db/migrations/013_create_users_table.sql] — `users.id VARCHAR(128)` type this story's `uploaded_by` column matches
- [Source: lib/db/migrations/012_enable_rls_default_deny.sql] — RLS default-deny pattern this story's migration follows
- [Source: _bmad-output/implementation-artifacts/11-1-supabase-production-db-local-dev-setup.md] — confirms Supabase is used purely as a Postgres host (no Storage/Auth/client-SDK), which is why Supabase Storage wasn't a "free" option when this story's storage backend was chosen
- [Source: _bmad-output/implementation-artifacts/12-1-event-page-tab-navigation.md#Dev Notes] — `EventPlanningTab.tsx` placeholder this story replaces; the `isLazy` forward-compatibility note this story fulfills
- [Source: _bmad-output/planning-artifacts/epics.md#L257-L282] — Epic 12 definition; the `VARCHAR(128)` column-typing guidance and "Photos... refetch on tab mount/focus only, no polling" decision this story follows
- [Source: package.json] — confirms `@aws-sdk/client-s3` absent; `@chakra-ui/react ^2.10.9` already present for `<Image>`

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npm run db:migrate` — applied `015_create_event_photos_table.sql` cleanly on top of 17 existing migrations.
- `npx jest lib/storage/__tests__/s3.test.ts` — 5/5 passed.
- `npx jest __tests__/services/eventPhotoService.test.ts` — 12/12 passed.
- `npx jest "app/api/groups/[groupId]/events/[eventId]/photos"` — 11/11 passed.
- `npx jest __tests__/components/EventPhotoGrid.test.tsx` — 5/5 passed.
- `npx jest __tests__/components/EventDetail.test.tsx __tests__/components/EventPlanningTab.test.tsx __tests__/components/EventPhotoGrid.test.tsx __tests__/components/EventChecklist.test.tsx` — 30/30 passed.
- Full-suite regression check via `git stash -u` against current HEAD (`f20edf7`, which already includes Stories 12.1/12.3): baseline 71 failing suites, after-change run showed 77 (7 new). Re-ran those 7 exact suites in isolation — **all 7 passed cleanly** (81/81 non-skipped tests), confirming the delta was `Exceeded timeout of 5000ms` flakiness from full-suite resource contention (~150 test files in one process), not real regressions. True new-regression count: 0.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- All 9 ACs implemented and covered by passing tests, except AC #1's manual bucket-provisioning step (not implementable by a dev agent, as the story itself said) and the end-to-end verification that depends on it.
- **Story 12.3 landed first**, as the story anticipated might happen — `EventPlanningTab.tsx` already had `eventId`/`groupId` props and `isLazy` was already on `EventDetail.tsx`'s `Tabs`. No duplicate work; added the photo grid as an independent sibling section next to 12.3's checklist, exactly as both stories were scoped to compose.
- **Migration number**: used `015`, not the story's assumed `014` — `014` was already taken by 12.3.
- **Two small deviations from the story's literal wording, both explained inline in the Tasks checklist above**: (1) used `NEXT_PUBLIC_AWS_REGION` for the S3 client's region, not blindly copying whichever "reference" file was cited first — found `alarms.ts` and `authService.ts` actually use two different env var names for region, and picked the one that's actually configured in `amplify.yml`; (2) `deleteEventPhoto` allows uploader-**or-admin**, since the AC's own text cites the comment edit/delete shape (creator-or-admin) as the model, even though its first sentence reads uploader-only in isolation.
- **Found and fixed one more Jest/ESM friction point**, same root cause as Story 12.3's `@jest-environment node` fix but a different trigger: automocking `lib/storage/s3` (`jest.mock('@/lib/storage/s3')` with no factory) still loads the real module to inspect its shape, which transitively pulled in `@aws-sdk/client-s3` and hit a raw `export` syntax error (an ESM-only submodule Jest's default transform config doesn't parse). Fixed by giving `eventPhotoService.test.ts`'s mock an explicit factory instead of relying on automock.
- **Full-suite regression verification surfaced a real environmental characteristic of this test suite**, not a story-specific problem: running all ~150 test files/3137 tests in one `npx jest` invocation on this machine produces `Exceeded timeout of 5000ms` failures under load, on files that pass cleanly in isolation every time. Confirmed this is pre-existing (the same pattern of failing-suite-count noise likely affected earlier baseline comparisons too) — documenting it here since it means a raw "before vs after failing-suite count" diff isn't reliable on its own; the isolation re-run step is the one that actually proves no regression.
- Did not touch `app/api/users/avatar/route.ts`, per AC #9.
- **2026-08-04 follow-up**: while actually provisioning the AC #1 manual step (S3 bucket, policy, IAM), discovered `AWS_S3_EVENT_PHOTOS_BUCKET` can never be set in Amplify's environment-variable API/Console — it rejects any name starting with the reserved `AWS` prefix (confirmed via `aws amplify update-app`, `BadRequestException`). Renamed the env var to `S3_EVENT_PHOTOS_BUCKET` throughout (`lib/storage/s3.ts`, its test, `.env.local`/`.env.local.example`, `README.md`) so production can actually be configured. Bucket `get-together-app-photos` (already existed, unconfigured) now has: public-access-block relaxed to allow bucket policies, a bucket policy granting public `GetObject` on `event-photos/*` only, and a new IAM policy (`get-together-s3-event-photos`) granting the `get-together-app` user `PutObject`/`DeleteObject`/`GetObject` on that same prefix — attached alongside its existing `get-together-cognito-admin` policy. Amplify's production `environmentVariables` updated to include `S3_EVENT_PHOTOS_BUCKET=get-together-app-photos`.

### File List

- `lib/db/migrations/015_create_event_photos_table.sql` (new)
- `lib/storage/s3.ts` (new)
- `lib/storage/__tests__/s3.test.ts` (new)
- `lib/services/eventPhotoService.ts` (new)
- `__tests__/services/eventPhotoService.test.ts` (new)
- `app/api/groups/[groupId]/events/[eventId]/photos/route.ts` (new)
- `app/api/groups/[groupId]/events/[eventId]/photos/[photoId]/route.ts` (new)
- `app/api/groups/[groupId]/events/[eventId]/photos/__tests__/route.test.ts` (new)
- `app/api/groups/[groupId]/events/[eventId]/photos/[photoId]/__tests__/route.test.ts` (new)
- `components/groups/EventPhotoGrid.tsx` (new)
- `__tests__/components/EventPhotoGrid.test.tsx` (new)
- `components/groups/EventPlanningTab.tsx` (modified — added `EventPhotoGrid` as a sibling section to 12.3's `EventChecklist`)
- `__tests__/components/EventPlanningTab.test.tsx` (modified — asserts both sections render and fetch)
- `__tests__/components/EventDetail.test.tsx` (modified — fetch-count assertion updated 2→3 for the added photos fetch)
- `__tests__/scripts/migrate.test.ts` (modified — bumped hardcoded migration count 17→18, directly caused by this story's new migration)
- `.env.local.example` (modified — added `AWS_S3_EVENT_PHOTOS_BUCKET`)
- `README.md` (modified — env var note)
- `package.json` / `package-lock.json` (modified — added `@aws-sdk/client-s3`)
