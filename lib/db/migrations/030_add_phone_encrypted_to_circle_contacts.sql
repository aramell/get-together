-- Story 10.4: Bulk-Invite a Social Circle When Creating a Group
--
-- social_circle_contacts (Story 10.2) intentionally never stored a phone
-- contact's raw number -- only a one-way hash (dedup) and a masked display
-- string. Bulk-inviting a circle to a group (AC4) needs the real number to
-- send the SMS magic link, so this adds reversible AES-256-GCM encrypted
-- storage using the existing lib/encryption/crypto.ts pattern (same approach
-- as calendar_connections.refresh_token_encrypted, Story 3.5).

ALTER TABLE social_circle_contacts
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;
