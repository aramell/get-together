# CloudWatch Backup Monitoring Alarms
# Task 4: CloudWatch Backup Monitoring (AC6)
# Terraform for backup failure alerts, retention violations, growth monitoring, PITR degradation

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "environment" {
  description = "Environment: dev, staging, production"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "rds_cluster_identifier" {
  description = "RDS Aurora cluster identifier"
  type        = string
}

variable "backup_alerts_sns_topic_arn" {
  description = "SNS topic ARN for backup alerts"
  type        = string
}

variable "backup_failure_threshold" {
  description = "Number of backup failures to trigger alert"
  type        = number
  default     = 1
}

variable "backup_growth_threshold_gb" {
  description = "Backup growth threshold in GB per day"
  type        = number
  default     = 50
}

variable "pitr_window_threshold_hours" {
  description = "Minimum PITR window in hours before alerting"
  type        = number
  default     = 24
}

# Data source for current region
data "aws_region" "current" {}

# Backup Job Failure Alarm
# Triggers when any backup operation fails (BackupFailed event)
resource "aws_cloudwatch_metric_alarm" "backup_job_failure" {
  alarm_name          = "get-together-backup-failure-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "BackupJobFailure"
  namespace           = "AWS/RDS"
  period              = "300" # 5 minutes
  statistic           = "Sum"
  threshold           = var.backup_failure_threshold
  alarm_description   = "Alert when RDS backup job fails"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.backup_alerts_sns_topic_arn]

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  tags = {
    Environment = var.environment
    Component   = "backup-monitoring"
    Severity    = "CRITICAL"
  }
}

# Backup Retention Policy Violation Alarm
# Triggers when backup retention window is violated
resource "aws_cloudwatch_metric_alarm" "backup_retention_violation" {
  alarm_name          = "get-together-backup-retention-violation-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "BackupRetentionPeriodStorageUsed"
  namespace           = "AWS/RDS"
  period              = "3600" # 1 hour
  statistic           = "Average"
  threshold           = 1 # At least 1 byte of backup storage should exist
  alarm_description   = "Alert when backup retention policy is violated (no backups)"
  treat_missing_data  = "breaching" # If no data, assume violation
  alarm_actions       = [var.backup_alerts_sns_topic_arn]

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  tags = {
    Environment = var.environment
    Component   = "backup-monitoring"
    Severity    = "WARNING"
  }
}

# Backup Storage Growth Alarm
# Triggers when daily backup growth exceeds threshold (e.g., > 50 GB/day)
resource "aws_cloudwatch_metric_alarm" "backup_growth_exceeded" {
  alarm_name          = "get-together-backup-growth-exceeded-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BackupStorageUsed"
  namespace           = "AWS/RDS"
  period              = "86400" # 1 day
  statistic           = "Average"
  threshold           = var.backup_growth_threshold_gb * 1024 * 1024 * 1024 # Convert GB to bytes
  alarm_description   = "Alert when daily backup growth exceeds ${var.backup_growth_threshold_gb}GB"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.backup_alerts_sns_topic_arn]

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  tags = {
    Environment = var.environment
    Component   = "backup-monitoring"
    Severity    = "WARNING"
  }
}

# PITR Window Degradation Alarm
# Triggers when PITR (Point-in-Time Recovery) window falls below threshold
# PITR window should be >= 35 days for production
resource "aws_cloudwatch_event_rule" "pitr_window_check" {
  name                = "get-together-pitr-window-check-${var.environment}"
  description         = "Check PITR window health every 6 hours"
  schedule_expression = "rate(6 hours)"

  tags = {
    Environment = var.environment
    Component   = "backup-monitoring"
  }
}

resource "aws_cloudwatch_event_target" "pitr_window_lambda" {
  rule      = aws_cloudwatch_event_rule.pitr_window_check.name
  target_id = "PITRWindowCheckLambda"
  arn       = aws_lambda_function.pitr_window_check.arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pitr_window_check.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.pitr_window_check.arn
}

# Lambda function to check PITR window
resource "aws_lambda_function" "pitr_window_check" {
  filename      = "pitr-window-check.zip"
  function_name = "get-together-pitr-window-check-${var.environment}"
  role          = aws_iam_role.lambda_pitr_role.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 60

  environment {
    variables = {
      DB_CLUSTER_ID           = var.rds_cluster_identifier
      SNS_TOPIC_ARN           = var.backup_alerts_sns_topic_arn
      PITR_THRESHOLD_HOURS    = var.pitr_window_threshold_hours
      ENVIRONMENT             = var.environment
    }
  }

  tags = {
    Environment = var.environment
    Component   = "backup-monitoring"
  }
}

# IAM Role for Lambda PITR Window Check
resource "aws_iam_role" "lambda_pitr_role" {
  name = "get-together-pitr-check-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_pitr_policy" {
  name   = "get-together-pitr-check-policy-${var.environment}"
  role   = aws_iam_role.lambda_pitr_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBClusters",
          "rds:DescribeDBClusterSnapshots"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.backup_alerts_sns_topic_arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:*:*"
      }
    ]
  })
}

# Composite Alarm: Backup Health Status
# Combines multiple backup alarms into single health indicator
resource "aws_cloudwatch_composite_alarm" "backup_health" {
  alarm_name          = "get-together-backup-health-${var.environment}"
  alarm_description   = "Composite alarm for overall backup health"
  actions_enabled     = true
  alarm_actions       = [var.backup_alerts_sns_topic_arn]
  ok_actions          = [var.backup_alerts_sns_topic_arn]

  # Alert if ANY of these conditions are true
  alarm_rule = join(" OR ", [
    "alarm(${aws_cloudwatch_metric_alarm.backup_job_failure.alarm_name})",
    "alarm(${aws_cloudwatch_metric_alarm.backup_retention_violation.alarm_name})",
    "alarm(${aws_cloudwatch_metric_alarm.backup_growth_exceeded.alarm_name})"
  ])

  tags = {
    Environment = var.environment
    Component   = "backup-monitoring"
  }
}

# CloudWatch Log Group for Backup Events
resource "aws_cloudwatch_log_group" "backup_events" {
  name              = "/aws/rds/backup-events-${var.environment}"
  retention_in_days = var.environment == "production" ? 90 : 30

  tags = {
    Environment = var.environment
    Component   = "backup-monitoring"
  }
}

# Metric Filter for Backup Completion Events
resource "aws_cloudwatch_log_group_metric_filter" "backup_completion" {
  name           = "BackupCompletion"
  log_group_name = aws_cloudwatch_log_group.backup_events.name
  filter_pattern = "[time, request_id, event_source, event_type=*Backup*Complete*, ...]"

  metric_transformation {
    name      = "BackupCompletionCount"
    namespace = "GetTogether/RDS"
    value     = "1"
  }
}

# Metric Filter for Backup Failures
resource "aws_cloudwatch_log_group_metric_filter" "backup_failure" {
  name           = "BackupFailure"
  log_group_name = aws_cloudwatch_log_group.backup_events.name
  filter_pattern = "[time, request_id, event_source, event_type=*Backup*Failed*, ...]"

  metric_transformation {
    name      = "BackupFailureCount"
    namespace = "GetTogether/RDS"
    value     = "1"
  }
}

# Dashboard Widget for Backup Status
resource "aws_cloudwatch_dashboard" "backup_monitoring" {
  dashboard_name = "get-together-backup-monitoring-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "BackupStorageUsed", { stat = "Average", label = "Backup Storage" }],
            [".", "BackupRetentionPeriodStorageUsed", { stat = "Maximum", label = "Retention Storage" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Backup Storage Usage"
          yAxis = {
            left = {
              label = "Bytes"
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["GetTogether/RDS", "BackupCompletionCount", { stat = "Sum" }],
            [".", "BackupFailureCount", { stat = "Sum" }]
          ]
          period = 3600
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "Backup Job Status"
          yAxis = {
            left = {
              label = "Count"
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "BackupWindowDuration", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Backup Duration"
          yAxis = {
            left = {
              label = "Minutes"
            }
          }
        }
      },
      {
        type = "log"
        properties = {
          query   = "fields @timestamp, @message | filter @message like /backup/ | stats count() as backup_events, count() as completed by ispresent(@message)"
          region  = data.aws_region.current.name
          title   = "Backup Events (Last 24h)"
          width   = 12
          height  = 6
        }
      }
    ]
  })
}

# Outputs
output "backup_failure_alarm_name" {
  value       = aws_cloudwatch_metric_alarm.backup_job_failure.alarm_name
  description = "Name of backup failure alarm"
}

output "backup_retention_violation_alarm_name" {
  value       = aws_cloudwatch_metric_alarm.backup_retention_violation.alarm_name
  description = "Name of retention violation alarm"
}

output "backup_growth_exceeded_alarm_name" {
  value       = aws_cloudwatch_metric_alarm.backup_growth_exceeded.alarm_name
  description = "Name of backup growth exceeded alarm"
}

output "backup_health_alarm_name" {
  value       = aws_cloudwatch_composite_alarm.backup_health.alarm_name
  description = "Name of composite backup health alarm"
}

output "backup_monitoring_dashboard_url" {
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=get-together-backup-monitoring-${var.environment}"
  description = "URL to backup monitoring dashboard"
}
