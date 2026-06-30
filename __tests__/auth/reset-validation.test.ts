import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validation/resetSchema';

describe('Password Reset Validation Schemas', () => {
  describe('forgotPasswordSchema', () => {
    it('should validate correct email format', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('should reject empty email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const result = forgotPasswordSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should infer correct TypeScript type', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'user@example.com',
      });
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate correct reset data', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: 'ABC123XYZ',
        newPassword: 'NewPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'invalid-email',
        code: 'ABC123XYZ',
        newPassword: 'NewPassword123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: 'ABC123XYZ',
        newPassword: 'short',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('8 characters');
      }
    });

    it('should reject password without uppercase', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: 'ABC123XYZ',
        newPassword: 'lowercase123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: 'ABC123XYZ',
        newPassword: 'NoNumbers',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty code', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: '',
        newPassword: 'NewPassword123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('should require non-empty code', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: 'ABC123',
        newPassword: 'NewPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should infer correct TypeScript type', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: 'ABC123XYZ',
        newPassword: 'NewPassword123',
      });
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
        expect(result.data.code).toBe('ABC123XYZ');
        expect(result.data.newPassword).toBe('NewPassword123');
      }
    });
  });
});
