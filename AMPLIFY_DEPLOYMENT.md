# Amplify Deployment Guide

This guide walks you through deploying your Amplify Gen 2 backend and connecting the frontend.

## Prerequisites

✅ AWS account with CLI configured
✅ Node.js 18+ installed
✅ Backend code in `get-together/` directory
✅ Frontend Next.js project in root

## Step 1: Deploy the Amplify Backend

```bash
cd get-together

# Install backend dependencies
npm install

# Deploy to AWS
npx amplify deploy
```

### What happens:
1. Creates Cognito user pool for authentication
2. Creates AppSync GraphQL API
3. Creates DynamoDB tables for your schema
4. Generates `amplify_outputs.json` in the backend directory

### Example output:
```
✔ Deployment successful!
GraphQL endpoint: https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
```

## Step 2: Copy Backend Outputs to Frontend

After deployment, copy `amplify_outputs.json` to the frontend:

```bash
cp get-together/amplify_outputs.json amplify_outputs.json
```

The frontend's `app/layout.tsx` will automatically detect and use this configuration.

## Step 3: Update Environment Variables

```bash
# Copy the example env file
cp .env.local.example .env.local

# Edit .env.local with values from amplify_outputs.json
# Key values to update:
# - NEXT_PUBLIC_AWS_REGION
# - NEXT_PUBLIC_USER_POOL_ID
# - NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID
# - NEXT_PUBLIC_APPSYNC_GRAPHQL_ENDPOINT
```

## Step 4: Install Frontend Dependencies

```bash
# Back in root directory
npm install
```

## Step 5: Run Frontend

```bash
npm run dev
```

Visit `http://localhost:3000` and you should see the Amplify login screen.

## Testing the Setup

1. **Sign up**: Create a new account with your email
2. **Confirm email**: Check your email for verification code
3. **Sign in**: Log in with your credentials
4. **Access dashboard**: You should now see the authenticated app

## Common Issues

### Issue: "amplify_outputs.json not found"
**Solution**: Run `amplify deploy` in the `get-together/` directory first

### Issue: "User pool not configured"
**Solution**: Make sure `.env.local` has the correct Cognito values from `amplify_outputs.json`

### Issue: "GraphQL endpoint not responding"
**Solution**: Verify AppSync API is deployed by checking AWS AppSync console

## Architecture Overview

```
get-together-web/
├── get-together/              # Amplify backend (CDK/TypeScript)
│   └── amplify/
│       ├── auth/
│       │   └── resource.ts    # Cognito configuration
│       ├── data/
│       │   └── resource.ts    # GraphQL schema
│       └── backend.ts         # Backend definition
│
├── app/                       # Next.js frontend
│   ├── layout.tsx            # Amplify Authenticator wrapper
│   └── page.tsx              # Home page (protected)
│
├── amplify_outputs.json       # Generated after deploy (in .gitignore)
└── .env.local                 # Local environment variables
```

## Next Steps

1. ✅ Deploy backend: `amplify deploy`
2. ✅ Copy outputs: `cp get-together/amplify_outputs.json amplify_outputs.json`
3. ✅ Configure env: Update `.env.local`
4. ✅ Run frontend: `npm run dev`
5. 🚀 Build components using generated GraphQL queries/mutations

## Useful Commands

```bash
# Check deployment status
amplify status

# Watch for changes and auto-deploy
amplify watch

# Local development with sandbox
amplify sandbox

# Tear down all resources
amplify delete
```

## Architecture Decisions Implemented

✅ **Decision 2c**: Email/password authentication via Cognito
✅ **Pattern 1**: TypeScript types auto-generated from GraphQL schema
✅ **Pattern 9**: Real-time subscriptions enabled in schema
✅ **Decision 1c**: Version field on all models for optimistic locking
✅ **Decision 4a**: AppSync/Amplify as single source of truth

---

**Last updated**: 2026-02-27
