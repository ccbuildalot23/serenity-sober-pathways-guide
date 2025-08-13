locals {
  bucket_id  = var.create_bucket ? aws_s3_bucket.logs[0].id : data.aws_s3_bucket.logs.id
  bucket_arn = var.create_bucket ? aws_s3_bucket.logs[0].arn : data.aws_s3_bucket.logs.arn
}

data "aws_caller_identity" "current" {}

data "aws_s3_bucket" "logs" {
  count = var.create_bucket ? 0 : 1
  bucket = var.logs_bucket_name
}

resource "aws_kms_key" "this" {
  description         = "KMS Key for CloudTrail encryption"
  enable_key_rotation = true
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowRootAccountAdmin"
        Effect   = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action   = [
          "kms:Create*","kms:Describe*","kms:Enable*","kms:List*","kms:Put*","kms:Update*",
          "kms:Revoke*","kms:Disable*","kms:Get*","kms:Delete*","kms:TagResource","kms:UntagResource",
          "kms:ScheduleKeyDeletion","kms:CancelKeyDeletion"
        ]
        Resource = "*"
      },
      {
        Sid      = "AllowUseOfKeyViaS3InAccount"
        Effect   = "Allow"
        Principal = { AWS = "*" }
        Action   = ["kms:Encrypt","kms:Decrypt","kms:ReEncrypt*","kms:GenerateDataKey*","kms:DescribeKey"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" : data.aws_caller_identity.current.account_id,
            "kms:ViaService"    : "s3.${var.region}.amazonaws.com"
          }
        }
      },
      {
        Sid      = "AllowCloudTrailToUseKey"
        Effect   = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = ["kms:GenerateDataKey*","kms:DescribeKey"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:SourceArn" : "arn:aws:cloudtrail:${var.region}:${data.aws_caller_identity.current.account_id}:trail/${var.trail_name}"
          }
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_kms_alias" "this" {
  name          = var.kms_key_alias
  target_key_id = aws_kms_key.this.key_id
}

resource "aws_s3_bucket" "logs" {
  count  = var.create_bucket ? 1 : 0
  bucket = var.logs_bucket_name

  tags = var.tags
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  count  = var.create_bucket ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "logs" {
  count  = var.create_bucket ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  count  = var.create_bucket ? 1 : 0
  bucket = aws_s3_bucket.logs[0].bucket
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.this.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  count  = var.create_bucket ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  count  = var.create_bucket ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id
  rule {
    id     = "retain-and-expire"
    status = "Enabled"
    expiration {
      days = var.s3_retention_days
    }
    noncurrent_version_expiration {
      noncurrent_days = var.s3_retention_days
    }
  }
}

resource "aws_s3_bucket_policy" "logs" {
  bucket = local.bucket_id

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudTrailDelivery"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = ["s3:PutObject"]
        Resource  = [
          "${local.bucket_arn}/${var.s3_key_prefix}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        ]
        Condition = {
          StringEquals = {
            "aws:SourceArn"     = "arn:aws:cloudtrail:${var.region}:${data.aws_caller_identity.current.account_id}:trail/${var.trail_name}"
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid      = "DenyInsecureTransport"
        Effect   = "Deny"
        Principal = "*"
        Action   = "s3:*"
        Resource = [local.bucket_arn, "${local.bucket_arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = false } }
      },
      {
        Sid      = "DenyUnencryptedObjectUploads"
        Effect   = "Deny"
        Principal = "*"
        Action   = "s3:PutObject"
        Resource = "${local.bucket_arn}/*"
        Condition = { Null = { "s3:x-amz-server-side-encryption" = true } }
      },
      {
        Sid      = "DenyIncorrectEncryptionHeader"
        Effect   = "Deny"
        Principal = "*"
        Action   = "s3:PutObject"
        Resource = "${local.bucket_arn}/*"
        Condition = { StringNotEquals = { "s3:x-amz-server-side-encryption" = "aws:kms" } }
      },
      {
        Sid      = "DenyWrongKMSKey"
        Effect   = "Deny"
        Principal = "*"
        Action   = "s3:PutObject"
        Resource = "${local.bucket_arn}/*"
        Condition = { StringNotEquals = { "s3:x-amz-server-side-encryption-aws-kms-key-id" = aws_kms_key.this.arn } }
      }
    ]
  })
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/cloudtrail/${var.trail_name}"
  retention_in_days = var.cloudwatch_retention_days
  tags              = var.tags
}

resource "aws_iam_role" "cloudtrail_to_cw" {
  name = "serenity-cloudtrail-to-cw-${var.region}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "cloudtrail.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
  tags = var.tags
}

resource "aws_iam_role_policy" "cloudtrail_to_cw" {
  role = aws_iam_role.cloudtrail_to_cw.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow",
      Action = ["logs:CreateLogStream", "logs:PutLogEvents"],
      Resource = aws_cloudwatch_log_group.this.arn
    }]
  })
}

# CloudTrail
resource "aws_cloudtrail" "this" {
  name                          = var.trail_name
  s3_bucket_name                = var.logs_bucket_name
  s3_key_prefix                 = var.s3_key_prefix
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.this.arn
  cloud_watch_logs_group_arn    = aws_cloudwatch_log_group.this.arn
  cloud_watch_logs_role_arn     = aws_iam_role.cloudtrail_to_cw.arn
  is_logging                    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true
    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::${var.phi_bucket_name}/"]
    }
  }

  depends_on = [aws_s3_bucket_policy.logs]
  tags       = var.tags
}

