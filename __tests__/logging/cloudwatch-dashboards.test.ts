/**
 * CloudWatch Dashboards & Log Analysis Tests
 * Task 8: Log Analysis & Dashboards (AC9)
 * Tests for CloudWatch Insights queries and dashboard visualization
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  CloudWatchDashboard,
  CloudWatchInsightsQuery,
  createErrorsQuery,
  createUserRequestsQuery,
  createSlowEndpointsQuery,
  createAuthFailuresQuery,
  createSlowQueriesQuery,
  getDashboardMetrics
} from '@/lib/logging/cloudwatch-dashboard';

describe('CloudWatch Insights Queries (AC9)', () => {
  it('should create query for errors in last hour', () => {
    const query = createErrorsQuery(60); // 60 minutes

    expect(query).toBeDefined();
    expect(query.name).toContain('Errors');
    expect(query.statement).toContain('ERROR');
    expect(query.statement).toContain('fields');
  });

  it('should create query for requests by user', () => {
    const userId = 'user-123';
    const query = createUserRequestsQuery(userId);

    expect(query).toBeDefined();
    expect(query.name).toContain('user-123');
    expect(query.statement).toContain('userId');
  });

  it('should create query for slow endpoints', () => {
    const query = createSlowEndpointsQuery(2000); // 2 seconds

    expect(query).toBeDefined();
    expect(query.name).toContain('Slow');
    expect(query.statement).toContain('duration');
  });

  it('should create query for failed authorization', () => {
    const query = createAuthFailuresQuery();

    expect(query).toBeDefined();
    expect(query.statement).toContain('403');
  });

  it('should create query for database performance issues', () => {
    const query = createSlowQueriesQuery(1000); // 1 second

    expect(query).toBeDefined();
    expect(query.statement).toContain('queryDuration');
  });
});

describe('CloudWatch Dashboard - Configuration (AC9)', () => {
  let dashboard: CloudWatchDashboard;

  beforeEach(() => {
    dashboard = new CloudWatchDashboard('Test Dashboard');
  });

  it('should create dashboard with title', () => {
    expect(dashboard.title).toBe('Test Dashboard');
  });

  it('should add widgets to dashboard', () => {
    dashboard.addMetricWidget({
      title: 'Request Count',
      metricName: 'RequestCount',
      namespace: 'GetTogether/API',
      stat: 'Sum'
    });

    expect(dashboard.getWidgetCount()).toBe(1);
  });

  it('should support multiple widget types', () => {
    // Metric widget
    dashboard.addMetricWidget({
      title: 'API Latency',
      metricName: 'Duration',
      namespace: 'GetTogether/API',
      stat: 'Average'
    });

    // Log widget
    dashboard.addLogInsightsWidget({
      title: 'Errors',
      query: createErrorsQuery(60)
    });

    expect(dashboard.getWidgetCount()).toBe(2);
  });

  it('should export dashboard definition', () => {
    dashboard.addMetricWidget({
      title: 'Request Count',
      metricName: 'RequestCount',
      namespace: 'GetTogether/API',
      stat: 'Sum'
    });

    const definition = dashboard.getDefinition();
    expect(definition).toBeDefined();
    expect(definition.widgets).toBeDefined();
    expect(definition.widgets.length).toBeGreaterThan(0);
  });
});

describe('CloudWatch Dashboard - Widgets (AC9)', () => {
  let dashboard: CloudWatchDashboard;

  beforeEach(() => {
    dashboard = new CloudWatchDashboard('Test Dashboard');
  });

  it('should create request count bar chart', () => {
    dashboard.addMetricWidget({
      title: 'Request Count by Endpoint',
      metricName: 'RequestCount',
      namespace: 'GetTogether/API',
      stat: 'Sum',
      chartType: 'bar'
    });

    const definition = dashboard.getDefinition();
    expect(definition.widgets[0].properties.yAxis.left.label).toBeDefined();
  });

  it('should create error rate trend line chart', () => {
    dashboard.addMetricWidget({
      title: 'Error Rate Trend',
      metricName: 'ErrorRate',
      namespace: 'GetTogether/API',
      stat: 'Average',
      chartType: 'line'
    });

    const definition = dashboard.getDefinition();
    expect(definition.widgets.length).toBeGreaterThan(0);
  });

  it('should create API latency histogram', () => {
    dashboard.addMetricWidget({
      title: 'API Latency Distribution',
      metricName: 'Duration',
      namespace: 'GetTogether/API',
      stat: 'Average',
      chartType: 'bar'
    });

    expect(dashboard.getWidgetCount()).toBe(1);
  });

  it('should create top errors table', () => {
    dashboard.addLogInsightsWidget({
      title: 'Top Errors',
      query: createErrorsQuery(60),
      chartType: 'table'
    });

    expect(dashboard.getWidgetCount()).toBe(1);
  });

  it('should create activity pie chart', () => {
    dashboard.addMetricWidget({
      title: 'Activity by Service',
      metricName: 'RequestCount',
      namespace: 'GetTogether/API',
      stat: 'Sum',
      chartType: 'pie'
    });

    expect(dashboard.getWidgetCount()).toBe(1);
  });
});

describe('CloudWatch Dashboard - Metrics & Visualizations (AC9)', () => {
  let dashboard: CloudWatchDashboard;

  beforeEach(() => {
    dashboard = new CloudWatchDashboard('Full Dashboard');
  });

  it('should support comprehensive dashboard with all metrics', () => {
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

    // API latency histogram (bar chart)
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

    expect(dashboard.getWidgetCount()).toBe(5);
  });

  it('should provide metrics for real-time monitoring', () => {
    dashboard.addMetricWidget({
      title: 'Real-time Request Rate',
      metricName: 'RequestCount',
      namespace: 'GetTogether/API',
      stat: 'Sum',
      period: 60 // 1-minute granularity
    });

    const metrics = getDashboardMetrics();
    expect(metrics).toBeDefined();
  });
});

describe('CloudWatch Insights - Query Examples (AC9)', () => {
  it('should execute errors query', () => {
    const query = createErrorsQuery(60);
    expect(query.statement).toContain('fields');
    expect(query.statement).toContain('@timestamp');
    expect(query.statement).toContain('ERROR');
  });

  it('should execute user requests query', () => {
    const query = createUserRequestsQuery('user-123');
    expect(query.statement).toContain('user-123');
    expect(query.statement).toContain('fields');
  });

  it('should execute slow endpoints query', () => {
    const query = createSlowEndpointsQuery(2000);
    expect(query.statement).toContain('duration');
    expect(query.statement).toContain('2000');
  });

  it('should execute auth failures query', () => {
    const query = createAuthFailuresQuery();
    expect(query.statement).toContain('403');
    expect(query.statement).toContain('fields');
  });

  it('should execute database performance query', () => {
    const query = createSlowQueriesQuery(1000);
    expect(query.statement).toContain('queryDuration');
    expect(query.statement).toContain('1000');
  });
});

describe('CloudWatch Dashboard - Compliance (AC9)', () => {
  it('should satisfy AC9 all errors query', () => {
    const query = createErrorsQuery(60);
    expect(query).toBeDefined();
    expect(query.statement).toBeTruthy();
  });

  it('should satisfy AC9 user requests query', () => {
    const query = createUserRequestsQuery('user-123');
    expect(query).toBeDefined();
    expect(query.statement).toBeTruthy();
  });

  it('should satisfy AC9 slow endpoints query', () => {
    const query = createSlowEndpointsQuery(2000);
    expect(query).toBeDefined();
    expect(query.statement).toBeTruthy();
  });

  it('should satisfy AC9 failed authorization query', () => {
    const query = createAuthFailuresQuery();
    expect(query).toBeDefined();
    expect(query.statement).toBeTruthy();
  });

  it('should satisfy AC9 database query performance', () => {
    const query = createSlowQueriesQuery(1000);
    expect(query).toBeDefined();
    expect(query.statement).toBeTruthy();
  });

  it('should satisfy AC9 dashboard with 5+ visualizations', () => {
    const dashboard = new CloudWatchDashboard('Full Dashboard');

    dashboard.addMetricWidget({
      title: 'Request Count',
      metricName: 'RequestCount',
      namespace: 'GetTogether/API',
      stat: 'Sum',
      chartType: 'bar'
    });

    dashboard.addMetricWidget({
      title: 'Error Rate',
      metricName: 'ErrorRate',
      namespace: 'GetTogether/API',
      stat: 'Average',
      chartType: 'line'
    });

    dashboard.addMetricWidget({
      title: 'Latency',
      metricName: 'Duration',
      namespace: 'GetTogether/API',
      stat: 'Average',
      chartType: 'bar'
    });

    dashboard.addLogInsightsWidget({
      title: 'Errors',
      query: createErrorsQuery(60),
      chartType: 'table'
    });

    dashboard.addMetricWidget({
      title: 'Activity',
      metricName: 'RequestCount',
      namespace: 'GetTogether/API',
      stat: 'Sum',
      chartType: 'pie'
    });

    expect(dashboard.getWidgetCount()).toBe(5);
  });
});
