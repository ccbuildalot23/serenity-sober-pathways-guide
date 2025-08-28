# Serenity Healthcare Platform - AWS Infrastructure
# HIPAA-compliant, scalable, and secure infrastructure for mental health platform

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "serenity-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "serenity-terraform-locks"
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      Owner       = var.owner
      CostCenter  = var.cost_center
      Compliance  = "HIPAA"
      CreatedBy   = "Terraform"
      CreatedAt   = timestamp()
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Local values
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  
  # Common tags
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Owner       = var.owner
    CostCenter  = var.cost_center
    Compliance  = "HIPAA"
    CreatedBy   = "Terraform"
  }
  
  # Availability zones
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
  
  # Network configuration
  vpc_cidr = var.vpc_cidr
  
  # Subnet CIDRs - calculated dynamically
  public_subnet_cidrs = [
    cidrsubnet(local.vpc_cidr, 8, 1),
    cidrsubnet(local.vpc_cidr, 8, 2),
    cidrsubnet(local.vpc_cidr, 8, 3)
  ]
  
  private_subnet_cidrs = [
    cidrsubnet(local.vpc_cidr, 8, 11),
    cidrsubnet(local.vpc_cidr, 8, 12),
    cidrsubnet(local.vpc_cidr, 8, 13)
  ]
  
  database_subnet_cidrs = [
    cidrsubnet(local.vpc_cidr, 8, 21),
    cidrsubnet(local.vpc_cidr, 8, 22),
    cidrsubnet(local.vpc_cidr, 8, 23)
  ]
}

# KMS Key for encryption at rest
resource "aws_kms_key" "serenity" {
  description             = "${var.project_name}-${var.environment} encryption key"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "key-policy-serenity"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-kms-key"
  })
}

resource "aws_kms_alias" "serenity" {
  name          = "alias/${var.project_name}-${var.environment}"
  target_key_id = aws_kms_key.serenity.key_id
}

# Include all infrastructure modules
module "networking" {
  source = "./modules/networking"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_cidr                 = local.vpc_cidr
  public_subnet_cidrs      = local.public_subnet_cidrs
  private_subnet_cidrs     = local.private_subnet_cidrs
  database_subnet_cidrs    = local.database_subnet_cidrs
  availability_zones       = local.azs
  
  enable_nat_gateway     = true
  enable_vpn_gateway     = false
  enable_dns_hostnames   = true
  enable_dns_support     = true
  enable_flow_logs       = true
  
  tags = local.common_tags
}

module "security" {
  source = "./modules/security"
  
  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
  
  kms_key_arn = aws_kms_key.serenity.arn
  
  tags = local.common_tags
}

module "eks" {
  source = "./modules/eks"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_id                = module.networking.vpc_id
  private_subnet_ids    = module.networking.private_subnet_ids
  public_subnet_ids     = module.networking.public_subnet_ids
  
  cluster_version       = var.eks_cluster_version
  instance_types        = var.eks_instance_types
  min_size             = var.eks_min_size
  max_size             = var.eks_max_size
  desired_size         = var.eks_desired_size
  
  kms_key_arn = aws_kms_key.serenity.arn
  
  tags = local.common_tags
}

module "rds" {
  source = "./modules/rds"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.database_subnet_ids
  security_group_ids = [module.security.rds_security_group_id]
  
  engine_version     = var.rds_engine_version
  instance_class     = var.rds_instance_class
  allocated_storage  = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  
  kms_key_arn = aws_kms_key.serenity.arn
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  tags = local.common_tags
}

module "elasticache" {
  source = "./modules/elasticache"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_id          = module.networking.vpc_id
  subnet_ids      = module.networking.private_subnet_ids
  security_group_ids = [module.security.elasticache_security_group_id]
  
  node_type       = var.elasticache_node_type
  num_cache_nodes = var.elasticache_num_nodes
  
  kms_key_arn = aws_kms_key.serenity.arn
  
  tags = local.common_tags
}

module "documentdb" {
  source = "./modules/documentdb"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_id          = module.networking.vpc_id
  subnet_ids      = module.networking.database_subnet_ids
  security_group_ids = [module.security.documentdb_security_group_id]
  
  cluster_size    = var.documentdb_cluster_size
  instance_class  = var.documentdb_instance_class
  
  kms_key_arn = aws_kms_key.serenity.arn
  
  tags = local.common_tags
}

module "load_balancer" {
  source = "./modules/load_balancer"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_id            = module.networking.vpc_id
  public_subnet_ids = module.networking.public_subnet_ids
  security_group_ids = [module.security.alb_security_group_id]
  
  certificate_arn = var.ssl_certificate_arn
  
  tags = local.common_tags
}

module "cloudfront" {
  source = "./modules/cloudfront"
  
  project_name = var.project_name
  environment  = var.environment
  
  origin_domain_name = module.load_balancer.alb_dns_name
  origin_id         = "${var.project_name}-${var.environment}-alb"
  
  certificate_arn = var.cloudfront_certificate_arn
  domain_name     = var.domain_name
  
  tags = local.common_tags
}

module "s3" {
  source = "./modules/s3"
  
  project_name = var.project_name
  environment  = var.environment
  
  kms_key_arn = aws_kms_key.serenity.arn
  
  tags = local.common_tags
}

module "compliance" {
  source = "./modules/compliance"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_id = module.networking.vpc_id
  
  s3_bucket_arn = module.s3.cloudtrail_bucket_arn
  kms_key_arn   = aws_kms_key.serenity.arn
  
  tags = local.common_tags
}

module "monitoring" {
  source = "./modules/monitoring"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_id             = module.networking.vpc_id
  eks_cluster_name   = module.eks.cluster_name
  rds_instance_id    = module.rds.db_instance_id
  elasticache_cluster_id = module.elasticache.cluster_id
  
  notification_email = var.notification_email
  
  tags = local.common_tags
}

module "cicd" {
  source = "./modules/cicd"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_id            = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  
  eks_cluster_name = module.eks.cluster_name
  ecr_repository_urls = var.ecr_repository_urls
  
  github_token_secret_arn = var.github_token_secret_arn
  
  tags = local.common_tags
}

module "disaster_recovery" {
  source = "./modules/disaster_recovery"
  
  project_name = var.project_name
  environment  = var.environment
  
  primary_region   = var.aws_region
  dr_region       = var.dr_region
  
  rds_instance_identifier = module.rds.db_instance_id
  s3_bucket_names        = module.s3.bucket_names
  
  kms_key_arn = aws_kms_key.serenity.arn
  
  tags = local.common_tags
}