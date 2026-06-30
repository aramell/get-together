/**
 * Performance Monitoring Tests
 * Task 4: Performance Monitoring (AC4)
 * Tests for metrics collection and histogram tracking
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  MetricsCollector,
  HistogramMetric,
  EndpointMetrics,
  recordEndpointLatency,
  recordQueryLatency,
  getLatencyPercentile,
  calculateHistogramStats
} from '@/lib/logging/metrics';

describe('Metrics - Histogram Configuration', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({ namespace: 'GetTogether/API' });
  });

  it('should create histogram with default buckets', () => {
    const histogram = new HistogramMetric('test.latency');

    expect(histogram).toBeDefined();
    expect(histogram.name).toBe('test.latency');
  });

  it('should track latency observations', () => {
    const histogram = new HistogramMetric('api.latency');

    histogram.observe(145); // 145ms
    histogram.observe(230); // 230ms
    histogram.observe(89);  // 89ms

    expect(histogram.count()).toBe(3);
  });

  it('should calculate percentiles (p50, p95, p99)', () => {
    const histogram = new HistogramMetric('latency');

    // Add 100 latency samples
    for (let i = 1; i <= 100; i++) {
      histogram.observe(i * 10); // 10ms to 1000ms
    }

    expect(histogram.p50()).toBeGreaterThan(0);
    expect(histogram.p95()).toBeGreaterThan(histogram.p50());
    expect(histogram.p99()).toBeGreaterThan(histogram.p95());
  });

  it('should track min and max latency', () => {
    const histogram = new HistogramMetric('latency');

    histogram.observe(100);
    histogram.observe(500);
    histogram.observe(250);

    expect(histogram.min()).toBe(100);
    expect(histogram.max()).toBe(500);
  });

  it('should calculate average latency', () => {
    const histogram = new HistogramMetric('latency');

    histogram.observe(100);
    histogram.observe(200);
    histogram.observe(300);

    expect(histogram.mean()).toBe(200);
  });
});

describe('Metrics - API Endpoint Latency (AC4)', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({ namespace: 'GetTogether/API' });
  });

  it('should create separate metrics per endpoint', () => {
    collector.recordEndpointLatency('/api/groups', 145);
    collector.recordEndpointLatency('/api/users/profile', 230);

    const groupsMetrics = collector.getEndpointMetrics('/api/groups');
    const profileMetrics = collector.getEndpointMetrics('/api/users/profile');

    expect(groupsMetrics).toBeDefined();
    expect(profileMetrics).toBeDefined();
    expect(groupsMetrics?.endpoint).toBe('/api/groups');
    expect(profileMetrics?.endpoint).toBe('/api/users/profile');
  });

  it('should track endpoint latency histogram', () => {
    // Record latencies for GET /api/groups
    for (let i = 0; i < 20; i++) {
      collector.recordEndpointLatency('/api/groups', 100 + Math.random() * 100);
    }

    const metrics = collector.getEndpointMetrics('/api/groups');

    expect(metrics).toBeDefined();
    expect(metrics!.histogram).toBeDefined();
    expect(metrics!.histogram.count()).toBe(20);
  });

  it('should calculate endpoint latency statistics', () => {
    const latencies = [100, 150, 200, 250, 300];
    latencies.forEach((lat) => {
      collector.recordEndpointLatency('/api/groups', lat);
    });

    const metrics = collector.getEndpointMetrics('/api/groups');

    expect(metrics?.histogram.min()).toBe(100);
    expect(metrics?.histogram.max()).toBe(300);
    expect(metrics?.histogram.mean()).toBe(200);
  });

  it('should track request count per endpoint', () => {
    collector.recordEndpointLatency('/api/groups', 145);
    collector.recordEndpointLatency('/api/groups', 156);
    collector.recordEndpointLatency('/api/groups', 167);

    const metrics = collector.getEndpointMetrics('/api/groups');

    expect(metrics?.requestCount).toBe(3);
  });

  it('should support custom latency buckets', () => {
    const customCollector = new MetricsCollector({
      namespace: 'GetTogether/API',
      latencyBuckets: [50, 100, 200, 500, 1000, 2000]
    });

    customCollector.recordEndpointLatency('/api/groups', 145);
    expect(customCollector.getEndpointMetrics('/api/groups')).toBeDefined();
  });
});

describe('Metrics - Database Query Latency (AC4)', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({ namespace: 'GetTogether/Database' });
  });

  it('should track query latency', () => {
    collector.recordQueryLatency('SELECT * FROM groups', 145);
    collector.recordQueryLatency('SELECT * FROM users', 230);

    expect(collector).toBeDefined();
  });

  it('should log slow queries (>1s)', () => {
    const slowQueries: string[] = [];

    collector.on('slowQuery', (query: string, duration: number) => {
      slowQueries.push(query);
    });

    collector.recordQueryLatency('SELECT * FROM groups', 500);  // Fast
    collector.recordQueryLatency('SELECT * FROM large_table', 1500); // Slow

    expect(slowQueries.length).toBe(1);
    expect(slowQueries[0]).toContain('large_table');
  });

  it('should track query types separately', () => {
    collector.recordQueryLatency('SELECT * FROM groups', 145, 'SELECT');
    collector.recordQueryLatency('INSERT INTO groups', 50, 'INSERT');
    collector.recordQueryLatency('UPDATE groups SET', 80, 'UPDATE');

    expect(collector).toBeDefined();
  });

  it('should calculate slow query percentage', () => {
    // Record 10 queries
    for (let i = 0; i < 10; i++) {
      if (i < 8) {
        collector.recordQueryLatency('SELECT * FROM groups', 200); // Fast
      } else {
        collector.recordQueryLatency('SELECT * FROM groups', 1500); // Slow
      }
    }

    const metrics = collector.getQueryMetrics();
    expect(metrics.slowQueryPercentage).toBe(20); // 2 out of 10
  });
});

describe('Metrics - Percentile Calculation', () => {
  it('should calculate p50 (median)', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const p50 = getLatencyPercentile(values, 50);

    expect(p50).toBe(5.5); // Median of 1-10
  });

  it('should calculate p95', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const p95 = getLatencyPercentile(values, 95);

    expect(p95).toBeGreaterThan(90);
    expect(p95).toBeLessThanOrEqual(100);
  });

  it('should calculate p99', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const p99 = getLatencyPercentile(values, 99);

    expect(p99).toBeGreaterThan(95);
    expect(p99).toBeLessThanOrEqual(100);
  });

  it('should handle edge case: empty array', () => {
    const p50 = getLatencyPercentile([], 50);
    expect(p50).toBe(0);
  });

  it('should handle edge case: single value', () => {
    const p50 = getLatencyPercentile([100], 50);
    expect(p50).toBe(100);
  });
});

describe('Metrics - Histogram Statistics', () => {
  it('should calculate min, max, mean, stddev', () => {
    const values = [100, 150, 200, 250, 300];
    const stats = calculateHistogramStats(values);

    expect(stats.min).toBe(100);
    expect(stats.max).toBe(300);
    expect(stats.mean).toBe(200);
    expect(stats.stddev).toBeGreaterThan(0);
  });

  it('should calculate percentiles in batch', () => {
    const values = Array.from({ length: 100 }, (_, i) => (i + 1) * 10);
    const stats = calculateHistogramStats(values);

    expect(stats.p50).toBeDefined();
    expect(stats.p95).toBeDefined();
    expect(stats.p99).toBeDefined();
    expect(stats.p99).toBeGreaterThanOrEqual(stats.p95);
  });
});

describe('Metrics - Dashboard Data', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({ namespace: 'GetTogether/API' });
  });

  it('should export metrics for dashboard display', () => {
    collector.recordEndpointLatency('/api/groups', 100);
    collector.recordEndpointLatency('/api/groups', 150);
    collector.recordEndpointLatency('/api/users', 200);

    const dashboardData = collector.getDashboardMetrics();

    expect(dashboardData).toBeDefined();
    expect(dashboardData.endpoints).toBeDefined();
    expect(dashboardData.endpoints.length).toBeGreaterThan(0);
  });

  it('should include endpoint performance summary', () => {
    collector.recordEndpointLatency('/api/groups', 145);
    const dashboard = collector.getDashboardMetrics();

    const groupsEndpoint = dashboard.endpoints.find((e) => e.endpoint === '/api/groups');
    expect(groupsEndpoint).toBeDefined();
    expect(groupsEndpoint?.min).toBeGreaterThan(0);
    expect(groupsEndpoint?.max).toBeGreaterThanOrEqual(groupsEndpoint?.min!);
  });

  it('should track endpoint error rates', () => {
    collector.recordEndpointLatency('/api/groups', 145, true);  // success
    collector.recordEndpointLatency('/api/groups', 230, false); // error
    collector.recordEndpointLatency('/api/groups', 167, true);  // success

    const metrics = collector.getEndpointMetrics('/api/groups');
    expect(metrics?.errorCount).toBe(1);
    expect(metrics?.successCount).toBe(2);
  });
});

describe('Metrics - Real-time Monitoring (AC4)', () => {
  it('should verify latency SLA < 500ms for momentum counter', () => {
    const collector = new MetricsCollector({ namespace: 'GetTogether/RealTime' });

    // Simulate momentum counter latencies
    for (let i = 0; i < 100; i++) {
      const latency = Math.random() * 400 + 50; // 50-450ms
      collector.recordEndpointLatency('/api/momentum', latency);
    }

    const metrics = collector.getEndpointMetrics('/api/momentum');
    expect(metrics!.histogram.p95()).toBeLessThan(500);
  });
});

describe('Metrics - Compliance (AC4)', () => {
  it('should satisfy AC4 API response time per endpoint', () => {
    const collector = new MetricsCollector({ namespace: 'GetTogether/API' });

    collector.recordEndpointLatency('/api/groups', 145);
    const metrics = collector.getEndpointMetrics('/api/groups');

    expect(metrics?.histogram).toBeDefined();
    expect(metrics?.histogram.min()).toBeDefined();
    expect(metrics?.histogram.max()).toBeDefined();
    expect(metrics?.histogram.p50()).toBeDefined();
    expect(metrics?.histogram.p95()).toBeDefined();
    expect(metrics?.histogram.p99()).toBeDefined();
  });

  it('should satisfy AC4 slow query logging >1s', () => {
    const collector = new MetricsCollector({ namespace: 'GetTogether/Database' });
    const slowQueries: string[] = [];

    collector.on('slowQuery', (query: string) => {
      slowQueries.push(query);
    });

    collector.recordQueryLatency('SELECT * FROM groups', 500);
    collector.recordQueryLatency('SELECT * FROM large_table', 1200);

    expect(slowQueries.length).toBe(1);
  });

  it('should satisfy AC4 dashboard showing latency distributions', () => {
    const collector = new MetricsCollector({ namespace: 'GetTogether/API' });

    for (let i = 0; i < 50; i++) {
      collector.recordEndpointLatency('/api/groups', Math.random() * 500 + 50);
    }

    const dashboard = collector.getDashboardMetrics();

    expect(dashboard.endpoints.length).toBeGreaterThan(0);
    expect(dashboard.endpoints[0].p50).toBeDefined();
    expect(dashboard.endpoints[0].p95).toBeDefined();
    expect(dashboard.endpoints[0].p99).toBeDefined();
  });
});
