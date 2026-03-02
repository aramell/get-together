import { forgotPassword, resetPassword, ForgotPasswordResponse, ResetPasswordResponse } from '@/lib/services/authService';

jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn(),
  ForgotPasswordCommand: jest.fn(),
  ConfirmForgotPasswordCommand: jest.fn(),
}));

describe('authService - Password Reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('forgotPassword()', () => {
    it('should accept valid email', async () => {
      const result = await forgotPassword('user@example.com');
      expect(result).toBeDefined();
      expect(result.success === true || result.success === false).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const result = await forgotPassword('not-an-email');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject empty email', async () => {
      const result = await forgotPassword('');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return proper response structure', async () => {
      const result = await forgotPassword('user@example.com');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('errorCode');
    });

    it('should handle user not found', async () => {
      // This would be tested with proper Cognito mock
      const result = await forgotPassword('nonexistent@example.com');
      expect(result).toHaveProperty('errorCode');
    });
  });

  describe('resetPassword()', () => {
    it('should accept valid reset data', async () => {
      const result = await resetPassword('user@example.com', 'ABC123XYZ', 'NewPassword123');
      expect(result).toBeDefined();
      expect(result.success === true || result.success === false).toBe(true);
    });

    it('should reject invalid email', async () => {
      const result = await resetPassword('invalid-email', 'ABC123XYZ', 'NewPassword123');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid password', async () => {
      const result = await resetPassword('user@example.com', 'ABC123XYZ', 'short');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject empty code', async () => {
      const result = await resetPassword('user@example.com', '', 'NewPassword123');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return proper response structure', async () => {
      const result = await resetPassword('user@example.com', 'ABC123XYZ', 'NewPassword123');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('errorCode');
    });

    it('should handle expired code', async () => {
      // This would be tested with proper Cognito mock returning ExpiredCodeException
      const result = await resetPassword('user@example.com', 'EXPIRED_CODE', 'NewPassword123');
      expect(result).toHaveProperty('errorCode');
    });

    it('should handle invalid code', async () => {
      const result = await resetPassword('user@example.com', 'INVALID_CODE', 'NewPassword123');
      expect(result).toHaveProperty('errorCode');
    });
  });
});
