'use server';

import {
  createCircle,
  getCirclesByUserId,
  getCircleById,
  updateCircleName,
  deleteCircleById,
  addPhoneContact,
  addUserContact,
  findContactByPhoneHash,
  findContactByUserId,
  getContactById,
  getContactsByCircleId,
  deleteContact,
} from '@/lib/db/queries/circles';
import {
  createCircleSchema,
  addContactSchema,
  type CreateCircleInput,
  type CircleResponse,
  type ContactResponse,
} from '@/lib/validation/circleSchema';
import { findUserByDisplayNameOrEmail } from '@/lib/services/userService';
import { hashPhoneNumber } from '@/lib/services/smsService';
import { encrypt } from '@/lib/encryption/crypto';
import { ZodError } from 'zod';

interface ServiceResult<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * Masks an E.164 phone number for display (Story 10.2 Dev Notes).
 * Assumes a 10-digit national number (area code + 7 digits), which covers
 * the NANP numbers this app currently supports end to end (see smsService.ts).
 * e.g. "+15550001234" -> "+1 555 ***-1234"
 */
function maskPhoneNumber(e164: string): string {
  const digits = e164.slice(1);
  const last4 = digits.slice(-4);
  const areaCode = digits.slice(-10, -7);
  const countryCode = digits.slice(0, digits.length - 10) || '1';
  return `+${countryCode} ${areaCode} ***-${last4}`;
}

/**
 * Create a new social circle for a user (Story 10.1)
 */
export async function createCircleService(
  userId: string,
  data: CreateCircleInput
): Promise<{
  success: boolean;
  message: string;
  data?: CircleResponse;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const validatedData = createCircleSchema.parse(data);

    const circle = await createCircle(userId, validatedData.name);

    return {
      success: true,
      message: 'Circle created',
      data: {
        id: circle.id,
        name: circle.name,
        contactCount: 0,
        createdAt: circle.created_at,
      },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message || 'Validation failed';

      return {
        success: false,
        message,
        error: 'VALIDATION_ERROR',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    console.error('Error creating social circle:', error);
    return {
      success: false,
      message: 'Failed to create circle',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * List all social circles owned by a user (Story 10.1)
 */
export async function getUserCirclesService(userId: string): Promise<{
  success: boolean;
  message: string;
  data?: CircleResponse[];
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const circles = await getCirclesByUserId(userId);

    return {
      success: true,
      message: 'Circles retrieved',
      data: circles.map((circle) => ({
        id: circle.id,
        name: circle.name,
        contactCount: circle.contact_count,
        createdAt: circle.created_at,
      })),
    };
  } catch (error) {
    console.error('Error retrieving social circles:', error);
    return {
      success: false,
      message: 'Failed to retrieve circles',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Verify a circle exists and is owned by requestingUserId.
 * Shared authorization gate for add/remove contact operations (Story 10.2).
 */
async function authorizeCircleOwner(
  circleId: string,
  requestingUserId: string
): Promise<ServiceResult<never> | null> {
  const circle = await getCircleById(circleId);

  if (!circle) {
    return { success: false, message: 'Circle not found', errorCode: 'NOT_FOUND' };
  }

  if (circle.user_id !== requestingUserId) {
    return { success: false, message: 'Not authorized', errorCode: 'FORBIDDEN' };
  }

  return null;
}

/**
 * Add a contact to a circle by phone number (Story 10.2, AC1, AC3, AC5)
 */
export async function addContactByPhone(
  circleId: string,
  requestingUserId: string,
  phoneNumber: string
): Promise<ServiceResult<ContactResponse>> {
  try {
    const authError = await authorizeCircleOwner(circleId, requestingUserId);
    if (authError) return authError;

    const parsed = addContactSchema.safeParse({ type: 'phone', value: phoneNumber });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const phoneHash = hashPhoneNumber(parsed.data.value);
    const existing = await findContactByPhoneHash(circleId, phoneHash);
    if (existing) {
      return {
        success: false,
        message: 'This contact is already in this circle',
        errorCode: 'DUPLICATE_CONTACT',
      };
    }

    const phoneDisplay = maskPhoneNumber(parsed.data.value);
    const phoneEncrypted = encrypt(parsed.data.value);
    const contact = await addPhoneContact(circleId, phoneHash, phoneDisplay, phoneEncrypted);

    return {
      success: true,
      message: 'Contact added',
      data: { id: contact.id, type: 'phone', displayName: contact.display_name },
    };
  } catch (error) {
    console.error('Error adding phone contact:', error);
    return { success: false, message: 'Failed to add contact', errorCode: 'INTERNAL_ERROR' };
  }
}

/**
 * Add a contact to a circle by app username (display name or email) (Story 10.2, AC2, AC4, AC5)
 */
export async function addContactByUsername(
  circleId: string,
  requestingUserId: string,
  usernameQuery: string
): Promise<ServiceResult<ContactResponse>> {
  try {
    const authError = await authorizeCircleOwner(circleId, requestingUserId);
    if (authError) return authError;

    const parsed = addContactSchema.safeParse({ type: 'user', value: usernameQuery });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const foundUser = await findUserByDisplayNameOrEmail(parsed.data.value);
    if (!foundUser) {
      return {
        success: false,
        message: 'No user found with that name or email. You can still add them by phone number.',
        errorCode: 'USER_NOT_FOUND',
      };
    }

    const existing = await findContactByUserId(circleId, foundUser.id);
    if (existing) {
      return {
        success: false,
        message: 'This contact is already in this circle',
        errorCode: 'DUPLICATE_CONTACT',
      };
    }

    const displayName = foundUser.display_name || foundUser.email;
    const contact = await addUserContact(circleId, foundUser.id, displayName);

    return {
      success: true,
      message: 'Contact added',
      data: { id: contact.id, type: 'user', displayName: contact.display_name },
    };
  } catch (error) {
    console.error('Error adding user contact:', error);
    return { success: false, message: 'Failed to add contact', errorCode: 'INTERNAL_ERROR' };
  }
}

/**
 * Remove a contact from a circle (Story 10.2, AC6, AC7)
 */
export async function removeContact(
  circleId: string,
  contactId: string,
  requestingUserId: string
): Promise<ServiceResult<never>> {
  try {
    const authError = await authorizeCircleOwner(circleId, requestingUserId);
    if (authError) return authError;

    const contact = await getContactById(contactId);
    if (!contact || contact.circle_id !== circleId) {
      return { success: false, message: 'Contact not found', errorCode: 'NOT_FOUND' };
    }

    await deleteContact(contactId);

    return { success: true, message: 'Contact removed' };
  } catch (error) {
    console.error('Error removing contact:', error);
    return { success: false, message: 'Failed to remove contact', errorCode: 'INTERNAL_ERROR' };
  }
}

interface CircleDetailResponse {
  id: string;
  name: string;
  contacts: ContactResponse[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch a circle with its contacts (Story 10.3, AC3, AC6)
 */
export async function getCircleDetailService(
  circleId: string,
  requestingUserId: string
): Promise<ServiceResult<CircleDetailResponse>> {
  try {
    const circle = await getCircleById(circleId);
    if (!circle) {
      return { success: false, message: 'Circle not found', errorCode: 'NOT_FOUND' };
    }
    if (circle.user_id !== requestingUserId) {
      return { success: false, message: 'Not authorized', errorCode: 'FORBIDDEN' };
    }

    const contacts = await getContactsByCircleId(circleId);

    return {
      success: true,
      message: 'Circle retrieved',
      data: {
        id: circle.id,
        name: circle.name,
        contacts: contacts.map((contact) => ({
          id: contact.id,
          type: contact.contact_type,
          displayName: contact.display_name,
        })),
        createdAt: circle.created_at,
        updatedAt: circle.updated_at,
      },
    };
  } catch (error) {
    console.error('Error retrieving circle detail:', error);
    return { success: false, message: 'Failed to retrieve circle', errorCode: 'INTERNAL_ERROR' };
  }
}

/**
 * Rename a circle (Story 10.3, AC4, AC6)
 */
export async function updateCircleNameService(
  circleId: string,
  requestingUserId: string,
  data: CreateCircleInput
): Promise<ServiceResult<{ id: string; name: string; updatedAt: string }>> {
  try {
    const circle = await getCircleById(circleId);
    if (!circle) {
      return { success: false, message: 'Circle not found', errorCode: 'NOT_FOUND' };
    }
    if (circle.user_id !== requestingUserId) {
      return { success: false, message: 'Not authorized', errorCode: 'FORBIDDEN' };
    }

    const validatedData = createCircleSchema.parse(data);
    const updated = await updateCircleName(circleId, validatedData.name);

    return {
      success: true,
      message: 'Circle name updated',
      data: { id: updated.id, name: updated.name, updatedAt: updated.updated_at },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: error.issues[0]?.message || 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    console.error('Error updating circle name:', error);
    return { success: false, message: 'Failed to update circle', errorCode: 'INTERNAL_ERROR' };
  }
}

/**
 * Delete a circle and its contacts (Story 10.3, AC5, AC6)
 */
export async function deleteCircleService(
  circleId: string,
  requestingUserId: string
): Promise<ServiceResult<never>> {
  try {
    const circle = await getCircleById(circleId);
    if (!circle) {
      return { success: false, message: 'Circle not found', errorCode: 'NOT_FOUND' };
    }
    if (circle.user_id !== requestingUserId) {
      return { success: false, message: 'Not authorized', errorCode: 'FORBIDDEN' };
    }

    await deleteCircleById(circleId);

    return { success: true, message: 'Circle deleted' };
  } catch (error) {
    console.error('Error deleting circle:', error);
    return { success: false, message: 'Failed to delete circle', errorCode: 'INTERNAL_ERROR' };
  }
}
