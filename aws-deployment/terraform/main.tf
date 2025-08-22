# Terraform configuration for AWS infrastructure
# HIPAA-compliant deployment for Serenity microservices

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
  
  backend "s3" {
    bucket         = "serenity-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "serenity-sober-pathways"
      ManagedBy   = "Terraform"
      Compliance  = "HIPAA"
    }
  }
}

# VPC Configuration for network isolation
module "vpc" {
  source = "./modules/vpc"
  
  name               = "${var.project_name}-vpc"
  cidr               = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
  enable_flow_logs   = true  # HIPAA requirement
  
  tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

# EKS Cluster for microservices
module "eks" {
  source = "./modules/eks"
  
  cluster_name    = var.cluster_name
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  # HIPAA-compliant configuration
  enable_irsa                    = true
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = false
  
  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }
  
  node_groups = {
    main = {
      desired_capacity = 3
      max_capacity     = 10
      min_capacity     = 2
      
      instance_types = ["t3.large"]
      
      k8s_labels = {
        Environment = var.environment
        Type        = "general"
      }
    }
    
    critical = {
      desired_capacity = 2
      max_capacity     = 4
      min_capacity     = 2
      
      instance_types = ["t3.xlarge"]
      
      k8s_labels = {
        Environment = var.environment
        Type        = "critical"
      }
      
      taints = [
        {
          key    = "critical"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }
  }
}

# RDS PostgreSQL for persistent data
module "rds" {
  source = "./modules/rds"
  
  identifier = "${var.project_name}-db"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds.arn
  
  database_name = "serenity"
  username      = "serenity_admin"
  
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  
  multi_az               = true
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  # HIPAA compliance
  deletion_protection = true
  skip_final_snapshot = false
  
  performance_insights_enabled = true
  monitoring_interval         = 60
}

# ElastiCache Redis for caching and sessions
module "elasticache" {
  source = "./modules/elasticache"
  
  cluster_id = "${var.project_name}-cache"
  
  engine         = "redis"
  engine_version = "7.0"
  node_type      = "cache.r6g.large"
  
  num_cache_nodes = 3
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled        = true
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
}

# Amazon MQ (RabbitMQ) for message queue
resource "aws_mq_broker" "rabbitmq" {
  broker_name = "${var.project_name}-mq"
  
  engine_type    = "RabbitMQ"
  engine_version = "3.11.20"
  
  deployment_mode = "CLUSTER_MULTI_AZ"
  host_instance_type = "mq.m5.large"
  
  security_groups = [aws_security_group.mq.id]
  subnet_ids      = slice(module.vpc.private_subnets, 0, 2)
  
  encryption_options {
    use_aws_owned_key = false
    kms_key_id       = aws_kms_key.mq.arn
  }
  
  logs {
    general = true
  }
  
  user {
    username = "admin"
    password = random_password.mq_password.result
  }
}

# S3 Buckets for file storage
module "s3" {
  source = "./modules/s3"
  
  buckets = {
    files = {
      name = "${var.project_name}-files"
      versioning = true
      encryption = {
        algorithm = "aws:kms"
        kms_key   = aws_kms_key.s3.arn
      }
      lifecycle_rules = [
        {
          id     = "archive"
          status = "Enabled"
          transition = {
            days          = 90
            storage_class = "GLACIER"
          }
        }
      ]
    }
    
    backups = {
      name = "${var.project_name}-backups"
      versioning = true
      encryption = {
        algorithm = "aws:kms"
        kms_key   = aws_kms_key.s3.arn
      }
      lifecycle_rules = [
        {
          id     = "expire"
          status = "Enabled"
          expiration = {
            days = 365
          }
        }
      ]
    }
  }
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  name = "${var.project_name}-alb"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnets
  
  # HTTPS only for HIPAA compliance
  enable_http2                     = true
  enable_cross_zone_load_balancing = true
  enable_deletion_protection       = true
  
  access_logs = {
    enabled = true
    bucket  = module.s3.buckets["logs"].id
    prefix  = "alb"
  }
  
  ssl_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn = aws_acm_certificate.main.arn
}

# WAF for application protection
module "waf" {
  source = "./modules/waf"
  
  name = "${var.project_name}-waf"
  
  alb_arn = module.alb.arn
  
  rules = [
    {
      name     = "RateLimitRule"
      priority = 1
      action   = "block"
      
      rate_limit = {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    },
    {
      name     = "SQLiRule"
      priority = 2
      action   = "block"
      
      managed_rule_group = {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    },
    {
      name     = "CommonRule"
      priority = 3
      action   = "block"
      
      managed_rule_group = {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }
  ]
}

# CloudFront CDN
module "cloudfront" {
  source = "./modules/cloudfront"
  
  aliases = ["app.serenity.com"]
  
  origin = {
    domain_name = module.alb.dns_name
    origin_id   = "ALB-${module.alb.id}"
  }
  
  default_cache_behavior = {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-${module.alb.id}"
    
    forwarded_values = {
      query_string = true
      headers      = ["Host", "CloudFront-Forwarded-Proto", "CloudFront-Is-Desktop-Viewer", "CloudFront-Is-Mobile-Viewer"]
      
      cookies = {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }
  
  price_class = "PriceClass_100"
  
  restrictions = {
    geo_restriction = {
      restriction_type = "whitelist"
      locations        = ["US", "CA"]
    }
  }
  
  viewer_certificate = {
    acm_certificate_arn = aws_acm_certificate.cloudfront.arn
    ssl_support_method  = "sni-only"
  }
  
  web_acl_id = module.waf.web_acl_arn
}

# Secrets Manager for sensitive data
resource "aws_secretsmanager_secret" "app_secrets" {
  name = "${var.project_name}-secrets"
  
  kms_key_id = aws_kms_key.secrets.arn
  
  replica {
    region = "us-west-2"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  
  secret_string = jsonencode({
    database_url    = module.rds.connection_string
    redis_url       = module.elasticache.connection_string
    rabbitmq_url    = "amqps://${aws_mq_broker.rabbitmq.id}.mq.${var.aws_region}.amazonaws.com"
    jwt_secret      = random_password.jwt_secret.result
    encryption_key  = random_password.encryption_key.result
  })
}

# KMS Keys for encryption
resource "aws_kms_key" "eks" {
  description = "KMS key for EKS cluster encryption"
  enable_key_rotation = true
}

resource "aws_kms_key" "rds" {
  description = "KMS key for RDS encryption"
  enable_key_rotation = true
}

resource "aws_kms_key" "s3" {
  description = "KMS key for S3 encryption"
  enable_key_rotation = true
}

resource "aws_kms_key" "mq" {
  description = "KMS key for MQ encryption"
  enable_key_rotation = true
}

resource "aws_kms_key" "secrets" {
  description = "KMS key for Secrets Manager"
  enable_key_rotation = true
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/serenity/application"
  retention_in_days = 90
  kms_key_id       = aws_kms_key.logs.arn
}

resource "aws_cloudwatch_log_group" "audit" {
  name              = "/aws/serenity/audit"
  retention_in_days = 2555  # 7 years for HIPAA
  kms_key_id       = aws_kms_key.logs.arn
}

# Random passwords
resource "random_password" "mq_password" {
  length  = 32
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

# Outputs
output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "alb_dns_name" {
  value = module.alb.dns_name
}

output "cloudfront_domain_name" {
  value = module.cloudfront.domain_name
}