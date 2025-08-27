# AWS RDS Configuration for HIPAA-Compliant PHI Storage
# Implements encryption at rest, automated backups, and multi-AZ deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# KMS key for RDS encryption
resource "aws_kms_key" "rds_phi" {
  description             = "KMS key for RDS PHI encryption - Serenity Health"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  
  tags = {
    Name        = "serenity-rds-phi-key"
    Environment = var.environment
    Compliance  = "HIPAA"
    Purpose     = "PHI Encryption"
  }
}

resource "aws_kms_alias" "rds_phi" {
  name          = "alias/serenity-rds-phi-${var.environment}"
  target_key_id = aws_kms_key.rds_phi.key_id
}

# Security group for RDS
resource "aws_security_group" "rds_phi" {
  name_prefix = "serenity-rds-phi-"
  description = "Security group for PHI RDS instance"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL from application servers"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "serenity-rds-phi-sg"
    Environment = var.environment
    Compliance  = "HIPAA"
  }
}

# DB subnet group
resource "aws_db_subnet_group" "phi" {
  name       = "serenity-phi-subnet-group-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "serenity-phi-subnet-group"
    Environment = var.environment
    Compliance  = "HIPAA"
  }
}

# Parameter group for PostgreSQL with HIPAA settings
resource "aws_db_parameter_group" "phi_postgres" {
  name_prefix = "serenity-phi-pg-"
  family      = "postgres15"
  description = "PostgreSQL parameter group for PHI with HIPAA compliance"

  # Enable connection and statement logging for audit
  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_duration"
    value = "1"
  }

  # SSL enforcement
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  # Session timeout for HIPAA (15 minutes = 900 seconds)
  parameter {
    name  = "idle_in_transaction_session_timeout"
    value = "900000"
  }

  tags = {
    Name        = "serenity-phi-params"
    Environment = var.environment
    Compliance  = "HIPAA"
  }
}

# RDS instance for PHI storage
resource "aws_db_instance" "phi" {
  identifier     = "serenity-phi-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  
  # Instance configuration
  instance_class               = var.db_instance_class
  allocated_storage           = var.allocated_storage
  max_allocated_storage       = var.max_allocated_storage
  storage_type                = "gp3"
  storage_encrypted           = true
  kms_key_id                  = aws_kms_key.rds_phi.arn
  
  # Database configuration
  db_name  = "serenity_phi"
  username = var.master_username
  password = var.master_password # Should be from AWS Secrets Manager
  port     = 5432
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.phi.name
  vpc_security_group_ids = [aws_security_group.rds_phi.id]
  publicly_accessible    = false
  
  # High availability
  multi_az               = true
  availability_zone      = var.multi_az ? null : var.availability_zone
  
  # Backup configuration for HIPAA compliance
  backup_retention_period   = 30  # 30 days for HIPAA
  backup_window            = "03:00-04:00"
  maintenance_window       = "sun:04:00-sun:05:00"
  copy_tags_to_snapshot    = true
  delete_automated_backups = false
  deletion_protection      = true
  
  # Performance and monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]
  monitoring_interval             = 60
  monitoring_role_arn            = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id = aws_kms_key.rds_phi.arn
  
  # Parameter group
  parameter_group_name = aws_db_parameter_group.phi_postgres.name
  
  # Enable automated minor version upgrades
  auto_minor_version_upgrade = true
  apply_immediately         = false
  
  # Final snapshot
  skip_final_snapshot       = false
  final_snapshot_identifier = "serenity-phi-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  tags = {
    Name        = "serenity-phi-rds"
    Environment = var.environment
    Compliance  = "HIPAA"
    Purpose     = "PHI Storage"
    BackupPolicy = "30-day-retention"
  }

  depends_on = [
    aws_kms_key.rds_phi,
    aws_security_group.rds_phi,
    aws_db_subnet_group.phi
  ]
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name_prefix = "serenity-rds-monitoring-"

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

  tags = {
    Name        = "serenity-rds-monitoring"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "serenity-phi-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors RDS CPU utilization"
  alarm_actions      = [var.sns_topic_arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.phi.identifier
  }

  tags = {
    Name        = "serenity-phi-cpu-alarm"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "database_storage" {
  alarm_name          = "serenity-phi-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name        = "FreeStorageSpace"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "10737418240" # 10 GB in bytes
  alarm_description  = "This metric monitors RDS free storage"
  alarm_actions      = [var.sns_topic_arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.phi.identifier
  }

  tags = {
    Name        = "serenity-phi-storage-alarm"
    Environment = var.environment
  }
}

# Secrets Manager for database credentials rotation
resource "aws_secretsmanager_secret" "rds_phi_credentials" {
  name_prefix             = "serenity-phi-rds-credentials-"
  description             = "RDS PHI database master credentials"
  recovery_window_in_days = 30
  
  rotation_rules {
    automatically_after_days = 30
  }

  tags = {
    Name        = "serenity-phi-rds-credentials"
    Environment = var.environment
    Compliance  = "HIPAA"
  }
}

resource "aws_secretsmanager_secret_version" "rds_phi_credentials" {
  secret_id = aws_secretsmanager_secret.rds_phi_credentials.id
  secret_string = jsonencode({
    username = var.master_username
    password = var.master_password
    engine   = "postgres"
    host     = aws_db_instance.phi.address
    port     = aws_db_instance.phi.port
    dbname   = aws_db_instance.phi.db_name
  })
}

# Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.phi.endpoint
  sensitive   = true
}

output "rds_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.phi.arn
}

output "kms_key_id" {
  description = "KMS key ID for PHI encryption"
  value       = aws_kms_key.rds_phi.id
}

output "security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds_phi.id
}

output "secret_arn" {
  description = "ARN of the secret containing RDS credentials"
  value       = aws_secretsmanager_secret.rds_phi_credentials.arn
  sensitive   = true
}