import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

const { createGroup } = require('@/lib/services/groupService');

describe('Group Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup function', () => {
    it('should successfully create a group with valid input', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Group created successfully',
          group: {
            id: 'group-123',
            name: 'Test Group',
            description: 'A test group',
            created_by: 'user-123',
            invite_code: 'abc123def456',
            invite_url: 'https://gettogether.app/join/abc123def456',
          },
        }),
      });

      const result = await createGroup('user-123', {
        name: 'Test Group',
        description: 'A test group',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('created successfully');
      expect(result.group?.name).toBe('Test Group');
    });

    it('should reject group creation with invalid user ID', async () => {
      const result = await createGroup('', {
        name: 'Test Group',
        description: null,
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject group creation with missing name', async () => {
      const result = await createGroup('user-123', {
        name: '',
        description: null,
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('required');
    });

    it('should reject group creation with name too long', async () => {
      const result = await createGroup('user-123', {
        name: 'a'.repeat(101),
        description: null,
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('100 characters');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          message: 'Database error',
          errorCode: 'DB_ERROR',
        }),
      });

      const result = await createGroup('user-123', {
        name: 'Test Group',
        description: null,
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('DB_ERROR');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await createGroup('user-123', {
        name: 'Test Group',
        description: null,
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should accept null description', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Group created successfully',
          group: {
            id: 'group-123',
            name: 'Test Group',
            description: null,
            created_by: 'user-123',
            invite_code: 'abc123def456',
            invite_url: 'https://gettogether.app/join/abc123def456',
          },
        }),
      });

      const result = await createGroup('user-123', {
        name: 'Test Group',
        description: null,
      });

      expect(result.success).toBe(true);
      expect(result.group?.description).toBeNull();
    });

    it('should trim whitespace from name', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Group created successfully',
          group: {
            id: 'group-123',
            name: 'Test Group',
            description: null,
            created_by: 'user-123',
            invite_code: 'abc123def456',
            invite_url: 'https://gettogether.app/join/abc123def456',
          },
        }),
      });

      const result = await createGroup('user-123', {
        name: '  Test Group  ',
        description: null,
      });

      expect(result.success).toBe(true);
    });
  });
});
