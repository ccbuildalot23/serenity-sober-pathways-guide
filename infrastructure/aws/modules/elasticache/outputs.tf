# Serenity Healthcare Platform - ElastiCache Module Outputs

output "cluster_id" {
  description = "The ID of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.main.id
}

output "cluster_arn" {
  description = "The ARN of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.main.arn
}

output "primary_endpoint_address" {
  description = "The address of the endpoint for the primary node in the replication group"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "reader_endpoint_address" {
  description = "The address of the endpoint for the reader node in the replication group"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "configuration_endpoint_address" {
  description = "The configuration endpoint address to allow host discovery"
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
}

output "port" {
  description = "The port number on which each of the cache nodes will accept connections"
  value       = aws_elasticache_replication_group.main.port
}

output "cache_nodes" {
  description = "List of cache node endpoints for a Redis replication group"
  value = [
    for node in aws_elasticache_replication_group.main.cache_clusters :
    "${node}.cache.amazonaws.com:${aws_elasticache_replication_group.main.port}"
  ]
}

output "member_clusters" {
  description = "The identifiers of all the nodes that are part of this replication group"
  value       = aws_elasticache_replication_group.main.member_clusters
}

output "replication_group_id" {
  description = "The ID of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.main.replication_group_id
}

output "subnet_group_name" {
  description = "The name of the cache subnet group"
  value       = aws_elasticache_subnet_group.main.name
}

output "parameter_group_name" {
  description = "The name of the parameter group associated with this replication group"
  value       = aws_elasticache_parameter_group.main.name
}

output "auth_token_secret_arn" {
  description = "The ARN of the secret containing the Redis auth token"
  value       = var.auth_token_enabled ? aws_secretsmanager_secret.redis_auth_token[0].arn : null
  sensitive   = true
}

output "auth_token_secret_name" {
  description = "The name of the secret containing the Redis auth token"
  value       = var.auth_token_enabled ? aws_secretsmanager_secret.redis_auth_token[0].name : null
  sensitive   = true
}

output "global_replication_group_id" {
  description = "The ID of the ElastiCache Global Replication Group"
  value       = var.enable_global_replication ? aws_elasticache_global_replication_group.main[0].global_replication_group_id : null
}

output "user_id" {
  description = "The ID of the ElastiCache user"
  value       = var.create_elasticache_user ? aws_elasticache_user.main[0].user_id : null
}

output "user_group_id" {
  description = "The ID of the ElastiCache user group"
  value       = var.create_elasticache_user ? aws_elasticache_user_group.main[0].user_group_id : null
}

output "log_group_name" {
  description = "The name of the CloudWatch log group for slow logs"
  value       = aws_cloudwatch_log_group.slow_log.name
}

output "log_group_arn" {
  description = "The ARN of the CloudWatch log group for slow logs"
  value       = aws_cloudwatch_log_group.slow_log.arn
}

# Connection information for applications
output "connection_info" {
  description = "Redis connection information"
  value = {
    primary_endpoint    = aws_elasticache_replication_group.main.primary_endpoint_address
    reader_endpoint     = aws_elasticache_replication_group.main.reader_endpoint_address
    configuration_endpoint = aws_elasticache_replication_group.main.configuration_endpoint_address
    port               = aws_elasticache_replication_group.main.port
    auth_token_required = var.auth_token_enabled
    ssl_enabled        = true
    cluster_mode       = aws_elasticache_replication_group.main.num_cache_clusters > 1
  }
  sensitive = false
}

# Monitoring information
output "monitoring_info" {
  description = "Monitoring and alerting configuration"
  value = {
    log_group_name     = aws_cloudwatch_log_group.slow_log.name
    cpu_alarm_name     = aws_cloudwatch_metric_alarm.cpu_utilization.alarm_name
    memory_alarm_name  = aws_cloudwatch_metric_alarm.memory_utilization.alarm_name
    connection_alarm_name = aws_cloudwatch_metric_alarm.connection_count.alarm_name
  }
}

# Reserved instances information
output "reserved_instances" {
  description = "Information about purchased reserved instances"
  value = var.purchase_reserved_instances ? {
    count = length(aws_elasticache_reserved_cache_node.main)
    node_type = var.node_type
  } : null
}