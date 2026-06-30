import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/validation/resetSchema';
import { forgotPassword } from '@/lib/services/authService';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = forgotPasswordSchema.parse(body);

    const result = await forgotPassword(validatedData.email);

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: result.message,
          codeDeliveryDetails: result.codeDeliveryDetails,
        },
        { status: 200 }
      );
    }

    const statusCode = result.errorCode === 'VALIDATION_ERROR' ? 422 : 404;
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

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON', errorCode: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', errorCode: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
