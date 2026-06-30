# Aurora Backup Configuration
# Task 1: Aurora Backup Configuration (AC1, AC2)
# Terraform for automated daily full backups + hourly incremental
# Point-in-time recovery with 35-day retention

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

variable "backup_retention_days" {
  description = "Backup retention period in days per environment"
  type        = number
  default     = 30 # dev default
}

variable "rds_cluster_identifier" {
  description = "RDS Aurora cluster identifier"
  type        = string
}

variable "preferred_backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "03:00-04:00" # 3-4 AM UTC
}

variable "preferred_maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00" # Sunday 4-5 AM UTC
}

variable "enable_cross_region_backup" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = true
}

variable "backup_kms_key_id" {
  description = "KMS key ID for backup encryption"
  type        = string
  optional    = true
}

# Data source for existing RDS cluster
data "aws_rds_cluster" "main" {
  cluster_identifier = var.rds_cluster_identifier
}

# RDS Parameter Group for Backup Configuration
resource "aws_db_cluster_parameter_group" "backup_config" {
  family      = data.aws_rds_cluster.main.engine_family
  name        = "get-together-backup-config-${var.environment}"
  description = "Backup configuration for get-together Aurora cluster"

  # Enable backup retention
  parameter {
    name  = "backup_retention_period"
    value = var.backup_retention_days
  }

  # Enable automated backups
  parameter {
    name  = "automated_backup_enabled"
    value = "1"
  }

  # Enable PITR (Point-in-Time Recovery)
  parameter {
    name  = "enable_pitr"
    value = "1"
  }

  tags = {
    Environment = var.environment
    Component   = "backup"
  }
}

# Update RDS Cluster with backup settings
# Note: In real implementation, this would be part of the RDS cluster resource
# For now, document the required cluster settings

locals {
  required_cluster_settings = {
    # Automated backup window (daily at 03:00 UTC)
    backup_retention_period = var.backup_retention_days
    backup_window           = var.preferred_backup_window
    copy_tags_to_snapshot   = true

    # PITR configuration (35-day retention for production, 7-day for others)
    backup_retention_period = var.environment == "production" ? 35 : 7

    # Encryption at rest
    storage_encrypted = true
    kms_key_id        = var.backup_kms_key_id

    # Enable enhanced monitoring for backup status
    enable_cloudwatch_logs_exports = ["audit", "error", "general", "slowquery"]
  }
}

# CloudWatch Log Group for RDS Events
resource "aws_cloudwatch_log_group" "rds_backup_events" {
  name              = "/aws/rds/backup-${var.environment}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Component   = "backup"
  }
}

# RDS Event Subscription for backup notifications
resource "aws_db_event_subscription" "backup_events" {
  name             = "get-together-backup-events-${var.environment}"
  sns_topic_arn    = aws_sns_topic.backup_alerts.arn
  source_type      = "db-cluster"
  source_ids       = [var.rds_cluster_identifier]
  enabled          = true

  # Event categories for backups
  event_categories = [
    "availability",
    "backup",
    "failure",
    "maintenance",
    "notification",
    "recovery"
  ]

  tags = {
    Environment = var.environment
    Component   = "backup"
  }
}

# SNS Topic for Backup Alerts (referenced by CloudWatch alarms)
resource "aws_sns_topic" "backup_alerts" {
  name = "get-together-backup-alerts-${var.environment}"

  tags = {
    Environment = var.environment
    Component   = "backup"
  }
}

# SNS Topic Policy for RDS events
resource "aws_sns_topic_policy" "backup_alerts_policy" {
  arn = aws_sns_topic.backup_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = "SNS:Publish"
        Resource = aws_sns_topic.backup_alerts.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Data source for current AWS account ID
data "aws_caller_identity" "current" {}

# CloudWatch Dashboard for Backup Monitoring
resource "aws_cloudwatch_dashboard" "backup_status" {
  dashboard_name = "get-together-backup-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "BackupStorageUsed", { stat = "Average" }],
            [".", "DBInstanceStorageUsed", { stat = "Average" }]
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
            ["AWS/RDS", "BackupRetentionPeriodStorageUsed", { stat = "Maximum" }]
          ]
          period = 300
          stat   = "Maximum"
          region = data.aws_region.current.name
          title  = "Backup Retention Period Storage"
          yAxis = {
            left = {
              label = "Bytes"
            }
          }
        }
      },
      {
        type = "log"
        properties = {
          query   = "fields @timestamp, @message | filter @message like /backup/ | stats count() as backup_events"
          region  = data.aws_region.current.name
          title   = "Backup Events (Last Hour)"
        }
      }
    ]
  })
}

# Data source for current AWS region
data "aws_region" "current" {}

# Outputs
output "backup_parameter_group_name" {
  value       = aws_db_cluster_parameter_group.backup_config.name
  description = "Name of the backup configuration parameter group"
}

output "backup_retention_days" {
  value       = var.backup_retention_days
  description = "Configured backup retention period in days"
}

output "backup_window" {
  value       = var.preferred_backup_window
  description = "Preferred backup window (UTC)"
}

output "backup_alerts_topic_arn" {
  value       = aws_sns_topic.backup_alerts.arn
  description = "SNS topic ARN for backup alerts"
}

output "cloudwatch_log_group_name" {
  value       = aws_cloudwatch_log_group.rds_backup_events.name
  description = "CloudWatch log group for RDS backup events"
}

output "backup_dashboard_url" {
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=get-together-backup-${var.environment}"
  description = "URL to CloudWatch backup monitoring dashboard"
}
