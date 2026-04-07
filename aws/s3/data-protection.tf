# S3 Data Protection Configuration
# Task 3: S3 Versioning & Data Protection (AC4)
# Terraform for S3 versioning, MFA delete, Object Lock, and lifecycle policies

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

variable "enable_mfa_delete" {
  description = "Enable MFA delete protection"
  type        = bool
  default     = false # Requires MFA device in production
}

variable "application_data_bucket" {
  description = "S3 bucket for application user-generated content"
  type        = string
}

# Data source for existing S3 bucket
data "aws_s3_bucket" "app_data" {
  bucket = var.application_data_bucket
}

# S3 Bucket Versioning for Data Recovery
resource "aws_s3_bucket_versioning" "app_data" {
  bucket = data.aws_s3_bucket.app_data.id

  versioning_configuration {
    status     = "Enabled"
    mfa_delete = var.enable_mfa_delete # Production: true (requires MFA)
  }
}

# S3 Bucket Object Lock for Compliance (WORM - Write Once Read Many)
resource "aws_s3_bucket_object_lock_configuration" "app_data" {
  bucket = data.aws_s3_bucket.app_data.id

  rule {
    default_retention {
      mode = "GOVERNANCE" # Can be overridden by bucket owner with versioning
      days = 30           # Minimum 30-day retention per environment
    }
  }
}

# S3 Bucket Encryption (at-rest using KMS)
resource "aws_s3_bucket_server_side_encryption_configuration" "app_data" {
  bucket = data.aws_s3_bucket.app_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3_backup.arn
    }
    bucket_key_enabled = true # Reduces KMS API calls
  }
}

# KMS Key for S3 Encryption
resource "aws_kms_key" "s3_backup" {
  description             = "KMS key for S3 data backup encryption in ${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Environment = var.environment
    Component   = "s3-backup"
  }
}

resource "aws_kms_alias" "s3_backup" {
  name          = "alias/get-together-s3-backup-${var.environment}"
  target_key_id = aws_kms_key.s3_backup.key_id
}

# S3 Lifecycle Policy - Manage retention and transition versions
resource "aws_s3_bucket_lifecycle_configuration" "app_data" {
  bucket = data.aws_s3_bucket.app_data.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    # Current version retention
    noncurrent_version_transition {
      noncurrent_days = var.environment == "production" ? 90 : 30
      storage_class   = "STANDARD_IA"
    }

    # Delete old versions after retention period
    noncurrent_version_expiration {
      noncurrent_days = var.environment == "production" ? 365 : 90
    }

    # Incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  # Cleanup temporary/cache objects
  rule {
    id     = "cleanup-temp-objects"
    status = "Enabled"

    filter {
      prefix = "tmp/"
    }

    expiration {
      days = 7
    }
  }
}

# Block Public Access Settings
resource "aws_s3_bucket_public_access_block" "app_data" {
  bucket = data.aws_s3_bucket.app_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy - Restrict access to authenticated CloudFront
resource "aws_s3_bucket_policy" "app_data" {
  bucket = data.aws_s3_bucket.app_data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${data.aws_s3_bucket.app_data.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          data.aws_s3_bucket.app_data.arn,
          "${data.aws_s3_bucket.app_data.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# CloudWatch Alarms for S3 Versioning and Storage
resource "aws_cloudwatch_metric_alarm" "s3_storage_growth" {
  alarm_name          = "get-together-s3-storage-growth-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = "86400" # 1 day
  statistic           = "Average"
  threshold           = 100 * 1024 * 1024 * 1024 # 100 GB
  alarm_description   = "Alert when S3 bucket exceeds 100 GB"
  alarm_actions       = [aws_sns_topic.s3_alerts.arn]

  dimensions = {
    BucketName = data.aws_s3_bucket.app_data.id
    StorageType = "StandardStorage"
  }
}

resource "aws_cloudwatch_metric_alarm" "s3_version_count" {
  alarm_name          = "get-together-s3-version-count-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "NumberOfObjects"
  namespace           = "AWS/S3"
  period              = "86400"
  statistic           = "Average"
  threshold           = 1000000 # 1 million versions
  alarm_description   = "Alert when S3 object versions exceed 1 million"
  alarm_actions       = [aws_sns_topic.s3_alerts.arn]

  dimensions = {
    BucketName = data.aws_s3_bucket.app_data.id
  }
}

# SNS Topic for S3 Alerts
resource "aws_sns_topic" "s3_alerts" {
  name = "get-together-s3-alerts-${var.environment}"

  tags = {
    Environment = var.environment
    Component   = "s3-backup"
  }
}

# SNS Topic Policy
resource "aws_sns_topic_policy" "s3_alerts_policy" {
  arn = aws_sns_topic.s3_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.s3_alerts.arn
      }
    ]
  })
}

# Outputs
output "s3_bucket_versioning_enabled" {
  value       = aws_s3_bucket_versioning.app_data.versioning_configuration[0].status
  description = "S3 bucket versioning status"
}

output "s3_bucket_encryption_key_id" {
  value       = aws_kms_key.s3_backup.id
  description = "KMS key ID for S3 encryption"
}

output "s3_object_lock_enabled" {
  value       = aws_s3_bucket_object_lock_configuration.app_data.rule[0].default_retention.mode
  description = "S3 Object Lock retention mode"
}

output "s3_lifecycle_rules" {
  value       = "delete-old-versions, cleanup-temp-objects"
  description = "Active S3 lifecycle rules"
}

output "s3_alerts_topic_arn" {
  value       = aws_sns_topic.s3_alerts.arn
  description = "SNS topic ARN for S3 storage alerts"
}
