import { describe, it, expect } from '@jest/globals';
import { phoneNumberSchema, smsMagicLinkRequestSchema } from '@/lib/validation/smsAuthSchema';

describe('phoneNumberSchema (AC2)', () => {
  it('accepts valid E.164 numbers', () => {
    expect(phoneNumberSchema.safeParse('+15550001234').success).toBe(true);
    expect(phoneNumberSchema.safeParse('+442071838750').success).toBe(true);
  });

  it('rejects numbers missing the leading +', () => {
    const result = phoneNumberSchema.safeParse('15550001234');
    expect(result.success).toBe(false);
  });

  it('rejects numbers without a country code digit', () => {
    const result = phoneNumberSchema.safeParse('+');
    expect(result.success).toBe(false);
  });

  it('rejects numbers starting with 0 after the +', () => {
    const result = phoneNumberSchema.safeParse('+05550001234');
    expect(result.success).toBe(false);
  });

  it('rejects numbers longer than 15 digits', () => {
    const result = phoneNumberSchema.safeParse('+1555000123456789');
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = phoneNumberSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('returns the friendly error message', () => {
    const result = phoneNumberSchema.safeParse('not-a-number');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('valid phone number');
    }
  });
});

describe('smsMagicLinkRequestSchema', () => {
  it('accepts a phone number with no target', () => {
    const result = smsMagicLinkRequestSchema.safeParse({ phoneNumber: '+15550001234' });
    expect(result.success).toBe(true);
  });

  it('accepts an optional group target', () => {
    const result = smsMagicLinkRequestSchema.safeParse({
      phoneNumber: '+15550001234',
      targetType: 'group',
      targetId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid targetType', () => {
    const result = smsMagicLinkRequestSchema.safeParse({
      phoneNumber: '+15550001234',
      targetType: 'not-a-type',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-UUID targetId', () => {
    const result = smsMagicLinkRequestSchema.safeParse({
      phoneNumber: '+15550001234',
      targetType: 'event',
      targetId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing phoneNumber', () => {
    const result = smsMagicLinkRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
