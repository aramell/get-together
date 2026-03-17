import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation/authSchema';
import { loginUser } from '@/lib/services/authService';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input with Zod
    const validatedData = loginSchema.parse(body);

    // Call auth service
    const result = await loginUser(validatedData.email, validatedData.password);

    // Return success response
    if (result.success) {
      // Store tokens in secure HTTP-only cookie
      const response = NextResponse.json(
        {
          success: true,
          message: result.message,
          accessToken: result.accessToken,
          idToken: result.idToken,
          userId: result.userId,
        },
        { status: 200 }
      );

      // Set HTTP-only secure cookies for tokens
      if (result.accessToken) {
        response.cookies.set('accessToken', result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 86400, // 24 hours
          path: '/',
        });
      }

      if (result.idToken) {
        response.cookies.set('idToken', result.idToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 86400, // 24 hours
          path: '/',
        });
      }

      if (result.refreshToken) {
        response.cookies.set('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 2592000, // 30 days
          path: '/',
        });
      }

      return response;
    }

    // Handle error responses based on error code
    const statusCode = getStatusCode(result.errorCode);
    return NextResponse.json(
      {
        success: false,
        message: result.message,
        errorCode: result.errorCode,
        error: result.error,
      },
      { status: statusCode }
    );
  } catch (error) {
    // Handle Zod validation errors
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

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON in request body',
          errorCode: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    const err = error as any;
    console.error('Login API error:', {
      message: err?.message,
      code: err?.code,
      name: err?.name,
      stack: err?.stack,
      fullError: error,
    });
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * Map error codes to HTTP status codes
 */
function getStatusCode(errorCode?: string): number {
  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 422,
    UNAUTHORIZED: 401,
    EMAIL_NOT_CONFIRMED: 403,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
  };

  return statusMap[errorCode || ''] || 500;
}
