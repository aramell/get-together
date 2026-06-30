/**
 * PII Masking Tests
 * Task 1: Application Logging Infrastructure (AC1, AC10)
 * Tests for masking sensitive data before logging
 */

import { describe, it, expect } from '@jest/globals';
import {
  maskEmail,
  maskPhoneNumber,
  maskToken,
  maskPassword,
  maskSensitiveObject,
  shouldMaskField
} from '@/lib/logging/pii-masking';

describe('PII Masking - Email Addresses', () => {
  it('should mask email address domain', () => {
    const email = 'john.doe@example.com';
    const masked = maskEmail(email);

    expect(masked).toMatch(/^[a-zA-Z0-9.]+@\*+\.[a-z]+$/);
    expect(masked).toContain('john.doe@');
    expect(masked).not.toContain('example');
  });

  it('should handle simple email format', () => {
    const masked = maskEmail('user@example.com');

    expect(masked).toBe('user@*******.com');
  });

  it('should handle email with plus addressing', () => {
    const masked = maskEmail('user+tag@example.com');

    expect(masked).toContain('user+tag@');
    expect(masked).not.toContain('example');
  });

  it('should handle subdomain emails', () => {
    const masked = maskEmail('user@mail.example.co.uk');

    expect(masked).toContain('@');
    expect(masked).not.toContain('example');
  });

  it('should handle invalid email gracefully', () => {
    expect(() => {
      maskEmail('not-an-email');
      maskEmail('');
      maskEmail('user@');
      maskEmail('@example.com');
    }).not.toThrow();
  });

  it('should handle null/undefined email', () => {
    expect(maskEmail(null as any)).toBeDefined();
    expect(maskEmail(undefined as any)).toBeDefined();
  });

  it('should return consistent mask for same email', () => {
    const email = 'test@example.com';
    const masked1 = maskEmail(email);
    const masked2 = maskEmail(email);

    expect(masked1).toBe(masked2);
  });

  it('should not mask local part (before @)', () => {
    const masked = maskEmail('sensitive.user.name@example.com');

    // Local part should remain visible for debugging
    expect(masked).toContain('sensitive.user.name@');
  });
});

describe('PII Masking - Phone Numbers', () => {
  it('should mask phone number', () => {
    const phone = '+1-555-123-4567';
    const masked = maskPhoneNumber(phone);

    expect(masked).toMatch(/\*+/);
    expect(masked).not.toContain('123');
    expect(masked).not.toContain('4567');
  });

  it('should handle US phone format', () => {
    const masked = maskPhoneNumber('(555) 123-4567');

    expect(masked).toBeDefined();
    expect(masked).not.toContain('4567');
  });

  it('should handle international phone format', () => {
    const masked = maskPhoneNumber('+1-555-123-4567');

    expect(masked).not.toContain('1234567');
  });

  it('should handle invalid phone gracefully', () => {
    expect(() => {
      maskPhoneNumber('not-a-phone');
      maskPhoneNumber('123');
      maskPhoneNumber('');
    }).not.toThrow();
  });
});

describe('PII Masking - Tokens & Passwords', () => {
  it('should mask authentication tokens', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const masked = maskToken(token);

    expect(masked).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(masked).toMatch(/\*+/);
  });

  it('should mask passwords completely', () => {
    const password = 'SuperSecureP@ssw0rd!';
    const masked = maskPassword(password);

    expect(masked).not.toContain('SuperSecure');
    expect(masked).not.toContain('P@ssw0rd');
    expect(masked).toBe('[REDACTED]');
  });

  it('should mask Bearer tokens', () => {
    const bearerToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const masked = maskToken(bearerToken);

    expect(masked).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('should mask API keys', () => {
    const apiKey = 'sk_live_51234567890abcdef';
    const masked = maskToken(apiKey);

    expect(masked).not.toContain('1234567890abcdef');
  });

  it('should handle null/undefined tokens', () => {
    expect(maskToken(null as any)).toBeDefined();
    expect(maskToken(undefined as any)).toBeDefined();
    expect(maskPassword(null as any)).toBeDefined();
  });
});

describe('PII Masking - Object Fields', () => {
  it('should identify fields that should be masked', () => {
    expect(shouldMaskField('email')).toBe(true);
    expect(shouldMaskField('password')).toBe(true);
    expect(shouldMaskField('phone')).toBe(true);
    expect(shouldMaskField('ssn')).toBe(true);
    expect(shouldMaskField('token')).toBe(true);
    expect(shouldMaskField('authorization')).toBe(true);
    expect(shouldMaskField('creditCard')).toBe(true);
  });

  it('should not mask non-sensitive fields', () => {
    expect(shouldMaskField('userId')).toBe(false);
    expect(shouldMaskField('groupId')).toBe(false);
    expect(shouldMaskField('name')).toBe(false);
    expect(shouldMaskField('action')).toBe(false);
  });

  it('should mask email field in objects', () => {
    const obj = {
      userId: 'user-123',
      email: 'john@example.com',
      action: 'login'
    };

    const masked = maskSensitiveObject(obj);

    expect(masked.userId).toBe('user-123');
    expect(masked.email).not.toBe('john@example.com');
    expect(masked.action).toBe('login');
  });

  it('should mask nested email fields', () => {
    const obj = {
      user: {
        id: 'user-123',
        email: 'john@example.com'
      },
      action: 'update'
    };

    const masked = maskSensitiveObject(obj);

    expect(masked.user.id).toBe('user-123');
    expect(masked.user.email).not.toBe('john@example.com');
    expect(masked.action).toBe('update');
  });

  it('should mask password field in objects', () => {
    const obj = {
      username: 'john',
      password: 'SecurePassword123!',
      email: 'john@example.com'
    };

    const masked = maskSensitiveObject(obj);

    expect(masked.username).toBe('john');
    expect(masked.password).not.toContain('SecurePassword123');
    expect(masked.email).not.toContain('example.com');
  });

  it('should mask token field in objects', () => {
    const obj = {
      userId: 'user-123',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      success: true
    };

    const masked = maskSensitiveObject(obj);

    expect(masked.userId).toBe('user-123');
    expect(masked.token).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(masked.success).toBe(true);
  });

  it('should handle arrays with sensitive objects', () => {
    const obj = {
      users: [
        { id: '1', email: 'user1@example.com' },
        { id: '2', email: 'user2@example.com' }
      ]
    };

    const masked = maskSensitiveObject(obj);

    expect(masked.users[0].id).toBe('1');
    expect(masked.users[0].email).not.toContain('example.com');
    expect(masked.users[1].email).not.toContain('example.com');
  });

  it('should not modify original object', () => {
    const obj = {
      userId: 'user-123',
      email: 'john@example.com'
    };

    const originalEmail = obj.email;
    maskSensitiveObject(obj);

    expect(obj.email).toBe(originalEmail);
  });

  it('should handle circular references gracefully', () => {
    const obj: any = {
      userId: 'user-123',
      email: 'john@example.com'
    };
    obj.self = obj; // Circular reference

    expect(() => {
      maskSensitiveObject(obj);
    }).not.toThrow();
  });

  it('should handle null/undefined objects', () => {
    expect(maskSensitiveObject(null)).toBeNull();
    expect(maskSensitiveObject(undefined)).toBeUndefined();
  });
});

describe('PII Masking - Edge Cases', () => {
  it('should handle extremely long email addresses', () => {
    const longEmail = 'a'.repeat(100) + '@example.com';
    expect(() => {
      maskEmail(longEmail);
    }).not.toThrow();
  });

  it('should handle unicode characters in email', () => {
    const unicodeEmail = 'user+café@example.com';
    const masked = maskEmail(unicodeEmail);

    expect(masked).toBeDefined();
    expect(masked).not.toContain('example.com');
  });

  it('should handle mixed case in field names', () => {
    const obj = {
      EMAIL: 'john@example.com',
      Password: 'secret',
      PhoneNumber: '+1-555-123-4567'
    };

    // Masking should handle case-insensitive field matching
    const masked = maskSensitiveObject(obj);
    expect(masked).toBeDefined();
  });
});
