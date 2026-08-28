/**
 * @jest-environment node
 */
import { PATCH, DELETE } from '../route';
import * as commentService from '@/lib/services/commentService';
import * as jwt from '@/lib/auth/jwt';

jest.mock('@/lib/services/commentService');
jest.mock('@/lib/auth/jwt');

function makeRequest(options: { authHeader?: string; body?: any } = {}) {
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? options.authHeader ?? null : null),
    },
    json: async () => options.body ?? {},
  } as any;
}

const params = Promise.resolve({ groupId: 'group-1', itemId: 'item-1', commentId: 'comment-1' });

describe('PATCH /api/groups/:groupId/wishlist/:itemId/comments/:commentId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await PATCH(makeRequest({ body: { content: 'hi' } }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 when the author edits their own comment', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('author-1');
    (commentService.editWishlistComment as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'comment-1', content: 'updated', edited_at: '2026-03-20T10:00:00Z', updated_count: 1 },
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { content: 'updated' } }),
      { params }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.content).toBe('updated');
  });

  it('returns 200 when a group admin edits someone else\'s comment', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('admin-1');
    (commentService.editWishlistComment as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'comment-1', content: 'moderated', edited_at: '2026-03-20T10:00:00Z', updated_count: 1 },
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { content: 'moderated' } }),
      { params }
    );
    expect(res.status).toBe(200);
  });

  it('returns 403 for a non-author, non-admin', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('random-member');
    (commentService.editWishlistComment as jest.Mock).mockResolvedValue({
      success: false,
      message: 'You do not have permission to edit this comment',
      errorCode: 'FORBIDDEN',
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { content: 'hack' } }),
      { params }
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when the comment does not exist', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('author-1');
    (commentService.editWishlistComment as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Comment not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { content: 'x' } }),
      { params }
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/groups/:groupId/wishlist/:itemId/comments/:commentId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 when the author deletes their own comment', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('author-1');
    (commentService.deleteWishlistCommentService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Comment deleted successfully',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(200);
  });

  it('returns 200 when a group admin deletes someone else\'s comment', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('admin-1');
    (commentService.deleteWishlistCommentService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Comment deleted successfully',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(200);
  });

  it('returns 403 for a non-author, non-admin', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('random-member');
    (commentService.deleteWishlistCommentService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'You do not have permission to delete this comment',
      errorCode: 'FORBIDDEN',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the comment does not exist', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('author-1');
    (commentService.deleteWishlistCommentService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Comment not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(404);
  });

  it('returns 409 when the comment is already deleted', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('author-1');
    (commentService.deleteWishlistCommentService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Comment has already been deleted',
      errorCode: 'CONFLICT',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(409);
  });
});
