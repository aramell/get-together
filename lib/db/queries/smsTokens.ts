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
