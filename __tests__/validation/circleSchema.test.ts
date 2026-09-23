import { createCircleSchema, addContactSchema } from '@/lib/validation/circleSchema';

describe('createCircleSchema (Story 10.1)', () => {
  it('accepts a valid circle name', () => {
    const result = createCircleSchema.safeParse({ name: 'Weekend Crew' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name (AC4)', () => {
    const result = createCircleSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Circle name is required');
    }
  });

  it('rejects a whitespace-only name (AC4)', () => {
    const result = createCircleSchema.safeParse({ name: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Circle name is required');
    }
  });

  it('rejects a name longer than 100 characters (AC4)', () => {
    const result = createCircleSchema.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Circle name must be 100 characters or less');
    }
  });

  it('accepts a name exactly 100 characters', () => {
    const result = createCircleSchema.safeParse({ name: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    const result = createCircleSchema.safeParse({ name: '  Weekend Crew  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Weekend Crew');
    }
  });
});

describe('addContactSchema (Story 10.2)', () => {
  it('accepts a valid E.164 phone contact', () => {
    const result = addContactSchema.safeParse({ type: 'phone', value: '+15550001234' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid phone number (AC3)', () => {
    const result = addContactSchema.safeParse({ type: 'phone', value: '555-000-1234' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Please enter a valid phone number including country code (e.g., +1 555 000 1234)'
      );
    }
  });

  it('accepts a valid username query (AC2)', () => {
    const result = addContactSchema.safeParse({ type: 'user', value: 'jane@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty username query', () => {
    const result = addContactSchema.safeParse({ type: 'user', value: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Please enter a name or email');
    }
  });

  it('rejects an unknown contact type', () => {
    const result = addContactSchema.safeParse({ type: 'email', value: 'jane@example.com' });
    expect(result.success).toBe(false);
  });
});
