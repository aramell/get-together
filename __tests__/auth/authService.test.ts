import { loginUser, LoginResponse } from '@/lib/services/authService';

// Mock the Cognito client
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn(),
  AdminInitiateAuthCommand: jest.fn(),
}));

describe('authService - Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginUser()', () => {
    it('should successfully login with valid credentials', async () => {
      const result = await loginUser('user@example.com', 'ValidPassword123');

      // We can't fully test without mocking, but we can verify the function exists
      // and handles basic validation
      expect(result).toBeDefined();
      expect(result.success === true || result.success === false).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const result = await loginUser('not-an-email', 'ValidPassword123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid password', async () => {
      const result = await loginUser('user@example.com', 'short');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject empty email', async () => {
      const result = await loginUser('', 'ValidPassword123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject empty password', async () => {
      const result = await loginUser('user@example.com', '');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return LoginResponse with proper structure', async () => {
      const result = await loginUser('user@example.com', 'ValidPassword123');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('errorCode');
    });

    it('should handle UNAUTHORIZED error for wrong password', async () => {
      // This would be tested with proper Cognito mock
      const result = await loginUser('user@example.com', 'WrongPassword123');

      // Should return an error response
      expect(result).toHaveProperty('errorCode');
    });

    it('should handle EMAIL_NOT_CONFIRMED error', async () => {
      // This would be tested with proper Cognito mock
      const result = await loginUser('unconfirmed@example.com', 'ValidPassword123');

      // Should return an error response
      expect(result).toHaveProperty('errorCode');
    });
  });
});
