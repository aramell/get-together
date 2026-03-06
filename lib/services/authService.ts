import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminInitiateAuthCommand, ForgotPasswordCommand, ConfirmForgotPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

// Lazy initialize Cognito client to ensure env vars are available at runtime
let cognitoClient: CognitoIdentityProviderClient | null = null;

function getCognitoClient(): CognitoIdentityProviderClient {
  if (!cognitoClient) {
    const config: any = {
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    };

    // Add credentials if available in environment (Amplify uses ACCESS_KEY_ID and SECRET_ACCESS_KEY)
    const accessKeyId = process.env.ACCESS_KEY_ID;
    const secretAccessKey = process.env.SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      config.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    cognitoClient = new CognitoIdentityProviderClient(config);
  }

  return cognitoClient;
}

const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || '';
const CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID || '';

// Validate Cognito configuration at service initialization
function validateCognitoConfig(): { isValid: boolean; error?: string } {
  if (!USER_POOL_ID) {
    return {
      isValid: false,
      error: 'NEXT_PUBLIC_USER_POOL_ID environment variable is not configured',
    };
  }
  if (!CLIENT_ID) {
    return {
      isValid: false,
      error: 'NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID environment variable is not configured',
    };
  }
  return { isValid: true };
}

export interface SignupResponse {
  success: boolean;
  message: string;
  userId?: string;
  error?: string;
  errorCode?: string;
}

export interface SignupError {
  code: string;
  message: string;
  statusCode: number;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  userId?: string;
  error?: string;
  errorCode?: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  codeDeliveryDetails?: {
    destination: string;
    deliveryMedium: string;
  };
  error?: string;
  errorCode?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  error?: string;
  errorCode?: string;
}

// Error code mapping for standardized responses
const errorCodeMap: Record<string, { message: string; statusCode: number }> = {
  UsernameExistsException: {
    message: 'This email is already registered',
    statusCode: 409,
  },
  InvalidParameterException: {
    message: 'Invalid input provided',
    statusCode: 422,
  },
  InvalidPasswordException: {
    message: 'Password does not meet requirements',
    statusCode: 422,
  },
  TooManyRequestsException: {
    message: 'Too many signup attempts. Please try again later.',
    statusCode: 429,
  },
};

// Error code mapping for login-specific errors
const loginErrorCodeMap: Record<string, { message: string; statusCode: number }> = {
  NotAuthorizedException: {
    message: 'Invalid email or password',
    statusCode: 401,
  },
  UserNotConfirmedException: {
    message: 'Please confirm your email before logging in',
    statusCode: 403,
  },
  UserNotFoundException: {
    message: 'Invalid email or password',
    statusCode: 401,
  },
  TooManyRequestsException: {
    message: 'Too many login attempts. Please try again later.',
    statusCode: 429,
  },
};

// Error code mapping for password reset errors
const resetErrorCodeMap: Record<string, { message: string; statusCode: number }> = {
  UserNotFoundException: {
    message: 'We cannot find an account with that email address',
    statusCode: 404,
  },
  UserNotConfirmedException: {
    message: 'Please confirm your email before resetting your password',
    statusCode: 403,
  },
  InvalidParameterException: {
    message: 'Invalid input provided',
    statusCode: 422,
  },
  TooManyRequestsException: {
    message: 'Too many password reset attempts. Please try again later.',
    statusCode: 429,
  },
  ExpiredCodeException: {
    message: 'This reset link has expired. Please request a new one.',
    statusCode: 400,
  },
  InvalidPasswordException: {
    message: 'Password does not meet requirements',
    statusCode: 422,
  },
  NotAuthorizedException: {
    message: 'Invalid reset code or email',
    statusCode: 401,
  },
};

/**
 * Create a new user in Cognito
 * @param email User's email address
 * @param password User's password
 * @returns SignupResponse with success status or error details
 */
export async function signupUser(email: string, password: string): Promise<SignupResponse> {
  try {
    // Validate Cognito configuration
    const configValidation = validateCognitoConfig();
    if (!configValidation.isValid) {
      console.error('Cognito configuration error:', configValidation.error);
      return {
        success: false,
        message: 'Service temporarily unavailable. Please try again later.',
        error: 'SERVICE_UNAVAILABLE',
        errorCode: 'SERVICE_CONFIG_ERROR',
      };
    }

    // Validate inputs (server-side validation using Zod schemas)
    if (!email || typeof email !== 'string') {
      return {
        success: false,
        message: 'Invalid email provided',
        error: 'INVALID_EMAIL',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Import schemas for validation (at top of file: import { emailSchema, passwordSchema } from '@/lib/validation/authSchema')
    // For now, validate password manually against requirements
    if (!password || typeof password !== 'string') {
      return {
        success: false,
        message: 'Password is required',
        error: 'INVALID_PASSWORD',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (password.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters',
        error: 'INVALID_PASSWORD',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        success: false,
        message: 'Password must contain at least one uppercase letter',
        error: 'INVALID_PASSWORD',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        success: false,
        message: 'Password must contain at least one number',
        error: 'INVALID_PASSWORD',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Create user in Cognito
    const command = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      MessageAction: 'RESEND', // Send welcome email with temporary password
      TemporaryPassword: password, // Will be changed on first login
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
        {
          Name: 'email_verified',
          Value: 'false',
        },
      ],
    });

    const response = await getCognitoClient().send(command);

    if (response.User?.Username) {
      // Send email verification
      // Note: In production, Cognito would send verification email automatically
      // For MVP, we'll rely on Cognito's built-in email verification

      return {
        success: true,
        message: 'Signup successful! Check your email to verify your account.',
        userId: response.User.Username,
      };
    }

    return {
      success: false,
      message: 'Failed to create user account',
      error: 'UNKNOWN_ERROR',
      errorCode: 'UNKNOWN_ERROR',
    };
  } catch (error: any) {
    const errorCode = error.name || error.code || 'UNKNOWN_ERROR';
    const errorInfo = errorCodeMap[errorCode] || {
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
    };

    console.error('Signup error:', { errorCode, message: error.message });

    // Map Cognito errors to standardized error codes
    let standardizedError = errorCode;
    if (errorCode === 'UsernameExistsException') {
      standardizedError = 'EMAIL_EXISTS';
    } else if (errorCode === 'InvalidParameterException' || errorCode === 'InvalidPasswordException') {
      standardizedError = 'INVALID_INPUT';
    } else if (errorCode === 'TooManyRequestsException') {
      standardizedError = 'RATE_LIMITED';
    }

    return {
      success: false,
      message: errorInfo.message,
      error: standardizedError,
      errorCode: standardizedError,
    };
  }
}

/**
 * Authenticate user with email and password via Cognito
 * @param email User's email address
 * @param password User's password
 * @returns LoginResponse with tokens or error details
 */
export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  try {
    // Validate inputs (server-side validation)
    if (!email || typeof email !== 'string') {
      return {
        success: false,
        message: 'Invalid email provided',
        error: 'INVALID_EMAIL',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters',
        error: 'INVALID_PASSWORD',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Authenticate with Cognito using AdminInitiateAuth
    const command = new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await getCognitoClient().send(command);

    if (response.AuthenticationResult?.AccessToken) {
      return {
        success: true,
        message: 'Login successful',
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
        userId: email,
      };
    }

    return {
      success: false,
      message: 'Failed to authenticate user',
      error: 'UNKNOWN_ERROR',
      errorCode: 'UNKNOWN_ERROR',
    };
  } catch (error: any) {
    const errorCode = error.name || error.code || 'UNKNOWN_ERROR';
    const errorInfo = loginErrorCodeMap[errorCode] || {
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
    };

    console.error('Login error:', { errorCode, message: error.message });

    return {
      success: false,
      message: errorInfo.message,
      error: errorCode,
      errorCode,
    };
  }
}

/**
 * Initiate password reset flow via email
 * @param email User's email address
 * @returns ForgotPasswordResponse with code delivery details or error
 */
export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  try {
    // Validate input
    if (!email || typeof email !== 'string') {
      return {
        success: false,
        message: 'Invalid email provided',
        error: 'INVALID_EMAIL',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Request password reset from Cognito
    const command = new ForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
    });

    const response = await getCognitoClient().send(command);

    if (response.CodeDeliveryDetails) {
      return {
        success: true,
        message: 'Password reset code sent to email',
        codeDeliveryDetails: {
          destination: response.CodeDeliveryDetails.Destination || '',
          deliveryMedium: response.CodeDeliveryDetails.DeliveryMedium || '',
        },
      };
    }

    return {
      success: false,
      message: 'Failed to initiate password reset',
      error: 'UNKNOWN_ERROR',
      errorCode: 'UNKNOWN_ERROR',
    };
  } catch (error: any) {
    const errorCode = error.name || error.code || 'UNKNOWN_ERROR';
    const errorInfo = resetErrorCodeMap[errorCode] || {
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
    };

    console.error('Forgot password error:', { errorCode, message: error.message });

    return {
      success: false,
      message: errorInfo.message,
      error: errorCode,
      errorCode,
    };
  }
}

/**
 * Complete password reset with confirmation code
 * @param email User's email address
 * @param code Confirmation code from email
 * @param newPassword New password
 * @returns ResetPasswordResponse with success or error details
 */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<ResetPasswordResponse> {
  try {
    // Validate inputs
    if (!email || typeof email !== 'string') {
      return {
        success: false,
        message: 'Invalid email provided',
        error: 'INVALID_EMAIL',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!code || typeof code !== 'string') {
      return {
        success: false,
        message: 'Reset code is required',
        error: 'INVALID_CODE',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters',
        error: 'INVALID_PASSWORD',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Confirm password reset with Cognito
    const command = new ConfirmForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    });

    await getCognitoClient().send(command);

    return {
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    };
  } catch (error: any) {
    const errorCode = error.name || error.code || 'UNKNOWN_ERROR';
    const errorInfo = resetErrorCodeMap[errorCode] || {
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
    };

    console.error('Reset password error:', { errorCode, message: error.message });

    return {
      success: false,
      message: errorInfo.message,
      error: errorCode,
      errorCode,
    };
  }
}

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  profile?: UserProfile;
  error?: string;
  errorCode?: string;
}

export interface EmailChangeResponse {
  success: boolean;
  message: string;
  error?: string;
  errorCode?: string;
}

/**
 * Get user profile from database
 * Fetches user data from Postgres users table via API
 */
export async function getUserProfile(userId: string): Promise<UpdateProfileResponse> {
  try {
    if (!userId) {
      return {
        success: false,
        message: 'User ID is required',
        errorCode: 'INVALID_USER_ID',
      };
    }

    // API call to fetch profile - will be implemented in API endpoint
    const response = await fetch('/api/users/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to retrieve user profile',
        errorCode: 'PROFILE_FETCH_ERROR',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'User profile retrieved',
      profile: data.profile,
    };
  } catch (error: any) {
    console.error('Get profile error:', error);
    return {
      success: false,
      message: 'Failed to retrieve user profile',
      errorCode: 'PROFILE_FETCH_ERROR',
    };
  }
}

/**
 * Update user profile (display_name and/or avatar_url)
 * Updates both Cognito and Postgres database
 */
export async function updateUserProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<UpdateProfileResponse> {
  try {
    if (!userId) {
      return {
        success: false,
        message: 'User ID is required',
        errorCode: 'INVALID_USER_ID',
      };
    }

    const response = await fetch('/api/users/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to update profile',
        errorCode: errorData.errorCode || 'UPDATE_PROFILE_ERROR',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Profile updated successfully',
      profile: data.profile,
    };
  } catch (error: any) {
    const errorCode = error.name || error.code || 'UPDATE_PROFILE_ERROR';
    console.error('Update profile error:', { errorCode, message: error.message });

    return {
      success: false,
      message: 'Failed to update profile',
      errorCode,
    };
  }
}

/**
 * Request email change with confirmation
 * Sends confirmation email to new email address
 */
export async function requestEmailChange(
  userId: string,
  newEmail: string
): Promise<EmailChangeResponse> {
  try {
    if (!userId || !newEmail) {
      return {
        success: false,
        message: 'User ID and new email are required',
        errorCode: 'INVALID_INPUT',
      };
    }

    const response = await fetch('/api/users/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ new_email: newEmail }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to process email change',
        errorCode: errorData.errorCode || 'EMAIL_CHANGE_ERROR',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || `Confirmation email sent to ${newEmail}`,
    };
  } catch (error: any) {
    const errorCode = error.name || error.code || 'EMAIL_CHANGE_ERROR';
    console.error('Email change request error:', { errorCode, message: error.message });

    return {
      success: false,
      message: 'Failed to process email change request',
      errorCode,
    };
  }
}

/**
 * Confirm email change with verification token
 * Updates email in both Cognito and Postgres
 */
export async function confirmEmailChange(
  token: string
): Promise<EmailChangeResponse> {
  try {
    if (!token) {
      return {
        success: false,
        message: 'Confirmation token is required',
        errorCode: 'MISSING_TOKEN',
      };
    }

    const response = await fetch('/api/users/confirm-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 400) {
        return {
          success: false,
          message: 'Confirmation link has expired. Please request a new one.',
          errorCode: 'TOKEN_EXPIRED',
        };
      }
      return {
        success: false,
        message: errorData.message || 'Failed to confirm email change',
        errorCode: errorData.errorCode || 'CONFIRM_EMAIL_ERROR',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Email successfully updated',
    };
  } catch (error: any) {
    const errorCode = error.name || error.code || 'CONFIRM_EMAIL_ERROR';
    console.error('Email confirmation error:', { errorCode, message: error.message });

    return {
      success: false,
      message: 'Failed to confirm email change',
      errorCode,
    };
  }
}
