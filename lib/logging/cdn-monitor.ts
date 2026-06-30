/**
 * CDN Cache Monitoring
 * Task 4: Performance Monitoring (AC4)
 * Tracks CloudFront/CDN cache hit ratios and bandwidth savings
 */

/**
 * CDN cache request metadata
 */
export interface CacheRequest {
  path: string;
  cached: boolean;
  bytes?: number;
  edgeLocation?: string;
  type?: string;
}

/**
 * CDN cache metrics
 */
export interface CacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatio: number;
  cachedBytes: number;
  uncachedBytes: number;
  contentTypes: Record<string, { hits: number; misses: number; hitRatio: number }>;
  edgeLocations: Record<string, { hits: number; misses: number; hitRatio: number }>;
}

/**
 * CDN Monitor for cache performance tracking
 */
export class CDNMonitor {
  private requests: CacheRequest[] = [];

  /**
   * Record a CDN cache request
   */
  recordRequest(request: CacheRequest): void {
    this.requests.push(request);
  }

  /**
   * Get aggregated cache metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.requests.length;
    const cacheHits = this.requests.filter((r) => r.cached).length;
    const cacheMisses = this.requests.filter((r) => !r.cached).length;
    const hitRatio = totalRequests === 0 ? 0 : (cacheHits / totalRequests) * 100;

    const cachedBytes = this.requests.filter((r) => r.cached).reduce((sum, r) => sum + (r.bytes || 0), 0);
    const uncachedBytes = this.requests.filter((r) => !r.cached).reduce((sum, r) => sum + (r.bytes || 0), 0);

    // Group by content type
    const contentTypes: Record<string, { hits: number; misses: number; hitRatio: number }> = {};
    this.requests.forEach((r) => {
      const type = r.type || 'unknown';
      if (!contentTypes[type]) {
        contentTypes[type] = { hits: 0, misses: 0, hitRatio: 0 };
      }

      if (r.cached) {
        contentTypes[type].hits++;
      } else {
        contentTypes[type].misses++;
      }

      const typeTotal = contentTypes[type].hits + contentTypes[type].misses;
      contentTypes[type].hitRatio = typeTotal === 0 ? 0 : (contentTypes[type].hits / typeTotal) * 100;
    });

    // Group by edge location
    const edgeLocations: Record<string, { hits: number; misses: number; hitRatio: number }> = {};
    this.requests.forEach((r) => {
      const location = r.edgeLocation || 'unknown';
      if (!edgeLocations[location]) {
        edgeLocations[location] = { hits: 0, misses: 0, hitRatio: 0 };
      }

      if (r.cached) {
        edgeLocations[location].hits++;
      } else {
        edgeLocations[location].misses++;
      }

      const locationTotal = edgeLocations[location].hits + edgeLocations[location].misses;
      edgeLocations[location].hitRatio = locationTotal === 0 ? 0 : (edgeLocations[location].hits / locationTotal) * 100;
    });

    return {
      totalRequests,
      cacheHits,
      cacheMisses,
      hitRatio,
      cachedBytes,
      uncachedBytes,
      contentTypes,
      edgeLocations
    };
  }

  /**
   * Identify content with low cache hit ratio
   */
  getLowHitRatioContent(threshold: number): string[] {
    const metrics = this.getMetrics();
    return Object.entries(metrics.contentTypes)
      .filter(([_, data]) => data.hitRatio < threshold)
      .map(([type]) => type);
  }

  /**
   * Get dashboard metrics for visualization
   */
  getDashboardMetrics(): {
    cacheMetrics: CacheMetrics;
    contentTypeMetrics: Array<{ type: string; hitRatio: number; hits: number; misses: number }>;
    edgeLocationMetrics: Array<{ location: string; hitRatio: number; hits: number; misses: number }>;
  } {
    const metrics = this.getMetrics();

    const contentTypeMetrics = Object.entries(metrics.contentTypes).map(([type, data]) => ({
      type,
      hitRatio: data.hitRatio,
      hits: data.hits,
      misses: data.misses
    }));

    const edgeLocationMetrics = Object.entries(metrics.edgeLocations).map(([location, data]) => ({
      location,
      hitRatio: data.hitRatio,
      hits: data.hits,
      misses: data.misses
    }));

    return {
      cacheMetrics: metrics,
      contentTypeMetrics,
      edgeLocationMetrics
    };
  }
}

/**
 * Singleton instance for global CDN monitoring
 */
let globalMonitor: CDNMonitor | null = null;

/**
 * Get global CDN monitor instance
 */
export function getCDNMonitor(): CDNMonitor {
  if (!globalMonitor) {
    globalMonitor = new CDNMonitor();
  }
  return globalMonitor;
}

/**
 * Record cache metric globally
 */
export function recordCacheMetric(request: CacheRequest): void {
  getCDNMonitor().recordRequest(request);
}

/**
 * Get cache metrics globally
 */
export function getCacheMetrics(): CacheMetrics {
  return getCDNMonitor().getMetrics();
}
