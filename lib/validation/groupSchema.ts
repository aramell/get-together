import { z } from 'zod';

// Group creation validation schema
export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Group name must be 100 characters or less')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .trim()
    .optional()
    .nullable(),
  // Story 10.4: optional bulk-invite of a social circle's contacts (AC1, AC8)
  circleId: z.string().uuid().optional(),
  excludedContactIds: z.array(z.string().uuid()).optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

// Group data type
export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  invite_code: string;
  invite_url: string;
  created_at: string;
  updated_at: string;
}

// API response types
export interface CreateGroupResponse {
  success: boolean;
  message: string;
  group?: Group;
  // Story 10.4: present when the group was created with a circleId (AC3, AC7)
  invitesSent?: number;
  invitesFailed?: number;
  error?: string;
  errorCode?: string;
}

export interface GetGroupResponse {
  success: boolean;
  message: string;
  group?: Group;
  error?: string;
  errorCode?: string;
}
