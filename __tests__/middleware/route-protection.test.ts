/**
 * @jest-environment node
 */

/**
 * Story 8.5 code review follow-up: middleware.ts previously gated
 * /dashboard, /groups, /events, /profile purely on an unverified decoded
 * `exp` claim, the exact anti-pattern this story exists to eliminate. It now
 * verifies `accessToken`'s signature via getVerifiedSubFromJWT. These tests
 * prove a forged accessToken (valid-looking exp, wrong signature) is
 * redirected to login rather than let through.
 */

import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'crypto';
import { NextRequest } from 'next/server';
import type { Jwk } from 'aws-jwt-verify/jwk';

const TEST_USER_POOL_ID = 'us-east-1_TESTPOOL01';
const TEST_CLIENT_ID = 'test-client-id-123';
const TEST_ISSUER = `https://cognito-idp.us-east-1.amazonaws.com/${TEST_USER_POOL_ID}`;
const KID = 'test-signing-key-1';

const ORIGINAL_USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID;
const ORIGINAL_CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID;

process.env.NEXT_PUBLIC_USER_POOL_ID = TEST_USER_POOL_ID;
process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID = TEST_CLIENT_ID;

afterAll(() => {
  if (ORIGINAL_USER_POOL_ID === undefined) {
    delete process.env.NEXT_PUBLIC_USER_POOL_ID;
  } else {
    process.env.NEXT_PUBLIC_USER_POOL_ID = ORIGINAL_USER_POOL_ID;
  }
  if (ORIGINAL_CLIENT_ID === undefined) {
    delete process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID;
  } else {
    process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID = ORIGINAL_CLIENT_ID;
  }
});

import { middleware } from '@/middleware';
import { getCognitoJwtVerifier } from '@/lib/auth/jwt';

function base64url(input: string | Buffer): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signToken(signingKey: KeyObject, expiresInSeconds = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: KID }));
  const payload = base64url(
    JSON.stringify({
      sub: 'user-1',
      token_use: 'access',
      client_id: TEST_CLIENT_ID,
      iss: TEST_ISSUER,
      iat: now,
      exp: now + expiresInSeconds,
    })
  );
  const signature = cryptoSign('RSA-SHA256', Buffer.from(`${header}.${payload}`), signingKey);
  return `${header}.${payload}.${base64url(signature)}`;
}

function makeIdToken(expiresInSeconds = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'none' }));
  const payload = base64url(JSON.stringify({ sub: 'user-1', exp: now + expiresInSeconds }));
  return `${header}.${payload}.`;
}

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const request = new NextRequest(new URL(`http://localhost:3000${pathname}`));
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }
  return request;
}

describe('middleware route protection (real JWT verification)', () => {
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

    getCognitoJwtVerifier().cacheJwks({ keys: [publicJwk] }, TEST_USER_POOL_ID);
  });

  it('lets a request with a validly-signed accessToken through to a protected route', async () => {
    const request = makeRequest('/groups', {
      accessToken: signToken(legitimateKey),
      idToken: makeIdToken(),
    });

    const response = await middleware(request);

    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects to login when accessToken is forged (valid-looking exp, wrong signature)', async () => {
    const request = makeRequest('/groups', {
      accessToken: signToken(attackerKey),
      idToken: makeIdToken(),
    });

    const response = await middleware(request);

    expect(response.headers.get('location')).toContain('/auth/login');
  });

  it('redirects to login when accessToken is missing', async () => {
    const request = makeRequest('/groups', { idToken: makeIdToken() });

    const response = await middleware(request);

    expect(response.headers.get('location')).toContain('/auth/login');
  });

  it('redirects to login when idToken is expired', async () => {
    const request = makeRequest('/groups', {
      accessToken: signToken(legitimateKey),
      idToken: makeIdToken(-60),
    });

    const response = await middleware(request);

    expect(response.headers.get('location')).toContain('/auth/login');
  });

  it('redirects an authenticated user away from the login page', async () => {
    const request = makeRequest('/auth/login', {
      accessToken: signToken(legitimateKey),
      idToken: makeIdToken(),
    });

    const response = await middleware(request);

    expect(response.headers.get('location')).toContain('/groups');
  });
});
