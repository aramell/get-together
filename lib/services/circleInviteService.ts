'use server';

/**
 * Shared bulk-invite logic for social circles (Story 10.4 group flow, Story
 * 10.5 event flow). Extracted so both entry points share one implementation.
 */

import { addUserToGroup } from '@/lib/db/queries';
import { getCircleById, getContactsByCircleId } from '@/lib/db/queries/circles';
import { createToken } from '@/lib/db/queries/smsTokens';
import {
  generateMagicToken,
  sendMagicLinkSms,
  checkAndRecordRateLimit,
} from '@/lib/services/smsService';
import { decrypt } from '@/lib/encryption/crypto';

export interface BulkInviteResult {
  success: boolean;
  message: string;
  data?: { invitesSent: number; invitesFailed: number };
  error?: string;
  errorCode?: string;
}

/**
 * Bulk-invite a social circle's contacts to a newly created group or event.
 * Phone contacts get an SMS magic link scoped to `targetType`/`targetId`,
 * reusing Story 9.1's token/rate-limit flow. App-user contacts are added to
 * `groupId` (the target's own id for a group invite, or the event's parent
 * group for an event invite -- event pages require group membership, same
 * as when a clicked magic link grants access via addUserToTarget in
 * magicLinkService.ts). The circle itself is only ever read here -- its
 * contacts are unaffected and it remains reusable for any number of future
 * invites (AC6). The group/event is already committed by the time this
 * runs, so per-contact failures are counted, not thrown, and never roll
 * back creation (AC7).
 */
export async function bulkInvite(
  circleId: string,
  targetType: 'group' | 'event',
  targetId: string,
  groupId: string,
  requestingUserId: string,
  excludedContactIds: string[] = []
): Promise<BulkInviteResult> {
  try {
    const circle = await getCircleById(circleId);
    if (!circle) {
      return { success: false, message: 'Circle not found', errorCode: 'NOT_FOUND' };
    }
    if (circle.user_id !== requestingUserId) {
      return { success: false, message: 'Not authorized', errorCode: 'FORBIDDEN' };
    }

    const allContacts = await getContactsByCircleId(circleId);
    const contacts = allContacts.filter((contact) => !excludedContactIds.includes(contact.id));

    let invitesSent = 0;
    let invitesFailed = 0;

    for (const contact of contacts) {
      if (contact.contact_type === 'phone') {
        if (!contact.phone_encrypted || !contact.phone_hash) {
          invitesFailed++;
          continue;
        }

        try {
          if (!checkAndRecordRateLimit(contact.phone_hash)) {
            invitesFailed++;
            continue;
          }

          const phoneNumber = decrypt(contact.phone_encrypted);
          const { rawToken, tokenHash, expiresAt } = generateMagicToken();
          await createToken(contact.phone_hash, tokenHash, expiresAt, targetType, targetId);
          await sendMagicLinkSms(phoneNumber, rawToken);
          invitesSent++;
        } catch (error) {
          console.error(
            'Bulk invite SMS failed for a circle contact:',
            error instanceof Error ? error.message : error
          );
          invitesFailed++;
        }
      } else {
        if (!contact.user_id) {
          invitesFailed++;
          continue;
        }

        try {
          await addUserToGroup(groupId, contact.user_id, 'member');
          invitesSent++;
        } catch (error) {
          console.error(
            'Bulk invite membership add failed for a circle contact:',
            error instanceof Error ? error.message : error
          );
          invitesFailed++;
        }
      }
    }

    return {
      success: true,
      message: 'Bulk invite complete',
      data: { invitesSent, invitesFailed },
    };
  } catch (error: any) {
    console.error('Bulk invite circle error:', error);
    return {
      success: false,
      message: 'Failed to bulk-invite circle',
      error: error.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Bulk-invite a circle's contacts to a group (Story 10.4).
 */
export async function bulkInviteCircleToGroup(
  groupId: string,
  circleId: string,
  requestingUserId: string,
  excludedContactIds: string[] = []
): Promise<BulkInviteResult> {
  return bulkInvite(circleId, 'group', groupId, groupId, requestingUserId, excludedContactIds);
}

/**
 * Bulk-invite a circle's contacts to a newly created event (Story 10.5).
 * Phone contacts get a magic link scoped to the event (AC4); user contacts
 * who aren't already members of the event's group are added to it (AC5).
 */
export async function bulkInviteCircleToEvent(
  eventId: string,
  groupId: string,
  circleId: string,
  requestingUserId: string,
  excludedContactIds: string[] = []
): Promise<BulkInviteResult> {
  return bulkInvite(circleId, 'event', eventId, groupId, requestingUserId, excludedContactIds);
}
