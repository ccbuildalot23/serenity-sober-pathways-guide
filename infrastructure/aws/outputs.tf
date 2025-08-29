# Serenity Healthcare Platform - AWS Infrastructure Outputs

# Network Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.networking.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = module.networking.database_subnet_ids
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = module.networking.internet_gateway_id
}

output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = module.networking.nat_gateway_ids
}

# EKS Outputs
output "eks_cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "eks_cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_version" {
  description = "EKS cluster Kubernetes version"
  value       = module.eks.cluster_version
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "eks_node_group_arn" {
  description = "EKS node group ARN"
  value       = module.eks.node_group_arn
}

output "eks_node_group_status" {
  description = "EKS node group status"
  value       = module.eks.node_group_status
}

output "eks_oidc_issuer_url" {
  description = "EKS cluster OIDC issuer URL"
  value       = module.eks.oidc_issuer_url
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = false
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.db_instance_port
}

output "rds_instance_id" {
  description = "RDS instance ID"
  value       = module.rds.db_instance_id
}

output "rds_instance_arn" {
  description = "RDS instance ARN"
  value       = module.rds.db_instance_arn
}

output "rds_master_username" {
  description = "RDS instance master username"
  value       = module.rds.db_instance_username
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.db_name
}

output "rds_parameter_group_name" {
  description = "RDS parameter group name"
  value       = module.rds.db_parameter_group_name
}

# ElastiCache Outputs
output "elasticache_cluster_id" {
  description = "ElastiCache cluster ID"
  value       = module.elasticache.cluster_id
}

output "elasticache_endpoint" {
  description = "ElastiCache endpoint"
  value       = module.elasticache.cache_nodes
}

output "elasticache_port" {
  description = "ElastiCache port"
  value       = module.elasticache.port
}

# DocumentDB Outputs
output "documentdb_cluster_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = module.documentdb.cluster_endpoint
}

output "documentdb_cluster_reader_endpoint" {
  description = "DocumentDB cluster reader endpoint"
  value       = module.documentdb.cluster_reader_endpoint
}

output "documentdb_cluster_id" {
  description = "DocumentDB cluster identifier"
  value       = module.documentdb.cluster_id
}

output "documentdb_port" {
  description = "DocumentDB port"
  value       = module.documentdb.port
}

# Load Balancer Outputs
output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = module.load_balancer.alb_arn
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.load_balancer.alb_dns_name
}

output "alb_zone_id" {
  description = "Application Load Balancer zone ID"
  value       = module.load_balancer.alb_zone_id
}

output "alb_security_group_id" {
  description = "Application Load Balancer security group ID"
  value       = module.load_balancer.alb_security_group_id
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = module.cloudfront.distribution_arn
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.distribution_domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  value       = module.cloudfront.distribution_hosted_zone_id
}

# S3 Outputs
output "s3_static_assets_bucket" {
  description = "S3 bucket for static assets"
  value       = module.s3.static_assets_bucket_name
}

output "s3_backups_bucket" {
  description = "S3 bucket for backups"
  value       = module.s3.backups_bucket_name
}

output "s3_logs_bucket" {
  description = "S3 bucket for logs"
  value       = module.s3.logs_bucket_name
}

output "s3_cloudtrail_bucket" {
  description = "S3 bucket for CloudTrail logs"
  value       = module.s3.cloudtrail_bucket_name
}

# KMS Outputs
output "kms_key_id" {
  description = "KMS key ID"
  value       = aws_kms_key.serenity.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN"
  value       = aws_kms_key.serenity.arn
}

output "kms_alias_name" {
  description = "KMS key alias name"
  value       = aws_kms_alias.serenity.name
}

# Security Outputs
output "security_groups" {
  description = "Security group IDs"
  value = {
    alb          = module.security.alb_security_group_id
    eks          = module.security.eks_security_group_id
    rds          = module.security.rds_security_group_id
    elasticache  = module.security.elasticache_security_group_id
    documentdb   = module.security.documentdb_security_group_id
  }
}

# Compliance Outputs
output "cloudtrail_arn" {
  description = "CloudTrail ARN"
  value       = module.compliance.cloudtrail_arn
}

output "config_configuration_recorder_name" {
  description = "AWS Config configuration recorder name"
  value       = module.compliance.config_configuration_recorder_name
}

output "guardduty_detector_id" {
  description = "GuardDuty detector ID"
  value       = module.compliance.guardduty_detector_id
}

output "security_hub_account_id" {
  description = "Security Hub account ID"
  value       = module.compliance.security_hub_account_id
}

# Monitoring Outputs
output "cloudwatch_log_groups" {
  description = "CloudWatch log group names"
  value       = module.monitoring.log_groups
}

output "sns_topic_arns" {
  description = "SNS topic ARNs for alerts"
  value       = module.monitoring.sns_topic_arns
}

output "cloudwatch_dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = module.monitoring.dashboard_url
}

# CI/CD Outputs
output "codepipeline_name" {
  description = "CodePipeline name"
  value       = module.cicd.pipeline_name
}

output "codepipeline_arn" {
  description = "CodePipeline ARN"
  value       = module.cicd.pipeline_arn
}

output "codebuild_project_names" {
  description = "CodeBuild project names"
  value       = module.cicd.codebuild_project_names
}

output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value       = module.cicd.ecr_repository_urls
}

# Disaster Recovery Outputs
output "backup_vault_arn" {
  description = "AWS Backup vault ARN"
  value       = module.disaster_recovery.backup_vault_arn
}

output "backup_plan_arn" {
  description = "AWS Backup plan ARN"
  value       = module.disaster_recovery.backup_plan_arn
}

output "dr_s3_bucket_name" {
  description = "Disaster recovery S3 bucket name"
  value       = module.disaster_recovery.dr_s3_bucket_name
}

# Connection Information (for applications)
output "database_connection_info" {
  description = "Database connection information"
  value = {
    postgresql = {
      endpoint = module.rds.db_instance_endpoint
      port     = module.rds.db_instance_port
      database = module.rds.db_name
      username = module.rds.db_instance_username
    }
    redis = {
      endpoint = module.elasticache.cache_nodes
      port     = module.elasticache.port
    }
    documentdb = {
      endpoint = module.documentdb.cluster_endpoint
      port     = module.documentdb.port
    }
  }
  sensitive = false
}

# URLs and Endpoints
output "application_urls" {
  description = "Application URLs and endpoints"
  value = {
    load_balancer = "https://${module.load_balancer.alb_dns_name}"
    cloudfront    = "https://${module.cloudfront.distribution_domain_name}"
    domain        = var.domain_name != "" ? "https://${var.domain_name}" : null
  }
}

# Resource Counts and Sizing
output "resource_summary" {
  description = "Summary of deployed resources"
  value = {
    vpc_cidr           = module.networking.vpc_cidr_block
    availability_zones = length(local.azs)
    public_subnets     = length(module.networking.public_subnet_ids)
    private_subnets    = length(module.networking.private_subnet_ids)
    database_subnets   = length(module.networking.database_subnet_ids)
    eks_node_count     = "${var.eks_min_size}-${var.eks_max_size} (desired: ${var.eks_desired_size})"
    rds_instance_class = var.rds_instance_class
    cache_node_count   = var.elasticache_num_nodes
    documentdb_instances = var.documentdb_cluster_size
  }
}

# Environment Information
output "environment_info" {
  description = "Environment and deployment information"
  value = {
    project_name = var.project_name
    environment  = var.environment
    region       = var.aws_region
    dr_region    = var.dr_region
    account_id   = local.account_id
    created_at   = timestamp()
  }
}