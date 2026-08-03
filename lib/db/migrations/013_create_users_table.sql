-- Corrects an omission from this migration set: app code throughout
-- (lib/services/userService.ts, app/api/users/profile/route.ts,
-- app/api/user/delete/route.ts, app/api/user/export/route.ts,
-- lib/db/queries.ts, lib/db/queries/invitations.ts) has always depended on
-- a `users` table keyed by Cognito's `sub` claim, but no migration in this
-- directory ever created one. Schema below is reconstructed from actual
-- column usage in current app code, plus the GDPR audit columns documented
-- in Story 8.2 (_bmad-output/implementation-artifacts/8-2-gdpr-compliance.md)
-- that aren't yet read/written by any route but were part of that story's
-- intent.

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY, -- Cognito sub claim
  email VARCHAR(255), -- nullable: app/api/user/delete/route.ts clears this to NULL on soft delete
  display_name VARCHAR(255),
  avatar_url TEXT,
  deleted_at TIMESTAMPTZ,
  update_timestamp TIMESTAMPTZ DEFAULT NOW(), -- audit trail, read/written by app/api/users/profile/route.ts
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  consent_accepted TIMESTAMPTZ, -- not yet read/written by any route; reserved per Story 8.2
  deletion_requested_at TIMESTAMPTZ, -- not yet read/written by any route; reserved per Story 8.2
  last_activity_ip INET, -- not yet read/written by any route; reserved per Story 8.2
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_update_timestamp ON users(update_timestamp);
CREATE INDEX IF NOT EXISTS idx_users_last_activity_at ON users(last_activity_at);

-- Defense in depth, same rationale as 012_enable_rls_default_deny.sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
