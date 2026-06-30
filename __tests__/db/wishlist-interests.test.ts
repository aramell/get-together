import pool from '@/lib/db/client';
import { markInterest, unmarkInterest, getInterestCount, getUserInterestStatus } from '@/lib/db/queries';

describe('Wishlist Interests Database', () => {
  const mockUserId = 'test-user-123';
  const mockItemId = '550e8400-e29b-41d4-a716-446655440000';
  let interestId: string;

  beforeAll(async () => {
    // Ensure tables exist before running tests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wishlist_interests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(128) NOT NULL,
        wishlist_item_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ,
        UNIQUE(user_id, wishlist_item_id)
      );
      CREATE INDEX IF NOT EXISTS idx_wishlist_interests_item ON wishlist_interests(wishlist_item_id);
    `);
  });

  afterEach(async () => {
    // Clean up after each test
    await pool.query('DELETE FROM wishlist_interests WHERE user_id = $1', [mockUserId]);
  });

  describe('markInterest', () => {
    it('should create an interest record', async () => {
      const result = await markInterest(mockItemId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      interestId = result.id;
    });

    it('should prevent duplicate interests from same user', async () => {
      await markInterest(mockItemId, mockUserId);

      expect(async () => {
        await markInterest(mockItemId, mockUserId);
      }).rejects.toThrow();
    });

    it('should allow same user to interest different items', async () => {
      const itemId2 = '550e8400-e29b-41d4-a716-446655440001';
      const result1 = await markInterest(mockItemId, mockUserId);
      const result2 = await markInterest(itemId2, mockUserId);

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).not.toEqual(result2.id);
    });
  });

  describe('unmarkInterest', () => {
    beforeEach(async () => {
      // Create an interest before each unmark test
      const result = await markInterest(mockItemId, mockUserId);
      interestId = result.id;
    });

    it('should soft delete an interest record', async () => {
      await unmarkInterest(mockItemId, mockUserId);

      const result = await pool.query(
        'SELECT deleted_at FROM wishlist_interests WHERE id = $1',
        [interestId]
      );

      expect(result.rows[0].deleted_at).not.toBeNull();
    });

    it('should allow re-marking interest after unmarking', async () => {
      await unmarkInterest(mockItemId, mockUserId);
      const result = await markInterest(mockItemId, mockUserId);

      expect(result.id).toBeDefined();
    });
  });

  describe('getInterestCount', () => {
    it('should return 0 for item with no interests', async () => {
      const count = await getInterestCount(mockItemId);
      expect(count).toBe(0);
    });

    it('should return correct count for item with interests', async () => {
      await markInterest(mockItemId, 'user-1');
      await markInterest(mockItemId, 'user-2');
      await markInterest(mockItemId, 'user-3');

      const count = await getInterestCount(mockItemId);
      expect(count).toBe(3);
    });

    it('should exclude soft-deleted interests from count', async () => {
      await markInterest(mockItemId, 'user-1');
      await markInterest(mockItemId, 'user-2');
      await markInterest(mockItemId, 'user-3');

      // Unmark one interest
      await unmarkInterest(mockItemId, 'user-2');

      const count = await getInterestCount(mockItemId);
      expect(count).toBe(2);
    });
  });

  describe('getUserInterestStatus', () => {
    it('should return false if user has not marked interest', async () => {
      const isInterested = await getUserInterestStatus(mockItemId, mockUserId);
      expect(isInterested).toBe(false);
    });

    it('should return true if user has marked interest', async () => {
      await markInterest(mockItemId, mockUserId);
      const isInterested = await getUserInterestStatus(mockItemId, mockUserId);
      expect(isInterested).toBe(true);
    });

    it('should return false if user has unmarked interest', async () => {
      await markInterest(mockItemId, mockUserId);
      await unmarkInterest(mockItemId, mockUserId);
      const isInterested = await getUserInterestStatus(mockItemId, mockUserId);
      expect(isInterested).toBe(false);
    });
  });
});
