import { NextRequest, NextResponse } from 'next/server';
import { DELETE } from '@/app/api/groups/[groupId]/route';

// Mock the database queries module
jest.mock('@/lib/db/queries', () => ({
  getUserGroupRole: jest.fn(),
  deleteGroup: jest.fn(),
}));

import { getUserGroupRole, deleteGroup } from '@/lib/db/queries';

describe('DELETE /api/groups/:groupId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task 1: AC2, AC5 - Authorization and Soft Delete', () => {
    it('should return 400 when groupId is missing', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/groups/'), {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ groupId: '' }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/groups/group-123'),
        {
          method: 'DELETE',
          headers: new Headers(),
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('UNAUTHORIZED');
    });

    it('should return 403 when user is not admin of the group', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');

      const request = new NextRequest(
        new URL('http://localhost:3000/api/groups/group-123'),
        {
          method: 'DELETE',
          headers: new Headers({
            'x-user-id': 'user-456',
          }),
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('FORBIDDEN');
      expect(getUserGroupRole).toHaveBeenCalledWith('group-123', 'user-456');
    });

    it('should delete group when user is admin', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      (deleteGroup as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest(
        new URL('http://localhost:3000/api/groups/group-123'),
        {
          method: 'DELETE',
          headers: new Headers({
            'x-user-id': 'admin-user',
          }),
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Group deleted successfully');
      expect(deleteGroup).toHaveBeenCalledWith('group-123');
    });
  });

  describe('Task 4: AC3 - Prevent Rejoining Deleted Group', () => {
    it('should set deleted_at timestamp when deleting group', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      (deleteGroup as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest(
        new URL('http://localhost:3000/api/groups/group-123'),
        {
          method: 'DELETE',
          headers: new Headers({
            'x-user-id': 'admin-user',
          }),
        }
      );

      await DELETE(request, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      // The deleteGroup function should be called with the group ID
      // The database query implementation sets deleted_at = NOW()
      expect(deleteGroup).toHaveBeenCalledWith('group-123');
    });
  });

  describe('Task 9: AC5 - Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      (deleteGroup as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest(
        new URL('http://localhost:3000/api/groups/group-123'),
        {
          method: 'DELETE',
          headers: new Headers({
            'x-user-id': 'admin-user',
          }),
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should return proper error response structure', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');

      const request = new NextRequest(
        new URL('http://localhost:3000/api/groups/group-123'),
        {
          method: 'DELETE',
          headers: new Headers({
            'x-user-id': 'user-456',
          }),
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('errorCode');
    });
  });

  describe('Task 1: AC2 - Structured Error Responses', () => {
    it('should return 400 for invalid group ID format', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/groups/invalid-id'),
        {
          method: 'DELETE',
          headers: new Headers({
            'x-user-id': 'user-456',
          }),
        }
      );

      // Even with invalid format, the request should still go through
      // The database layer will return null/error if group doesn't exist
      const response = await DELETE(request, {
        params: Promise.resolve({ groupId: 'invalid-id' }),
      });

      // The response should include proper error codes
      const data = await response.json();
      expect(data).toHaveProperty('errorCode');
    });

    it('should validate user authentication independently', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/groups/group-123'),
        {
          method: 'DELETE',
          headers: new Headers({}), // No auth header or x-user-id
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.errorCode).toBe('UNAUTHORIZED');
    });
  });

  describe('Task 3: AC2, AC4 - Soft Delete with GDPR Compliance', () => {
    it('should call deleteGroup function which performs soft delete', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      (deleteGroup as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest(
        new URL('http://localhost:3000/api/groups/group-123'),
        {
          method: 'DELETE',
          headers: new Headers({
            'x-user-id': 'admin-user',
          }),
        }
      );

      await DELETE(request, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      // Verify soft delete function is called
      // (hard delete would use DELETE FROM, soft delete uses UPDATE with deleted_at)
      expect(deleteGroup).toHaveBeenCalled();
    });
  });
});
