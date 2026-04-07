/**
 * CloudWatch Alarms & Error Tracking
 * Task 3: Error Tracking & Alerting (AC3)
 * Configures alarms for error rates, latency, and infrastructure health
 */

import {
  CloudWatchClient,
  PutMetricAlarmCommand,
  MetricAlarm,
  ComparisonOperator,
  Statistic
} from '@aws-sdk/client-cloudwatch';
import { SNSClient, CreateTopicCommand, SubscribeCommand } from '@aws-sdk/client-sns';

export interface AlarmConfig {
  alarmName: string;
  metricName: string;
  namespace: string;
  statistic: Statistic;
  period: number;
  evaluationPeriods: number;
  threshold: number;
  comparisonOperator: ComparisonOperator;
  alarmActions: string[]; // SNS topic ARNs
  treatMissingData?: 'missing' | 'notBreaching' | 'breaching' | 'insufficientData';
}

export interface AlarmThresholds {
  errorRateWarning: number; // 5%
  errorRateCritical: number; // 10%
  latencyThreshold: number; // 2000ms
  databaseConnectionThreshold: number; // 95%
  cognitoFailureThreshold: number; // 10/minute
}

/**
 * Default alarm thresholds (from AC3)
 */
export const DEFAULT_ALARM_THRESHOLDS: AlarmThresholds = {
  errorRateWarning: 5,
  errorRateCritical: 10,
  latencyThreshold: 2000, // milliseconds (p95)
  databaseConnectionThreshold: 95, // percent
  cognitoFailureThreshold: 10 // per minute
};

/**
 * Alarm factory class
 */
export class AlarmManager {
  private cloudwatch: CloudWatchClient;
  private sns: SNSClient;
  private snsTopicArn: string | null = null;
  private thresholds: AlarmThresholds;
  private awsRegion: string;

  constructor(config: {
    awsRegion?: string;
    thresholds?: Partial<AlarmThresholds>;
  } = {}) {
    this.awsRegion = config.awsRegion || process.env.AWS_REGION || 'us-east-1';
    this.thresholds = { ...DEFAULT_ALARM_THRESHOLDS, ...config.thresholds };
    this.cloudwatch = new CloudWatchClient({ region: this.awsRegion });
    this.sns = new SNSClient({ region: this.awsRegion });
  }

  /**
   * Create SNS topic for alarm notifications
   */
  async createSNSTopic(topicName: string = 'get-together-alerts'): Promise<string> {
    try {
      const command = new CreateTopicCommand({ Name: topicName });
      const response = await this.sns.send(command);

      this.snsTopicArn = response.TopicArn!;
      return response.TopicArn!;
    } catch (error) {
      console.error('Failed to create SNS topic:', error);
      throw error;
    }
  }

  /**
   * Subscribe email to SNS topic
   */
  async subscribeEmail(topicArn: string, email: string): Promise<string> {
    try {
      const command = new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: 'email',
        Endpoint: email
      });

      const response = await this.sns.send(command);
      return response.SubscriptionArn!;
    } catch (error) {
      console.error('Failed to subscribe email:', error);
      throw error;
    }
  }

  /**
   * Subscribe Slack webhook to SNS topic
   */
  async subscribeSlack(topicArn: string, webhookUrl: string): Promise<string> {
    try {
      const command = new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: 'https',
        Endpoint: webhookUrl
      });

      const response = await this.sns.send(command);
      return response.SubscriptionArn!;
    } catch (error) {
      console.error('Failed to subscribe Slack:', error);
      throw error;
    }
  }

  /**
   * Create alarm for HTTP 5xx errors (AC3)
   */
  async createErrorRateAlarm(
    logGroupName: string,
    snsTopicArn: string = this.snsTopicArn!
  ): Promise<void> {
    // Create metric filter for 5xx errors
    const alarmConfig: AlarmConfig = {
      alarmName: 'get-together-error-rate-critical',
      metricName: 'ErrorRate',
      namespace: 'GetTogether/API',
      statistic: 'Average',
      period: 300, // 5 minutes
      evaluationPeriods: 1,
      threshold: this.thresholds.errorRateCritical,
      comparisonOperator: 'GreaterThanThreshold',
      alarmActions: [snsTopicArn],
      treatMissingData: 'notBreaching'
    };

    await this.createAlarm(alarmConfig);

    // Create warning alarm (5%)
    await this.createAlarm({
      ...alarmConfig,
      alarmName: 'get-together-error-rate-warning',
      threshold: this.thresholds.errorRateWarning
    });
  }

  /**
   * Create alarm for API latency (AC3)
   */
  async createLatencyAlarm(
    logGroupName: string,
    snsTopicArn: string = this.snsTopicArn!
  ): Promise<void> {
    const alarmConfig: AlarmConfig = {
      alarmName: 'get-together-api-latency-high',
      metricName: 'Duration',
      namespace: 'GetTogether/API',
      statistic: 'Average',
      period: 300, // 5 minutes
      evaluationPeriods: 2,
      threshold: this.thresholds.latencyThreshold,
      comparisonOperator: 'GreaterThanThreshold',
      alarmActions: [snsTopicArn],
      treatMissingData: 'notBreaching'
    };

    await this.createAlarm(alarmConfig);
  }

  /**
   * Create alarm for database connection failures (AC3)
   */
  async createDatabaseConnectionAlarm(
    snsTopicArn: string = this.snsTopicArn!
  ): Promise<void> {
    const alarmConfig: AlarmConfig = {
      alarmName: 'get-together-database-connection-failures',
      metricName: 'DatabaseConnections',
      namespace: 'AWS/RDS',
      statistic: 'Average',
      period: 300,
      evaluationPeriods: 1,
      threshold: this.thresholds.databaseConnectionThreshold,
      comparisonOperator: 'GreaterThanThreshold',
      alarmActions: [snsTopicArn],
      treatMissingData: 'notBreaching'
    };

    await this.createAlarm(alarmConfig);
  }

  /**
   * Create alarm for Cognito authentication failures (AC3)
   */
  async createCognitoFailureAlarm(
    logGroupName: string,
    snsTopicArn: string = this.snsTopicArn!
  ): Promise<void> {
    const alarmConfig: AlarmConfig = {
      alarmName: 'get-together-cognito-auth-failures',
      metricName: 'CognitoAuthFailures',
      namespace: 'GetTogether/Auth',
      statistic: 'Sum',
      period: 60, // 1 minute
      evaluationPeriods: 1,
      threshold: this.thresholds.cognitoFailureThreshold,
      comparisonOperator: 'GreaterThanThreshold',
      alarmActions: [snsTopicArn],
      treatMissingData: 'notBreaching'
    };

    await this.createAlarm(alarmConfig);
  }

  /**
   * Create a metric alarm in CloudWatch
   */
  private async createAlarm(config: AlarmConfig): Promise<void> {
    try {
      const command = new PutMetricAlarmCommand({
        AlarmName: config.alarmName,
        MetricName: config.metricName,
        Namespace: config.namespace,
        Statistic: config.statistic,
        Period: config.period,
        EvaluationPeriods: config.evaluationPeriods,
        Threshold: config.threshold,
        ComparisonOperator: config.comparisonOperator as any,
        AlarmActions: config.alarmActions,
        TreatMissingData: config.treatMissingData || 'notBreaching',
        AlarmDescription: `Alarm for ${config.alarmName}`
      });

      await this.cloudwatch.send(command);
      console.log(`Created alarm: ${config.alarmName}`);
    } catch (error) {
      console.error(`Failed to create alarm ${config.alarmName}:`, error);
      // Continue even if alarm creation fails (might already exist)
    }
  }

  /**
   * Create all alarms for comprehensive monitoring
   */
  async createAllAlarms(
    logGroupName: string,
    snsTopicArn: string = this.snsTopicArn!
  ): Promise<void> {
    console.log('Creating CloudWatch alarms...');

    await Promise.all([
      this.createErrorRateAlarm(logGroupName, snsTopicArn),
      this.createLatencyAlarm(logGroupName, snsTopicArn),
      this.createDatabaseConnectionAlarm(snsTopicArn),
      this.createCognitoFailureAlarm(logGroupName, snsTopicArn)
    ]);

    console.log('All alarms created successfully');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cloudwatch.destroy();
    this.sns.destroy();
  }
}

/**
 * Metric helper for publishing custom metrics
 */
export interface MetricData {
  metricName: string;
  value: number;
  unit?: string;
  timestamp?: Date;
  dimensions?: Array<{ name: string; value: string }>;
}

/**
 * Publish custom metric to CloudWatch
 */
export async function publishMetric(
  metric: MetricData,
  namespace: string = 'GetTogether/API',
  awsRegion: string = 'us-east-1'
): Promise<void> {
  const client = new CloudWatchClient({ region: awsRegion });

  try {
    const command = new (require('@aws-sdk/client-cloudwatch') as any).PutMetricDataCommand({
      Namespace: namespace,
      MetricData: [
        {
          MetricName: metric.metricName,
          Value: metric.value,
          Unit: metric.unit || 'None',
          Timestamp: metric.timestamp || new Date(),
          Dimensions: metric.dimensions || []
        }
      ]
    });

    await client.send(command);
  } catch (error) {
    console.error('Failed to publish metric:', error);
  }
}

/**
 * Helper to log error with severity for alarming
 */
export function logErrorWithSeverity(
  severity: 'info' | 'warning' | 'critical',
  message: string,
  context?: Record<string, any>
): void {
  const levels = {
    info: 'INFO',
    warning: 'WARN',
    critical: 'ERROR'
  };

  console.log(JSON.stringify({
    level: levels[severity],
    message,
    severity,
    timestamp: new Date().toISOString(),
    ...context
  }));
}
