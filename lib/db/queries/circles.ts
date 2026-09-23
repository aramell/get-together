import { query, queryOne } from '../client';

export interface SocialCircle {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new social circle owned by userId
 */
export async function createCircle(userId: string, name: string): Promise<SocialCircle> {
  const sql = `
    INSERT INTO social_circles (user_id, name)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const result = await queryOne<SocialCircle>(sql, [userId, name]);

  if (!result) {
    throw new Error('Failed to create social circle');
  }

  return result;
}

export interface SocialCircleWithCount extends SocialCircle {
  contact_count: number;
}

/**
 * List all social circles owned by userId with their contact counts (Story
 * 10.3, AC1), most recently created first
 */
export async function getCirclesByUserId(userId: string): Promise<SocialCircleWithCount[]> {
  const sql = `
    SELECT sc.*, COUNT(scc.id)::int AS contact_count
    FROM social_circles sc
    LEFT JOIN social_circle_contacts scc ON scc.circle_id = sc.id
    WHERE sc.user_id = $1
    GROUP BY sc.id
    ORDER BY sc.created_at DESC;
  `;

  return query<SocialCircleWithCount>(sql, [userId]);
}

/**
 * Fetch a single social circle by id (used for ownership checks in Story 10.2)
 */
export async function getCircleById(circleId: string): Promise<SocialCircle | null> {
  return queryOne<SocialCircle>('SELECT * FROM social_circles WHERE id = $1', [circleId]);
}

/**
 * Rename a circle (Story 10.3, AC4)
 */
export async function updateCircleName(circleId: string, name: string): Promise<SocialCircle> {
  const sql = `
    UPDATE social_circles
    SET name = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  const result = await queryOne<SocialCircle>(sql, [circleId, name]);

  if (!result) {
    throw new Error('Failed to update social circle');
  }

  return result;
}

/**
 * Delete a circle. Its contacts cascade-delete via the FK on
 * social_circle_contacts.circle_id (Story 10.3, AC5).
 */
export async function deleteCircleById(circleId: string): Promise<void> {
  await query('DELETE FROM social_circles WHERE id = $1', [circleId]);
}

export interface SocialCircleContact {
  id: string;
  circle_id: string;
  contact_type: 'phone' | 'user';
  phone_hash: string | null;
  phone_display: string | null;
  phone_encrypted: string | null;
  user_id: string | null;
  display_name: string;
  created_at: string;
}

/**
 * Add a phone-type contact to a circle (Story 10.2, AC1).
 * phoneEncrypted stores the number reversibly (Story 10.4, AC4) so it can
 * later be decrypted to send a bulk-invite SMS; phone_hash/phone_display
 * remain one-way/masked for dedup and display, as before.
 */
export async function addPhoneContact(
  circleId: string,
  phoneHash: string,
  phoneDisplay: string,
  phoneEncrypted: string
): Promise<SocialCircleContact> {
  const sql = `
    INSERT INTO social_circle_contacts (circle_id, contact_type, phone_hash, phone_display, phone_encrypted, display_name)
    VALUES ($1, 'phone', $2, $3, $4, $3)
    RETURNING *;
  `;

  const result = await queryOne<SocialCircleContact>(sql, [circleId, phoneHash, phoneDisplay, phoneEncrypted]);

  if (!result) {
    throw new Error('Failed to add phone contact');
  }

  return result;
}

/**
 * Add a user-reference contact to a circle (Story 10.2, AC2)
 */
export async function addUserContact(
  circleId: string,
  userId: string,
  displayName: string
): Promise<SocialCircleContact> {
  const sql = `
    INSERT INTO social_circle_contacts (circle_id, contact_type, user_id, display_name)
    VALUES ($1, 'user', $2, $3)
    RETURNING *;
  `;

  const result = await queryOne<SocialCircleContact>(sql, [circleId, userId, displayName]);

  if (!result) {
    throw new Error('Failed to add user contact');
  }

  return result;
}

/**
 * Look up an existing phone contact in a circle by its hash (dedup check, AC5)
 */
export async function findContactByPhoneHash(
  circleId: string,
  phoneHash: string
): Promise<SocialCircleContact | null> {
  return queryOne<SocialCircleContact>(
    'SELECT * FROM social_circle_contacts WHERE circle_id = $1 AND phone_hash = $2',
    [circleId, phoneHash]
  );
}

/**
 * Look up an existing user contact in a circle by user id (dedup check, AC5)
 */
export async function findContactByUserId(
  circleId: string,
  userId: string
): Promise<SocialCircleContact | null> {
  return queryOne<SocialCircleContact>(
    'SELECT * FROM social_circle_contacts WHERE circle_id = $1 AND user_id = $2',
    [circleId, userId]
  );
}

/**
 * Fetch a single contact by id (used to verify circle ownership before delete)
 */
export async function getContactById(contactId: string): Promise<SocialCircleContact | null> {
  return queryOne<SocialCircleContact>(
    'SELECT * FROM social_circle_contacts WHERE id = $1',
    [contactId]
  );
}

/**
 * Remove a contact from a circle (Story 10.2, AC6)
 */
export async function deleteContact(contactId: string): Promise<void> {
  await query('DELETE FROM social_circle_contacts WHERE id = $1', [contactId]);
}

/**
 * List all contacts in a circle, oldest first (Story 10.3, AC3)
 */
export async function getContactsByCircleId(circleId: string): Promise<SocialCircleContact[]> {
  return query<SocialCircleContact>(
    'SELECT * FROM social_circle_contacts WHERE circle_id = $1 ORDER BY created_at ASC',
    [circleId]
  );
}
