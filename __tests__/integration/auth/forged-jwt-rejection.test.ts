/**
 * @jest-environment node
 */

/**
 * Story 8.5, Task 3: end-to-end proof that a real route rejects a forged JWT.
 *
 * Unlike the route-level unit tests (which mock `@/lib/auth/jwt` entirely),
 * this test leaves the real `getVerifiedSubFromJWT` in place and only seeds
 * its Cognito verifier with a test JWKS (no network call to Cognito - see
 * lib/auth/__tests__/jwt.test.ts for the same pattern). Only the DB-backed
 * service layer is mocked, so the full request -> header parsing -> signature
 * verification -> authorization boundary is exercised for real.
 */

import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'crypto';
import { NextRequest } from 'next/server';
import type { Jwk } from 'aws-jwt-verify/jwk';

const TEST_USER_POOL_ID = 'us-east-1_TESTPOOL01';
const TEST_CLIENT_ID = 'test-client-id-123';
const TEST_ISSUER = `https://cognito-idp.us-east-1.amazonaws.com/${TEST_USER_POOL_ID}`;
const KID = 'test-signing-key-1';

process.env.NEXT_PUBLIC_USER_POOL_ID = TEST_USER_POOL_ID;
process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID = TEST_CLIENT_ID;

jest.mock('@/lib/services/eventService');

import { addEventComment } from '@/lib/services/eventService';
import { POST } from '@/app/api/groups/[groupId]/events/[eventId]/comments/route';
import { getCognitoJwtVerifier } from '@/lib/auth/jwt';

function base64url(input: string | Buffer): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signToken(sub: string, signingKey: KeyObject): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: KID }));
  const payload = base64url(
    JSON.stringify({
      sub,
      token_use: 'access',
      client_id: TEST_CLIENT_ID,
      iss: TEST_ISSUER,
      iat: now,
      exp: now + 3600,
    })
  );
  const signature = cryptoSign('RSA-SHA256', Buffer.from(`${header}.${payload}`), signingKey);
  return `${header}.${payload}.${base64url(signature)}`;
}

const GROUP_ID = '550e8400-e29b-41d4-a716-446655440001';
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440002';

function makeRequest(authHeader?: string) {
  const request = new NextRequest(
    new URL(`http://localhost:3000/api/groups/${GROUP_ID}/events/${EVENT_ID}/comments`),
    {
      method: 'POST',
      headers: authHeader ? { authorization: authHeader } : undefined,
      body: JSON.stringify({ content: 'nice job everyone' }),
    }
  );
  return request;
}

const params = Promise.resolve({ groupId: GROUP_ID, eventId: EVENT_ID });

describe('Forged JWT rejection (integration, real verification path)', () => {
  let legitimateKey: KeyObject;
  let attackerKey: KeyObject;

  beforeAll(() => {
    const legit = generateKeyPairSync('rsa', { modulusLength: 2048 });
    legitimateKey = legit.privateKey;
    const publicJwk = legit.publicKey.export({ format: 'jwk' }) as unknown as Jwk;
    publicJwk.kid = KID;
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';

    const attacker = generateKeyPairSync('rsa', { modulusLength: 2048 });
    attackerKey = attacker.privateKey;

    // Seed the real verifier's JWKS cache so verification is cryptographic and
    // deterministic, with no network dependency on Cognito.
    getCognitoJwtVerifier().cacheJwks({ keys: [publicJwk] }, TEST_USER_POOL_ID);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a token forged by someone without Cognito\'s private key with 401, and never calls the service layer', async () => {
    const forgedToken = signToken('attacker-pretending-to-be-user-1', attackerKey);

    const response = await POST(makeRequest(`Bearer ${forgedToken}`), { params });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({ success: false, errorCode: 'UNAUTHORIZED' });
    expect(addEventComment).not.toHaveBeenCalled();
  });

  it('rejects a request with no Authorization header with 401', async () => {
    const response = await POST(makeRequest(), { params });

    expect(response.status).toBe(401);
    expect(addEventComment).not.toHaveBeenCalled();
  });

  it('accepts a validly-signed token and passes the verified sub through to the service layer', async () => {
    (addEventComment as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'comment-1', content: 'nice job everyone' },
      message: 'Comment added successfully',
    });

    const validToken = signToken('real-user-1', legitimateKey);
    const response = await POST(makeRequest(`Bearer ${validToken}`), { params });

    expect(response.status).toBe(201);
    expect(addEventComment).toHaveBeenCalledWith(EVENT_ID, GROUP_ID, 'real-user-1', 'nice job everyone');
  });
});
