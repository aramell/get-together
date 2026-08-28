/**
 * @jest-environment node
 */

/**
 * Story 8.5: Verify JWT Signatures Instead of Trusting Decoded Claims
 *
 * These tests sign tokens locally with a test-only RSA key pair (via Node's
 * built-in `crypto`, no external JWT lib needed) and seed the Cognito
 * verifier's JWKS cache directly (aws-jwt-verify's documented pattern via
 * `cacheJwks`), so verification is real cryptographic signature checking
 * with no network call to Cognito.
 */

import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'crypto';
import type { Jwk } from 'aws-jwt-verify/jwk';
import { decodeJWT, getSubFromJWT, getEmailFromJWT, getVerifiedSubFromJWT, getCognitoJwtVerifier } from '@/lib/auth/jwt';

const TEST_USER_POOL_ID = 'us-east-1_TESTPOOL01';
const TEST_CLIENT_ID = 'test-client-id-123';
const TEST_ISSUER = `https://cognito-idp.us-east-1.amazonaws.com/${TEST_USER_POOL_ID}`;
const KID = 'test-signing-key-1';
const TEST_SUB = 'user-sub-abc-123';

process.env.NEXT_PUBLIC_USER_POOL_ID = TEST_USER_POOL_ID;
process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID = TEST_CLIENT_ID;

function base64url(input: string | Buffer): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signRs256(header: Record<string, unknown>, payload: Record<string, unknown>, privateKey: KeyObject): string {
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = cryptoSign('RSA-SHA256', Buffer.from(signingInput), privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

describe('lib/auth/jwt - verified JWT decode', () => {
  let signingKey: KeyObject;
  let attackerKey: KeyObject;

  function makeToken(opts: {
    sub?: string;
    clientId?: string | null;
    issuer?: string;
    expiresInSeconds?: number;
    signingKeyOverride?: KeyObject;
    kid?: string;
    tokenUse?: string | null;
  } = {}): string {
    const {
      sub = TEST_SUB,
      clientId = TEST_CLIENT_ID,
      issuer = TEST_ISSUER,
      expiresInSeconds = 3600,
      signingKeyOverride = signingKey,
      kid = KID,
      tokenUse = 'access',
    } = opts;

    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      sub,
      iss: issuer,
      iat: now,
      exp: now + expiresInSeconds,
    };
    if (tokenUse !== null) payload.token_use = tokenUse;
    if (clientId !== null) payload.client_id = clientId;

    return signRs256({ alg: 'RS256', typ: 'JWT', kid }, payload, signingKeyOverride);
  }

  beforeAll(() => {
    const legit = generateKeyPairSync('rsa', { modulusLength: 2048 });
    signingKey = legit.privateKey;
    const publicJwk = legit.publicKey.export({ format: 'jwk' }) as unknown as Jwk;
    publicJwk.kid = KID;
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';

    // A second, unrelated key pair standing in for an attacker who signs their
    // own forged token but doesn't control Cognito's private key.
    const attacker = generateKeyPairSync('rsa', { modulusLength: 2048 });
    attackerKey = attacker.privateKey;

    // Seed the verifier's JWKS cache directly instead of hitting the network -
    // this is aws-jwt-verify's documented pattern for hermetic tests.
    getCognitoJwtVerifier().cacheJwks({ keys: [publicJwk] }, TEST_USER_POOL_ID);
  });

  describe('AC1: signature verification', () => {
    it('accepts a validly-signed token and returns its sub claim', async () => {
      const token = makeToken();
      await expect(getVerifiedSubFromJWT(token)).resolves.toBe(TEST_SUB);
    });

    it('rejects a token forged with an unrelated private key', async () => {
      const forged = makeToken({ signingKeyOverride: attackerKey });
      await expect(getVerifiedSubFromJWT(forged)).resolves.toBeNull();
    });

    it('rejects a token whose payload was tampered with after signing', async () => {
      const token = makeToken({ sub: 'victim-user' });
      const [header, , signature] = token.split('.');
      const tamperedPayload = base64url(
        JSON.stringify({
          sub: 'attacker-user',
          token_use: 'access',
          client_id: TEST_CLIENT_ID,
          iss: TEST_ISSUER,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      );
      const tampered = `${header}.${tamperedPayload}.${signature}`;

      await expect(getVerifiedSubFromJWT(tampered)).resolves.toBeNull();
    });

    it('rejects an unsigned "alg: none" token', async () => {
      const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
      const payload = base64url(
        JSON.stringify({
          sub: TEST_SUB,
          token_use: 'access',
          client_id: TEST_CLIENT_ID,
          iss: TEST_ISSUER,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      );
      const unsignedToken = `${header}.${payload}.`;

      await expect(getVerifiedSubFromJWT(unsignedToken)).resolves.toBeNull();
    });

    it('rejects malformed input without throwing', async () => {
      await expect(getVerifiedSubFromJWT('not-a-jwt')).resolves.toBeNull();
      await expect(getVerifiedSubFromJWT('')).resolves.toBeNull();
    });
  });

  describe('AC2: expiration, issuer, and client validation', () => {
    it('rejects an expired token', async () => {
      const expired = makeToken({ expiresInSeconds: -60 });
      await expect(getVerifiedSubFromJWT(expired)).resolves.toBeNull();
    });

    it('rejects a token issued by a different user pool (wrong issuer)', async () => {
      const wrongIssuer = makeToken({
        issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ANOTHERPOOL',
      });
      await expect(getVerifiedSubFromJWT(wrongIssuer)).resolves.toBeNull();
    });

    it('rejects a token issued for a different client (wrong client_id)', async () => {
      const wrongClient = makeToken({ clientId: 'some-other-app-client-id' });
      await expect(getVerifiedSubFromJWT(wrongClient)).resolves.toBeNull();
    });
  });

  describe('AC3: no behavior change for legitimate users', () => {
    it('accepts multiple distinct valid tokens with their correct subs', async () => {
      const tokenA = makeToken({ sub: 'user-a' });
      const tokenB = makeToken({ sub: 'user-b' });

      await expect(getVerifiedSubFromJWT(tokenA)).resolves.toBe('user-a');
      await expect(getVerifiedSubFromJWT(tokenB)).resolves.toBe('user-b');
    });
  });
});

describe('lib/auth/jwt - legacy unverified decode (client-only helpers)', () => {
  it('decodeJWT still decodes claims without verifying signature', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({ sub: 'user-1', email: 'user@example.com', exp: 9999999999, iat: 1 })
    ).toString('base64');
    const token = `${header}.${payload}.signature`;

    expect(getSubFromJWT(token)).toBe('user-1');
    expect(getEmailFromJWT(token)).toBe('user@example.com');
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJWT('garbage')).toBeNull();
    expect(getSubFromJWT('garbage')).toBeNull();
  });
});
