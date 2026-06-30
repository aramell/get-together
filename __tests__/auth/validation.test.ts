import { signupSchema, emailSchema, passwordSchema } from '@/lib/validation/authSchema';
import { describe, it, expect } from '@jest/globals';

describe('Email Validation', () => {
  it('should accept valid email addresses', () => {
    const validEmails = [
      'user@example.com',
      'test.user@example.co.uk',
      'user+tag@example.com',
    ];

    validEmails.forEach((email) => {
      expect(() => emailSchema.parse(email)).not.toThrow();
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = ['invalid', 'user@', '@example.com', 'user @example.com'];

    invalidEmails.forEach((email) => {
      expect(() => emailSchema.parse(email)).toThrow('Please enter a valid email address');
    });
  });

  it('should reject empty email', () => {
    expect(() => emailSchema.parse('')).toThrow('Please enter a valid email address');
  });
});

describe('Password Validation', () => {
  it('should accept strong passwords', () => {
    const strongPasswords = ['Password1', 'SecurePass123', 'MyP@ssw0rd'];

    strongPasswords.forEach((password) => {
      expect(() => passwordSchema.parse(password)).not.toThrow();
    });
  });

  it('should reject password shorter than 8 characters', () => {
    expect(() => passwordSchema.parse('Pass1')).toThrow(
      'Password must be at least 8 characters'
    );
  });

  it('should reject password without uppercase letter', () => {
    expect(() => passwordSchema.parse('password123')).toThrow(
      'Password must contain at least one uppercase letter'
    );
  });

  it('should reject password without number', () => {
    expect(() => passwordSchema.parse('Password')).toThrow(
      'Password must contain at least one number'
    );
  });

  it('should reject empty password', () => {
    expect(() => passwordSchema.parse('')).toThrow(
      'Password must be at least 8 characters'
    );
  });
});

describe('Signup Schema Validation', () => {
  it('should accept valid signup data', () => {
    const validData = {
      email: 'user@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    };

    expect(() => signupSchema.parse(validData)).not.toThrow();
  });

  it('should reject mismatched passwords', () => {
    const invalidData = {
      email: 'user@example.com',
      password: 'Password123',
      confirmPassword: 'Password124',
    };

    expect(() => signupSchema.parse(invalidData)).toThrow('Passwords do not match');
  });

  it('should reject invalid email', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'Password123',
      confirmPassword: 'Password123',
    };

    expect(() => signupSchema.parse(invalidData)).toThrow();
  });

  it('should reject weak password', () => {
    const invalidData = {
      email: 'user@example.com',
      password: 'weak',
      confirmPassword: 'weak',
    };

    expect(() => signupSchema.parse(invalidData)).toThrow();
  });
});
