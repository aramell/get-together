/**
 * Database Performance Monitoring
 * Task 4: Performance Monitoring & Task 6: Database Monitoring (AC4, AC6)
 * Tracks slow queries, connection pool health, and database metrics
 */

/**
 * Slow query event data
 */
export interface SlowQueryEvent {
  query: string;
  duration: number;
  timestamp: Date;
  type?: string;
}

/**
 * Connection pool metrics
 */
export interface ConnectionPoolMetrics {
  activeConnections: number;
  totalConnections: number;
  utilizationPercentage: number;
  timestamp: Date;
}

/**
 * Database query metrics
 */
export interface QueryMetrics {
  totalQueries: number;
  slowQueryCount: number;
  slowQueryPercentage: number;
  averageLatency: number;
  p50: number;
  p95: number;
  p99: number;
  queryTypes: Record<string, number>;
  errorCount: number;
}

/**
 * Database monitor for query and connection pool tracking
 */
export class DatabaseMonitor {
  private slowQueryThreshold: number;
  private queries: Array<{ query: string; duration: number; type?: string; timestamp: Date }> = [];
  private connectionPoolHistory: ConnectionPoolMetrics[] = [];
  private currentConnectionPool: ConnectionPoolMetrics | null = null;
  private errorLog: Array<{ query: string; error: string; timestamp: Date }> = [];
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: { slowQueryThreshold?: number } = {}) {
    this.slowQueryThreshold = config.slowQueryThreshold || 1000; // 1 second default
  }

  /**
   * Record a database query execution
   */
  recordQuery(query: string, duration: number, type?: string): void {
    this.queries.push({
      query,
      duration,
      type,
      timestamp: new Date()
    });

    // Detect slow queries
    if (duration > this.slowQueryThreshold) {
      this.emit('slowQuery', {
        query,
        duration,
        timestamp: new Date(),
        type
      });
    }
  }

  /**
   * Record a query error (deadlock, timeout, etc.)
   */
  recordQueryError(query: string, error: string): void {
    this.errorLog.push({
      query,
      error,
      timestamp: new Date()
    });

    if (error === 'deadlock_detected') {
      this.emit('deadlock', query);
    }
  }

  /**
   * Update connection pool metrics
   */
  updateConnectionPool(metrics: { activeConnections: number; totalConnections: number }): void {
    const poolMetrics: ConnectionPoolMetrics = {
      activeConnections: metrics.activeConnections,
      totalConnections: metrics.totalConnections,
      utilizationPercentage: (metrics.activeConnections / metrics.totalConnections) * 100,
      timestamp: new Date()
    };

    this.currentConnectionPool = poolMetrics;
    this.connectionPoolHistory.push(poolMetrics);

    // Detect connection exhaustion
    if (poolMetrics.utilizationPercentage > 95) {
      this.emit('connectionExhaustion', poolMetrics);
    }
  }

  /**
   * Get current connection pool metrics
   */
  getConnectionPoolMetrics(): ConnectionPoolMetrics {
    return (
      this.currentConnectionPool || {
        activeConnections: 0,
        totalConnections: 0,
        utilizationPercentage: 0,
        timestamp: new Date()
      }
    );
  }

  /**
   * Get connection pool history
   */
  getConnectionPoolHistory(): ConnectionPoolMetrics[] {
    return [...this.connectionPoolHistory];
  }

  /**
   * Get aggregated query metrics
   */
  getMetrics(): QueryMetrics {
    const totalQueries = this.queries.length;
    const slowQueries = this.queries.filter((q) => q.duration > this.slowQueryThreshold);
    const slowQueryCount = slowQueries.length;
    const slowQueryPercentage = totalQueries === 0 ? 0 : (slowQueryCount / totalQueries) * 100;

    const durations = this.queries.map((q) => q.duration);
    const averageLatency = totalQueries === 0 ? 0 : durations.reduce((a, b) => a + b, 0) / totalQueries;

    // Calculate percentiles
    const sorted = [...durations].sort((a, b) => a - b);
    const getPercentile = (p: number): number => {
      if (sorted.length === 0) return 0;
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, idx)];
    };

    // Count query types
    const queryTypes: Record<string, number> = {};
    this.queries.forEach((q) => {
      const type = q.type || 'UNKNOWN';
      queryTypes[type] = (queryTypes[type] || 0) + 1;
    });

    return {
      totalQueries,
      slowQueryCount,
      slowQueryPercentage,
      averageLatency,
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
      queryTypes,
      errorCount: this.errorLog.length
    };
  }

  /**
   * Get dashboard metrics
   */
  getDashboardMetrics(): {
    queryMetrics: QueryMetrics;
    connectionPool: ConnectionPoolMetrics;
    slowQueries: SlowQueryEvent[];
  } {
    const slowQueryEvents: SlowQueryEvent[] = this.queries
      .filter((q) => q.duration > this.slowQueryThreshold)
      .map((q) => ({
        query: q.query,
        duration: q.duration,
        timestamp: q.timestamp,
        type: q.type
      }));

    return {
      queryMetrics: this.getMetrics(),
      connectionPool: this.getConnectionPoolMetrics(),
      slowQueries: slowQueryEvents.slice(-10) // Last 10 slow queries
    };
  }

  /**
   * Register event listener
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(...args));
    }
  }
}

/**
 * Singleton instance for global database monitoring
 */
let globalMonitor: DatabaseMonitor | null = null;

/**
 * Get global database monitor instance
 */
export function getDatabaseMonitor(config?: { slowQueryThreshold?: number }): DatabaseMonitor {
  if (!globalMonitor) {
    globalMonitor = new DatabaseMonitor(config);
  }
  return globalMonitor;
}

/**
 * Record query metric globally
 */
export function recordQueryMetric(query: string, duration: number, type?: string): void {
  getDatabaseMonitor().recordQuery(query, duration, type);
}

/**
 * Get query metrics globally
 */
export function getQueryMetrics(): QueryMetrics {
  return getDatabaseMonitor().getMetrics();
}
