# Serenity Healthcare Platform - AWS Infrastructure Variables

# General Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "serenity"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
  
  validation {
    condition = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "dr_region" {
  description = "Disaster recovery region"
  type        = string
  default     = "us-west-2"
}

variable "owner" {
  description = "Owner of the resources"
  type        = string
  default     = "serenity-platform-team"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "healthcare-platform"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
  
  validation {
    condition = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_instance_types" {
  description = "EC2 instance types for EKS worker nodes"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "eks_min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 3
}

variable "eks_max_size" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 20
}

variable "eks_desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 6
}

# RDS Configuration
variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage in GB for autoscaling"
  type        = number
  default     = 1000
}

variable "rds_multi_az" {
  description = "Enable multi-AZ deployment"
  type        = bool
  default     = true
}

variable "rds_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

# ElastiCache Configuration
variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r7g.large"
}

variable "elasticache_num_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 3
}

# DocumentDB Configuration
variable "documentdb_cluster_size" {
  description = "Number of DocumentDB instances"
  type        = number
  default     = 3
}

variable "documentdb_instance_class" {
  description = "DocumentDB instance class"
  type        = string
  default     = "db.r6g.large"
}

# Load Balancer Configuration
variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for ALB"
  type        = string
  default     = ""
}

variable "cloudfront_certificate_arn" {
  description = "ARN of SSL certificate for CloudFront (must be in us-east-1)"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "serenity-platform.com"
}

# Monitoring Configuration
variable "notification_email" {
  description = "Email for notifications and alerts"
  type        = string
  default     = "alerts@serenity-platform.com"
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

# CI/CD Configuration
variable "ecr_repository_urls" {
  description = "List of ECR repository URLs"
  type        = list(string)
  default     = []
}

variable "github_token_secret_arn" {
  description = "ARN of AWS Secrets Manager secret containing GitHub token"
  type        = string
  default     = ""
}

# Security Configuration
variable "enable_waf" {
  description = "Enable AWS WAF"
  type        = bool
  default     = true
}

variable "enable_shield_advanced" {
  description = "Enable AWS Shield Advanced"
  type        = bool
  default     = false
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty"
  type        = bool
  default     = true
}

variable "enable_macie" {
  description = "Enable AWS Macie"
  type        = bool
  default     = true
}

variable "enable_security_hub" {
  description = "Enable AWS Security Hub"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_vault_kms_key_arn" {
  description = "KMS key ARN for AWS Backup vault encryption"
  type        = string
  default     = ""
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 365
}

# Auto Scaling Configuration
variable "enable_cluster_autoscaler" {
  description = "Enable cluster autoscaler for EKS"
  type        = bool
  default     = true
}

variable "enable_hpa" {
  description = "Enable Horizontal Pod Autoscaler"
  type        = bool
  default     = true
}

variable "hpa_target_cpu_utilization" {
  description = "Target CPU utilization percentage for HPA"
  type        = number
  default     = 70
}

variable "hpa_target_memory_utilization" {
  description = "Target memory utilization percentage for HPA"
  type        = number
  default     = 80
}

# Performance Configuration
variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights"
  type        = bool
  default     = true
}

variable "enable_xray_tracing" {
  description = "Enable AWS X-Ray tracing"
  type        = bool
  default     = true
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for EKS worker nodes"
  type        = bool
  default     = false
}

variable "spot_instance_percentage" {
  description = "Percentage of spot instances in node group"
  type        = number
  default     = 50
}

variable "enable_scheduled_scaling" {
  description = "Enable scheduled scaling for predictable workloads"
  type        = bool
  default     = true
}

# Compliance Configuration
variable "enable_config" {
  description = "Enable AWS Config"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Enable AWS CloudTrail"
  type        = bool
  default     = true
}

variable "cloudtrail_s3_key_prefix" {
  description = "S3 key prefix for CloudTrail logs"
  type        = string
  default     = "cloudtrail-logs"
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

# Database Configuration
variable "enable_performance_insights" {
  description = "Enable Performance Insights for RDS"
  type        = bool
  default     = true
}

variable "performance_insights_retention_period" {
  description = "Performance Insights retention period in days"
  type        = number
  default     = 7
}

variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring for RDS"
  type        = bool
  default     = true
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60
}

# Environment-specific overrides
variable "environment_config" {
  description = "Environment-specific configuration overrides"
  type = object({
    development = optional(object({
      eks_min_size     = optional(number)
      eks_max_size     = optional(number)
      eks_desired_size = optional(number)
      rds_instance_class = optional(string)
      enable_multi_az = optional(bool)
    }))
    staging = optional(object({
      eks_min_size     = optional(number)
      eks_max_size     = optional(number)
      eks_desired_size = optional(number)
      rds_instance_class = optional(string)
      enable_multi_az = optional(bool)
    }))
    production = optional(object({
      eks_min_size     = optional(number)
      eks_max_size     = optional(number)
      eks_desired_size = optional(number)
      rds_instance_class = optional(string)
      enable_multi_az = optional(bool)
    }))
  })
  default = {
    development = {
      eks_min_size       = 1
      eks_max_size       = 5
      eks_desired_size   = 2
      rds_instance_class = "db.t3.micro"
      enable_multi_az    = false
    }
    staging = {
      eks_min_size       = 2
      eks_max_size       = 10
      eks_desired_size   = 3
      rds_instance_class = "db.r6g.large"
      enable_multi_az    = true
    }
    production = {
      eks_min_size       = 3
      eks_max_size       = 20
      eks_desired_size   = 6
      rds_instance_class = "db.r6g.xlarge"
      enable_multi_az    = true
    }
  }
}