'use server';

import crypto from 'crypto';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { getClient, query, queryOne } from '@/lib/db/client';
import { addUserToGroup } from '@/lib/db/queries';
import { findUserByPhoneHash, createUserProfileByPhoneHash } from '@/lib/services/userService';

const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || '';
const CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID || '';

// Admin* Cognito APIs need IAM credentials (unlike the public client-ID-only
// APIs in authService.ts) -- relies on the SDK's default credential provider
// chain, same as lib/storage/s3.ts. The deployed app's execution role must be
// granted cognito-idp:AdminCreateUser / AdminSetUserPassword / AdminInitiateAuth
// for this to work; that IAM policy grant is outside this codebase.
function getCognitoAdminClient(): CognitoIdentityProviderClient {
  return new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
}

function validateCognitoConfig(): void {
  if (!USER_POOL_ID || !CLIENT_ID) {
    throw new Error(
      'Missing Cognito configuration: NEXT_PUBLIC_USER_POOL_ID and NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID are required'
    );
  }
}

/**
 * Cognito Username for a phone-auth user, derived from phone_hash rather
 * than the actual phone number. Story 9.1 never persists the raw phone
 * number past the initial SMS send (NFR32), and 9.2 deliberately keeps that
 * boundary -- so Cognito never sees real digits, only this synthetic,
 * non-PII identifier. Consequence: the app cannot recover a phone-auth
 * user's real number later (no SMS re-notifications, no "signed in as
 * +1 555..." display), and rotating the HMAC key (ENCRYPTION_KEY) would
 * orphan existing phone-linked accounts.
 */
function cognitoUsernameForPhoneHash(phoneHash: string): string {
  return `phone_${phoneHash}`;
}

/**
 * A password Cognito's ADMIN_USER_PASSWORD_AUTH flow requires internally,
 * used exactly once and never persisted or returned to any caller. Fixed
 * prefix guarantees upper/lower/digit/symbol classes for Cognito's default
 * password policy; the random suffix makes it unguessable.
 */
function generateOneTimePassword(): string {
  return `Aa1!${crypto.randomBytes(24).toString('base64')}`;
}

export interface ConsumedToken {
  id: string;
  phone_hash: string;
  target_type: 'group' | 'event' | null;
  target_id: string | null;
}

/**
 * Atomically consume a magic link token (AC1, AC6): look it up by its hash,
 * require it to be unused and unexpired, and mark it used inside a row lock
 * so a second simultaneous request for the same token cannot also succeed --
 * `SELECT ... FOR UPDATE` blocks the second transaction until the first
 * commits, and its `used_at IS NULL` condition is re-evaluated on wake, so
 * the loser correctly sees zero rows instead of a stale unused row.
 */
export async function consumeToken(rawToken: string): Promise<ConsumedToken | null> {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id, phone_hash, target_type, target_id
       FROM sms_magic_link_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const token = result.rows[0];

    await client.query(`UPDATE sms_magic_link_tokens SET used_at = NOW() WHERE id = $1`, [token.id]);
    await client.query('COMMIT');

    return token;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Restore a consumed token to unused. Used when account creation/sign-in
 * fails *after* consumeToken already committed used_at (AC6 requires that
 * commit happen before we know whether the rest of the flow will succeed,
 * to keep the concurrent-double-click protection atomic) -- without this,
 * an unrelated transient failure (e.g. a Cognito API error) would
 * permanently burn a token that was never actually delivered to the user.
 */
async function releaseToken(tokenId: string): Promise<void> {
  try {
    await query(`UPDATE sms_magic_link_tokens SET used_at = NULL WHERE id = $1`, [tokenId]);
  } catch (error) {
    console.error(
      'Failed to release magic link token after a downstream failure:',
      error instanceof Error ? error.message : error
    );
  }
}

export interface AuthenticatedUser {
  userId: string;
  isNewUser: boolean;
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

/**
 * Find or create the local + Cognito account for a phone_hash, and return a
 * real Cognito session for it (AC2, AC3, AC7). New and existing users share
 * the same authentication step: a fresh one-time password is (re)set on the
 * Cognito user immediately before use, so no password ever needs to be
 * remembered across sign-ins -- AdminSetUserPassword is an admin operation
 * that doesn't require knowing the previous password.
 */
export async function findOrCreateUserByPhoneHash(phoneHash: string): Promise<AuthenticatedUser> {
  validateCognitoConfig();

  const existing = await findUserByPhoneHash(phoneHash);
  const username = cognitoUsernameForPhoneHash(phoneHash);
  const client = getCognitoAdminClient();

  let userId: string;
  const isNewUser = !existing;

  if (existing) {
    userId = existing.id;
  } else {
    const createResult = await client.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        MessageAction: 'SUPPRESS',
      })
    );

    const sub = createResult.User?.Attributes?.find((attr) => attr.Name === 'sub')?.Value;
    if (!sub) {
      throw new Error('Cognito did not return a sub for the newly created phone-auth user');
    }

    userId = sub;
    const profile = await createUserProfileByPhoneHash(userId, phoneHash);
    if (!profile) {
      // createUserProfileByPhoneHash swallows DB errors and returns null
      // rather than throwing (see userService.ts) -- without this check, a
      // failed INSERT here would silently continue to password-set and
      // authenticate a Cognito user with no matching `users` row, issuing a
      // "valid" session for an account the rest of the app can't find.
      throw new Error('Failed to create local user profile for the new phone-auth user');
    }
  }

  const oneTimePassword = generateOneTimePassword();

  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      Password: oneTimePassword,
      Permanent: true,
    })
  );

  const authResult = await client.send(
    new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: username, PASSWORD: oneTimePassword },
    })
  );

  const tokens = authResult.AuthenticationResult;
  if (!tokens?.AccessToken || !tokens?.IdToken || !tokens?.RefreshToken) {
    throw new Error('Cognito did not return a complete set of tokens for the phone-auth user');
  }

  return {
    userId,
    isNewUser,
    accessToken: tokens.AccessToken,
    idToken: tokens.IdToken,
    refreshToken: tokens.RefreshToken,
  };
}

/**
 * Grant immediate access to the magic link's invite target, if any (AC4).
 * An 'event' target grants membership on the event's parent group (event
 * pages require group membership) and redirects straight to the event.
 * No target, or a target that no longer exists, falls back to the user's
 * groups list rather than failing the whole sign-in.
 */
export async function addUserToTarget(
  userId: string,
  targetType: 'group' | 'event' | null,
  targetId: string | null
): Promise<{ redirectPath: string }> {
  if (targetType === 'group' && targetId) {
    await addUserToGroup(targetId, userId, 'member');
    return { redirectPath: `/groups/${targetId}` };
  }

  if (targetType === 'event' && targetId) {
    const event = await queryOne<{ group_id: string }>(
      `SELECT group_id FROM event_proposals WHERE id = $1 AND deleted_at IS NULL`,
      [targetId]
    );

    if (event) {
      await addUserToGroup(event.group_id, userId, 'member');
      return { redirectPath: `/groups/${event.group_id}/events/${targetId}` };
    }
  }

  return { redirectPath: '/groups' };
}

export interface MagicLinkSignInResult {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  redirectPath?: string;
  errorCode?: 'INVALID_OR_EXPIRED_TOKEN' | 'INTERNAL_SERVER_ERROR';
}

/**
 * Full magic link sign-in flow (AC1-AC7): consume the token, resolve the
 * account (creating one if needed), grant target access, and return a
 * ready-to-use Cognito session.
 */
export async function signInViaMagicLink(rawToken: string): Promise<MagicLinkSignInResult> {
  const token = await consumeToken(rawToken);
  if (!token) {
    return { success: false, errorCode: 'INVALID_OR_EXPIRED_TOKEN' };
  }

  try {
    const auth = await findOrCreateUserByPhoneHash(token.phone_hash);
    const { redirectPath } = await addUserToTarget(auth.userId, token.target_type, token.target_id);

    return {
      success: true,
      accessToken: auth.accessToken,
      idToken: auth.idToken,
      refreshToken: auth.refreshToken,
      redirectPath,
    };
  } catch (error) {
    await releaseToken(token.id);
    throw error;
  }
}
