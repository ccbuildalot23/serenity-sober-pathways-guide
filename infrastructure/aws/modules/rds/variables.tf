# Serenity Healthcare Platform - RDS Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs to associate with the RDS cluster"
  type        = list(string)
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = []
}

variable "engine_version" {
  description = "The engine version of the Aurora PostgreSQL cluster"
  type        = string
  default     = "15.4"
}

variable "instance_class" {
  description = "The instance class to use for the RDS cluster instances"
  type        = string
  default     = "db.r6g.large"
}

variable "instance_count" {
  description = "Number of instances in the cluster"
  type        = number
  default     = 2
}

variable "reader_instance_count" {
  description = "Number of reader instances in the cluster"
  type        = number
  default     = 1
}

variable "reader_instance_class" {
  description = "The instance class to use for the RDS cluster reader instances"
  type        = string
  default     = "db.r6g.large"
}

variable "database_name" {
  description = "The name of the database to create when the DB cluster is created"
  type        = string
  default     = "serenity"
}

variable "master_username" {
  description = "Master username for the database"
  type        = string
  default     = "postgres"
}

variable "port" {
  description = "The port on which the DB accepts connections"
  type        = number
  default     = 5432
}

variable "parameter_group_family" {
  description = "The parameter group family for the DB cluster"
  type        = string
  default     = "aurora-postgresql15"
}

variable "backup_retention_period" {
  description = "The number of days to retain backups"
  type        = number
  default     = 30
}

variable "backup_window" {
  description = "The time window for backups"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "The weekly time range for system maintenance"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "deletion_protection" {
  description = "Enable deletion protection for the DB cluster"
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when deleting the DB cluster"
  type        = bool
  default     = false
}

variable "enable_performance_insights" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

variable "performance_insights_retention_period" {
  description = "Performance Insights retention period"
  type        = number
  default     = 7
}

variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring"
  type        = bool
  default     = true
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60
}

variable "enable_autoscaling" {
  description = "Enable autoscaling for Aurora read replicas"
  type        = bool
  default     = true
}

variable "autoscaling_min_capacity" {
  description = "Minimum number of read replicas for autoscaling"
  type        = number
  default     = 1
}

variable "autoscaling_max_capacity" {
  description = "Maximum number of read replicas for autoscaling"
  type        = number
  default     = 5
}

variable "autoscaling_target_cpu" {
  description = "Target CPU utilization for autoscaling"
  type        = number
  default     = 70
}

variable "enable_proxy" {
  description = "Enable RDS Proxy for connection pooling"
  type        = bool
  default     = true
}

variable "allocated_storage" {
  description = "The initial allocated storage in gibibytes"
  type        = number
  default     = 100
}

variable "max_allocated_storage" {
  description = "The upper limit for automatic storage scaling in gibibytes"
  type        = number
  default     = 1000
}

variable "kms_key_arn" {
  description = "The ARN of the KMS key to use for encryption"
  type        = string
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}