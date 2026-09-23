import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ZodError } from 'zod';
import { signInViaMagicLink } from '@/lib/services/magicLinkService';

const magicLinkSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = magicLinkSchema.parse(body);

    const result = await signInViaMagicLink(token);

    if (!result.success) {
      if (result.errorCode === 'INTERNAL_SERVER_ERROR') {
        return NextResponse.json(
          { success: false, message: 'Server error', errorCode: result.errorCode },
          { status: 500 }
        );
      }

      // AC1, AC2, AC6: structured 410 so the client can show a specific
      // expired/already-used/invalid message and carry target context into
      // a re-request, instead of one generic "invalid or expired" result.
      const reason =
        result.errorCode === 'EXPIRED' ? 'expired' : result.errorCode === 'ALREADY_USED' ? 'already_used' : 'invalid';

      return NextResponse.json(
        {
          success: false,
          reason,
          targetType: result.targetType ?? undefined,
          targetId: result.targetId ?? undefined,
        },
        { status: 410 }
      );
    }

    // Same cookie pattern as /api/auth/login (AC7): the session behaves
    // identically to an email/password login from here on.
    const response = NextResponse.json(
      { success: true, redirectPath: result.redirectPath },
      { status: 200 }
    );

    response.cookies.set('accessToken', result.accessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400,
      path: '/',
    });

    response.cookies.set('idToken', result.idToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400,
      path: '/',
    });

    response.cookies.set('refreshToken', result.refreshToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2592000,
      path: '/',
    });

    return response;
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

    console.error('Magic link sign-in error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, message: 'Server error', errorCode: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
