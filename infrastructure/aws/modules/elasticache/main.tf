# Serenity Healthcare Platform - ElastiCache Module
# HIPAA-compliant Redis cluster with encryption and high availability

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-cache-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cache-subnet-group"
    Type = "ElastiCache Subnet Group"
  })
}

# ElastiCache Parameter Group for Redis
resource "aws_elasticache_parameter_group" "main" {
  family = var.parameter_group_family
  name   = "${var.project_name}-${var.environment}-redis-pg"

  # Redis configuration parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "maxmemory-samples"
    value = "5"
  }

  # Persistence configuration
  parameter {
    name  = "save"
    value = "900 1 300 10 60 10000"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-pg"
    Type = "ElastiCache Parameter Group"
  })
}

# ElastiCache Replication Group (Redis Cluster)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.project_name}-${var.environment}-redis"
  description               = "Redis cluster for ${var.project_name}-${var.environment}"
  
  # Network configuration
  port                      = var.port
  subnet_group_name         = aws_elasticache_subnet_group.main.name
  security_group_ids        = var.security_group_ids

  # Cluster configuration
  node_type                 = var.node_type
  num_cache_clusters        = var.num_cache_nodes
  parameter_group_name      = aws_elasticache_parameter_group.main.name

  # Redis version
  engine_version           = var.engine_version

  # High Availability
  multi_az_enabled         = var.multi_az_enabled
  automatic_failover_enabled = var.automatic_failover_enabled

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                = var.kms_key_arn

  # Authentication
  auth_token                = var.auth_token_enabled ? random_password.auth_token[0].result : null
  auth_token_update_strategy = var.auth_token_enabled ? "ROTATE" : null

  # Backup configuration
  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window         = var.snapshot_window
  maintenance_window      = var.maintenance_window

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  # Auto minor version upgrade
  auto_minor_version_upgrade = var.auto_minor_version_upgrade

  # Notification
  notification_topic_arn = var.notification_topic_arn

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-cluster"
    Type = "ElastiCache Replication Group"
  })

  depends_on = [
    aws_elasticache_parameter_group.main,
    aws_elasticache_subnet_group.main
  ]
}

# Auth token for Redis (if enabled)
resource "random_password" "auth_token" {
  count = var.auth_token_enabled ? 1 : 0

  length  = 32
  special = true
}

# Store auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth_token" {
  count = var.auth_token_enabled ? 1 : 0

  name        = "${var.project_name}-${var.environment}-redis-auth-token"
  description = "Redis authentication token"
  kms_key_id  = var.kms_key_arn

  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-auth-token"
    Type = "Secrets Manager Secret"
  })
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  count = var.auth_token_enabled ? 1 : 0

  secret_id     = aws_secretsmanager_secret.redis_auth_token[0].id
  secret_string = jsonencode({
    auth_token = random_password.auth_token[0].result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# CloudWatch Log Group for Redis slow logs
resource "aws_cloudwatch_log_group" "slow_log" {
  name              = "/aws/elasticache/redis/${var.project_name}-${var.environment}/slow-log"
  retention_in_days = 30
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-slow-log"
    Type = "CloudWatch Log Group"
  })
}

# ElastiCache Global Replication Group (for cross-region replication)
resource "aws_elasticache_global_replication_group" "main" {
  count = var.enable_global_replication ? 1 : 0

  global_replication_group_id_suffix = "${var.project_name}-${var.environment}-global"
  description                        = "Global replication group for ${var.project_name}-${var.environment}"

  primary_replication_group_id = aws_elasticache_replication_group.main.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-global"
    Type = "ElastiCache Global Replication Group"
  })
}

# ElastiCache User for RBAC (Redis 6.0+)
resource "aws_elasticache_user" "main" {
  count = var.create_elasticache_user ? 1 : 0

  user_id       = "${var.project_name}-${var.environment}-redis-user"
  user_name     = var.elasticache_user_name
  access_string = var.elasticache_user_access_string
  engine        = "REDIS"
  passwords     = [random_password.user_password[0].result]

  authentication_mode {
    type      = "password"
    passwords = [random_password.user_password[0].result]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-user"
    Type = "ElastiCache User"
  })
}

# User password for ElastiCache user
resource "random_password" "user_password" {
  count = var.create_elasticache_user ? 1 : 0

  length  = 32
  special = true
}

# ElastiCache User Group
resource "aws_elasticache_user_group" "main" {
  count = var.create_elasticache_user ? 1 : 0

  user_group_id = "${var.project_name}-${var.environment}-redis-user-group"
  engine        = "REDIS"
  user_ids      = ["default", aws_elasticache_user.main[0].user_id]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-user-group"
    Type = "ElastiCache User Group"
  })
}

# CloudWatch Alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.cpu_threshold
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-cpu-alarm"
    Type = "CloudWatch Alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "memory_utilization" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.memory_threshold
  alarm_description   = "This metric monitors Redis memory utilization"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-memory-alarm"
    Type = "CloudWatch Alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "connection_count" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.connection_threshold
  alarm_description   = "This metric monitors Redis connection count"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-connections-alarm"
    Type = "CloudWatch Alarm"
  })
}

# Reserved Instances (if enabled for cost optimization)
resource "aws_elasticache_reserved_cache_node" "main" {
  count = var.purchase_reserved_instances ? var.num_cache_nodes : 0

  cache_node_type         = var.node_type
  reserved_cache_nodes_offering_id = data.aws_elasticache_reserved_cache_node_offering.main[0].offering_id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-reserved-${count.index + 1}"
    Type = "ElastiCache Reserved Instance"
  })
}

# Data source for reserved instance offerings
data "aws_elasticache_reserved_cache_node_offering" "main" {
  count = var.purchase_reserved_instances ? 1 : 0

  cache_node_type     = var.node_type
  duration            = "31536000" # 1 year in seconds
  offering_type       = "All Upfront"
  product_description = "redis"
}