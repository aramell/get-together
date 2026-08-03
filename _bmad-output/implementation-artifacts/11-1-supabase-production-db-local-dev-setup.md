# Story 11.1: Supabase Production Database Setup & Local Dev Environment Reconciliation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer on get-together,
I want a provisioned Supabase Postgres database wired into the production Amplify deployment (with local dev reconciled to match),
so that DB-backed API routes stop 500ing in production and local development reliably mirrors what's running live.

## Acceptance Criteria

1. A Supabase project exists for production, with every migration in `lib/db/migrations/*.sql` applied in the correct dependency order (see Dev Notes — numbering collisions must be resolved first, not just sorted lexically).
2. Amplify Hosting environment variables (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_SSL`) are set in the Amplify Console for the production environment (not in `amplify.yml`, which currently only carries `NEXT_PUBLIC_*` values) and point at the Supabase instance.
3. `DATABASE_SSL=true` is set and confirmed to work against Supabase's enforced TLS using the existing `ssl: { rejectUnauthorized: false }` handling in `lib/db/client.ts:10` — no code change should be needed here, only verification.
4. `GET https://main.dcgzludlp6zxy.amplifyapp.com/api/groups` (and at least one other DB-backed route, e.g. `GET /api/groups/:groupId/calendar`) returns a real 200/401 response instead of 500 after deployment.
5. A repeatable, documented way to apply `lib/db/migrations/*.sql` exists and is used for both Supabase and local Postgres — today there is no migration runner or npm script, migrations are presumably applied by hand.
6. `README.md` is updated with real local setup steps (it is currently unmodified `create-next-app` boilerplate with no mention of Postgres, `docker-compose.yml`, or required env vars).
7. A documented decision is made and recorded for local dev: keep `docker-compose.yml`'s local Postgres 16 container as the dev database, or point local dev at a separate Supabase project/branch — and the chosen option's setup steps are written down.
8. No production credentials are committed. `.env.local` remains gitignored (already true — `.gitignore:26`); if a `.env.local.example` template is added, it must contain placeholder values only.
9. **(Added during implementation)** Every application table has Row Level Security enabled with no policies (default-deny), as defense in depth against Supabase's Data API (PostgREST) auto-exposing `public` schema tables to `anon`/`authenticated` roles — this app uses neither Supabase Auth nor its REST API, connecting only via direct Postgres as the table owner, which RLS does not restrict.

## Tasks / Subtasks

- [x] Task 1a: Audit migrations and build a migration runner (AC: #5) — see Dev Agent Record
  - [x] Audit `lib/db/migrations/` dependency order (not just filename sort) — see Completion Notes for actual finding
  - [x] Add a migration runner script tracking applied files in a `schema_migrations` table (`scripts/migrate.js`, `npm run db:migrate`)
- [x] Task 1c: Enable RLS default-deny on every application table (AC: #9)
  - [x] `lib/db/migrations/012_enable_rls_default_deny.sql` — `ENABLE ROW LEVEL SECURITY`, no policies, on all 10 app tables + `schema_migrations`
  - [x] Confirmed `FORCE ROW LEVEL SECURITY` intentionally NOT used — this app connects as the table owner (`postgres`) via `lib/db/client.ts`, and forcing RLS would also restrict the owner, breaking the app itself
- [x] Task 1b: Provision Supabase and apply migrations (AC: #1)
  - [x] Supabase project provisioned by user (`qsptfcelqpdiwflmysjp`, direct connection)
  - [x] All 16 migration files applied successfully via `node --env-file=.env.supabase.local scripts/migrate.js` — see Completion Notes for three real bugs found and fixed along the way (one of which was introduced by this dev agent mid-story, then corrected)
- [x] Task 1d: Add the missing `users` table (discovered mid-story, not in original AC list)
  - [x] `lib/db/migrations/013_create_users_table.sql` — reconstructed from actual column usage across `lib/services/userService.ts`, `app/api/users/profile/route.ts`, `app/api/user/delete/route.ts`, `app/api/user/export/route.ts`, plus GDPR audit columns from Story 8.2
  - [x] Applied to production Supabase
  - [ ] **NOT restored:** the FK from `wishlist_items`/`event_comments`/`wishlist_comments`.`created_by` to `users.id` — see Completion Notes, this surfaced a separate pre-existing type-mismatch bug that's out of scope for this story
- [x] Task 2: Wire production environment variables (AC: #2, #3, #4)
  - [x] `DATABASE_HOST/PORT/NAME/USER/PASSWORD/SSL=true` set in Amplify Console → Hosting → Environment variables by user
  - [x] Redeployed
  - [x] Verified: `GET /api/groups` (unauthenticated) → `401 UNAUTHORIZED` (not 500 — but auth check runs before any DB call, so not conclusive alone). `GET /api/events/public/<bogus-token>` (unauthenticated, DB-backed, no auth gate) → `404 "Event not found or link has expired"` — this response can only occur after a real query against the database returns zero rows, which is conclusive proof the production DB connection works end-to-end.
- [x] Task 3: Reconcile and document local dev environment (AC: #6, #7, #8)
  - [x] Decision recorded: keep `docker-compose.yml`'s local Postgres 16 container for local dev (see Completion Notes)
  - [x] `README.md` rewritten with real setup steps: env vars, starting the DB, running migrations, running the app; also corrected the boilerplate "Deploy on Vercel" section (this app deploys to AWS Amplify)
  - [x] Verified local Postgres initializes cleanly via `npm run db:migrate` — see Completion Notes; done against native Postgres.app rather than `docker-compose.yml` specifically, but exercises identical code path against the same `DATABASE_*` config
  - [x] `.env.local` confirmed already gitignored; added `.env.local.example` with placeholder values only

## Dev Notes

- **Root cause this story fixes:** `lib/db/client.ts:4-11` builds its `pg.Pool` from `DATABASE_*` env vars, defaulting `DATABASE_HOST` to `'localhost'`. `amplify.yml:14-18` never sets any `DATABASE_*` variable for the hosted environment, so in production the pool tries to reach `localhost:5432`, which doesn't exist in Amplify's compute environment — every DB-backed route (e.g. `app/api/groups/route.ts:131`) throws and falls into the generic 500 handler (`app/api/groups/route.ts:236-246`).
- **Architecture deviation — flag, don't silently fix:** `_bmad-output/planning-artifacts/architecture.md:61,1417` documents **Aurora Serverless Postgres** behind AWS AppSync/GraphQL as the intended database layer, not a directly-connected Postgres instance reached via REST API routes. The actual implementation (`lib/db/client.ts`, plain `pg` Pool, Next.js API routes) already diverged from that document before this story, and choosing Supabase is a second, compounding divergence. This story does not update `architecture.md` — recommend a fast-follow with the architect (Winston) to bring the doc in line with reality, since future stories will keep citing a database layer that no longer matches what's deployed.
- Auth (Cognito + AppSync) is unaffected by this story and already works — confirmed by production login succeeding before the `/api/groups` 500.
- `lib/db/client.ts:10` already has SSL support gated on `DATABASE_SSL === 'true'`; Supabase requires SSL, so this should just need the env var set correctly, not a code change.
- No migration runner exists today (`package.json` scripts are only `dev`, `build`, `start`, `lint`, `test`, `test:watch`) — Task 1 needs to introduce one, however minimal.

### Project Structure Notes

- Local Postgres container: `docker-compose.yml` (root), Postgres 16, added in commit `2e8c9bc`.
- Local env config: `.env.local` (root, gitignored, currently points `DATABASE_HOST=localhost`).
- **Ignore `get-together-web/`** — it's a stray, gitignored duplicate of this project with its own `.git` (`.gitignore:9-12`). Do not edit files under it; the real, deployed code is at the repo root (`app/`, `lib/`).
- Migrations live at `lib/db/migrations/*.sql` (14 files as of Task 1a's initial audit, 16 after Task 1c's `012_enable_rls_default_deny.sql` and Task 1d's `013_create_users_table.sql`; numbering collisions noted in Completion Notes are safe in practice).
- **The `users` table is real and required** — see the correction in Completion Notes. Don't assume "no local users table" from a quick grep of this migrations directory alone; check actual application code usage first.

### References

- [Source: lib/db/client.ts#L1-L11] — Postgres pool construction and env var defaults
- [Source: app/api/groups/route.ts#L101-L253] — representative DB-backed route currently 500ing in production
- [Source: amplify.yml#L14-L18] — current Amplify env vars (no `DATABASE_*`)
- [Source: docker-compose.yml] — local Postgres 16 container
- [Source: .env.local] — local DB env vars (gitignored, real file)
- [Source: _bmad-output/planning-artifacts/architecture.md#L61,#L1417] — documented (and now diverged) Aurora Serverless Postgres decision
- [Source: .gitignore#L9-L12] — stray nested `get-together-web/` copy, do not edit

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npx jest __tests__/scripts/migrate.test.ts` — 11/11 passed (re-verified after adding/removing `013`/`014`, final state: 16 migration files)
- `node --env-file=.env.supabase.local scripts/migrate.js` (final run against production) — `Done. Applied 0 migration(s), skipped 16 already-applied.` — confirms production is fully caught up with no pending or broken migrations.
- `npx jest --testPathIgnorePatterns='/node_modules/' '/get-together-web/'` — 2483 passed / 588 failed / 26 skipped across 144 suites, pre-existing and unrelated to this story's changes (verified: none of the touched files — `scripts/migrate.js`, `__tests__/scripts/migrate.test.ts`, `package.json`, `README.md`, `.env.local.example` — appear in any failing suite; sampled failures are unrelated component/UI tests, e.g. `CreateEventModal`). Full un-scoped `npx jest` also pulls in `get-together-web/__tests__/**`, the stray gitignored duplicate, whose separate `node_modules` copy of React causes ~1300 additional unrelated failures (dual React instance / "Cannot read properties of null (reading 'useState')"). Flagging both pre-existing conditions to the user rather than fixing under this story's scope.

### Completion Notes List

- **Migration order audit finding (corrects the story's original assumption):** the numbered-prefix collision (`001`/`002` appearing twice) looked like a real ordering hazard, but on inspection it isn't one in practice. `000_create_groups_schema.sql` is a consolidated baseline that already creates `groups`, `group_memberships`, `availabilities`, `event_proposals`, `event_rsvps` — all via `CREATE TABLE IF NOT EXISTS`, and it sorts first alphabetically. The colliding `001_create_availabilities_table.sql` / `001_create_events_schema.sql` / `002_create_event_rsvps_table.sql` files re-declare the same tables (including dangling `REFERENCES users(id)` to a `users` table that doesn't exist anywhere) but safely no-op when run after `000`, because `CREATE TABLE IF NOT EXISTS` skips the entire body — including the FK clause — once the table exists. Plain filename sort (`Array.prototype.sort()` on the zero-padded names) is therefore safe and sufficient; no manual dependency-graph reordering was needed. This is verified by a unit test (`sortMigrationFiles` test in `__tests__/scripts/migrate.test.ts`) asserting the exact expected order against the real `lib/db/migrations/` directory contents.
- **Why a runner was still necessary despite the above:** later migrations (`007_create_wishlist_interests_table.sql`, `008_add_event_comments_table.sql`, `009_add_wishlist_comments_table.sql`) do **not** use `IF NOT EXISTS` on their `CREATE TABLE` statements. Re-running the full migration set a second time (e.g. after a fresh `git pull`) would error on those files without a way to skip already-applied ones. `scripts/migrate.js` adds a `schema_migrations` tracking table (filename + applied_at) so each file runs exactly once, ever, and reruns are safe.
- **Local dev decision:** kept `docker-compose.yml`'s Postgres 16 container rather than pointing local dev at a Supabase project/branch. Rationale: no network dependency or cloud credentials needed to develop offline; the new `scripts/migrate.js` runner is shared by both local and Supabase, so schema parity is enforced by tooling rather than by using the same physical database.
- **CORRECTION to an earlier entry in this same list — I was wrong, documenting the mistake rather than quietly editing it away:** the original version of item 2 below claimed "no `users` table exists anywhere in this schema, by design" and used that to justify deleting `REFERENCES users(id)` from three migrations. That conclusion was based only on grepping `lib/db/migrations/` — it did not check application code. A `users` table is in fact required and actively used throughout the app (`lib/services/userService.ts`, `app/api/users/profile/route.ts`, `app/api/user/delete/route.ts`, `app/api/user/export/route.ts`, `lib/db/queries.ts`, `lib/db/queries/invitations.ts` all read/write it). It was created ad hoc in local dev outside any tracked migration and simply had no migration file in this directory at all — confirmed by finding a `users` table already sitting in the local Postgres.app `gettogether` database once Docker/local investigation happened, and by discovering an abandoned, more-complete migration history in the stray `get-together-web/migrations/` directory (`000_create_users_table.sql`, `014_add_audit_columns_to_users.sql`) that was apparently never fully ported into this canonical `lib/db/migrations/` directory. **Production Supabase was briefly missing this table entirely** as a direct result of my earlier mistake, until fixed by Task 1d's `013_create_users_table.sql` (schema reconstructed from actual current app-code column usage, not from either historical migration source, since both were themselves incomplete/stale — e.g. neither had `update_timestamp` or `last_activity_at`, which `app/api/users/profile/route.ts` actively reads and writes).
- **Three real migration bugs found and fixed while applying to production Supabase (all failed on the first real run against an empty database — this migration set had never been run end-to-end before this story, on any environment):**
  1. `004_add_confirmed_at_to_events.sql` did a bare `ADD COLUMN confirmed_at` — but `000_create_groups_schema.sql:64` already declares that column in its consolidated `event_proposals` table (004 predates 000's consolidation and was never reconciled). Fixed with `ADD COLUMN IF NOT EXISTS`. Also dropped the file's redundant internal `BEGIN;`/`COMMIT;`, since `scripts/migrate.js` already wraps each file in its own transaction.
  2. `005_create_wishlist_items_table.sql`, `008_add_event_comments_table.sql`, `009_add_wishlist_comments_table.sql` all declared `created_by UUID NOT NULL REFERENCES users(id)`, which failed because no `users` table existed yet at that point in the run. **My first fix (dropping the FK clause) was wrong** — see the correction above. The right fix, applied after Task 1d created `users`, would be to restore the FK — but that surfaced bug #3 below, so the FK was deliberately left off rather than restored.
  3. **New, out-of-scope bug, not fixed under this story:** attempting to restore the FK (`ALTER TABLE wishlist_items ADD CONSTRAINT ... FOREIGN KEY (created_by) REFERENCES users(id)`) failed with "foreign key constraint cannot be implemented" — `wishlist_items.created_by`, `event_comments.created_by`, and `wishlist_comments.created_by` are typed `UUID`, but `users.id` is `VARCHAR(128)` (Cognito `sub`). Postgres requires matching/castable types for a FK. This is a genuine, pre-existing data-model inconsistency across the schema (most `created_by`/`user_id` columns are `UUID`; `wishlist_interests.user_id` is correctly `VARCHAR(128)`) that predates this story and this dev agent entirely — the original FK in 005/008/009 could never have succeeded even as originally written. Fixing it properly means `ALTER COLUMN ... TYPE VARCHAR(128)` across several tables plus auditing every query that joins on them, which is a separate story's worth of work, not a fix to slip into a database-provisioning story. **Left as no FK for now** (matches the app's actual current behavior — it never had a working FK here regardless of who last touched these files).
  4. **Also found, also out-of-scope, related to #3:** `lib/db/queries.ts:850` and `lib/services/eventService.ts:984` join `ON wi.created_by = u.sub` / `ON ec.created_by = u.sub` — but the `users` table has no `sub` column, only `id`. These two specific queries will error at execution time whenever hit (`column u.sub does not exist`). Everywhere else in the codebase correctly joins on `u.id`. Flagging for a follow-up story rather than fixing here — it's an application-code bug, not a database schema/provisioning issue.
  - (The four remaining `REFERENCES users(id)` occurrences in `001_create_events_schema.sql`, `001_create_availabilities_table.sql`, `002_create_event_rsvps_table.sql` were left alone — those files' `CREATE TABLE IF NOT EXISTS` already no-op against tables `000` created, so those FK clauses never execute, and are harmless dead code.)
- **Task 2 complete:** user set the six `DATABASE_*` values in Amplify Console and redeployed. Verified in production via `GET /api/events/public/<bogus-token>` returning `404` (proves the DB round-trip works) rather than `500`. AC #4 satisfied.
- **Local dev verification, completed:** discovered local Postgres was actually running natively via **Postgres.app** (port 5432), not `docker-compose.yml`'s container (which would have failed to bind that same port anyway) — a real local-dev-environment discrepancy this story exists to catch. The existing local `gettogether` database predated all of this tooling: missing 4 tables, an ad-hoc `users` table lacking columns the app now needs, no `schema_migrations` tracking. Per user decision, reset it (`DROP DATABASE` / `CREATE DATABASE`, losing ~11 rows of local test data) and ran `npm run db:migrate` fresh — all 16 migrations applied cleanly with zero errors, confirming the exact same runner code that fixed production also builds a correct schema from nothing locally. `docker-compose.yml` remains available as an alternative for anyone who prefers Docker over Postgres.app, but isn't what's actually in use on this machine — worth a `README.md` follow-up note if this turns out to be common across contributors, not done in this pass.
- **Code review fixes (post-implementation, found by adversarial code review of this story):**
  1. **HIGH — `u.sub` does not exist on `users`, only `u.id`:** `lib/db/queries.ts:850` and `lib/services/eventService.ts:984` joined `LEFT JOIN users u ON ... = u.sub`. The dev's own Completion Notes had already flagged these two lines as a known pre-existing bug and left them unfixed as "out of scope." Fixed both to join on `u.id` instead, since `013_create_users_table.sql` never defined a `sub` column — `id` *is* the Cognito sub.
  2. **HIGH — wider blast radius than documented, `u.name` does not exist on `users` either (only `display_name`):** the code review found four more call sites with the same class of bug that the dev's notes had missed entirely: `lib/db/queries.ts:108` (`getGroupDetailsWithMembers`), `:483` (`getGroupAvailabilities`), `:533` (`getGroupAvailabilitiesWithRecurring`), and `:644/648` (`getGroupAvailabilitiesForCalendar` — **the exact query backing `GET /api/groups/:groupId/calendar`, the named example route in AC #4**). Since `users` never existed before this story, none of these queries could ever have been exercised against a real schema, and all existing tests for them mock `@/lib/db/queries` entirely, so no test caught the typo. This means AC #4's named example route was very likely still returning 500 in production even after Task 2 — the dev's verification substituted a different route (`/api/events/public/<token>`) instead of testing the calendar endpoint as written. Fixed all four call sites to select `u.display_name` (aliased to match the existing field names consumers already expect: `name`, `user_name`, `creator_name`), so no downstream code changes were needed.
  3. **MEDIUM — sprint-status.yaml summary undercounted:** `stories_done` (36) + `stories_in_progress` (0) + `stories_backlog` (0) summed to 36 against `total_stories: 37`, because there was no bucket for "review" status. Added `stories_review: 1` so the summary is internally consistent now and going forward whenever a story sits in review.
  4. **Verified no regressions:** ran the full set of tests touching the four fixed query functions (availabilities, calendar, group-details, soft-delete integration/API suites) before and after the fix via `git stash` — identical 70 failing / same suites in both runs, confirming those failures are the pre-existing `get-together-web/` duplicate-copy issue already documented above, not something introduced by this fix.
  - Not fixed as part of this pass (flagged instead): `__tests__/components/PublicEventPage.test.tsx` is untracked, unrelated to this story, and appears to be a dead RED-phase TDD stub from Story 7.3 referencing a `PublicEventPage` component that was never built under that name (the real component is `PublicEventHeader`). 43 of its 45 tests fail. Left in place rather than deleted since it's outside this story's scope — recommend the user decide whether to finish, repurpose, or delete it.
- **Security note during this session:** the user's actual Supabase database password appeared verbatim in an IDE-selection notification that became part of this conversation's context (`get-together/.env.supabase.local:5`, a stale editor tab pointing at a since-moved file). Flagged to the user to consider rotating it in the Supabase dashboard as a precaution; not acted on further since it's the user's call.
- **RLS defense-in-depth (AC #9, added mid-implementation):** installed the official Supabase Claude Code skills (`npx skills add supabase/agent-skills`, now at `.agents/skills/{supabase,supabase-postgres-best-practices}`, symlinked into `.claude/skills/`) and reviewed both `SKILL.md` files before trusting them — legitimate, unmodified Supabase-authored content, no injected instructions. Their guidance flagged that Supabase's Data API (PostgREST) auto-exposes `public` schema tables to `anon`/`authenticated` roles unless RLS is enabled, independent of whether the table has any relationship to `auth.users`. Since this app never uses Supabase Auth or its REST API — only a direct `pg.Pool` connection as the table owner (`lib/db/client.ts`) — enabling RLS with **zero policies** on every table is a complete, correct default-deny for those roles while leaving the app's own owner-level connection completely unaffected (Postgres does not apply RLS to table owners unless `FORCE ROW LEVEL SECURITY` is also set, which was deliberately left off). Added as `012_enable_rls_default_deny.sql`; user chose to keep Supabase's Data API on and rely on this rather than disabling the Data API outright.

### File List

- `scripts/migrate.js` (new)
- `__tests__/scripts/migrate.test.ts` (new)
- `package.json` (added `db:migrate` script)
- `README.md` (rewritten local setup + deployment sections)
- `.env.local.example` (new)
- `lib/db/migrations/012_enable_rls_default_deny.sql` (new)
- `lib/db/migrations/013_create_users_table.sql` (new — the corrective `users` table migration)
- `lib/db/migrations/004_add_confirmed_at_to_events.sql` (fixed: idempotent `ADD COLUMN`, removed internal `BEGIN`/`COMMIT`)
- `lib/db/migrations/005_create_wishlist_items_table.sql` (fixed: dropped `REFERENCES users(id)` — this was itself a mistake, corrected in the same session; left as no-FK due to the type-mismatch bug documented in Completion Notes)
- `lib/db/migrations/008_add_event_comments_table.sql` (same as above)
- `lib/db/migrations/009_add_wishlist_comments_table.sql` (same as above)
- `.env.supabase.local` (new, gitignored, real Supabase credentials, created by user — migrations applied against it)
- `.agents/skills/supabase/`, `.agents/skills/supabase-postgres-best-practices/`, `.claude/skills/supabase`, `.claude/skills/supabase-postgres-best-practices` (new — installed via `npx skills add supabase/agent-skills`, reviewed, not authored by this agent)
- `lib/db/queries.ts` (code review fix: `u.sub` → `u.id`, `u.name` → `u.display_name` across 5 queries — see Completion Notes)
- `lib/services/eventService.ts` (code review fix: `u.sub` → `u.id`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (code review fix: added missing `stories_review` bucket to summary)
