import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import crypto from 'crypto';

process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PublishCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

import {
  hashPhoneNumber,
  generateMagicToken,
  checkAndRecordRateLimit,
  sendMagicLinkSms,
} from '@/lib/services/smsService';

describe('smsService', () => {
  beforeEach(() => {
    mockSend.mockClear();
    mockSend.mockResolvedValue({});
  });

  describe('hashPhoneNumber (AC4)', () => {
    it('produces a deterministic hash for the same phone number', () => {
      const hash1 = hashPhoneNumber('+15550001234');
      const hash2 = hashPhoneNumber('+15550001234');
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different phone numbers', () => {
      const hash1 = hashPhoneNumber('+15550001234');
      const hash2 = hashPhoneNumber('+15550005678');
      expect(hash1).not.toBe(hash2);
    });

    it('never returns the raw phone number', () => {
      const hash = hashPhoneNumber('+15550001234');
      expect(hash).not.toContain('5550001234');
    });
  });

  describe('generateMagicToken (AC3)', () => {
    it('generates a 64-character hex raw token (32 random bytes)', () => {
      const { rawToken } = generateMagicToken();
      expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
    });

    it('hashes the raw token with SHA-256', () => {
      const { rawToken, tokenHash } = generateMagicToken();
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(tokenHash).toBe(expectedHash);
    });

    it('generates different tokens on each call', () => {
      const first = generateMagicToken();
      const second = generateMagicToken();
      expect(first.rawToken).not.toBe(second.rawToken);
    });

    it('sets expiry to 15 minutes from now', () => {
      const before = Date.now();
      const { expiresAt } = generateMagicToken();
      const after = Date.now();

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 15 * 60 * 1000 - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 15 * 60 * 1000 + 1000);
    });
  });

  describe('checkAndRecordRateLimit (AC5)', () => {
    it('allows up to 3 requests within the window', () => {
      const phoneHash = `rate-limit-test-${crypto.randomUUID()}`;
      expect(checkAndRecordRateLimit(phoneHash)).toBe(true);
      expect(checkAndRecordRateLimit(phoneHash)).toBe(true);
      expect(checkAndRecordRateLimit(phoneHash)).toBe(true);
    });

    it('rejects the 4th request within the window', () => {
      const phoneHash = `rate-limit-test-${crypto.randomUUID()}`;
      checkAndRecordRateLimit(phoneHash);
      checkAndRecordRateLimit(phoneHash);
      checkAndRecordRateLimit(phoneHash);

      expect(checkAndRecordRateLimit(phoneHash)).toBe(false);
    });

    it('isolates rate limits per phone hash', () => {
      const phoneHashA = `rate-limit-test-a-${crypto.randomUUID()}`;
      const phoneHashB = `rate-limit-test-b-${crypto.randomUUID()}`;

      checkAndRecordRateLimit(phoneHashA);
      checkAndRecordRateLimit(phoneHashA);
      checkAndRecordRateLimit(phoneHashA);

      expect(checkAndRecordRateLimit(phoneHashA)).toBe(false);
      expect(checkAndRecordRateLimit(phoneHashB)).toBe(true);
    });
  });

  describe('sendMagicLinkSms (AC3, AC4)', () => {
    it('dispatches an SMS with the magic link containing the raw token', async () => {
      await sendMagicLinkSms('+15550001234', 'abc123token');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command.input.PhoneNumber).toBe('+15550001234');
      expect(command.input.Message).toContain('abc123token');
    });

    it('propagates errors from the SMS provider', async () => {
      mockSend.mockRejectedValueOnce(new Error('provider unavailable'));

      await expect(sendMagicLinkSms('+15550001234', 'abc123token')).rejects.toThrow(
        'provider unavailable'
      );
    });
  });
});
