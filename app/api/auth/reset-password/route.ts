import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/validation/resetSchema';
import { resetPassword } from '@/lib/services/authService';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    const result = await resetPassword(
      validatedData.email,
      validatedData.code,
      validatedData.newPassword
    );

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: result.message,
        },
        { status: 200 }
      );
    }

    const statusCodeMap: Record<string, number> = {
      VALIDATION_ERROR: 422,
      CODE_EXPIRED: 400,
      ExpiredCodeException: 400,
      UNAUTHORIZED: 401,
      USER_NOT_FOUND: 404,
    };

    const statusCode = statusCodeMap[result.errorCode || ''] || 500;

    return NextResponse.json(
      {
        success: false,
        message: result.message,
        errorCode: result.errorCode,
      },
      { status: statusCode }
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

    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', errorCode: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
