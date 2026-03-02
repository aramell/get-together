import { loginSchema } from '@/lib/validation/authSchema';

describe('Login Validation Schema', () => {
  describe('loginSchema', () => {
    it('should validate correct email and password', () => {
      const validData = {
        email: 'user@example.com',
        password: 'SecurePassword123',
      };
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'SecurePassword123',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Short1',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
      }
    });

    it('should reject password without uppercase letter', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'lowercase123',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase');
      }
    });

    it('should reject password without number', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'NoNumbersHere',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('number');
      }
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'SecurePassword123',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'user@example.com',
        password: '',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject when email is missing', () => {
      const invalidData = {
        password: 'SecurePassword123',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject when password is missing', () => {
      const invalidData = {
        email: 'user@example.com',
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should infer correct TypeScript type', () => {
      const validData = {
        email: 'user@example.com',
        password: 'SecurePassword123',
      };
      const result = loginSchema.safeParse(validData);
      if (result.success) {
        const data = result.data;
        // This test verifies TypeScript typing works
        expect(data.email).toBe('user@example.com');
        expect(data.password).toBe('SecurePassword123');
      }
    });
  });
});
