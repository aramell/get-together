/**
 * User service for managing user profile data
 * Users are identified by Cognito's sub (subject) claim
 */

import { getClient } from '@/lib/db/client';

export interface UserProfile {
  id: string; // Cognito sub
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create a user profile in the database
 * Called after user signs up in Cognito
 */
export async function createUserProfile(
  cognitoSub: string,
  email: string
): Promise<UserProfile | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      `INSERT INTO users (id, email) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
       RETURNING id, email, display_name, avatar_url, created_at, updated_at`,
      [cognitoSub, email]
    );

    if (result.length > 0) {
      return result[0];
    }

    return null;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Get user profile by Cognito sub
 */
export async function getUserProfile(cognitoSub: string): Promise<UserProfile | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      'SELECT id, email, display_name, avatar_url, created_at, updated_at FROM users WHERE id = $1',
      [cognitoSub]
    );

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  cognitoSub: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<UserProfile | null> {
  const client = await getClient();
  try {
    const fields: string[] = [];
    const values: any[] = [cognitoSub];
    let paramIndex = 2;

    if (updates.display_name !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(updates.display_name);
    }

    if (updates.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(updates.avatar_url);
    }

    if (fields.length === 0) {
      return getUserProfile(cognitoSub);
    }

    fields.push(`updated_at = NOW()`);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $1
                   RETURNING id, email, display_name, avatar_url, created_at, updated_at`;

    const result = await client.query(query, values);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  } finally {
    client.release();
  }
}
