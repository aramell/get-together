/**
 * Compliance Validator
 * Task 9: Compliance & PII Handling (AC10)
 * Validates logs for PII, manages GDPR data extraction, and audits compliance
 */

import { shouldMaskField, maskEmail, maskPhoneNumber, maskPassword, maskToken } from './pii-masking';

/**
 * Check if a value contains unmasked PII
 */
export function containsUnmaskedPII(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'string') return false;

  const str = value;
  const lowerStr = str.toLowerCase();

  // Check for already-masked values
  if (str.startsWith('[REDACTED]') || str.startsWith('[INVALID_')) {
    return false;
  }

  // Email pattern: something@something.something (unmask check)
  // Real emails have readable domain parts, masked have ****
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str)) {
    // Check if domain has at least one non-masked part beyond TLD
    const parts = str.split('@');
    if (parts.length === 2) {
      const domainParts = parts[1].split('.');
      // If domain part is not fully masked, it's unmasked
      if (domainParts.some((part) => part.length > 0 && !part.includes('*'))) {
        return true;
      }
    }
  }

  // Phone pattern: digits with optional formatting (phone numbers have hyphens, parentheses, or direct digits)
  // Masked phones show as "1555*******" or similar with asterisks
  if (/^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(str)) {
    // Check if it's the original format (not masked with asterisks)
    if (!str.includes('*')) {
      return true;
    }
  }

  // Credit card pattern: XXXX-XXXX-XXXX-XXXX or similar
  if (/^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$/.test(str)) {
    return true;
  }

  // Password: anything that doesn't start with [REDACTED] and is in a password field
  // This is handled by field name check in validateLogForPII

  // JWT/Token pattern: eyJ... prefix indicates unmasked JWT
  if (lowerStr.startsWith('eyj') && str.length > 20 && !str.includes('*')) {
    return true;
  }

  // API key patterns
  if ((lowerStr.startsWith('sk_') || lowerStr.startsWith('pk_')) && str.length > 20 && !str.includes('*')) {
    return true;
  }

  return false;
}

/**
 * Validate a single log entry for unmasked PII
 */
export function validateLogForPII(log: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(log)) {
    const fieldName = String(key).toLowerCase();

    // Check if field name suggests PII
    if (shouldMaskField(fieldName)) {
      // For password fields, anything that's not [REDACTED] is unmasked
      if (fieldName.includes('password')) {
        if (value !== '[REDACTED]' && value !== '[INVALID_PASSWORD]') {
          return true; // Unmasked password found
        }
      }
      // For token/auth fields, check if properly masked
      else if (fieldName.includes('token') || fieldName.includes('authorization')) {
        if (containsUnmaskedPII(value)) {
          return true;
        }
        // Also check if it doesn't start with masked pattern
        if (typeof value === 'string' && !value.startsWith('[INVALID_TOKEN]') && !value.includes('****')) {
          // If it's a JWT or similar token and not masked, it's PII
          if (value.startsWith('eyJ') || value.startsWith('sk_') || value.startsWith('pk_')) {
            return true;
          }
        }
      }
      // For other PII fields
      else if (containsUnmaskedPII(value)) {
        return true; // PII found
      }
    }

    // Recursively check nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (validateLogForPII(value)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate that no logs contain unmasked PII
 */
export function validateNoUnmaskedPII(logs: Record<string, any>[]): boolean {
  for (const log of logs) {
    if (validateLogForPII(log)) {
      return false; // Found unmasked PII
    }
  }
  return true; // All logs clean
}

/**
 * Extract user's data for GDPR deletion requests
 */
export function extractGDPRData(
  userId: string,
  auditLogs: any[],
  startDate?: Date,
  endDate?: Date
): any[] {
  let filtered = auditLogs.filter((log) => log.userId === userId);

  if (startDate || endDate) {
    filtered = filtered.filter((log) => {
      const logTime = new Date(log.timestamp).getTime();
      if (startDate && logTime < startDate.getTime()) return false;
      if (endDate && logTime > endDate.getTime()) return false;
      return true;
    });
  }

  return filtered;
}

/**
 * Create GDPR data export for user
 */
export function createGDPRDataExport(userId: string, auditLogs: any[]): any {
  const logs = extractGDPRData(userId, auditLogs);

  return {
    userId,
    logs,
    exportDate: new Date(),
    totalEntries: logs.length,
    dataCategories: {
      authentication: logs.filter((l) => l.action?.includes('login') || l.action?.includes('signup')).length,
      dataAccess: logs.filter((l) => l.action?.includes('view') || l.action?.includes('read')).length,
      dataModification: logs.filter((l) => l.action?.includes('create') || l.action?.includes('update') || l.action?.includes('delete')).length,
      adminActions: logs.filter((l) => l.isAdmin).length
    }
  };
}

/**
 * Compliance Validator Class
 * Provides batch validation and compliance auditing
 */
export class ComplianceValidator {
  /**
   * Validate a batch of logs for PII
   */
  validateBatch(logs: Record<string, any>[]): { piiFound: boolean; offendingLogs: number[] } {
    const offendingLogs: number[] = [];

    for (let i = 0; i < logs.length; i++) {
      if (validateLogForPII(logs[i])) {
        offendingLogs.push(i);
      }
    }

    return {
      piiFound: offendingLogs.length > 0,
      offendingLogs
    };
  }

  /**
   * Audit logs for compliance
   */
  auditForCompliance(logs: Record<string, any>[]): {
    compliant: boolean;
    piiViolations: any[];
    violationCount: number;
  } {
    const violations: any[] = [];

    for (let i = 0; i < logs.length; i++) {
      if (validateLogForPII(logs[i])) {
        violations.push({
          logIndex: i,
          log: logs[i],
          timestamp: new Date()
        });
      }
    }

    return {
      compliant: violations.length === 0,
      piiViolations: violations,
      violationCount: violations.length
    };
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(logs: Record<string, any>[]): {
    totalLogs: number;
    compliant: boolean;
    piiViolationCount: number;
    timestamp: Date;
    reportId: string;
  } {
    const audit = this.auditForCompliance(logs);

    return {
      totalLogs: logs.length,
      compliant: audit.compliant,
      piiViolationCount: audit.violationCount,
      timestamp: new Date(),
      reportId: `report-${Date.now()}`
    };
  }
}
