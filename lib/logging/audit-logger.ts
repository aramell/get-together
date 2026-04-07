/**
 * Audit Logging & Security
 * Task 7: Audit Logging & Security (AC7)
 * Logs authentication events, data access, modifications, and admin actions for compliance
 */

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  userId: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress: string;
  timestamp: Date;
  result: 'success' | 'failure';
  details?: Record<string, any>;
}

/**
 * Query filter for audit trail
 */
export interface AuditQueryFilter {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Audit Logger for compliance and security logging
 */
export class AuditLogger {
  private logs: AuditLogEntry[] = [];

  /**
   * Log authentication event (signup, login, logout, password reset, failed attempts)
   */
  logAuthenticationEvent(event: {
    action: string; // 'signup', 'login', 'logout', 'password_reset'
    userId: string | null;
    email?: string;
    ipAddress: string;
    result: 'success' | 'failure';
    details?: string;
    timestamp?: Date;
  }): void {
    this.logs.push({
      userId: event.userId,
      action: event.action,
      ipAddress: event.ipAddress,
      timestamp: event.timestamp || new Date(),
      result: event.result,
      details: event.details ? { message: event.details } : undefined
    });
  }

  /**
   * Log data access event (API GET to sensitive endpoints)
   */
  logDataAccessEvent(event: {
    userId: string;
    action: string; // 'get_export', 'get_profile'
    resource: string;
    resourceId: string;
    ipAddress: string;
    result: 'success' | 'failure';
    details?: string;
  }): void {
    this.logs.push({
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      ipAddress: event.ipAddress,
      timestamp: new Date(),
      result: event.result,
      details: event.details ? { message: event.details } : undefined
    });
  }

  /**
   * Log data modification event (POST/PUT/DELETE operations)
   */
  logDataModificationEvent(event: {
    userId: string;
    action: string; // 'create', 'update', 'delete'
    resource: string;
    resourceId: string;
    ipAddress: string;
    result: 'success' | 'failure';
    details?: Record<string, any>;
  }): void {
    this.logs.push({
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      ipAddress: event.ipAddress,
      timestamp: new Date(),
      result: event.result,
      details: event.details
    });
  }

  /**
   * Log admin action (group deletion, member removal, role changes)
   */
  logAdminActionEvent(event: {
    adminUserId: string;
    action: string; // 'delete_group', 'remove_member', 'change_role'
    resource: string;
    resourceId: string;
    ipAddress: string;
    result: 'success' | 'failure';
    details?: Record<string, any>;
  }): void {
    this.logs.push({
      userId: event.adminUserId,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      ipAddress: event.ipAddress,
      timestamp: new Date(),
      result: event.result,
      details: event.details
    });
  }

  /**
   * Get complete audit trail (immutable copy)
   */
  getAuditTrail(): AuditLogEntry[] {
    // Return deep copy to maintain immutability
    return this.logs.map((log) => ({
      ...log,
      timestamp: new Date(log.timestamp),
      details: log.details ? { ...log.details } : undefined
    }));
  }

  /**
   * Query audit trail with filters
   */
  queryAuditTrail(filter: AuditQueryFilter): AuditLogEntry[] {
    return this.logs.filter((log) => {
      if (filter.userId && log.userId !== filter.userId) return false;
      if (filter.action && log.action !== filter.action) return false;
      if (filter.resource && log.resource !== filter.resource) return false;

      if (filter.startDate && log.timestamp < filter.startDate) return false;
      if (filter.endDate && log.timestamp > filter.endDate) return false;

      return true;
    });
  }
}

/**
 * Singleton instance for global audit logging
 */
let globalAuditLogger: AuditLogger | null = null;

/**
 * Get global audit logger instance
 */
export function getGlobalAuditLogger(): AuditLogger {
  if (!globalAuditLogger) {
    globalAuditLogger = new AuditLogger();
  }
  return globalAuditLogger;
}

/**
 * Log authentication event globally
 */
export function logAuthenticationEvent(event: {
  action: string;
  userId: string | null;
  email?: string;
  ipAddress: string;
  result: 'success' | 'failure';
  details?: string;
  timestamp?: Date;
}): void {
  getGlobalAuditLogger().logAuthenticationEvent(event);
}

/**
 * Log data access event globally
 */
export function logDataAccessEvent(event: {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  ipAddress: string;
  result: 'success' | 'failure';
  details?: string;
}): void {
  getGlobalAuditLogger().logDataAccessEvent(event);
}

/**
 * Log data modification event globally
 */
export function logDataModificationEvent(event: {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  ipAddress: string;
  result: 'success' | 'failure';
  details?: Record<string, any>;
}): void {
  getGlobalAuditLogger().logDataModificationEvent(event);
}

/**
 * Log admin action event globally
 */
export function logAdminActionEvent(event: {
  adminUserId: string;
  action: string;
  resource: string;
  resourceId: string;
  ipAddress: string;
  result: 'success' | 'failure';
  details?: Record<string, any>;
}): void {
  getGlobalAuditLogger().logAdminActionEvent(event);
}

/**
 * Get audit trail globally
 */
export function getAuditTrail(): AuditLogEntry[] {
  return getGlobalAuditLogger().getAuditTrail();
}
