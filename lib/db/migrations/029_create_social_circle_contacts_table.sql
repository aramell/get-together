-- Story 10.2: Add & Remove Contacts from a Social Circle
--
-- Membership rows for social_circles (Story 10.1). A contact is either a raw
-- phone number (hashed for dedup/privacy, per lib/services/smsService.ts's
-- existing hashPhoneNumber convention) or a reference to an existing app user.

CREATE TABLE IF NOT EXISTS social_circle_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES social_circles(id) ON DELETE CASCADE,
  contact_type VARCHAR(10) NOT NULL CHECK (contact_type IN ('phone', 'user')),
  phone_hash VARCHAR(255),           -- hashed E.164 phone (if contact_type = 'phone')
  phone_display VARCHAR(20),         -- masked display: "+1 555 ***-1234"
  user_id VARCHAR(128) REFERENCES users(id), -- cognito_sub (if contact_type = 'user')
  display_name VARCHAR(255) NOT NULL, -- cached name for display (masked phone or user's display name)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(circle_id, phone_hash),
  UNIQUE(circle_id, user_id),
  CHECK (
    (contact_type = 'phone' AND phone_hash IS NOT NULL AND phone_display IS NOT NULL AND user_id IS NULL)
    OR
    (contact_type = 'user' AND user_id IS NOT NULL AND phone_hash IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_social_circle_contacts_circle_id ON social_circle_contacts(circle_id);

ALTER TABLE social_circle_contacts ENABLE ROW LEVEL SECURITY;
