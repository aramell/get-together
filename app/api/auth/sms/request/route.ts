import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { smsMagicLinkRequestSchema } from '@/lib/validation/smsAuthSchema';
import {
  hashPhoneNumber,
  generateMagicToken,
  checkAndRecordRateLimit,
  sendMagicLinkSms,
} from '@/lib/services/smsService';
import { createToken } from '@/lib/db/queries/smsTokens';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, targetType, targetId } = smsMagicLinkRequestSchema.parse(body);

    const phoneHash = hashPhoneNumber(phoneNumber);

    // AC5: Rate limiting -- checked before any token is generated or SMS sent
    if (!checkAndRecordRateLimit(phoneHash)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many requests. Please wait before requesting a new link.',
          errorCode: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    const { rawToken, tokenHash, expiresAt } = generateMagicToken();

    await createToken(phoneHash, tokenHash, expiresAt, targetType, targetId);
    await sendMagicLinkSms(phoneNumber, rawToken);

    // AC6: Same response whether or not an account exists for this number --
    // never reveal registration status.
    return NextResponse.json(
      {
        success: true,
        message: `Check your texts — we sent a link to ${phoneNumber}`,
      },
      { status: 200 }
    );
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

    // AC4: never log the raw request body / phone number
    console.error('SMS magic link request error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, message: 'Server error', errorCode: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
