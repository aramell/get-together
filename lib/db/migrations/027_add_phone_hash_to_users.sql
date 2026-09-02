-- Story 9.2: Auto-Account Creation & Immediate Access via Magic Link
--
-- phone_hash identifies phone-auth users the same way email identifies
-- password-auth users, using the same deterministic HMAC-SHA256
-- (lib/services/smsService.ts's hashPhoneNumber, Story 9.1) so it supports
-- the equality lookup findOrCreateUserByPhoneHash needs -- same reasoning as
-- sms_magic_link_tokens.phone_hash (026_create_sms_magic_link_tokens_table.sql).

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(255) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON users(phone_hash);
