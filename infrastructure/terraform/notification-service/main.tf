# Main Terraform configuration for Serenity Notification Service Infrastructure
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    bucket         = "serenity-terraform-state"
    key            = "notification-service/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
    
    # HIPAA compliance: Enable state encryption and versioning
    kms_key_id = "alias/terraform-state-key"
  }
}

# AWS Provider configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project             = "serenity-notification-service"
      Environment         = var.environment
      ManagedBy          = "terraform"
      HIPAACompliant     = "true"
      DataClassification = "confidential"
      CostCenter         = "platform-engineering"
      Owner              = "platform-team@serenity.com"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_eks_cluster" "main" {
  name = var.eks_cluster_name
}

data "aws_eks_cluster_auth" "main" {
  name = var.eks_cluster_name
}

# Kubernetes Provider configuration
provider "kubernetes" {
  host                   = data.aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}

# Helm Provider configuration
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.main.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.main.token
  }
}

# Local values for common configuration
locals {
  name_prefix = "serenity-notification-${var.environment}"
  
  common_tags = {
    Project             = "serenity-notification-service"
    Environment         = var.environment
    ManagedBy          = "terraform"
    HIPAACompliant     = "true"
    DataClassification = "confidential"
  }
  
  # HIPAA compliance tags
  hipaa_tags = {
    HIPAARequired      = "true"
    DataRetention      = "7-years"
    EncryptionRequired = "true"
    AuditRequired      = "true"
  }
}

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# KMS Key for encryption
resource "aws_kms_key" "notification_service" {
  description             = "KMS key for Serenity Notification Service encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow notification service to use the key"
        Effect = "Allow"
        Principal = {
          AWS = [
            aws_iam_role.notification_service.arn,
            aws_iam_role.notification_service_pod.arn
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:GenerateDataKeyWithoutPlaintext",
          "kms:ReEncryptFrom",
          "kms:ReEncryptTo",
          "kms:CreateGrant",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = merge(local.common_tags, local.hipaa_tags, {
    Name = "${local.name_prefix}-kms-key"
  })
}

resource "aws_kms_alias" "notification_service" {
  name          = "alias/${local.name_prefix}-key"
  target_key_id = aws_kms_key.notification_service.key_id
}

# VPC Configuration (if not using existing)
module "vpc" {
  count  = var.create_vpc ? 1 : 0
  source = "terraform-aws-modules/vpc/aws"
  
  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr
  
  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs
  database_subnets = var.database_subnet_cidrs
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support = true
  
  # VPC Flow Logs for HIPAA compliance
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_max_aggregation_interval    = 60
  
  tags = merge(local.common_tags, local.hipaa_tags)
}

# Security Groups
resource "aws_security_group" "rds" {
  name_prefix = "${local.name_prefix}-rds-"
  vpc_id      = var.create_vpc ? module.vpc[0].vpc_id : var.vpc_id
  
  ingress {
    from_port = 5432
    to_port   = 5432
    protocol  = "tcp"
    security_groups = [aws_security_group.eks_worker_nodes.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-rds-sg"
  })
}

resource "aws_security_group" "elasticache" {
  name_prefix = "${local.name_prefix}-redis-"
  vpc_id      = var.create_vpc ? module.vpc[0].vpc_id : var.vpc_id
  
  ingress {
    from_port = 6379
    to_port   = 6379
    protocol  = "tcp"
    security_groups = [aws_security_group.eks_worker_nodes.id]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-sg"
  })
}

resource "aws_security_group" "eks_worker_nodes" {
  name_prefix = "${local.name_prefix}-eks-nodes-"
  vpc_id      = var.create_vpc ? module.vpc[0].vpc_id : var.vpc_id
  
  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-eks-nodes-sg"
  })
}

# RDS Instance for PostgreSQL
resource "aws_db_subnet_group" "notification_service" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = var.create_vpc ? module.vpc[0].database_subnets : var.database_subnet_ids
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnet-group"
  })
}

resource "aws_db_instance" "notification_service" {
  identifier = "${local.name_prefix}-postgres"
  
  # Engine configuration
  engine         = "postgres"
  engine_version = var.postgres_version
  instance_class = var.db_instance_class
  
  # Storage configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.notification_service.arn
  
  # Database configuration
  db_name  = "serenity_notifications"
  username = "notifications_admin"
  password = random_password.db_password.result
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.notification_service.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  
  # Backup configuration (HIPAA requirement)
  backup_retention_period = var.db_backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Monitoring configuration
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  # Performance Insights (HIPAA compliant)
  performance_insights_enabled = true
  performance_insights_kms_key_id = aws_kms_key.notification_service.arn
  performance_insights_retention_period = 7
  
  # Logging
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  # Security
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.name_prefix}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null
  
  tags = merge(local.common_tags, local.hipaa_tags, {
    Name = "${local.name_prefix}-postgres"
  })
  
  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      password,
      final_snapshot_identifier,
    ]
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_subnet_group" "notification_service" {
  name       = "${local.name_prefix}-redis-subnet-group"
  subnet_ids = var.create_vpc ? module.vpc[0].private_subnets : var.private_subnet_ids
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-subnet-group"
  })
}

resource "aws_elasticache_replication_group" "notification_service" {
  replication_group_id       = "${local.name_prefix}-redis"
  description                = "Redis cluster for Serenity Notification Service"
  
  node_type                  = var.redis_node_type
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = var.redis_num_cache_nodes
  
  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result
  kms_key_id                = aws_kms_key.notification_service.arn
  
  # Network
  subnet_group_name          = aws_elasticache_subnet_group.notification_service.name
  security_group_ids         = [aws_security_group.elasticache.id]
  
  # Backup (HIPAA requirement)
  automatic_failover_enabled = var.redis_num_cache_nodes > 1
  multi_az_enabled          = var.redis_num_cache_nodes > 1
  snapshot_retention_limit   = 5
  snapshot_window           = "03:00-05:00"
  
  # Maintenance
  maintenance_window         = "sun:05:00-sun:07:00"
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format      = "text"
    log_type        = "slow-log"
  }
  
  tags = merge(local.common_tags, local.hipaa_tags, {
    Name = "${local.name_prefix}-redis"
  })
}

resource "random_password" "redis_auth_token" {
  length  = 64
  special = false
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "notification_service" {
  name              = "/aws/eks/${var.eks_cluster_name}/notification-service"
  retention_in_days = var.log_retention_days
  kms_key_id       = aws_kms_key.notification_service.arn
  
  tags = merge(local.common_tags, local.hipaa_tags, {
    Name = "${local.name_prefix}-logs"
  })
}

resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/notification-service/redis/slow-log"
  retention_in_days = var.log_retention_days
  kms_key_id       = aws_kms_key.notification_service.arn
  
  tags = merge(local.common_tags, local.hipaa_tags, {
    Name = "${local.name_prefix}-redis-slow-log"
  })
}

# S3 Bucket for HIPAA audit logs
resource "aws_s3_bucket" "audit_logs" {
  bucket = "${local.name_prefix}-hipaa-audit-logs"
  
  tags = merge(local.common_tags, local.hipaa_tags, {
    Name = "${local.name_prefix}-audit-logs"
  })
}

resource "aws_s3_bucket_encryption_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.notification_service.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_versioning" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id
  
  rule {
    id     = "audit_log_lifecycle"
    status = "Enabled"
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    # HIPAA requires 7 years retention
    expiration {
      days = 2555  # 7 years
    }
  }
}

# IAM Roles and Policies
resource "aws_iam_role" "notification_service" {
  name = "${local.name_prefix}-service-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = ["ecs-tasks.amazonaws.com", "lambda.amazonaws.com"]
        }
      }
    ]
  })
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-service-role"
  })
}

resource "aws_iam_role" "notification_service_pod" {
  name = "${local.name_prefix}-pod-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = var.eks_oidc_issuer_arn
        }
        Condition = {
          StringEquals = {
            "${var.eks_oidc_issuer_url}:sub": "system:serviceaccount:notification-service:notification-service"
            "${var.eks_oidc_issuer_url}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-pod-role"
  })
}

resource "aws_iam_role" "rds_monitoring" {
  name = "${local.name_prefix}-rds-monitoring"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-rds-monitoring"
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# IAM policies for the notification service
resource "aws_iam_policy" "notification_service_policy" {
  name        = "${local.name_prefix}-policy"
  description = "IAM policy for Serenity Notification Service"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:GenerateDataKeyWithoutPlaintext"
        ]
        Resource = [aws_kms_key.notification_service.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject"
        ]
        Resource = ["${aws_s3_bucket.audit_logs.arn}/*"]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          aws_cloudwatch_log_group.notification_service.arn,
          "${aws_cloudwatch_log_group.notification_service.arn}:*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${local.name_prefix}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = ["*"]
        Condition = {
          StringEquals = {
            "ses:FromAddress": var.notification_from_email
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [aws_sns_topic.notification_alerts.arn]
      }
    ]
  })
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-policy"
  })
}

resource "aws_iam_role_policy_attachment" "notification_service_policy" {
  role       = aws_iam_role.notification_service_pod.name
  policy_arn = aws_iam_policy.notification_service_policy.arn
}

# SNS Topic for notifications
resource "aws_sns_topic" "notification_alerts" {
  name         = "${local.name_prefix}-alerts"
  display_name = "Serenity Notification Service Alerts"
  
  kms_master_key_id = aws_kms_key.notification_service.key_id
  
  tags = merge(local.common_tags, local.hipaa_tags, {
    Name = "${local.name_prefix}-alerts-topic"
  })
}

# Secrets Manager for sensitive configuration
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${local.name_prefix}/database"
  description = "Database credentials for notification service"
  
  kms_key_id = aws_kms_key.notification_service.key_id
  
  tags = merge(local.common_tags, local.hipaa_tags, {
    Name = "${local.name_prefix}-db-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = aws_db_instance.notification_service.username
    password = random_password.db_password.result
    endpoint = aws_db_instance.notification_service.endpoint
    port     = aws_db_instance.notification_service.port
    database = aws_db_instance.notification_service.db_name
  })
}

resource "aws_secretsmanager_secret" "redis_credentials" {
  name        = "${local.name_prefix}/redis"
  description = "Redis credentials for notification service"
  
  kms_key_id = aws_kms_key.notification_service.key_id
  
  tags = merge(local.common_tags, local.hipaa_tags, {
    Name = "${local.name_prefix}-redis-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
    endpoint   = aws_elasticache_replication_group.notification_service.configuration_endpoint_address
    port       = aws_elasticache_replication_group.notification_service.port
  })
}