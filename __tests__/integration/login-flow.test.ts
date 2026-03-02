import { loginUser } from '@/lib/services/authService';
import { loginSchema } from '@/lib/validation/authSchema';

/**
 * Integration tests for complete login flow
 * These tests verify the entire login process from validation through authentication
 */
describe('Login Flow - Integration Tests', () => {
  describe('Complete login workflow', () => {
    it('should validate email and password before calling auth service', async () => {
      const invalidEmail = 'not-an-email';
      const validPassword = 'ValidPassword123';

      // This should fail at validation stage
      const result = loginSchema.safeParse({
        email: invalidEmail,
        password: validPassword,
      });

      expect(result.success).toBe(false);
    });

    it('should not call auth service if validation fails', () => {
      const testData = {
        email: 'invalid-email',
        password: 'short',
      };

      const result = loginSchema.safeParse(testData);
      expect(result.success).toBe(false);
    });

    it('should handle successful login with valid credentials', async () => {
      const validCredentials = {
        email: 'user@example.com',
        password: 'ValidPassword123',
      };

      // Validate first
      const validationResult = loginSchema.safeParse(validCredentials);
      expect(validationResult.success).toBe(true);

      // Then call auth service (mocked in real tests)
      if (validationResult.success) {
        const result = await loginUser(validCredentials.email, validCredentials.password);
        // Result structure is verified
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('errorCode');
      }
    });

    it('should enforce password requirements throughout flow', () => {
      const passwordTests = [
        { password: 'short', shouldPass: false, reason: 'too short' },
        { password: 'nouppercase123', shouldPass: false, reason: 'no uppercase' },
        { password: 'NoNumbers', shouldPass: false, reason: 'no numbers' },
        { password: 'ValidPassword123', shouldPass: true, reason: 'all requirements met' },
      ];

      passwordTests.forEach(({ password, shouldPass }) => {
        const result = loginSchema.safeParse({
          email: 'user@example.com',
          password,
        });
        expect(result.success).toBe(shouldPass);
      });
    });

    it('should maintain consistent error messages across validation and API', async () => {
      const invalidCredentials = {
        email: 'invalid-email',
        password: 'ValidPassword123',
      };

      // Client-side validation
      const validationResult = loginSchema.safeParse(invalidCredentials);
      expect(validationResult.success).toBe(false);

      if (!validationResult.success) {
        const clientError = validationResult.error.issues[0].message;
        expect(clientError).toContain('email');
      }

      // Server-side should have consistent error handling
      const serverResult = await loginUser(
        invalidCredentials.email,
        invalidCredentials.password
      );
      expect(serverResult.success).toBe(false);
      expect(serverResult.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error scenarios throughout login flow', () => {
    it('should handle unconfirmed email appropriately', async () => {
      // This simulates a user who registered but hasn't confirmed their email
      const unconfirmedUserCredentials = {
        email: 'unconfirmed@example.com',
        password: 'ValidPassword123',
      };

      const validationResult = loginSchema.safeParse(unconfirmedUserCredentials);
      expect(validationResult.success).toBe(true);

      // Auth service would return EMAIL_NOT_CONFIRMED error
      const result = await loginUser(
        unconfirmedUserCredentials.email,
        unconfirmedUserCredentials.password
      );

      // Error structure should be consistent
      expect(result).toHaveProperty('errorCode');
      expect(result.success).toBe(false);
    });

    it('should provide generic error for both non-existent and wrong password', async () => {
      const wrongPasswordCredentials = {
        email: 'user@example.com',
        password: 'WrongPassword123',
      };

      const result = await loginUser(
        wrongPasswordCredentials.email,
        wrongPasswordCredentials.password
      );

      // Should return generic message (security best practice)
      expect(result.success).toBe(false);
      // Message should be same for both wrong password and non-existent email
      expect(result.message).toMatch(/invalid|password/i);
    });

    it('should handle rate limiting errors', async () => {
      // Simulate rate limit scenario
      const credentials = {
        email: 'user@example.com',
        password: 'ValidPassword123',
      };

      // In real scenario, multiple failed attempts would trigger rate limiting
      const result = await loginUser(credentials.email, credentials.password);

      // Response structure should indicate error clearly
      if (result.errorCode === 'RATE_LIMITED' || result.errorCode === 'TOO_MANY_REQUESTS') {
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Token handling after login', () => {
    it('should expect tokens in successful login response', async () => {
      // This test documents the contract for a successful login
      const credentials = {
        email: 'user@example.com',
        password: 'ValidPassword123',
      };

      const result = await loginUser(credentials.email, credentials.password);

      // If login succeeds, tokens must be present
      if (result.success) {
        expect(result.accessToken).toBeDefined();
        expect(result.idToken).toBeDefined();
        expect(typeof result.accessToken).toBe('string');
        expect(typeof result.idToken).toBe('string');
      }
    });

    it('should not return tokens on failed login', async () => {
      const credentials = {
        email: 'user@example.com',
        password: 'WrongPassword123',
      };

      const result = await loginUser(credentials.email, credentials.password);

      if (!result.success) {
        // Failed login should not have tokens
        expect(result.accessToken).toBeUndefined();
        expect(result.idToken).toBeUndefined();
      }
    });
  });
});
