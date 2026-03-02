import { describe, it, expect } from '@jest/globals';
import { createGroupSchema, CreateGroupInput } from '@/lib/validation/groupSchema';

describe('Group Validation Schema', () => {
  describe('Group Name Validation', () => {
    it('should accept valid group name', () => {
      const data = { name: 'My Group', description: null };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Group');
      }
    });

    it('should reject empty group name', () => {
      const data = { name: '', description: null };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject group name with only whitespace', () => {
      const data = { name: '   ', description: null };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from group name', () => {
      const data = { name: '  My Group  ', description: null };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Group');
      }
    });

    it('should reject group name longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      const data = { name: longName, description: null };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept group name exactly 100 characters', () => {
      const name = 'a'.repeat(100);
      const data = { name, description: null };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept group name with special characters', () => {
      const data = { name: 'My Group & Friends! 🎉', description: null };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Description Validation', () => {
    it('should accept valid description', () => {
      const data = { name: 'Group', description: 'This is a group for friends' };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('This is a group for friends');
      }
    });

    it('should accept null description', () => {
      const data = { name: 'Group', description: null };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
      }
    });

    it('should accept undefined description', () => {
      const data = { name: 'Group' };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeUndefined();
      }
    });

    it('should trim whitespace from description', () => {
      const data = { name: 'Group', description: '  My description  ' };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('My description');
      }
    });

    it('should reject description longer than 500 characters', () => {
      const longDescription = 'a'.repeat(501);
      const data = { name: 'Group', description: longDescription };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept description exactly 500 characters', () => {
      const description = 'a'.repeat(500);
      const data = { name: 'Group', description };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept empty description string', () => {
      const data = { name: 'Group', description: '' };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Full Schema Validation', () => {
    it('should validate complete valid input', () => {
      const data: CreateGroupInput = {
        name: 'Friends Group',
        description: 'A group for coordinating with friends',
      };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid input with missing name', () => {
      const data = { description: 'Description' };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid input with null name', () => {
      const data = { name: null, description: 'Description' };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should handle multiple validation errors', () => {
      const data = { name: 'a'.repeat(101), description: 'a'.repeat(501) };
      const result = createGroupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
