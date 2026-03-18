import { commentSchema } from '@/lib/validation/commentSchema';

describe('commentSchema', () => {
  describe('valid comments', () => {
    it('accepts valid comment with required fields', () => {
      const data = {
        content: 'This is a valid comment',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('This is a valid comment');
      }
    });

    it('accepts comment with minimum length (1 character)', () => {
      const data = {
        content: 'A',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('accepts comment with maximum length (2000 characters)', () => {
      const longContent = 'a'.repeat(2000);
      const data = {
        content: longContent,
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('accepts comment with valid UUID event_id', () => {
      const data = {
        content: 'Valid comment',
        event_id: '123e4567-e89b-12d3-a456-426614174000',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('accepts comment with valid UUID group_id', () => {
      const data = {
        content: 'Valid comment',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid comments - content validation', () => {
    it('rejects empty comment', () => {
      const data = {
        content: '',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects comment with only whitespace', () => {
      const data = {
        content: '   \n\t  ',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects comment exceeding 2000 characters', () => {
      const longContent = 'a'.repeat(2001);
      const data = {
        content: longContent,
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('provides error message for empty content', () => {
      const data = {
        content: '',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const contentError = result.error.issues.find((issue) => issue.path.includes('content'));
        expect(contentError).toBeDefined();
      }
    });

    it('provides error message for content exceeding max length', () => {
      const data = {
        content: 'a'.repeat(2001),
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const contentError = result.error.issues.find((issue) => issue.path.includes('content'));
        expect(contentError).toBeDefined();
      }
    });
  });

  describe('invalid comments - UUID validation', () => {
    it('rejects invalid event_id format', () => {
      const data = {
        content: 'Valid comment',
        event_id: 'not-a-uuid',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects invalid group_id format', () => {
      const data = {
        content: 'Valid comment',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: 'not-a-uuid',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects missing event_id', () => {
      const data = {
        content: 'Valid comment',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects missing group_id', () => {
      const data = {
        content: 'Valid comment',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('missing required fields', () => {
    it('rejects comment without content', () => {
      const data = {
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects comment with null content', () => {
      const data = {
        content: null,
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        group_id: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = commentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
