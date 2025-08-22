# Variables for Serenity Notification Service Infrastructure

# General Configuration
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition = contains([
      "dev", "development",
      "staging", "stage", "stg",
      "prod", "production"
    ], var.environment)
    error_message = "Environment must be one of: dev, development, staging, stage, stg, prod, production."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "serenity-notification-service"
}

# Network Configuration
variable "create_vpc" {
  description = "Whether to create a new VPC or use existing"
  type        = bool
  default     = false
}

variable "vpc_id" {
  description = "VPC ID to use (when create_vpc is false)"
  type        = string
  default     = ""
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.1.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.1.201.0/24", "10.1.202.0/24", "10.1.203.0/24"]
}

variable "private_subnet_ids" {
  description = "Private subnet IDs (when create_vpc is false)"
  type        = list(string)
  default     = []
}

variable "database_subnet_ids" {
  description = "Database subnet IDs (when create_vpc is false)"
  type        = list(string)
  default     = []
}

# EKS Configuration
variable "eks_cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "eks_oidc_issuer_arn" {
  description = "ARN of the EKS OIDC issuer"
  type        = string
}

variable "eks_oidc_issuer_url" {
  description = "URL of the EKS OIDC issuer"
  type        = string
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
  
  validation {
    condition = can(regex("^db\\.(t3|t4g|r5|r6g|m5|m6g)\\.(micro|small|medium|large|xlarge|2xlarge|4xlarge|8xlarge|12xlarge|16xlarge|24xlarge)", var.db_instance_class))
    error_message = "Database instance class must be a valid RDS instance type."
  }
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for RDS instance (GB)"
  type        = number
  default     = 100
  
  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 65536
    error_message = "Allocated storage must be between 20 and 65536 GB."
  }
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS instance (GB)"
  type        = number
  default     = 1000
  
  validation {
    condition     = var.db_max_allocated_storage >= 100 && var.db_max_allocated_storage <= 65536
    error_message = "Maximum allocated storage must be between 100 and 65536 GB."
  }
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.4"
  
  validation {
    condition     = can(regex("^(13|14|15)\\.[0-9]+$", var.postgres_version))
    error_message = "PostgreSQL version must be 13.x, 14.x, or 15.x."
  }
}

variable "db_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
  
  validation {
    condition     = var.db_backup_retention_period >= 7 && var.db_backup_retention_period <= 35
    error_message = "Backup retention period must be between 7 and 35 days for HIPAA compliance."
  }
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.medium"
  
  validation {
    condition = can(regex("^cache\\.(t3|t4g|r5|r6g|m5|m6g)\\.(micro|small|medium|large|xlarge|2xlarge|4xlarge|8xlarge|12xlarge|16xlarge|24xlarge)", var.redis_node_type))
    error_message = "Redis node type must be a valid ElastiCache instance type."
  }
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 2
  
  validation {
    condition     = var.redis_num_cache_nodes >= 1 && var.redis_num_cache_nodes <= 6
    error_message = "Number of Redis cache nodes must be between 1 and 6."
  }
}

# Application Configuration
variable "notification_from_email" {
  description = "Email address for sending notifications"
  type        = string
  default     = "notifications@serenity.com"
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.notification_from_email))
    error_message = "Notification from email must be a valid email address."
  }
}

variable "app_version" {
  description = "Version of the notification service application"
  type        = string
  default     = "1.0.0"
}

# Monitoring and Logging
variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 2555  # 7 years for HIPAA compliance
  
  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 2192, 2557, 2922, 3288, 3653
    ], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch log retention period."
  }
}

variable "enable_performance_insights" {
  description = "Enable RDS Performance Insights"
  type        = bool
  default     = true
}

# Security Configuration
variable "enable_encryption" {
  description = "Enable encryption for all services (required for HIPAA)"
  type        = bool
  default     = true
  
  validation {
    condition     = var.enable_encryption == true
    error_message = "Encryption must be enabled for HIPAA compliance."
  }
}

variable "kms_key_deletion_window" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 7
  
  validation {
    condition     = var.kms_key_deletion_window >= 7 && var.kms_key_deletion_window <= 30
    error_message = "KMS key deletion window must be between 7 and 30 days."
  }
}

# Auto Scaling Configuration
variable "min_capacity" {
  description = "Minimum number of instances"
  type        = number
  default     = 2
  
  validation {
    condition     = var.min_capacity >= 1 && var.min_capacity <= 100
    error_message = "Minimum capacity must be between 1 and 100."
  }
}

variable "max_capacity" {
  description = "Maximum number of instances"
  type        = number
  default     = 20
  
  validation {
    condition     = var.max_capacity >= 1 && var.max_capacity <= 1000
    error_message = "Maximum capacity must be between 1 and 1000."
  }
}

variable "desired_capacity" {
  description = "Desired number of instances"
  type        = number
  default     = 3
  
  validation {
    condition     = var.desired_capacity >= 1 && var.desired_capacity <= 1000
    error_message = "Desired capacity must be between 1 and 1000."
  }
}

# Cost Optimization
variable "enable_scheduled_scaling" {
  description = "Enable scheduled scaling for cost optimization"
  type        = bool
  default     = false
}

variable "scale_down_schedule" {
  description = "Cron expression for scaling down (UTC)"
  type        = string
  default     = "0 22 * * *"  # 10 PM UTC
}

variable "scale_up_schedule" {
  description = "Cron expression for scaling up (UTC)"
  type        = string
  default     = "0 6 * * *"   # 6 AM UTC
}

variable "off_hours_min_capacity" {
  description = "Minimum capacity during off hours"
  type        = number
  default     = 1
}

# Feature Flags
variable "enable_blue_green_deployment" {
  description = "Enable blue-green deployment infrastructure"
  type        = bool
  default     = false
}

variable "enable_canary_deployment" {
  description = "Enable canary deployment infrastructure"
  type        = bool
  default     = false
}

variable "enable_multi_region" {
  description = "Enable multi-region deployment"
  type        = bool
  default     = false
}

variable "secondary_regions" {
  description = "List of secondary regions for multi-region deployment"
  type        = list(string)
  default     = ["us-west-2"]
}

# External Integrations
variable "datadog_api_key" {
  description = "DataDog API key (stored in Secrets Manager)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "newrelic_license_key" {
  description = "New Relic license key (stored in Secrets Manager)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  default     = ""
  sensitive   = true
}

variable "pagerduty_integration_key" {
  description = "PagerDuty integration key"
  type        = string
  default     = ""
  sensitive   = true
}

# Compliance and Governance
variable "compliance_framework" {
  description = "Compliance framework (HIPAA, SOX, etc.)"
  type        = string
  default     = "HIPAA"
  
  validation {
    condition     = contains(["HIPAA", "SOX", "PCI", "SOC2"], var.compliance_framework)
    error_message = "Compliance framework must be one of: HIPAA, SOX, PCI, SOC2."
  }
}

variable "data_classification" {
  description = "Data classification level"
  type        = string
  default     = "confidential"
  
  validation {
    condition     = contains(["public", "internal", "confidential", "restricted"], var.data_classification)
    error_message = "Data classification must be one of: public, internal, confidential, restricted."
  }
}

variable "business_unit" {
  description = "Business unit responsible for the service"
  type        = string
  default     = "healthcare-platform"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "platform-engineering"
}

variable "owner_email" {
  description = "Email of the service owner"
  type        = string
  default     = "platform-team@serenity.com"
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.owner_email))
    error_message = "Owner email must be a valid email address."
  }
}

# Disaster Recovery
variable "enable_cross_region_backup" {
  description = "Enable cross-region backup for disaster recovery"
  type        = bool
  default     = false
}

variable "backup_region" {
  description = "Backup region for disaster recovery"
  type        = string
  default     = "us-west-2"
}

variable "rpo_hours" {
  description = "Recovery Point Objective in hours"
  type        = number
  default     = 4
  
  validation {
    condition     = var.rpo_hours >= 1 && var.rpo_hours <= 24
    error_message = "RPO must be between 1 and 24 hours."
  }
}

variable "rto_hours" {
  description = "Recovery Time Objective in hours"
  type        = number
  default     = 2
  
  validation {
    condition     = var.rto_hours >= 1 && var.rto_hours <= 24
    error_message = "RTO must be between 1 and 24 hours."
  }
}

# Development and Testing
variable "enable_debug_mode" {
  description = "Enable debug mode for development environments"
  type        = bool
  default     = false
}

variable "mock_external_services" {
  description = "Use mock external services for testing"
  type        = bool
  default     = false
}

variable "test_data_enabled" {
  description = "Enable test data population"
  type        = bool
  default     = false
}

# Resource Tagging
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Notification Service Specific
variable "notification_queue_retention_days" {
  description = "Retention period for notification queue messages"
  type        = number
  default     = 14
  
  validation {
    condition     = var.notification_queue_retention_days >= 1 && var.notification_queue_retention_days <= 14
    error_message = "Queue retention days must be between 1 and 14 days."
  }
}

variable "max_notification_retries" {
  description = "Maximum number of notification delivery retries"
  type        = number
  default     = 3
  
  validation {
    condition     = var.max_notification_retries >= 1 && var.max_notification_retries <= 10
    error_message = "Max retries must be between 1 and 10."
  }
}

variable "notification_batch_size" {
  description = "Batch size for notification processing"
  type        = number
  default     = 100
  
  validation {
    condition     = var.notification_batch_size >= 1 && var.notification_batch_size <= 1000
    error_message = "Batch size must be between 1 and 1000."
  }
}

variable "enable_notification_analytics" {
  description = "Enable notification analytics and reporting"
  type        = bool
  default     = true
}

variable "analytics_retention_days" {
  description = "Retention period for notification analytics data"
  type        = number
  default     = 90
  
  validation {
    condition     = var.analytics_retention_days >= 30 && var.analytics_retention_days <= 2555
    error_message = "Analytics retention must be between 30 days and 7 years."
  }
}