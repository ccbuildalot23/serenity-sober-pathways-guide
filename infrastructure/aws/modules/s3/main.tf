# Serenity Healthcare Platform - S3 Module
# HIPAA-compliant S3 buckets with encryption and lifecycle policies

# Random suffix for bucket names to ensure uniqueness
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Static Assets Bucket
resource "aws_s3_bucket" "static_assets" {
  bucket        = "${var.project_name}-${var.environment}-static-assets-${random_id.bucket_suffix.hex}"
  force_destroy = var.force_destroy

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-static-assets"
    Type        = "S3 Bucket"
    Purpose     = "Static Assets"
    DataClass   = "Public"
  })
}

# Static Assets Bucket Configuration
resource "aws_s3_bucket_versioning" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    id     = "static_assets_lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Backups Bucket
resource "aws_s3_bucket" "backups" {
  bucket        = "${var.project_name}-${var.environment}-backups-${random_id.bucket_suffix.hex}"
  force_destroy = false # Never allow force destroy on backups

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-backups"
    Type        = "S3 Bucket"
    Purpose     = "Backups"
    DataClass   = "Confidential"
    Retention   = "Long-term"
  })
}

# Backups Bucket Configuration
resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "backup_lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    # Keep current versions for 7 years (HIPAA compliance)
    expiration {
      days = 2555 # 7 years
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

# Cross-region replication for backups
resource "aws_s3_bucket_replication_configuration" "backups" {
  count = var.enable_cross_region_replication ? 1 : 0

  role   = aws_iam_role.replication[0].arn
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "backup_replication"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.backups_replica[0].arn
      storage_class = "STANDARD_IA"

      encryption_configuration {
        replica_kms_key_id = var.replica_kms_key_arn
      }
    }
  }

  depends_on = [aws_s3_bucket_versioning.backups]
}

# Backup replica bucket in DR region
resource "aws_s3_bucket" "backups_replica" {
  count = var.enable_cross_region_replication ? 1 : 0

  provider      = aws.replica
  bucket        = "${var.project_name}-${var.environment}-backups-replica-${random_id.bucket_suffix.hex}"
  force_destroy = false

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-backups-replica"
    Type        = "S3 Bucket"
    Purpose     = "Backup Replica"
    DataClass   = "Confidential"
    Region      = var.replica_region
  })
}

# CloudTrail Logs Bucket
resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket        = "${var.project_name}-${var.environment}-cloudtrail-logs-${random_id.bucket_suffix.hex}"
  force_destroy = var.force_destroy

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-cloudtrail-logs"
    Type        = "S3 Bucket"
    Purpose     = "CloudTrail Logs"
    DataClass   = "Audit"
  })
}

# CloudTrail Logs Bucket Configuration
resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    id     = "cloudtrail_lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Keep CloudTrail logs for 7 years (compliance requirement)
    expiration {
      days = 2555
    }
  }
}

# CloudTrail bucket policy
resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_logs.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# Application Logs Bucket
resource "aws_s3_bucket" "logs" {
  bucket        = "${var.project_name}-${var.environment}-logs-${random_id.bucket_suffix.hex}"
  force_destroy = var.force_destroy

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-logs"
    Type        = "S3 Bucket"
    Purpose     = "Application Logs"
    DataClass   = "Internal"
  })
}

# Application Logs Bucket Configuration
resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "logs_lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# Data Exports Bucket (for HIPAA compliance - patient data export requests)
resource "aws_s3_bucket" "data_exports" {
  bucket        = "${var.project_name}-${var.environment}-data-exports-${random_id.bucket_suffix.hex}"
  force_destroy = false # Never allow force destroy on patient data

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-data-exports"
    Type        = "S3 Bucket"
    Purpose     = "Data Exports"
    DataClass   = "PHI"
    Compliance  = "HIPAA"
  })
}

# Data Exports Bucket Configuration (highest security)
resource "aws_s3_bucket_versioning" "data_exports" {
  bucket = aws_s3_bucket.data_exports.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data_exports" {
  bucket = aws_s3_bucket.data_exports.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data_exports" {
  bucket = aws_s3_bucket.data_exports.id

  rule {
    id     = "data_exports_lifecycle"
    status = "Enabled"

    # Immediate transition to IA for cost optimization
    transition {
      days          = 1
      storage_class = "STANDARD_IA"
    }

    # Keep for 7 years minimum (HIPAA requirement)
    expiration {
      days = 2555
    }

    noncurrent_version_expiration {
      noncurrent_days = 2555
    }
  }
}

# Public Access Block for all buckets (security best practice)
resource "aws_s3_bucket_public_access_block" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  block_public_acls       = !var.allow_public_static_assets
  block_public_policy     = !var.allow_public_static_assets
  ignore_public_acls      = !var.allow_public_static_assets
  restrict_public_buckets = !var.allow_public_static_assets
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "data_exports" {
  bucket = aws_s3_bucket.data_exports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM Role for S3 Replication
resource "aws_iam_role" "replication" {
  count = var.enable_cross_region_replication ? 1 : 0

  name = "${var.project_name}-${var.environment}-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-s3-replication-role"
    Type = "IAM Role"
  })
}

resource "aws_iam_policy" "replication" {
  count = var.enable_cross_region_replication ? 1 : 0

  name = "${var.project_name}-${var.environment}-s3-replication-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.backups.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = [
          "${aws_s3_bucket.backups.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = [
          "${aws_s3_bucket.backups_replica[0].arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [
          var.kms_key_arn,
          var.replica_kms_key_arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "replication" {
  count = var.enable_cross_region_replication ? 1 : 0

  role       = aws_iam_role.replication[0].name
  policy_arn = aws_iam_policy.replication[0].arn
}

# S3 Bucket Notifications (for monitoring and compliance)
resource "aws_s3_bucket_notification" "data_exports" {
  bucket = aws_s3_bucket.data_exports.id

  topic {
    topic_arn = var.compliance_notification_topic_arn
    events    = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
  }
}

# CloudWatch Metrics for S3 buckets
resource "aws_cloudwatch_metric_alarm" "bucket_size" {
  for_each = {
    static_assets = aws_s3_bucket.static_assets.bucket
    backups      = aws_s3_bucket.backups.bucket
    logs         = aws_s3_bucket.logs.bucket
    data_exports = aws_s3_bucket.data_exports.bucket
  }

  alarm_name          = "${var.project_name}-${var.environment}-s3-${each.key}-size"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = "86400" # 24 hours
  statistic           = "Average"
  threshold           = var.bucket_size_threshold
  alarm_description   = "This metric monitors S3 bucket size for ${each.key}"
  alarm_actions       = var.alarm_actions

  dimensions = {
    BucketName  = each.value
    StorageType = "StandardStorage"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-s3-${each.key}-size-alarm"
    Type = "CloudWatch Alarm"
  })
}