# Serenity Healthcare Platform - ElastiCache Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the cache subnet group"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs to associate with the ElastiCache cluster"
  type        = list(string)
}

variable "node_type" {
  description = "The instance class to use for the cache nodes"
  type        = string
  default     = "cache.r7g.large"
}

variable "num_cache_nodes" {
  description = "The number of cache nodes in the cluster"
  type        = number
  default     = 3
}

variable "port" {
  description = "The port number on which each of the cache nodes will accept connections"
  type        = number
  default     = 6379
}

variable "engine_version" {
  description = "The version number of the cache engine"
  type        = string
  default     = "7.0"
}

variable "parameter_group_family" {
  description = "The parameter group family for the cache parameter group"
  type        = string
  default     = "redis7.x"
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "automatic_failover_enabled" {
  description = "Enable automatic failover for the replication group"
  type        = bool
  default     = true
}

variable "auth_token_enabled" {
  description = "Enable authentication token (password) when connecting to Redis"
  type        = bool
  default     = true
}

variable "snapshot_retention_limit" {
  description = "The number of days to retain automatic snapshots"
  type        = number
  default     = 7
}

variable "snapshot_window" {
  description = "The daily time range during which automated backups are created"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "The weekly time range for system maintenance"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades"
  type        = bool
  default     = true
}

variable "notification_topic_arn" {
  description = "The ARN of the SNS topic to send notifications to"
  type        = string
  default     = ""
}

variable "enable_global_replication" {
  description = "Enable global replication group for cross-region replication"
  type        = bool
  default     = false
}

variable "create_elasticache_user" {
  description = "Create ElastiCache user for RBAC (Redis 6.0+)"
  type        = bool
  default     = true
}

variable "elasticache_user_name" {
  description = "The name of the ElastiCache user"
  type        = string
  default     = "serenity-app"
}

variable "elasticache_user_access_string" {
  description = "Access permissions string for the ElastiCache user"
  type        = string
  default     = "on ~* +@all -@dangerous"
}

variable "kms_key_arn" {
  description = "The ARN of the KMS key to use for encryption"
  type        = string
}

# Monitoring and alerting
variable "cpu_threshold" {
  description = "CPU utilization threshold for CloudWatch alarms"
  type        = number
  default     = 80
}

variable "memory_threshold" {
  description = "Memory utilization threshold for CloudWatch alarms"
  type        = number
  default     = 80
}

variable "connection_threshold" {
  description = "Connection count threshold for CloudWatch alarms"
  type        = number
  default     = 1000
}

variable "alarm_actions" {
  description = "List of ARN strings to notify on alarm state changes"
  type        = list(string)
  default     = []
}

# Cost optimization
variable "purchase_reserved_instances" {
  description = "Purchase reserved instances for cost optimization"
  type        = bool
  default     = false
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}