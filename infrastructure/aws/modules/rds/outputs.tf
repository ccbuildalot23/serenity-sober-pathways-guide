# Serenity Healthcare Platform - RDS Module Outputs

output "db_instance_endpoint" {
  description = "The RDS instance endpoint"
  value       = aws_rds_cluster.main.endpoint
  sensitive   = false
}

output "db_instance_reader_endpoint" {
  description = "The RDS instance reader endpoint"
  value       = aws_rds_cluster.main.reader_endpoint
  sensitive   = false
}

output "db_instance_port" {
  description = "The RDS instance port"
  value       = aws_rds_cluster.main.port
}

output "db_instance_id" {
  description = "The RDS cluster identifier"
  value       = aws_rds_cluster.main.cluster_identifier
}

output "db_instance_arn" {
  description = "The ARN of the RDS cluster"
  value       = aws_rds_cluster.main.arn
}

output "db_instance_username" {
  description = "The master username for the database"
  value       = aws_rds_cluster.main.master_username
  sensitive   = true
}

output "db_name" {
  description = "The database name"
  value       = aws_rds_cluster.main.database_name
}

output "db_parameter_group_name" {
  description = "The name of the DB parameter group"
  value       = aws_db_parameter_group.main.name
}

output "db_cluster_parameter_group_name" {
  description = "The name of the DB cluster parameter group"
  value       = aws_rds_cluster_parameter_group.main.name
}

output "db_subnet_group_name" {
  description = "The name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "db_subnet_group_arn" {
  description = "The ARN of the DB subnet group"
  value       = aws_db_subnet_group.main.arn
}

output "cluster_members" {
  description = "List of RDS Instances that are a part of this cluster"
  value       = aws_rds_cluster.main.cluster_members
}

output "cluster_instances" {
  description = "Map of cluster instances and their attributes"
  value = {
    for instance in aws_rds_cluster_instance.cluster_instances :
    instance.identifier => {
      identifier                = instance.identifier
      instance_class           = instance.instance_class
      publicly_accessible      = instance.publicly_accessible
      performance_insights_enabled = instance.performance_insights_enabled
      monitoring_interval      = instance.monitoring_interval
    }
  }
}

output "reader_instances" {
  description = "Map of reader instances and their attributes"
  value = {
    for instance in aws_rds_cluster_instance.reader_instances :
    instance.identifier => {
      identifier                = instance.identifier
      instance_class           = instance.instance_class
      publicly_accessible      = instance.publicly_accessible
      performance_insights_enabled = instance.performance_insights_enabled
      monitoring_interval      = instance.monitoring_interval
    }
  }
}

output "secret_arn" {
  description = "The ARN of the secret containing the database password"
  value       = aws_secretsmanager_secret.db_password.arn
  sensitive   = true
}

output "secret_name" {
  description = "The name of the secret containing the database password"
  value       = aws_secretsmanager_secret.db_password.name
  sensitive   = true
}

output "log_group_name" {
  description = "The name of the CloudWatch log group for PostgreSQL logs"
  value       = aws_cloudwatch_log_group.postgresql.name
}

output "enhanced_monitoring_role_arn" {
  description = "The ARN of the enhanced monitoring IAM role"
  value       = var.enable_enhanced_monitoring ? aws_iam_role.rds_enhanced_monitoring[0].arn : null
}

output "proxy_endpoint" {
  description = "The RDS Proxy endpoint"
  value       = var.enable_proxy ? aws_db_proxy.main[0].endpoint : null
}

output "proxy_target_endpoint" {
  description = "The RDS Proxy target endpoint"
  value       = var.enable_proxy ? "${aws_db_proxy.main[0].endpoint}:${var.port}" : null
}

output "autoscaling_target_arn" {
  description = "The ARN of the Application AutoScaling target"
  value       = var.enable_autoscaling ? aws_appautoscaling_target.replicas[0].arn : null
}

output "cluster_resource_id" {
  description = "The RDS Cluster Resource ID"
  value       = aws_rds_cluster.main.cluster_resource_id
}

output "cluster_hosted_zone_id" {
  description = "The Route53 Hosted Zone ID of the endpoint"
  value       = aws_rds_cluster.main.hosted_zone_id
}

# Connection string components for applications
output "connection_info" {
  description = "Database connection information"
  value = {
    host     = aws_rds_cluster.main.endpoint
    port     = aws_rds_cluster.main.port
    database = aws_rds_cluster.main.database_name
    username = aws_rds_cluster.main.master_username
    reader_endpoint = aws_rds_cluster.main.reader_endpoint
    proxy_endpoint  = var.enable_proxy ? aws_db_proxy.main[0].endpoint : null
  }
  sensitive = false
}

# Monitoring and alerting information
output "monitoring_info" {
  description = "Monitoring and alerting configuration"
  value = {
    performance_insights_enabled = var.enable_performance_insights
    enhanced_monitoring_enabled  = var.enable_enhanced_monitoring
    monitoring_interval         = var.enable_enhanced_monitoring ? var.monitoring_interval : 0
    log_group_name             = aws_cloudwatch_log_group.postgresql.name
  }
}