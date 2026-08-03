# Story 12.2: Pre-Event Photo Uploads

Status: ready-for-dev

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

- [ ] Task 1: Database migration (AC: #2)
  - [ ] Add `lib/db/migrations/014_create_event_photos_table.sql`: `event_photos(id UUID PK, event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE, group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE, uploaded_by VARCHAR(128) NOT NULL, s3_key VARCHAR(512) NOT NULL, url TEXT NOT NULL, caption VARCHAR(255), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`, index on `event_id`, `ENABLE ROW LEVEL SECURITY`, no policies.
  - [ ] **Deliberately no `REFERENCES users(id)` on `uploaded_by`** — see Dev Notes for why (unlike the type-mismatch reason in Story 11.1, this is a different, new reason: no code path in this app currently guarantees a `users` row exists for every authenticated user).
  - [ ] Run `npm run db:migrate` against local dev DB; confirm it applies cleanly on top of the existing 14 migrations.
- [ ] Task 2: S3 client + upload/delete helpers (AC: #1, #3, #5)
  - [ ] Add `@aws-sdk/client-s3` as a new dependency (`npm install @aws-sdk/client-s3`) — pre-approved for this story, matches the "AWS S3" decision made when this story was scoped.
  - [ ] Add `lib/storage/s3.ts`: instantiate `new S3Client({ region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1' })` — no explicit credentials block, matching the existing pattern in `lib/logging/alarms.ts`/`lib/services/authService.ts` (default AWS credential provider chain). Export `uploadEventPhoto(buffer, key, contentType)` (→ `PutObjectCommand`) and `deleteEventPhoto(key)` (→ `DeleteObjectCommand`).
  - [ ] S3 key convention: `event-photos/{eventId}/{timestamp}-{sanitized-filename}` (mirrors the `avatars/{userId}/{timestamp}-{filename}` shape already sketched — but never implemented — in `app/api/users/avatar/route.ts:68`, for consistency if that stub is ever fixed later).
  - [ ] Public URL shape: `` `https://${bucket}.s3.${region}.amazonaws.com/${key}` `` — store this in `event_photos.url` at insert time.
- [ ] Task 3: Service layer (AC: #3, #4, #5)
  - [ ] Add `lib/services/eventPhotoService.ts` with `addEventPhoto`, `getEventPhotos`, `deleteEventPhoto` functions, following the exact shape of `addEventComment`/`getEventComments` in `lib/services/eventService.ts` (`{ success, message, data?, error?, errorCode? }`, event-exists check, group-membership check via the same inline `group_memberships` query pattern or `getUserGroupRole`).
  - [ ] `deleteEventPhoto` must check `uploaded_by === userId` before deleting — return `errorCode: 'FORBIDDEN'` otherwise (same shape as other ownership checks in this codebase).
- [ ] Task 4: API routes (AC: #1, #3, #4, #5)
  - [ ] Add `app/api/groups/[groupId]/events/[eventId]/photos/route.ts` with `GET`/`POST`, following `app/api/groups/[groupId]/events/[eventId]/comments/route.ts` line-for-line for: `params` resolution, Bearer-header + `getSubFromJWT` auth (**not** the avatar route's insecure "trust a `userId` form field" pattern), and the `errorCode` → HTTP status mapping (`VALIDATION_ERROR`→400, `FORBIDDEN`→403, `NOT_FOUND`→404, else→500; success→201 for POST).
  - [ ] Add `app/api/groups/[groupId]/events/[eventId]/photos/[photoId]/route.ts` with `DELETE`, same auth/error-mapping conventions.
  - [ ] `POST` reads the file via `request.formData()` (same native API the avatar route already uses — no `multer`/`formidable` needed), validates type/size **server-side** (do not trust the client), converts to a `Buffer` via `Buffer.from(await file.arrayBuffer())` before calling `uploadEventPhoto`.
- [ ] Task 5: Planning tab UI (AC: #6, #7)
  - [ ] In `components/groups/EventDetail.tsx`, add `isLazy` to the `<Tabs>` component (Story 12.1 flagged this as needed exactly when Planning tab content starts fetching data — that's now).
  - [ ] Rewrite `components/groups/EventPlanningTab.tsx`: accept `eventId`/`groupId` props (currently takes none), fetch photos on mount (safe now that `isLazy` means this only mounts when the tab is actually opened), render a responsive grid (Chakra `SimpleGrid` or `Wrap` + `Image`), a file `input[type=file]` + upload `Button`, per-photo delete `Button` (only rendered when `photo.uploaded_by === userId`, via `useAuth()`).
  - [ ] Update the `<EventPlanningTab />` usage in `EventDetail.tsx` to pass `eventId`/`groupId`.
  - [ ] Add `images.remotePatterns` to `next.config.ts`? **No** — deliberately using Chakra's plain `<Image>` (already a dependency, zero config), not `next/image`, so no `next.config.ts` change needed. Do not introduce `next/image` in this story.
- [ ] Task 6: Tests (AC: #3, #4, #5, #6, #7)
  - [ ] `__tests__/services/eventPhotoService.test.ts`: add/get/delete, ownership check, group-membership check, not-found handling.
  - [ ] `__tests__/api/groups/events/photos.test.ts` (or colocated `__tests__` per existing convention, e.g. `app/api/groups/[groupId]/wishlist/[itemId]/comments/__tests__/route.test.ts`'s pattern): auth required, validation errors (bad type/size), 201 on success, 403 on delete-by-non-uploader.
  - [ ] `__tests__/components/EventPlanningTab.test.tsx` (extend the file from Story 12.1): fetches on mount, renders grid, upload flow (mock `fetch`), delete button visibility gated by uploader, error toast on failed upload.
  - [ ] Update `lib/storage/s3.ts` tests to mock `@aws-sdk/client-s3`'s `S3Client`/`PutObjectCommand`/`DeleteObjectCommand` — do not hit real AWS in tests.
  - [ ] **Fix a test this story will legitimately break:** `__tests__/components/EventDetail.test.tsx`'s Story-12.1 test `'switching to Planning tab shows placeholder and does not trigger additional fetches'` asserted zero fetches on switching tabs, because 12.1's Planning tab had no content. That assumption is no longer true — update the assertion to expect exactly one additional `fetch` call (the photos `GET`), not zero. Don't just delete the test; fix its premise and keep the "no *extra* unexpected fetches" intent.
- [ ] Task 7: Docs (AC: #1, #8)
  - [ ] Add `AWS_S3_EVENT_PHOTOS_BUCKET=` (placeholder/empty) to `.env.local.example`.
  - [ ] Add a short README note under the existing "Configure environment variables" section (added in Story 11.1) pointing at the new var and what it's for.
- [ ] Task 8: Verify no regressions
  - [ ] Run the full test suite scoped away from `get-together-web/` (per established convention); confirm 0 new failures beyond already-known pre-existing ones.
  - [ ] Manual end-to-end verification against a real S3 bucket requires Task/AC #1 (bucket provisioning) to be done first by the user — flag this dependency explicitly rather than silently skipping it.

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

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created

### File List
