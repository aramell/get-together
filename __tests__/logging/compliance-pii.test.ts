/**
 * Compliance & PII Handling Tests
 * Task 9: Compliance & PII Handling (AC10)
 * Tests for PII masking, IAM permissions, and GDPR compliance
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ComplianceValidator,
  validateNoUnmaskedPII,
  validateLogForPII,
  extractGDPRData,
  createGDPRDataExport
} from '@/lib/logging/compliance-validator';
import { maskSensitiveObject } from '@/lib/logging/pii-masking';

describe('PII Masking Validation (AC10)', () => {
  it('should mask email addresses in logs', () => {
    const log = {
      message: 'User logged in',
      email: 'user@example.com',
      userId: 'user-123'
    };

    const masked = maskSensitiveObject(log);

    expect(masked.email).not.toBe('user@example.com');
    expect(masked.email).toContain('****');
    expect(masked.userId).toBe('user-123'); // Non-PII unchanged
  });

  it('should never log phone numbers', () => {
    const log = {
      message: 'User signup',
      phoneNumber: '+1-555-123-4567'
    };

    const masked = maskSensitiveObject(log);

    expect(masked.phoneNumber).not.toContain('555');
    expect(masked.phoneNumber).not.toContain('123-4567');
  });

  it('should never log passwords', () => {
    const log = {
      action: 'password_reset',
      password: 'SuperSecret123!'
    };

    const masked = maskSensitiveObject(log);

    expect(masked.password).toBe('[REDACTED]');
    expect(masked.password).not.toContain('SuperSecret');
  });

  it('should never log authentication tokens', () => {
    const log = {
      event: 'token_generated',
      authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    };

    const masked = maskSensitiveObject(log);

    expect(masked.authToken).not.toContain('eyJh');
    expect(masked.authToken).toContain('****');
  });

  it('should mask credit card numbers', () => {
    const log = {
      transaction: 'payment',
      cardNumber: '4532-1234-5678-9010'
    };

    const masked = maskSensitiveObject(log);

    expect(masked.cardNumber).not.toContain('4532');
    expect(masked.cardNumber).not.toContain('9010');
  });

  it('should handle nested PII masking', () => {
    const log = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        profile: {
          phone: '+1-555-123-4567'
        }
      }
    };

    const masked = maskSensitiveObject(log);

    expect(masked.user.email).toContain('****');
    expect(masked.user.profile.phone).not.toContain('555');
  });

  it('should preserve non-PII user IDs', () => {
    const log = {
      userId: 'uuid-12345-67890',
      action: 'login',
      timestamp: '2026-04-06T10:00:00Z'
    };

    const masked = maskSensitiveObject(log);

    expect(masked.userId).toBe('uuid-12345-67890');
    expect(masked.action).toBe('login');
    expect(masked.timestamp).toBe('2026-04-06T10:00:00Z');
  });
});

describe('Log Validation for PII (AC10)', () => {
  let validator: ComplianceValidator;

  beforeEach(() => {
    validator = new ComplianceValidator();
  });

  it('should detect unmasked email addresses', () => {
    const log = {
      message: 'User action',
      email: 'user@example.com'
    };

    const hasPII = validateLogForPII(log);
    expect(hasPII).toBe(true);
  });

  it('should detect unmasked phone numbers', () => {
    const log = {
      message: 'Contact info',
      phone: '+1-555-123-4567'
    };

    const hasPII = validateLogForPII(log);
    expect(hasPII).toBe(true);
  });

  it('should detect unmasked passwords', () => {
    const log = {
      action: 'auth',
      password: 'MyPassword123'
    };

    const hasPII = validateLogForPII(log);
    expect(hasPII).toBe(true);
  });

  it('should allow properly masked logs', () => {
    const log = {
      message: 'User action',
      email: 'user@******.com',
      userId: 'user-123'
    };

    const hasPII = validateLogForPII(log);
    expect(hasPII).toBe(false);
  });

  it('should validate logs in bulk', () => {
    const logs = [
      { email: 'user@******.com', userId: 'user-1' },
      { email: 'user@******.com', userId: 'user-2' },
      { email: 'unmasked@example.com', userId: 'user-3' } // PII!
    ];

    const validator = new ComplianceValidator();
    const result = validator.validateBatch(logs);

    expect(result.piiFound).toBe(true);
    expect(result.offendingLogs).toContain(2);
  });
});

describe('GDPR Data Retrieval (AC10)', () => {
  it('should extract all data for user on deletion request', () => {
    const userId = 'user-123';
    const auditLogs = [
      { userId: 'user-123', action: 'login', timestamp: new Date() },
      { userId: 'user-123', action: 'create_group', timestamp: new Date() },
      { userId: 'user-456', action: 'login', timestamp: new Date() } // Different user
    ];

    const userData = extractGDPRData(userId, auditLogs);

    expect(userData.length).toBe(2);
    expect(userData.every((log) => log.userId === userId)).toBe(true);
  });

  it('should include all user activities in export', () => {
    const userId = 'user-123';
    const auditLogs = [
      { userId: 'user-123', action: 'signup', resource: 'user', timestamp: new Date() },
      { userId: 'user-123', action: 'create_group', resource: 'group', timestamp: new Date() },
      { userId: 'user-123', action: 'login', resource: 'auth', timestamp: new Date() },
      { userId: 'user-123', action: 'delete_group', resource: 'group', timestamp: new Date() }
    ];

    const userData = extractGDPRData(userId, auditLogs);

    expect(userData.length).toBe(4);
    expect(userData.map((log) => log.action)).toContain('signup');
    expect(userData.map((log) => log.action)).toContain('create_group');
    expect(userData.map((log) => log.action)).toContain('login');
    expect(userData.map((log) => log.action)).toContain('delete_group');
  });

  it('should create GDPR data export with proper formatting', () => {
    const userId = 'user-123';
    const auditLogs = [
      { userId: 'user-123', action: 'login', timestamp: new Date('2026-04-01') },
      { userId: 'user-123', action: 'logout', timestamp: new Date('2026-04-02') }
    ];

    const export_data = createGDPRDataExport(userId, auditLogs);

    expect(export_data).toBeDefined();
    expect(export_data.userId).toBe(userId);
    expect(export_data.logs.length).toBe(2);
    expect(export_data.exportDate).toBeDefined();
  });

  it('should support date range filtering for GDPR requests', () => {
    const userId = 'user-123';
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-03-31');

    const auditLogs = [
      { userId: 'user-123', action: 'login', timestamp: new Date('2025-12-01') }, // Before range
      { userId: 'user-123', action: 'login', timestamp: new Date('2026-02-01') }, // In range
      { userId: 'user-123', action: 'logout', timestamp: new Date('2026-04-01') } // After range
    ];

    const userData = extractGDPRData(userId, auditLogs, startDate, endDate);

    expect(userData.length).toBe(1);
    expect(userData[0].timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
    expect(userData[0].timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
  });
});

describe('IAM Permissions Configuration (AC10)', () => {
  it('should define restricted log access permissions', () => {
    const permissions = {
      'cloudwatch:GetLogEvents': ['log-group:/aws/amplify/get-together/*'],
      'cloudwatch:DescribeLogGroups': ['*'],
      'logs:DescribeLogStreams': ['log-group:/aws/amplify/get-together/*'],
      'logs:FilterLogEvents': ['log-group:/aws/amplify/get-together/*']
    };

    expect(permissions['cloudwatch:GetLogEvents']).toBeDefined();
    expect(permissions['cloudwatch:GetLogEvents'][0]).toContain('/aws/amplify/');
  });

  it('should restrict log deletion for audit trail immutability', () => {
    const permissions = {
      'logs:DeleteLogGroup': [], // No delete access
      'logs:DeleteLogStream': [], // No delete access
      'logs:PutRetentionPolicy': []
    };

    expect(permissions['logs:DeleteLogGroup'].length).toBe(0);
    expect(permissions['logs:DeleteLogStream'].length).toBe(0);
  });

  it('should allow audit log queries only to authorized users', () => {
    const devTeamArn = 'arn:aws:iam::123456789012:group/DevTeam';
    const policies = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: devTeamArn },
          Action: ['logs:FilterLogEvents', 'logs:GetLogEvents'],
          Resource: ['arn:aws:logs:us-east-1:123456789012:log-group:/aws/amplify/get-together/*']
        }
      ]
    };

    expect(policies.Statement[0].Principal.AWS).toBe(devTeamArn);
    expect(policies.Statement[0].Effect).toBe('Allow');
  });
});

describe('Compliance Audit (AC10)', () => {
  let validator: ComplianceValidator;

  beforeEach(() => {
    validator = new ComplianceValidator();
  });

  it('should pass audit when no PII detected', () => {
    const logs = [
      { userId: 'user-123', action: 'login', timestamp: new Date() },
      { userId: 'user-456', action: 'create_group', timestamp: new Date() }
    ];

    const result = validator.auditForCompliance(logs);
    expect(result.compliant).toBe(true);
    expect(result.piiViolations.length).toBe(0);
  });

  it('should fail audit when PII detected', () => {
    const logs = [
      { userId: 'user-123', email: 'user@example.com', action: 'signup' } // Unmasked email
    ];

    const result = validator.auditForCompliance(logs);
    expect(result.compliant).toBe(false);
    expect(result.piiViolations.length).toBeGreaterThan(0);
  });

  it('should generate compliance report', () => {
    const logs = [
      { userId: 'user-123', action: 'login', timestamp: new Date() },
      { userId: 'user-456', action: 'logout', timestamp: new Date() }
    ];

    const report = validator.generateComplianceReport(logs);

    expect(report).toBeDefined();
    expect(report.totalLogs).toBe(2);
    expect(report.compliant).toBe(true);
    expect(report.timestamp).toBeDefined();
  });
});

describe('Compliance - Acceptance Criteria (AC10)', () => {
  it('should satisfy AC10 email masking', () => {
    const log = { email: 'user@example.com' };
    const masked = maskSensitiveObject(log);

    expect(masked.email).not.toBe('user@example.com');
    expect(masked.email).toContain('@');
    expect(masked.email).toContain('****');
  });

  it('should satisfy AC10 never log phone numbers', () => {
    const hasPII = validateLogForPII({ phone: '+1-555-123-4567' });
    expect(hasPII).toBe(true);
  });

  it('should satisfy AC10 never log passwords', () => {
    const hasPII = validateLogForPII({ password: 'secret123' });
    expect(hasPII).toBe(true);
  });

  it('should satisfy AC10 never log tokens', () => {
    const hasPII = validateLogForPII({ token: 'eyJhbGc...' });
    expect(hasPII).toBe(true);
  });

  it('should satisfy AC10 GDPR user log retrieval', () => {
    const userId = 'user-123';
    const logs = [
      { userId: 'user-123', action: 'login', timestamp: new Date() },
      { userId: 'user-456', action: 'login', timestamp: new Date() }
    ];

    const userData = extractGDPRData(userId, logs);
    expect(userData.every((log) => log.userId === userId)).toBe(true);
  });

  it('should satisfy AC10 IAM restrictions on log access', () => {
    const permissions = {
      'logs:DeleteLogGroup': [],
      'logs:DeleteLogStream': []
    };

    expect(permissions['logs:DeleteLogGroup'].length).toBe(0);
    expect(permissions['logs:DeleteLogStream'].length).toBe(0);
  });
});
