import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { phoneNumberSchema } from '@/lib/validation/smsAuthSchema';
import {
  hashPhoneNumber,
  generateMagicToken,
  checkAndRecordRateLimit,
  sendMagicLinkSms,
} from '@/lib/services/smsService';
import { getTokenTargetContext } from '@/lib/services/magicLinkService';
import { createToken } from '@/lib/db/queries/smsTokens';

const rerequestSchema = z.object({
  phoneNumber: phoneNumberSchema,
  originalToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, originalToken } = rerequestSchema.parse(body);

    const phoneHash = hashPhoneNumber(phoneNumber);

    // AC5: same 3-per-10-minute budget as the original request endpoint --
    // shared by phone hash, so re-requests from the error page count against
    // the same window as the initial send.
    if (!checkAndRecordRateLimit(phoneHash)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many requests. Please wait a few minutes before trying again.',
          errorCode: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    // AC4: the only trustworthy source of target context is the original
    // token's own DB record, recovered here and gated on the re-requester's
    // phone number matching the token's original recipient -- this endpoint
    // deliberately does NOT accept a client-supplied targetType/targetId.
    // Trusting a client-asserted target would let anyone name any group or
    // event UUID directly (no token needed at all) and get a magic link
    // that self-joins them to it, bypassing the app's invite-code-based
    // membership system entirely (group_memberships has no other guard).
    let resolvedTargetType: 'group' | 'event' | undefined;
    let resolvedTargetId: string | undefined;

    if (originalToken) {
      const context = await getTokenTargetContext(originalToken);
      if (context && context.phone_hash === phoneHash) {
        resolvedTargetType = context.target_type ?? undefined;
        resolvedTargetId = context.target_id ?? undefined;
      }
    }

    const { rawToken, tokenHash, expiresAt } = generateMagicToken();

    await createToken(phoneHash, tokenHash, expiresAt, resolvedTargetType, resolvedTargetId);
    await sendMagicLinkSms(phoneNumber, rawToken);

    return NextResponse.json({ success: true, message: 'New link sent! Check your texts.' }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errorCode: 'VALIDATION_ERROR',
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 422 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON', errorCode: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // AC4 (smsService): never log the raw request body / phone number
    console.error('SMS magic link re-request error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, message: 'Server error', errorCode: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
