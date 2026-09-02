-- Story 9.1: Request SMS Magic Link
--
-- One-time tokens for SMS-based magic link auth. Both the phone number and the
-- raw token are hashed before storage (AC4), both with keyed HMAC-SHA256 (via
-- ENCRYPTION_KEY as the HMAC key) rather than bcrypt: phone_hash must support
-- exact-match lookups (the idx_sms_tokens_phone_hash index below, used for rate
-- limiting and -- in Story 9.2 -- matching a clicked link back to its phone
-- number), which bcrypt's random-salt-per-call output can't do.
-- target_type/target_id carry invite context (e.g. join this group) through
-- to link-click time; NULL means a plain login link.

CREATE TABLE IF NOT EXISTS sms_magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  target_type VARCHAR(20) CHECK (target_type IN ('group', 'event')),
  target_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_tokens_token_hash ON sms_magic_link_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_sms_tokens_phone_hash ON sms_magic_link_tokens(phone_hash);

ALTER TABLE sms_magic_link_tokens ENABLE ROW LEVEL SECURITY;
