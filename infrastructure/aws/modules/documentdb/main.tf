# Serenity Healthcare Platform - DocumentDB Module
# HIPAA-compliant MongoDB-compatible database with encryption

# Random password for master user
resource "random_password" "master" {
  length  = 16
  special = true
}

# Store the password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "documentdb_password" {
  name        = "${var.project_name}-${var.environment}-documentdb-master-password"
  description = "Master password for DocumentDB cluster"
  kms_key_id  = var.kms_key_arn

  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-documentdb-password"
    Type = "Secrets Manager Secret"
  })
}

resource "aws_secretsmanager_secret_version" "documentdb_password" {
  secret_id     = aws_secretsmanager_secret.documentdb_password.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# DocumentDB Subnet Group
resource "aws_docdb_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-docdb-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-docdb-subnet-group"
    Type = "DocumentDB Subnet Group"
  })
}

# DocumentDB Parameter Group
resource "aws_docdb_cluster_parameter_group" "main" {
  family      = var.parameter_group_family
  name        = "${var.project_name}-${var.environment}-docdb-cluster-pg"
  description = "DocumentDB cluster parameter group for ${var.project_name}-${var.environment}"

  # Enable audit logging
  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  # Enable TLS
  parameter {
    name  = "tls"
    value = "enabled"
  }

  # Set profiler threshold
  parameter {
    name  = "profiler"
    value = "enabled"
  }

  parameter {
    name  = "profiler_threshold_ms"
    value = "100"
  }

  # TTL monitoring
  parameter {
    name  = "ttl_monitor"
    value = "enabled"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-docdb-cluster-pg"
    Type = "DocumentDB Cluster Parameter Group"
  })
}

# DocumentDB Cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier      = "${var.project_name}-${var.environment}-docdb-cluster"
  engine                 = "docdb"
  engine_version         = var.engine_version
  master_username        = var.master_username
  master_password        = random_password.master.result

  # Networking
  db_subnet_group_name   = aws_docdb_subnet_group.main.name
  vpc_security_group_ids = var.security_group_ids
  port                   = var.port

  # Encryption
  storage_encrypted = true
  kms_key_id       = var.kms_key_arn

  # Backup configuration
  backup_retention_period   = var.backup_retention_period
  preferred_backup_window   = var.backup_window
  preferred_maintenance_window = var.maintenance_window
  skip_final_snapshot      = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Parameter group
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name

  # Logging
  enabled_cloudwatch_logs_exports = [
    "audit",
    "profiler"
  ]

  # Deletion protection
  deletion_protection = var.deletion_protection

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-docdb-cluster"
    Type = "DocumentDB Cluster"
  })

  depends_on = [
    aws_docdb_cluster_parameter_group.main,
    aws_cloudwatch_log_group.audit,
    aws_cloudwatch_log_group.profiler
  ]
}

# DocumentDB Instances
resource "aws_docdb_cluster_instance" "cluster_instances" {
  count              = var.cluster_size
  identifier         = "${var.project_name}-${var.environment}-docdb-instance-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.instance_class
  engine             = aws_docdb_cluster.main.engine

  # Performance Insights
  performance_insights_enabled    = var.enable_performance_insights
  performance_insights_kms_key_id = var.kms_key_arn

  # Auto minor version upgrade
  auto_minor_version_upgrade = var.auto_minor_version_upgrade

  # Promotion tier (0 = highest priority for failover)
  promotion_tier = count.index

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-docdb-instance-${count.index + 1}"
    Type = "DocumentDB Instance"
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "audit" {
  name              = "/aws/docdb/${aws_docdb_cluster.main.cluster_identifier}/audit"
  retention_in_days = 30
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-docdb-audit-logs"
    Type = "CloudWatch Log Group"
  })
}

resource "aws_cloudwatch_log_group" "profiler" {
  name              = "/aws/docdb/${aws_docdb_cluster.main.cluster_identifier}/profiler"
  retention_in_days = 30
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-docdb-profiler-logs"
    Type = "CloudWatch Log Group"
  })
}

# CloudWatch Alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  count = var.cluster_size

  alarm_name          = "${var.project_name}-${var.environment}-docdb-cpu-${count.index + 1}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/DocDB"
  period              = "300"
  statistic           = "Average"
  threshold           = var.cpu_threshold
  alarm_description   = "This metric monitors DocumentDB CPU utilization for instance ${count.index + 1}"
  alarm_actions       = var.alarm_actions

  dimensions = {
    DBClusterIdentifier  = aws_docdb_cluster.main.cluster_identifier
    DBInstanceIdentifier = aws_docdb_cluster_instance.cluster_instances[count.index].identifier
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-docdb-cpu-alarm-${count.index + 1}"
    Type = "CloudWatch Alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-docdb-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/DocDB"
  period              = "300"
  statistic           = "Average"
  threshold           = var.connection_threshold
  alarm_description   = "This metric monitors DocumentDB connection count"
  alarm_actions       = var.alarm_actions

  dimensions = {
    DBClusterIdentifier = aws_docdb_cluster.main.cluster_identifier
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-docdb-connections-alarm"
    Type = "CloudWatch Alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "free_storage_space" {
  alarm_name          = "${var.project_name}-${var.environment}-docdb-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/DocDB"
  period              = "300"
  statistic           = "Average"
  threshold           = var.free_storage_threshold
  alarm_description   = "This metric monitors DocumentDB free storage space"
  alarm_actions       = var.alarm_actions

  dimensions = {
    DBClusterIdentifier = aws_docdb_cluster.main.cluster_identifier
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-docdb-storage-alarm"
    Type = "CloudWatch Alarm"
  })
}