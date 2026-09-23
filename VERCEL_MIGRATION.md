# Vercel Migration Guide: Amplify Hosting → Vercel

This document covers the hosting migration from AWS Amplify Hosting to Vercel. Cognito, S3, and SNS remain on AWS as external services.

---

## Phase 1: AWS IAM Credential Setup

Create a dedicated IAM user with minimal permissions for S3 photo uploads, SNS SMS sending, and Cognito magic-link authentication.

### Step 1: Create IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam)
2. Click **Users** → **Create user**
3. Name: `get-together-vercel-prod` (or `get-together-vercel-preview` for a second account if desired)
4. Click **Next**
5. Click **Create user** (don't add to group yet)

### Step 2: Create Inline Policy

1. In the user detail page, click **Add permissions** → **Create inline policy**
2. Choose **JSON** editor and paste this policy (replace values in angle brackets with your actual IDs):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3PhotoStorage",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::<YOUR_S3_BUCKET_NAME>/*"
    },
    {
      "Sid": "SNSMagicLinkSMS",
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CognitoMagicLink",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminInitiateAuth"
      ],
      "Resource": "arn:aws:cognito-idp:<YOUR_AWS_REGION>:<YOUR_AWS_ACCOUNT_ID>:userpool/<YOUR_USER_POOL_ID>"
    }
  ]
}
```

**Where to find the values:**
- `<YOUR_S3_BUCKET_NAME>`: The bucket name you use for event photos
- `<YOUR_AWS_REGION>`: e.g., `us-east-1` (see `NEXT_PUBLIC_AWS_REGION` in your `.env.local`)
- `<YOUR_AWS_ACCOUNT_ID>`: Your AWS account ID (visible in the top-right menu → My Account)
- `<YOUR_USER_POOL_ID>`: Get from AWS Cognito console → User Pools → Your pool → Pool ID (looks like `us-east-1_abc123def`)

3. Click **Create policy**

### Step 3: Generate Access Key

1. In the user detail page, go to **Security credentials** tab
2. Click **Create access key**
3. Choose **Application running outside AWS**
4. Click **Next** → **Create access key**
5. **Copy and save both `Access Key ID` and `Secret Access Key`** to a password manager — you'll only see this once
6. Click **Done**

---

## Phase 3: Vercel Project Setup

### Step 3a: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New...** → **Project**
3. **Import Git Repository**: Connect your GitHub repo (authorize if prompted)
4. Select the `get-together` repo
5. Click **Import**
6. **Configure project**:
   - Framework Preset: Should auto-detect **Next.js** ✓
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Install Command: `npm install` (confirm it does NOT include `--legacy-peer-deps` — if peer-dep warnings exist during build, this can be overridden, but try without first)
   - Output Directory: `.next` (default)
7. Click **Deploy** — first deployment will be the default branch (main)

### Step 3b: Add Custom Domain (optional for initial testing)

1. In the project settings, go to **Domains**
2. Add your production domain (e.g., `get-together.example.com`)
3. **Do NOT update DNS yet** — you'll do this in Phase 5 after smoke testing
4. Vercel will show you the DNS records to add (CNAME or A record)

### Step 3c: Configure Environment Variables

1. In project settings, go to **Environment Variables**
2. Add variables for **both Production and Preview** environments:

| Variable | Value | Secret? | Notes |
|---|---|---|---|
| `DATABASE_HOST` | From Supabase | Yes | e.g., `db.xxx.supabase.co` |
| `DATABASE_PORT` | `5432` | No | |
| `DATABASE_NAME` | From Supabase | No | Usually `postgres` |
| `DATABASE_USER` | From Supabase | Yes | Usually `postgres` |
| `DATABASE_PASSWORD` | From Supabase | Yes | |
| `DATABASE_SSL` | `true` | No | |
| `S3_EVENT_PHOTOS_BUCKET` | Your bucket name | No | |
| `NEXT_PUBLIC_AWS_REGION` | `us-east-1` | No | Match your region |
| `AWS_REGION` | `us-east-1` | No | Match your region |
| `AWS_ACCESS_KEY_ID` | From Phase 1 | **Yes** | Paste the access key ID |
| `AWS_SECRET_ACCESS_KEY` | From Phase 1 | **Yes** | Paste the secret access key |
| `NEXT_PUBLIC_USER_POOL_ID` | From Cognito | No | e.g., `us-east-1_abc123def` |
| `NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID` | From Cognito | No | e.g., `1a2b3c4d5e6f7g8h9i0j1k2l3` |
| `GOOGLE_CLIENT_ID` | From Google Cloud | No | |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud | **Yes** | |
| `GOOGLE_REDIRECT_URI` | See Phase 5 note | No | **Update after cutover** |
| `ENCRYPTION_KEY` | From current prod | **Yes** | **Copy exactly** — do not regenerate |
| `CALENDAR_SYNC_SECRET` | Existing value | **Yes** | **Copy exactly** |
| `NEXT_PUBLIC_APP_URL` | See Phase 5 note | No | **Update after cutover** |
| `NEXT_PUBLIC_BASE_URL` | See Phase 5 note | No | **Update after cutover** (same value as above) |

**How to add env vars:**
- For **secrets**: Click **Add New** → enter name/value → select environments (Production + Preview) → click **Add**
- For **non-secrets**: Same process

**Getting Cognito and Supabase values:**
- **Supabase**: Supabase Dashboard → Project → Settings → Database
- **Cognito**: AWS Cognito Console → User Pools → Your pool → App Integration → App Clients → Copy pool/client IDs

**Note on `GOOGLE_REDIRECT_URI` and `NEXT_PUBLIC_APP_URL`:**
- For now, set these to a placeholder (e.g., `http://localhost:3000`)
- Update to your actual production domain URL in Phase 5, after DNS cutover

---

## Phase 4: Preview Verification

Once env vars are set, push any branch or commit to trigger a Preview deployment:

```bash
git push origin feature/amplify-to-vercel
# or
git push origin main
```

Wait for the deployment to complete, then visit the preview URL and test:
- [ ] Sign up (email/password)
- [ ] Log in, verify cookies
- [ ] SMS magic-link request (confirm SMS received)
- [ ] SMS magic-link login
- [ ] Upload + delete event photo
- [ ] Group/event invite links (check URLs are correct)
- [ ] POST /api/calendar/sync with correct `x-sync-secret` header

---

## Phase 5: Production Cutover

See `/Users/andrewramell/code/get-together/.claude/plans/fuzzy-chasing-frost.md` for the full sequenced cutover plan (DNS, Google OAuth, calendar sync scheduler repoint, decommission Amplify).

**Key steps:**
1. Add production domain to Vercel (DNS not flipped yet)
2. Update Google OAuth redirect URIs
3. Set Production env vars to final domain values
4. Deploy to Production, smoke-test on `*.vercel.app` alias
5. Flip DNS
6. Repoint calendar-sync scheduler
7. Decommission Amplify (after soak period)

---

## Rollback Plan

If production cutover fails, you have:
- Amplify Hosting still running on the old domain (keep for 24–48h)
- Git history to revert to before Amplify cleanup
- Cognito, S3, SNS unchanged (no rollback needed for auth/storage/SMS)

To roll back:
1. Repoint DNS back to Amplify's endpoint
2. Verify traffic and auth/photos/SMS work
3. Keep investigating the Vercel deployment issue offline
4. Retry cutover once issue is resolved

---

## Support / Troubleshooting

### Build fails on Vercel

Check build logs in Vercel Dashboard → Deployments → [failed build] → Build Log tab.

Common issues:
- Missing env var: add to Vercel Env Vars (check typo)
- AWS credentials wrong: verify Phase 1 policy and key ID
- TypeScript error: fix locally with `npm run build`, commit, redeploy

### Auth fails (Cognito)

- Verify `NEXT_PUBLIC_USER_POOL_ID` and `NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID` are correct
- Verify Cognito user pool exists and is in the same region as `AWS_REGION`
- Check IAM policy includes Cognito admin permissions for the specific pool

### SMS doesn't send (SNS)

- Verify `AWS_REGION` matches the region you're sending SMS to
- Verify IAM policy includes `sns:Publish`
- Check `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` are copied correctly (no extra spaces)

### Photos don't upload (S3)

- Verify `S3_EVENT_PHOTOS_BUCKET` matches the actual bucket name
- Verify bucket policy allows public GetObject (for serving photos)
- Verify IAM policy includes S3 PutObject/DeleteObject on the specific bucket
- Check AWS credentials in Vercel env vars

### Calendar sync stops

- After DNS cutover, update the EventBridge rule / Lambda / scheduler URL to point at new Vercel domain
- Verify `CALENDAR_SYNC_SECRET` matches on both Vercel and the scheduler

---

## Files Changed in This Migration

**Deleted:**
- `amplify.yml` — Amplify build config
- `amplify/` — Amplify CLI scaffold
- `amplify_outputs.json` — Amplify outputs config
- `lib/logging/cloudwatch.ts`, `alarms.ts`, `cloudwatch-dashboard.ts` — dead code
- Package deps: `aws-amplify`, `@aws-amplify/ui-react`, `@aws-sdk/client-cloudwatch`, `@aws-sdk/client-cloudwatch-logs`

**Modified:**
- `app/amplify-provider.tsx` — removed Amplify.configure(), kept ChakraProvider/AuthProvider wrapper
- `.env.local.example` — added AWS credential placeholders
- `package.json` — removed unused deps

**Unchanged:**
- Cognito auth (authService.ts, magicLinkService.ts, jwt.ts, middleware.ts, login/magic routes)
- S3 storage (lib/storage/s3.ts, eventPhotoService.ts)
- SNS SMS (lib/services/smsService.ts)
- Database (Supabase Postgres via pg Pool)
- Google Calendar OAuth, encryption, etc.

---

**Next:** Proceed with Phase 3a (create Vercel project) and Phase 1 (create IAM user).
