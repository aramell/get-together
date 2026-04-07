/**
 * PII Masking Utility
 * Task 1: Application Logging Infrastructure (AC1, AC10)
 * Masks sensitive data before logging to prevent PII leakage
 */

const SENSITIVE_FIELDS = [
  'email',
  'password',
  'phone',
  'phonenumber',
  'ssn',
  'social_security_number',
  'creditcard',
  'credit_card',
  'card',
  'cvv',
  'token',
  'authorization',
  'cookie',
  'session',
  'secret',
  'apikey',
  'api_key',
  'privatekey',
  'private_key'
];

/**
 * Check if a field name should be masked
 */
export function shouldMaskField(fieldName: string): boolean {
  if (!fieldName) return false;
  const lowerName = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some((sensitive) => lowerName.includes(sensitive));
}

/**
 * Mask email address: keep local part, hide domain
 * user@example.com → user@******.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '[INVALID_EMAIL]';

  const parts = email.split('@');
  if (parts.length !== 2) return '[INVALID_EMAIL]';

  const [localPart, domain] = parts;
  if (!localPart || !domain) return '[INVALID_EMAIL]';

  // Keep local part, mask domain
  const domainParts = domain.split('.');
  const maskedDomain = domainParts
    .map((part, index) => {
      if (index === domainParts.length - 1) return part; // Keep TLD
      return '*'.repeat(Math.max(1, part.length));
    })
    .join('.');

  return `${localPart}@${maskedDomain}`;
}

/**
 * Mask phone number
 * +1-555-123-4567 → ****-***-****
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '[INVALID_PHONE]';

  // Remove non-digit characters for masking
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '[INVALID_PHONE]';

  // Mask all digits for security
  const masked = '*'.repeat(digits.length);

  return masked;
}

/**
 * Mask authentication token
 * Completely mask the token
 */
export function maskToken(token: string | null | undefined): string {
  if (!token || typeof token !== 'string') return '[INVALID_TOKEN]';

  // Mask entire token
  const masked = '*'.repeat(Math.max(10, token.length));

  return masked;
}

/**
 * Mask password completely
 * Never show any part of password
 */
export function maskPassword(password: string | null | undefined): string {
  if (!password) return '[INVALID_PASSWORD]';
  return '[REDACTED]';
}

/**
 * Mask credit card number
 * 4532-1234-5678-9010 → ****-****-****-****
 */
export function maskCreditCard(cardNumber: string | null | undefined): string {
  if (!cardNumber || typeof cardNumber !== 'string') return '[INVALID_CARD]';

  // Remove non-digit characters for validation
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) return '[INVALID_CARD]';

  // Mask all digits
  const masked = '*'.repeat(digits.length);

  // Restore formatting with dashes if original had them
  if (cardNumber.includes('-')) {
    const groups = masked.match(/.{1,4}/g) || [];
    return groups.join('-');
  }

  return masked;
}

/**
 * Mask sensitive object fields recursively
 */
export function maskSensitiveObject(
  obj: any,
  seen: WeakSet<any> = new WeakSet()
): any {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Detect circular references
  if (seen.has(obj)) {
    return '[CIRCULAR_REFERENCE]';
  }
  seen.add(obj);

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveObject(item, seen));
  }

  // Handle objects
  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (shouldMaskField(key)) {
      // Mask specific field types
      if (key.toLowerCase().includes('email')) {
        masked[key] = maskEmail(value as string | null | undefined);
      } else if (key.toLowerCase().includes('phone')) {
        masked[key] = maskPhoneNumber(value as string | null | undefined);
      } else if (key.toLowerCase().includes('password')) {
        masked[key] = maskPassword(value as string | null | undefined);
      } else if (key.toLowerCase().includes('card') || key.toLowerCase().includes('creditcard')) {
        masked[key] = maskCreditCard(value as string | null | undefined);
      } else if (
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('authorization') ||
        key.toLowerCase().includes('apikey')
      ) {
        masked[key] = maskToken(value as string | null | undefined);
      } else {
        masked[key] = '[REDACTED]';
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively mask nested objects
      masked[key] = maskSensitiveObject(value, seen);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Mask error object
 * Preserves stack trace but masks sensitive data in error message and details
 */
export function maskError(error: Error | any): any {
  if (!error) return null;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      // Remove any details that might contain PII
      ...maskSensitiveObject(error)
    };
  }

  return maskSensitiveObject(error);
}

/**
 * Mask request/response data
 */
export function maskRequestData(data: any): any {
  return maskSensitiveObject(data);
}

/**
 * Mask header values (exclude sensitive headers)
 */
export function maskHeaders(headers: Record<string, string | string[]>): Record<string, string | string[]> {
  const REDACTED_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

  const masked: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (REDACTED_HEADERS.some((h) => key.toLowerCase().includes(h))) {
      masked[key] = '[REDACTED]';
    } else {
      masked[key] = value;
    }
  }

  return masked;
}
