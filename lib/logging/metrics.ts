/**
 * Performance Metrics Collection
 * Task 4: Performance Monitoring (AC4)
 * Tracks API latency, database query performance, and other metrics
 */

/**
 * Histogram metric for latency tracking
 */
export class HistogramMetric {
  name: string;
  private values: number[] = [];
  private buckets: number[];

  constructor(name: string, buckets?: number[]) {
    this.name = name;
    this.buckets = buckets || [10, 50, 100, 200, 500, 1000, 2000, 5000];
  }

  /**
   * Record a latency observation
   */
  observe(value: number): void {
    this.values.push(value);
  }

  /**
   * Get total observation count
   */
  count(): number {
    return this.values.length;
  }

  /**
   * Get minimum latency
   */
  min(): number {
    return this.values.length === 0 ? 0 : Math.min(...this.values);
  }

  /**
   * Get maximum latency
   */
  max(): number {
    return this.values.length === 0 ? 0 : Math.max(...this.values);
  }

  /**
   * Get mean (average) latency
   */
  mean(): number {
    if (this.values.length === 0) return 0;
    const sum = this.values.reduce((a, b) => a + b, 0);
    return sum / this.values.length;
  }

  /**
   * Get median (p50) latency
   */
  median(): number {
    return this.p50();
  }

  /**
   * Get p50 (50th percentile) latency
   */
  p50(): number {
    return getLatencyPercentile([...this.values], 50);
  }

  /**
   * Get p95 (95th percentile) latency
   */
  p95(): number {
    return getLatencyPercentile([...this.values], 95);
  }

  /**
   * Get p99 (99th percentile) latency
   */
  p99(): number {
    return getLatencyPercentile([...this.values], 99);
  }

  /**
   * Get standard deviation
   */
  stddev(): number {
    if (this.values.length === 0) return 0;
    const mean = this.mean();
    const variance = this.values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.values.length;
    return Math.sqrt(variance);
  }
}

/**
 * Endpoint metrics container
 */
export interface EndpointMetrics {
  endpoint: string;
  histogram: HistogramMetric;
  requestCount: number;
  successCount: number;
  errorCount: number;
  lastUpdated: Date;
}

/**
 * Metrics collector for centralized tracking
 */
export class MetricsCollector {
  private namespace: string;
  private endpointMetrics: Map<string, EndpointMetrics> = new Map();
  private queryMetrics: Array<{ query: string; duration: number; type?: string }> = [];
  private eventListeners: Map<string, Function[]> = new Map();
  private latencyBuckets: number[];

  constructor(config: { namespace?: string; latencyBuckets?: number[] } = {}) {
    this.namespace = config.namespace || 'GetTogether/API';
    this.latencyBuckets = config.latencyBuckets || [10, 50, 100, 200, 500, 1000, 2000, 5000];
  }

  /**
   * Record endpoint latency
   */
  recordEndpointLatency(endpoint: string, duration: number, success: boolean = true): void {
    if (!this.endpointMetrics.has(endpoint)) {
      this.endpointMetrics.set(endpoint, {
        endpoint,
        histogram: new HistogramMetric(endpoint, this.latencyBuckets),
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        lastUpdated: new Date()
      });
    }

    const metrics = this.endpointMetrics.get(endpoint)!;
    metrics.histogram.observe(duration);
    metrics.requestCount++;

    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }

    metrics.lastUpdated = new Date();

    // Publish metrics to CloudWatch (would be done in production)
    this.publishEndpointMetrics(endpoint, duration, success);
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint: string): EndpointMetrics | undefined {
    return this.endpointMetrics.get(endpoint);
  }

  /**
   * Get all endpoint metrics
   */
  getAllEndpointMetrics(): EndpointMetrics[] {
    return Array.from(this.endpointMetrics.values());
  }

  /**
   * Record database query latency
   */
  recordQueryLatency(query: string, duration: number, type?: string): void {
    this.queryMetrics.push({ query, duration, type });

    // Emit slow query event if duration > 1000ms
    if (duration > 1000) {
      this.emit('slowQuery', query, duration);
    }
  }

  /**
   * Get query metrics
   */
  getQueryMetrics(): {
    totalQueries: number;
    slowQueryCount: number;
    slowQueryPercentage: number;
    averageLatency: number;
  } {
    const totalQueries = this.queryMetrics.length;
    const slowQueries = this.queryMetrics.filter((q) => q.duration > 1000);
    const slowQueryCount = slowQueries.length;
    const slowQueryPercentage = totalQueries === 0 ? 0 : (slowQueryCount / totalQueries) * 100;
    const averageLatency =
      totalQueries === 0 ? 0 : this.queryMetrics.reduce((sum, q) => sum + q.duration, 0) / totalQueries;

    return {
      totalQueries,
      slowQueryCount,
      slowQueryPercentage,
      averageLatency
    };
  }

  /**
   * Get dashboard metrics for visualization
   */
  getDashboardMetrics(): {
    namespace: string;
    endpoints: Array<{
      endpoint: string;
      requestCount: number;
      min: number;
      max: number;
      mean: number;
      p50: number;
      p95: number;
      p99: number;
      successRate: number;
    }>;
    summary: {
      totalEndpoints: number;
      totalRequests: number;
      averageLatency: number;
    };
  } {
    const endpoints = Array.from(this.endpointMetrics.values()).map((metrics) => ({
      endpoint: metrics.endpoint,
      requestCount: metrics.requestCount,
      min: metrics.histogram.min(),
      max: metrics.histogram.max(),
      mean: metrics.histogram.mean(),
      p50: metrics.histogram.p50(),
      p95: metrics.histogram.p95(),
      p99: metrics.histogram.p99(),
      successRate: metrics.requestCount === 0 ? 100 : (metrics.successCount / metrics.requestCount) * 100
    }));

    const totalRequests = endpoints.reduce((sum, e) => sum + e.requestCount, 0);
    const averageLatency = endpoints.length === 0 ? 0 : endpoints.reduce((sum, e) => sum + e.mean, 0) / endpoints.length;

    return {
      namespace: this.namespace,
      endpoints,
      summary: {
        totalEndpoints: endpoints.length,
        totalRequests,
        averageLatency
      }
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

  /**
   * Publish endpoint metrics to CloudWatch (placeholder)
   */
  private publishEndpointMetrics(endpoint: string, duration: number, success: boolean): void {
    // In production, this would publish to CloudWatch
    // console.debug(`Metric: ${endpoint} - ${duration}ms (${success ? 'success' : 'error'})`);
  }
}

/**
 * Calculate latency percentile
 */
export function getLatencyPercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate histogram statistics
 */
export function calculateHistogramStats(values: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  stddev: number;
  p50: number;
  p95: number;
  p99: number;
} {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stddev: 0,
      p50: 0,
      p95: 0,
      p99: 0
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stddev = Math.sqrt(variance);
  const p50 = getLatencyPercentile(values, 50);
  const p95 = getLatencyPercentile(values, 95);
  const p99 = getLatencyPercentile(values, 99);

  return {
    min,
    max,
    mean,
    median: p50,
    stddev,
    p50,
    p95,
    p99
  };
}

/**
 * Singleton instance for global metrics collection
 */
let globalCollector: MetricsCollector | null = null;

/**
 * Get global metrics collector instance
 */
export function getMetricsCollector(config?: { namespace?: string; latencyBuckets?: number[] }): MetricsCollector {
  if (!globalCollector) {
    globalCollector = new MetricsCollector(config);
  }
  return globalCollector;
}

/**
 * Record endpoint latency globally
 */
export function recordEndpointLatency(endpoint: string, duration: number, success?: boolean): void {
  getMetricsCollector().recordEndpointLatency(endpoint, duration, success);
}

/**
 * Record query latency globally
 */
export function recordQueryLatency(query: string, duration: number, type?: string): void {
  getMetricsCollector().recordQueryLatency(query, duration, type);
}
