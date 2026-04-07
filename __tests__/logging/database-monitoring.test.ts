/**
 * Database Monitoring Tests
 * Task 4: Performance Monitoring - Database metrics (AC4, AC6)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  DatabaseMonitor,
  SlowQueryEvent,
  ConnectionPoolMetrics,
  recordQueryMetric,
  getQueryMetrics
} from '@/lib/logging/database-monitor';

describe('Database Monitor - Slow Query Detection (AC4, AC6)', () => {
  let monitor: DatabaseMonitor;

  beforeEach(() => {
    monitor = new DatabaseMonitor({ slowQueryThreshold: 1000 });
  });

  it('should detect slow queries > 1 second', () => {
    const slowQueries: SlowQueryEvent[] = [];

    monitor.on('slowQuery', (event) => {
      slowQueries.push(event);
    });

    monitor.recordQuery('SELECT * FROM groups', 500);  // Fast
    monitor.recordQuery('SELECT * FROM large_table', 1500); // Slow

    expect(slowQueries.length).toBe(1);
    expect(slowQueries[0].query).toContain('large_table');
    expect(slowQueries[0].duration).toBe(1500);
  });

  it('should log query execution time', () => {
    monitor.recordQuery('SELECT * FROM groups', 145);

    const metrics = monitor.getMetrics();
    expect(metrics.totalQueries).toBe(1);
    expect(metrics.averageLatency).toBe(145);
  });

  it('should track slow query percentage', () => {
    // Record 10 queries, 2 slow
    for (let i = 0; i < 8; i++) {
      monitor.recordQuery('SELECT * FROM groups', 200);
    }
    for (let i = 0; i < 2; i++) {
      monitor.recordQuery('SELECT * FROM groups', 1500);
    }

    const metrics = monitor.getMetrics();
    expect(metrics.slowQueryPercentage).toBe(20);
  });

  it('should separate query types', () => {
    monitor.recordQuery('SELECT * FROM groups', 100, 'SELECT');
    monitor.recordQuery('INSERT INTO groups', 50, 'INSERT');
    monitor.recordQuery('UPDATE groups SET', 75, 'UPDATE');
    monitor.recordQuery('DELETE FROM groups', 60, 'DELETE');

    const metrics = monitor.getMetrics();
    expect(metrics.queryTypes.SELECT).toBe(1);
    expect(metrics.queryTypes.INSERT).toBe(1);
    expect(metrics.queryTypes.UPDATE).toBe(1);
    expect(metrics.queryTypes.DELETE).toBe(1);
  });

  it('should calculate query latency percentiles', () => {
    // Record 50 queries with varying latencies
    for (let i = 0; i < 50; i++) {
      const latency = 100 + i * 10; // 100-590ms
      monitor.recordQuery('SELECT * FROM groups', latency);
    }

    const metrics = monitor.getMetrics();
    expect(metrics.p50).toBeDefined();
    expect(metrics.p95).toBeDefined();
    expect(metrics.p99).toBeDefined();
    expect(metrics.p95).toBeGreaterThan(metrics.p50);
  });
});

describe('Database Monitor - Connection Pool Metrics (AC6)', () => {
  let monitor: DatabaseMonitor;

  beforeEach(() => {
    monitor = new DatabaseMonitor();
  });

  it('should track connection pool size', () => {
    monitor.updateConnectionPool({ activeConnections: 45, totalConnections: 100 });

    const poolMetrics = monitor.getConnectionPoolMetrics();
    expect(poolMetrics.activeConnections).toBe(45);
    expect(poolMetrics.totalConnections).toBe(100);
    expect(poolMetrics.utilizationPercentage).toBe(45);
  });

  it('should alert on connection exhaustion (>95%)', () => {
    const alerts: ConnectionPoolMetrics[] = [];

    monitor.on('connectionExhaustion', (metrics) => {
      alerts.push(metrics);
    });

    monitor.updateConnectionPool({ activeConnections: 96, totalConnections: 100 });

    expect(alerts.length).toBe(1);
    expect(alerts[0].utilizationPercentage).toBe(96);
  });

  it('should calculate connection utilization', () => {
    monitor.updateConnectionPool({ activeConnections: 60, totalConnections: 100 });

    const metrics = monitor.getConnectionPoolMetrics();
    expect(metrics.utilizationPercentage).toBe(60);
  });

  it('should track connection pool history', () => {
    monitor.updateConnectionPool({ activeConnections: 30, totalConnections: 100 });
    monitor.updateConnectionPool({ activeConnections: 60, totalConnections: 100 });
    monitor.updateConnectionPool({ activeConnections: 75, totalConnections: 100 });

    const history = monitor.getConnectionPoolHistory();
    expect(history.length).toBe(3);
  });
});

describe('Database Monitor - Query Classification (AC6)', () => {
  let monitor: DatabaseMonitor;

  beforeEach(() => {
    monitor = new DatabaseMonitor();
  });

  it('should classify SELECT queries', () => {
    monitor.recordQuery('SELECT * FROM groups WHERE id = ?', 150, 'SELECT');

    const metrics = monitor.getMetrics();
    expect(metrics.queryTypes.SELECT).toBe(1);
  });

  it('should classify INSERT queries', () => {
    monitor.recordQuery('INSERT INTO groups (name) VALUES (?)', 50, 'INSERT');

    const metrics = monitor.getMetrics();
    expect(metrics.queryTypes.INSERT).toBe(1);
  });

  it('should classify UPDATE queries', () => {
    monitor.recordQuery('UPDATE groups SET name = ? WHERE id = ?', 75, 'UPDATE');

    const metrics = monitor.getMetrics();
    expect(metrics.queryTypes.UPDATE).toBe(1);
  });

  it('should classify DELETE queries', () => {
    monitor.recordQuery('DELETE FROM groups WHERE id = ?', 60, 'DELETE');

    const metrics = monitor.getMetrics();
    expect(metrics.queryTypes.DELETE).toBe(1);
  });
});

describe('Database Monitor - Deadlock Detection (AC6)', () => {
  let monitor: DatabaseMonitor;

  beforeEach(() => {
    monitor = new DatabaseMonitor();
  });

  it('should detect deadlock errors', () => {
    const deadlocks: string[] = [];

    monitor.on('deadlock', (query) => {
      deadlocks.push(query);
    });

    monitor.recordQueryError('SELECT * FROM groups FOR UPDATE', 'deadlock_detected');
    expect(deadlocks.length).toBe(1);
  });

  it('should log deadlock queries for analysis', () => {
    monitor.recordQueryError('UPDATE groups SET name = ?', 'deadlock_detected');

    const metrics = monitor.getMetrics();
    expect(metrics.errorCount).toBeGreaterThan(0);
  });
});

describe('Database Monitor - Metrics Aggregation (AC4, AC6)', () => {
  let monitor: DatabaseMonitor;

  beforeEach(() => {
    monitor = new DatabaseMonitor();
  });

  it('should calculate average query latency', () => {
    monitor.recordQuery('SELECT 1', 100);
    monitor.recordQuery('SELECT 2', 200);
    monitor.recordQuery('SELECT 3', 300);

    const metrics = monitor.getMetrics();
    expect(metrics.averageLatency).toBe(200);
  });

  it('should track query count by type', () => {
    for (let i = 0; i < 5; i++) {
      monitor.recordQuery('SELECT * FROM groups', 100, 'SELECT');
    }
    for (let i = 0; i < 3; i++) {
      monitor.recordQuery('INSERT INTO groups', 50, 'INSERT');
    }

    const metrics = monitor.getMetrics();
    expect(metrics.queryTypes.SELECT).toBe(5);
    expect(metrics.queryTypes.INSERT).toBe(3);
  });

  it('should export metrics for dashboard', () => {
    monitor.recordQuery('SELECT 1', 100);
    monitor.recordQuery('SELECT 2', 150);
    monitor.updateConnectionPool({ activeConnections: 50, totalConnections: 100 });

    const dashboard = monitor.getDashboardMetrics();
    expect(dashboard.queryMetrics).toBeDefined();
    expect(dashboard.connectionPool).toBeDefined();
    expect(dashboard.slowQueries).toBeDefined();
  });
});

describe('Database Monitor - Compliance (AC4, AC6)', () => {
  it('should satisfy AC4 slow query logging >1s', () => {
    const monitor = new DatabaseMonitor({ slowQueryThreshold: 1000 });
    const slowQueries: SlowQueryEvent[] = [];

    monitor.on('slowQuery', (event) => {
      slowQueries.push(event);
    });

    monitor.recordQuery('SELECT * FROM groups', 500);
    monitor.recordQuery('SELECT * FROM large_table', 1500);

    expect(slowQueries.length).toBe(1);
    expect(slowQueries[0].duration).toBeGreaterThan(1000);
  });

  it('should satisfy AC6 connection exhaustion >95%', () => {
    const monitor = new DatabaseMonitor();
    const alerts: ConnectionPoolMetrics[] = [];

    monitor.on('connectionExhaustion', (metrics) => {
      alerts.push(metrics);
    });

    monitor.updateConnectionPool({ activeConnections: 96, totalConnections: 100 });

    expect(alerts.length).toBe(1);
    expect(alerts[0].utilizationPercentage).toBeGreaterThan(95);
  });

  it('should satisfy AC6 deadlock detection and alerting', () => {
    const monitor = new DatabaseMonitor();
    const deadlocks: string[] = [];

    monitor.on('deadlock', (query) => {
      deadlocks.push(query);
    });

    monitor.recordQueryError('SELECT * FROM groups FOR UPDATE', 'deadlock_detected');

    expect(deadlocks.length).toBe(1);
  });
});

describe('Database Monitor - Global Helpers', () => {
  it('should record query metrics globally', () => {
    recordQueryMetric('SELECT * FROM groups', 150);

    const metrics = getQueryMetrics();
    expect(metrics.totalQueries).toBeGreaterThan(0);
  });
});
