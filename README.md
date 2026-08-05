This is a [Next.js](https://nextjs.org) app. Auth (Cognito + AppSync) is managed via AWS Amplify Gen 2; everything else (groups, calendar, wishlist, events, comments) is served by Next.js API routes under `app/api/**` talking directly to a Postgres database via `lib/db/client.ts`.

## Getting Started

### 1. Start the local database

Local dev uses a Postgres 16 container (`docker-compose.yml`), not a hosted Supabase project — this avoids needing network access or cloud credentials just to run the app locally. Production uses Supabase; schema stays in sync between the two because both are migrated with the same script (step 3).

```bash
docker compose up -d
```

### 2. Configure environment variables

Copy `.env.local` (already gitignored, never commit it) and make sure it has:

```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=gettogether
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_SSL=false
```

These match `docker-compose.yml`'s `POSTGRES_*` values. You'll also need the AWS Cognito/AppSync values from `amplify_outputs.json` for auth to work locally — see `AMPLIFY_DEPLOYMENT.md`.

If you're working on event Planning-tab photo uploads (Story 12.2), you'll also need `S3_EVENT_PHOTOS_BUCKET` pointed at an S3 bucket with public `GetObject` and `PutObject`/`DeleteObject` for the app's AWS identity — not required for anything else. (Not `AWS_S3_...`: Amplify's environment-variable API rejects any name starting with the reserved `AWS` prefix.)

### 3. Apply database migrations

```bash
npm run db:migrate
```

This runs every file in `lib/db/migrations/*.sql` that hasn't been applied yet (tracked in a `schema_migrations` table), in filename order. Safe to re-run — already-applied migrations are skipped. Run this same command against Supabase (with `DATABASE_*` env vars pointed at it) to keep production schema in sync.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Note on `get-together-web/`

If you see a `get-together-web/` directory in this repo, it's a stray nested duplicate of this project with its own `.git` — it's gitignored and not deployed. Do all work at the repo root (`app/`, `lib/`, etc.).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

This app deploys to **AWS Amplify Hosting** (see `amplify.yml`, `AMPLIFY_DEPLOYMENT.md`) — not Vercel. Production `DATABASE_*` env vars are set in the Amplify Console under Hosting → Environment variables, not in `amplify.yml`.
