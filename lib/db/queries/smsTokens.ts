import { queryOne } from '../client';

export interface SmsMagicLinkToken {
  id: string;
  phone_hash: string;
  token_hash: string;
  target_type: 'group' | 'event' | null;
  target_id: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

/**
 * Create a new SMS magic link token record
 */
export async function createToken(
  phoneHash: string,
  tokenHash: string,
  expiresAt: Date,
  targetType?: 'group' | 'event',
  targetId?: string
): Promise<SmsMagicLinkToken> {
  const sql = `
    INSERT INTO sms_magic_link_tokens (
      phone_hash, token_hash, target_type, target_id, expires_at
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const result = await queryOne<SmsMagicLinkToken>(sql, [
    phoneHash,
    tokenHash,
    targetType ?? null,
    targetId ?? null,
    expiresAt.toISOString(),
  ]);

  if (!result) {
    throw new Error('Failed to create SMS magic link token');
  }

  return result;
}

/**
 * Look up a token's owner and group-or-event target by its hash, regardless
 * of used_at/expires_at (Story 9.3 AC4) -- lets a re-request recover the
 * original invite context from an already-expired/used token. Callers MUST
 * check phone_hash against the re-requesting phone number before trusting
 * the target -- this lookup alone doesn't prove who is asking.
 */
export async function findTokenContextByHash(
  tokenHash: string
): Promise<{ phone_hash: string; target_type: 'group' | 'event' | null; target_id: string | null } | null> {
  const sql = `SELECT phone_hash, target_type, target_id FROM sms_magic_link_tokens WHERE token_hash = $1`;
  return queryOne(sql, [tokenHash]);
}
