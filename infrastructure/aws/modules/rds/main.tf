# Serenity Healthcare Platform - RDS Module
# HIPAA-compliant Aurora PostgreSQL with encryption and high availability

# Random password for master user
resource "random_password" "master" {
  length  = 16
  special = true
}

# Store the password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name        = "${var.project_name}-${var.environment}-db-master-password"
  description = "Master password for RDS Aurora PostgreSQL cluster"
  kms_key_id  = var.kms_key_arn

  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-password"
    Type = "Secrets Manager Secret"
  })
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
    Type = "DB Subnet Group"
  })
}

# RDS Parameter Group for PostgreSQL
resource "aws_rds_cluster_parameter_group" "main" {
  family      = var.parameter_group_family
  name        = "${var.project_name}-${var.environment}-cluster-pg"
  description = "RDS cluster parameter group for ${var.project_name}-${var.environment}"

  # HIPAA compliance parameters
  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "log_temp_files"
    value = "0"
  }

  parameter {
    name  = "log_autovacuum_min_duration"
    value = "0"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "track_activity_query_size"
    value = "2048"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  parameter {
    name  = "pg_stat_statements.max"
    value = "10000"
  }

  # Security parameters
  parameter {
    name  = "ssl"
    value = "1"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cluster-pg"
    Type = "RDS Cluster Parameter Group"
  })
}

resource "aws_db_parameter_group" "main" {
  family = var.parameter_group_family
  name   = "${var.project_name}-${var.environment}-db-pg"

  # Performance and monitoring parameters
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-pg"
    Type = "DB Parameter Group"
  })
}

# RDS Aurora Cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "${var.project_name}-${var.environment}-aurora-cluster"
  engine                 = "aurora-postgresql"
  engine_version         = var.engine_version
  database_name          = var.database_name
  master_username        = var.master_username
  manage_master_user_password = false
  master_password        = random_password.master.result

  backup_retention_period = var.backup_retention_period
  preferred_backup_window = var.backup_window
  preferred_maintenance_window = var.maintenance_window

  # High Availability
  availability_zones = var.availability_zones

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = var.security_group_ids
  port                   = var.port

  # Encryption
  storage_encrypted = true
  kms_key_id       = var.kms_key_arn

  # Backup configuration
  backup_retention_period    = var.backup_retention_period
  preferred_backup_window    = var.backup_window
  preferred_maintenance_window = var.maintenance_window
  copy_tags_to_snapshot      = true
  delete_automated_backups   = false
  deletion_protection        = var.deletion_protection

  # Parameter groups
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name

  # Monitoring and logging
  enabled_cloudwatch_logs_exports = [
    "postgresql"
  ]

  # Point-in-time recovery
  backup_retention_period = var.backup_retention_period

  # Performance Insights
  # Note: Performance Insights is configured on individual instances

  # Final snapshot
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  skip_final_snapshot       = var.skip_final_snapshot

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-aurora-cluster"
    Type = "RDS Aurora Cluster"
  })

  depends_on = [
    aws_rds_cluster_parameter_group.main
  ]
}

# RDS Aurora Instances
resource "aws_rds_cluster_instance" "cluster_instances" {
  count              = var.instance_count
  identifier         = "${var.project_name}-${var.environment}-aurora-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.instance_class
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  # Parameter group
  db_parameter_group_name = aws_db_parameter_group.main.name

  # Performance Insights
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_kms_key_id      = var.kms_key_arn
  performance_insights_retention_period = var.performance_insights_retention_period

  # Enhanced Monitoring
  monitoring_interval = var.enable_enhanced_monitoring ? var.monitoring_interval : 0
  monitoring_role_arn = var.enable_enhanced_monitoring ? aws_iam_role.rds_enhanced_monitoring[0].arn : null

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Public access
  publicly_accessible = false

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-aurora-instance-${count.index + 1}"
    Type = "RDS Aurora Instance"
  })
}

# Read Replica (for read scaling)
resource "aws_rds_cluster_instance" "reader_instances" {
  count              = var.reader_instance_count
  identifier         = "${var.project_name}-${var.environment}-aurora-reader-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.reader_instance_class
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  # Parameter group
  db_parameter_group_name = aws_db_parameter_group.main.name

  # Performance Insights
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_kms_key_id      = var.kms_key_arn
  performance_insights_retention_period = var.performance_insights_retention_period

  # Enhanced Monitoring
  monitoring_interval = var.enable_enhanced_monitoring ? var.monitoring_interval : 0
  monitoring_role_arn = var.enable_enhanced_monitoring ? aws_iam_role.rds_enhanced_monitoring[0].arn : null

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Public access
  publicly_accessible = false

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-aurora-reader-${count.index + 1}"
    Type = "RDS Aurora Reader Instance"
  })
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  name = "${var.project_name}-${var.environment}-rds-enhanced-monitoring-role"

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

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-enhanced-monitoring-role"
    Type = "IAM Role"
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  role       = aws_iam_role.rds_enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Log Group for PostgreSQL logs
resource "aws_cloudwatch_log_group" "postgresql" {
  name              = "/aws/rds/cluster/${aws_rds_cluster.main.cluster_identifier}/postgresql"
  retention_in_days = 30
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-postgresql-logs"
    Type = "CloudWatch Log Group"
  })
}

# Auto scaling for Aurora read replicas
resource "aws_appautoscaling_target" "replicas" {
  count = var.enable_autoscaling ? 1 : 0

  service_namespace  = "rds"
  scalable_dimension = "rds:cluster:ReadReplicaCount"
  resource_id        = "cluster:${aws_rds_cluster.main.cluster_identifier}"
  min_capacity       = var.autoscaling_min_capacity
  max_capacity       = var.autoscaling_max_capacity
}

resource "aws_appautoscaling_policy" "replicas_scale_up" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${var.project_name}-${var.environment}-aurora-replica-scale-up"
  service_namespace  = aws_appautoscaling_target.replicas[0].service_namespace
  scalable_dimension = aws_appautoscaling_target.replicas[0].scalable_dimension
  resource_id        = aws_appautoscaling_target.replicas[0].resource_id
  policy_type        = "TargetTrackingScaling"

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageCPUUtilization"
    }
    target_value       = var.autoscaling_target_cpu
    scale_out_cooldown = 300
    scale_in_cooldown  = 300
  }
}

# RDS Proxy for connection pooling (optional but recommended for high-traffic applications)
resource "aws_db_proxy" "main" {
  count = var.enable_proxy ? 1 : 0

  name                   = "${var.project_name}-${var.environment}-rds-proxy"
  engine_family         = "POSTGRESQL"
  auth {
    auth_scheme = "SECRETS"
    secret_arn  = aws_secretsmanager_secret.db_password.arn
  }

  role_arn               = aws_iam_role.proxy[0].arn
  vpc_subnet_ids         = var.subnet_ids
  require_tls            = true
  idle_client_timeout    = 1800
  max_connections_percent = 100
  max_idle_connections_percent = 50

  target {
    db_cluster_identifier = aws_rds_cluster.main.cluster_identifier
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-proxy"
    Type = "RDS Proxy"
  })
}

# IAM role for RDS Proxy
resource "aws_iam_role" "proxy" {
  count = var.enable_proxy ? 1 : 0

  name = "${var.project_name}-${var.environment}-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-proxy-role"
    Type = "IAM Role"
  })
}

resource "aws_iam_policy" "proxy" {
  count = var.enable_proxy ? 1 : 0

  name = "${var.project_name}-${var.environment}-rds-proxy-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [
          var.kms_key_arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "proxy" {
  count = var.enable_proxy ? 1 : 0

  role       = aws_iam_role.proxy[0].name
  policy_arn = aws_iam_policy.proxy[0].arn
}