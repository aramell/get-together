/**
 * CloudWatch Dashboard & Insights Queries
 * Task 8: Log Analysis & Dashboards (AC9)
 * CloudWatch Insights queries for common debugging scenarios
 */

/**
 * CloudWatch Insights query structure
 */
export interface CloudWatchInsightsQuery {
  name: string;
  statement: string;
  description?: string;
}

/**
 * Dashboard widget configuration
 */
export interface MetricWidgetConfig {
  title: string;
  metricName: string;
  namespace: string;
  stat: string;
  chartType?: 'bar' | 'line' | 'pie';
  period?: number;
}

export interface LogInsightsWidgetConfig {
  title: string;
  query: CloudWatchInsightsQuery;
  chartType?: 'line' | 'bar' | 'table' | 'number';
}

/**
 * CloudWatch Insights query templates
 */
export function createErrorsQuery(minutes: number): CloudWatchInsightsQuery {
  return {
    name: `Errors in Last ${minutes} Minutes`,
    statement: `
      fields @timestamp, @message, level, errorCode
      | filter level = "ERROR"
      | stats count() as errorCount by errorCode
      | sort errorCount desc
    `,
    description: 'Find all errors in the specified time period'
  };
}

export function createUserRequestsQuery(userId: string): CloudWatchInsightsQuery {
  return {
    name: `All Requests for ${userId}`,
    statement: `
      fields @timestamp, method, path, statusCode, duration
      | filter userId = "${userId}"
      | sort @timestamp desc
    `,
    description: `Find all requests made by user ${userId}`
  };
}

export function createSlowEndpointsQuery(thresholdMs: number): CloudWatchInsightsQuery {
  return {
    name: `Slow Endpoints (>${thresholdMs}ms)`,
    statement: `
      fields @timestamp, path, method, duration
      | filter duration > ${thresholdMs}
      | stats avg(duration) as avgDuration, max(duration) as maxDuration, count() as count by path
      | sort avgDuration desc
    `,
    description: `Find endpoints with latency exceeding ${thresholdMs}ms`
  };
}

export function createAuthFailuresQuery(): CloudWatchInsightsQuery {
  return {
    name: 'Failed Authorization Attempts',
    statement: `
      fields @timestamp, userId, ipAddress, path
      | filter statusCode = 403
      | stats count() as failureCount by userId, ipAddress
      | sort failureCount desc
    `,
    description: 'Find authorization failures (403 errors)'
  };
}

export function createSlowQueriesQuery(thresholdMs: number): CloudWatchInsightsQuery {
  return {
    name: `Slow Database Queries (>${thresholdMs}ms)`,
    statement: `
      fields @timestamp, query, queryDuration
      | filter queryDuration > ${thresholdMs}
      | stats avg(queryDuration) as avgDuration, max(queryDuration) as maxDuration by query
      | sort avgDuration desc
    `,
    description: `Find database queries exceeding ${thresholdMs}ms`
  };
}

/**
 * CloudWatch Dashboard builder
 */
export class CloudWatchDashboard {
  title: string;
  private widgets: any[] = [];

  constructor(title: string) {
    this.title = title;
  }

  /**
   * Add metric widget to dashboard
   */
  addMetricWidget(config: MetricWidgetConfig): void {
    this.widgets.push({
      type: 'metric',
      properties: {
        metrics: [
          [config.namespace, config.metricName]
        ],
        period: config.period || 300,
        stat: config.stat,
        region: 'us-east-1',
        title: config.title,
        yAxis: {
          left: {
            label: config.metricName
          }
        }
      }
    });
  }

  /**
   * Add CloudWatch Insights query widget
   */
  addLogInsightsWidget(config: LogInsightsWidgetConfig): void {
    this.widgets.push({
      type: 'log',
      properties: {
        query: config.query.statement,
        title: config.title,
        chartType: config.chartType || 'line'
      }
    });
  }

  /**
   * Get widget count
   */
  getWidgetCount(): number {
    return this.widgets.length;
  }

  /**
   * Get dashboard definition (CloudFormation/Terraform compatible)
   */
  getDefinition(): any {
    return {
      DashboardName: this.title,
      widgets: this.widgets,
      DashboardBody: JSON.stringify({
        widgets: this.widgets
      })
    };
  }
}

/**
 * Get dashboard metrics for real-time monitoring
 */
export function getDashboardMetrics(): any {
  return {
    requestCount: 'RequestCount',
    errorRate: 'ErrorRate',
    latency: 'Duration',
    databaseLatency: 'QueryDuration'
  };
}

/**
 * Sample dashboard creation helper
 */
export function createDefaultDashboard(): CloudWatchDashboard {
  const dashboard = new CloudWatchDashboard('GetTogether API Monitoring');

  // Request count by endpoint (bar chart)
  dashboard.addMetricWidget({
    title: 'Request Count by Endpoint',
    metricName: 'RequestCount',
    namespace: 'GetTogether/API',
    stat: 'Sum',
    chartType: 'bar'
  });

  // Error rate trend (line chart)
  dashboard.addMetricWidget({
    title: 'Error Rate Trend',
    metricName: 'ErrorRate',
    namespace: 'GetTogether/API',
    stat: 'Average',
    chartType: 'line'
  });

  // API latency histogram
  dashboard.addMetricWidget({
    title: 'API Latency Distribution',
    metricName: 'Duration',
    namespace: 'GetTogether/API',
    stat: 'Average',
    chartType: 'bar'
  });

  // Top errors table
  dashboard.addLogInsightsWidget({
    title: 'Top Errors',
    query: createErrorsQuery(60),
    chartType: 'table'
  });

  // Activity by service pie chart
  dashboard.addMetricWidget({
    title: 'Activity by Service',
    metricName: 'RequestCount',
    namespace: 'GetTogether/API',
    stat: 'Sum',
    chartType: 'pie'
  });

  return dashboard;
}
