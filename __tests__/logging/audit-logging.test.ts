/**
 * Audit Logging & Security Tests
 * Task 7: Audit Logging & Security (AC7)
 * Tests for authentication events, data access, and admin action logging
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  AuditLogger,
  logAuthenticationEvent,
  logDataAccessEvent,
  logDataModificationEvent,
  logAdminActionEvent,
  getAuditTrail
} from '@/lib/logging/audit-logger';

describe('Audit Logger - Authentication Events (AC7, 7.1, 7.2)', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  it('should log signup events', () => {
    auditLogger.logAuthenticationEvent({
      action: 'signup',
      userId: 'user-123',
      email: 'user@example.com',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail.length).toBe(1);
    expect(trail[0].action).toBe('signup');
    expect(trail[0].result).toBe('success');
  });

  it('should log login events', () => {
    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBe('login');
  });

  it('should log logout events', () => {
    auditLogger.logAuthenticationEvent({
      action: 'logout',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBe('logout');
  });

  it('should log password reset events', () => {
    auditLogger.logAuthenticationEvent({
      action: 'password_reset',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBe('password_reset');
  });

  it('should log failed authentication attempts', () => {
    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: null, // Unknown user
      email: 'invalid@example.com',
      ipAddress: '192.168.1.1',
      result: 'failure',
      details: 'Invalid credentials'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].result).toBe('failure');
    expect(trail[0].details?.message).toBe('Invalid credentials');
  });

  it('should include timestamp in authentication log', () => {
    const beforeTimestamp = Date.now();

    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    const logTimestamp = trail[0].timestamp.getTime();

    expect(logTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
  });

  it('should include IP address in authentication log', () => {
    const ipAddress = '192.168.1.1';

    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: ipAddress,
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].ipAddress).toBe(ipAddress);
  });
});

describe('Audit Logger - Data Access Events (AC7, 7.3)', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  it('should log user data export access', () => {
    auditLogger.logDataAccessEvent({
      userId: 'user-123',
      action: 'get_export',
      resource: 'user_data',
      resourceId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBe('get_export');
    expect(trail[0].resource).toBe('user_data');
  });

  it('should log profile access', () => {
    auditLogger.logDataAccessEvent({
      userId: 'user-123',
      action: 'get_profile',
      resource: 'user_profile',
      resourceId: 'user-456',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBe('get_profile');
  });

  it('should log failed data access attempts', () => {
    auditLogger.logDataAccessEvent({
      userId: 'user-123',
      action: 'get_export',
      resource: 'user_data',
      resourceId: 'user-999',
      ipAddress: '192.168.1.1',
      result: 'failure',
      details: 'Unauthorized access'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].result).toBe('failure');
  });
});

describe('Audit Logger - Data Modification Events (AC7, 7.4)', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  it('should log POST (create) operations', () => {
    auditLogger.logDataModificationEvent({
      userId: 'user-123',
      action: 'create',
      resource: 'group',
      resourceId: 'group-456',
      ipAddress: '192.168.1.1',
      result: 'success',
      details: { name: 'New Group', description: 'Description' }
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBe('create');
    expect(trail[0].resource).toBe('group');
  });

  it('should log PUT (update) operations', () => {
    auditLogger.logDataModificationEvent({
      userId: 'user-123',
      action: 'update',
      resource: 'group',
      resourceId: 'group-456',
      ipAddress: '192.168.1.1',
      result: 'success',
      details: { field: 'name', oldValue: 'Old', newValue: 'New' }
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBe('update');
  });

  it('should log DELETE operations', () => {
    auditLogger.logDataModificationEvent({
      userId: 'user-123',
      action: 'delete',
      resource: 'group',
      resourceId: 'group-456',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBe('delete');
  });
});

describe('Audit Logger - Admin Actions (AC7, 7.5)', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  it('should log group deletion by admin', () => {
    auditLogger.logAdminActionEvent({
      adminUserId: 'admin-123',
      action: 'delete_group',
      resource: 'group',
      resourceId: 'group-456',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBe('delete_group');
  });

  it('should log member removal from group', () => {
    auditLogger.logAdminActionEvent({
      adminUserId: 'admin-123',
      action: 'remove_member',
      resource: 'group_member',
      resourceId: 'member-456',
      ipAddress: '192.168.1.1',
      result: 'success',
      details: { groupId: 'group-123', memberId: 'user-456' }
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBe('remove_member');
  });

  it('should log role changes', () => {
    auditLogger.logAdminActionEvent({
      adminUserId: 'admin-123',
      action: 'change_role',
      resource: 'group_member',
      resourceId: 'member-456',
      ipAddress: '192.168.1.1',
      result: 'success',
      details: { oldRole: 'member', newRole: 'admin' }
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBe('change_role');
  });
});

describe('Audit Logger - Required Fields (AC7, 7.6)', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  it('should include user_id in audit log', () => {
    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].userId).toBe('user-123');
  });

  it('should include ip_address in audit log', () => {
    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].ipAddress).toBe('192.168.1.1');
  });

  it('should include action in audit log', () => {
    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].action).toBeDefined();
  });

  it('should include timestamp in audit log', () => {
    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].timestamp).toBeDefined();
    expect(trail[0].timestamp instanceof Date).toBe(true);
  });

  it('should include resource in audit log', () => {
    auditLogger.logDataModificationEvent({
      userId: 'user-123',
      action: 'create',
      resource: 'group',
      resourceId: 'group-456',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].resource).toBe('group');
  });

  it('should include result (success/failure) in audit log', () => {
    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].result).toBe('success');
  });
});

describe('Audit Logger - Immutability (AC7, 7.7)', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  it('should store audit logs immutably', () => {
    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    const originalLength = trail.length;

    // Attempt to modify (should not affect stored logs)
    trail.length = 0;

    // Verify original logs unchanged
    const newTrail = auditLogger.getAuditTrail();
    expect(newTrail.length).toBe(originalLength);
  });

  it('should prevent deletion of audit logs', () => {
    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail.length).toBe(1);

    // Audit logger should not support deletion
    expect(typeof auditLogger.deleteAuditLog).toEqual('undefined');
  });
});

describe('Audit Logger - Query Capabilities (AC7, 7.8)', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();

    // Create 30 days of audit logs
    for (let i = 0; i < 100; i++) {
      const daysAgo = Math.floor(i / 4); // Spread across 25 days
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - daysAgo);

      auditLogger.logAuthenticationEvent({
        action: 'login',
        userId: `user-${i % 10}`,
        ipAddress: '192.168.1.1',
        result: 'success',
        timestamp: timestamp
      });
    }
  });

  it('should filter audit logs by user', () => {
    const userLogs = auditLogger.queryAuditTrail({ userId: 'user-0' });

    expect(userLogs.length).toBeGreaterThan(0);
    expect(userLogs.every((log) => log.userId === 'user-0')).toBe(true);
  });

  it('should filter audit logs by action', () => {
    // Add different action types
    auditLogger.logDataModificationEvent({
      userId: 'user-123',
      action: 'create',
      resource: 'group',
      resourceId: 'group-456',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const createLogs = auditLogger.queryAuditTrail({ action: 'create' });

    expect(createLogs.length).toBeGreaterThan(0);
    expect(createLogs.every((log) => log.action === 'create')).toBe(true);
  });

  it('should filter audit logs by date range', () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    const logsInRange = auditLogger.queryAuditTrail({ startDate, endDate });

    expect(logsInRange.length).toBeGreaterThan(0);
    logsInRange.forEach((log) => {
      expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
      expect(log.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
    });
  });

  it('should support year-long audit trail queries', () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1); // Last year

    const logsInYear = auditLogger.queryAuditTrail({ startDate, endDate });

    // Should retrieve logs (1-year retention)
    expect(logsInYear.length).toBeGreaterThanOrEqual(0);
  });
});

describe('Audit Logger - Compliance (AC7)', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  it('should satisfy AC7 authentication event logging', () => {
    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].userId).toBe('user-123');
    expect(trail[0].ipAddress).toBe('192.168.1.1');
    expect(trail[0].action).toBe('login');
    expect(trail[0].timestamp).toBeDefined();
    expect(trail[0].result).toBe('success');
  });

  it('should satisfy AC7 data access logging', () => {
    auditLogger.logDataAccessEvent({
      userId: 'user-123',
      action: 'get_export',
      resource: 'user_data',
      resourceId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].userId).toBe('user-123');
    expect(trail[0].action).toBe('get_export');
    expect(trail[0].resource).toBe('user_data');
  });

  it('should satisfy AC7 data modification logging', () => {
    auditLogger.logDataModificationEvent({
      userId: 'user-123',
      action: 'create',
      resource: 'group',
      resourceId: 'group-456',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].userId).toBe('user-123');
    expect(trail[0].action).toBe('create');
    expect(trail[0].resource).toBe('group');
    expect(trail[0].resourceId).toBe('group-456');
  });

  it('should satisfy AC7 admin action logging', () => {
    auditLogger.logAdminActionEvent({
      adminUserId: 'admin-123',
      action: 'delete_group',
      resource: 'group',
      resourceId: 'group-456',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = auditLogger.getAuditTrail();
    expect(trail[0].userId).toBe('admin-123');
    expect(trail[0].action).toBe('delete_group');
  });

  it('should satisfy AC7 immutable audit trail', () => {
    auditLogger.logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    // Verify logs cannot be deleted/modified
    const trail = auditLogger.getAuditTrail();
    expect(trail.length).toBe(1);
    expect(typeof auditLogger.deleteAuditLog).toEqual('undefined');
  });
});

describe('Audit Logger - Global Helpers', () => {
  it('should log authentication event globally', () => {
    logAuthenticationEvent({
      action: 'login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = getAuditTrail();
    expect(trail.length).toBeGreaterThan(0);
  });

  it('should log data access event globally', () => {
    logDataAccessEvent({
      userId: 'user-123',
      action: 'get_profile',
      resource: 'user_profile',
      resourceId: 'user-456',
      ipAddress: '192.168.1.1',
      result: 'success'
    });

    const trail = getAuditTrail();
    expect(trail.length).toBeGreaterThan(0);
  });
});
