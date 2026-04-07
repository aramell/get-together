-- Migration: Add audit columns to users table for GDPR compliance (Story 8.2 Tasks 3 & 9)
-- Adds update_timestamp for tracking profile changes (audit trail)
-- Adds consent_accepted for tracking consent to Terms/Privacy
-- Adds deletion_requested_at for tracking deletion requests
-- Adds last_activity_at and last_activity_ip for audit trail (AC9)

BEGIN;

-- AC4: Right to Rectification - track profile update timestamps
ALTER TABLE users ADD COLUMN IF NOT EXISTS update_timestamp TIMESTAMPTZ DEFAULT NOW();

-- AC7: Consent Management - track when user consented
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_accepted TIMESTAMPTZ;

-- AC2: Right to Erasure - track deletion requests for 90-day hard-delete
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- AC9: Audit Logging - track user activity for forensics
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_ip INET;

-- Indexes for performance and GDPR compliance
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_update_timestamp ON users(update_timestamp);
CREATE INDEX IF NOT EXISTS idx_users_last_activity_at ON users(last_activity_at);

COMMIT;
