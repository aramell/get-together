import { NextRequest, NextResponse } from 'next/server';
import { signupUser } from '@/lib/services/authService';
import { signupSchema } from '@/lib/validation/authSchema';
import { ZodError } from 'zod';

/**
 * POST /api/auth/signup
 * Create a new user account with email and password
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body with Zod
    const validatedData = signupSchema.pick({ email: true, password: true }).parse({
      email: body.email,
      password: body.password,
    });

    // Call signup service
    const result = await signupUser(validatedData.email, validatedData.password);

    // Return response based on result
    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      // Determine status code based on error type
      let statusCode = 400;

      if (result.error === 'EMAIL_EXISTS') {
        statusCode = 409;
      } else if (result.errorCode === 'VALIDATION_ERROR') {
        statusCode = 422;
      } else if (result.error === 'INVALID_PASSWORD') {
        statusCode = 422;
      }

      return NextResponse.json(result, { status: statusCode });
    }
  } catch (error) {
    // Handle validation errors
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: validationErrors,
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    // Handle unexpected errors
    console.error('Signup API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/auth/signup
 * Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  // Get the origin from the request
  const origin = request.headers.get('origin') || '';

  // Define allowed origins (update these based on your deployment)
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_APP_URL, // Production domain from env
  ].filter(Boolean);

  // Check if request origin is allowed
  const isOriginAllowed = allowedOrigins.includes(origin);

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': isOriginAllowed ? origin : '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}
