import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  getUserProfile,
  updateUserProfile,
  requestEmailChange,
  confirmEmailChange,
} from '@/lib/services/authService';

// Mock fetch for all service tests
global.fetch = jest.fn();

describe('Profile Service Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'user@example.com',
        display_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-02T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      });

      const result = await getUserProfile('user-123');
      expect(result.success).toBe(true);
      expect(result.profile).toEqual(mockProfile);
    });

    it('should handle fetch error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getUserProfile('user-123');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROFILE_FETCH_ERROR');
    });

    it('should reject missing user ID', async () => {
      const result = await getUserProfile('');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_USER_ID');
    });
  });

  describe('updateUserProfile', () => {
    it('should update display_name successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profile: {
            id: 'user-123',
            email: 'user@example.com',
            display_name: 'Jane Doe',
            avatar_url: null,
            created_at: '2026-03-01T00:00:00Z',
            updated_at: '2026-03-02T00:00:00Z',
          },
        }),
      });

      const result = await updateUserProfile('user-123', {
        display_name: 'Jane Doe',
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('updated successfully');
    });

    it('should handle validation error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          message: 'Validation error',
          errorCode: 'VALIDATION_ERROR',
        }),
      });

      const result = await updateUserProfile('user-123', {
        display_name: '',
      });
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject missing user ID', async () => {
      const result = await updateUserProfile('', { display_name: 'New Name' });
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_USER_ID');
    });
  });

  describe('requestEmailChange', () => {
    it('should request email change successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Confirmation email sent to newemail@example.com',
        }),
      });

      const result = await requestEmailChange('user-123', 'newemail@example.com');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Confirmation email');
    });

    it('should reject invalid email', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          message: 'Invalid email format',
          errorCode: 'VALIDATION_ERROR',
        }),
      });

      const result = await requestEmailChange('user-123', 'invalid-email');
      expect(result.success).toBe(false);
    });

    it('should reject missing parameters', async () => {
      const result = await requestEmailChange('', 'newemail@example.com');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_INPUT');
    });
  });

  describe('confirmEmailChange', () => {
    it('should confirm email change successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Email successfully updated',
        }),
      });

      const result = await confirmEmailChange('valid-token-abc123');
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully updated');
    });

    it('should handle expired token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Confirmation link has expired',
          errorCode: 'TOKEN_EXPIRED',
        }),
      });

      const result = await confirmEmailChange('expired-token');
      expect(result.success).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('should reject missing token', async () => {
      const result = await confirmEmailChange('');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('MISSING_TOKEN');
    });
  });
});
