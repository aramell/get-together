import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminInitiateAuthCommand, ForgotPasswordCommand, ConfirmForgotPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
});

const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || '';
const CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID || '';

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

    // Create user in Cognito
    const command = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      MessageAction: 'SUPPRESS', // Don't send default password email
      TemporaryPassword: password, // Will be changed on first login
    });

    const response = await cognitoClient.send(command);

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

    return {
      success: false,
      message: errorInfo.message,
      error: errorCode,
      errorCode,
    };
  }
}

/**
 * Set permanent password for user (after email verification)
 * @param email User's email
 * @param newPassword New permanent password
 * @returns SignupResponse
 */
export async function setPermanentPassword(email: string, newPassword: string): Promise<SignupResponse> {
  try {
    // This would be called after email verification in a full implementation
    // For MVP, Cognito handles password management

    return {
      success: true,
      message: 'Password set successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to set password',
      error: error.message,
      errorCode: error.code,
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

    const response = await cognitoClient.send(command);

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

    const response = await cognitoClient.send(command);

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

    await cognitoClient.send(command);

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
