# Serenity Healthcare Platform - EKS Module Variables

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

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.28"
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDR blocks that can access the Amazon EKS public API server endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cluster_security_group_ids" {
  description = "List of security group IDs for the cross-account elastic network interfaces"
  type        = list(string)
  default     = []
}

variable "node_security_group_ids" {
  description = "List of security group IDs for the EKS node group"
  type        = list(string)
  default     = []
}

variable "instance_types" {
  description = "Set of instance types associated with the EKS Node Group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "capacity_type" {
  description = "Type of capacity associated with the EKS Node Group. Valid values: ON_DEMAND, SPOT"
  type        = string
  default     = "ON_DEMAND"
}

variable "min_size" {
  description = "Minimum number of instances"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}

variable "desired_size" {
  description = "Desired number of instances"
  type        = number
  default     = 3
}

variable "disk_size" {
  description = "Disk size in GiB for worker nodes"
  type        = number
  default     = 50
}

variable "enable_monitoring" {
  description = "Enable detailed monitoring for instances"
  type        = bool
  default     = true
}

variable "bootstrap_arguments" {
  description = "Additional arguments for the EKS bootstrap script"
  type        = string
  default     = ""
}

variable "enable_spot_instances" {
  description = "Enable spot instances node group"
  type        = bool
  default     = false
}

variable "spot_instance_types" {
  description = "Set of instance types for spot instances"
  type        = list(string)
  default     = ["t3.medium", "t3.large", "t3a.medium", "t3a.large"]
}

variable "spot_min_size" {
  description = "Minimum number of spot instances"
  type        = number
  default     = 0
}

variable "spot_max_size" {
  description = "Maximum number of spot instances"
  type        = number
  default     = 5
}

variable "spot_desired_size" {
  description = "Desired number of spot instances"
  type        = number
  default     = 2
}

variable "kms_key_arn" {
  description = "ARN of the KMS key to use for encryption"
  type        = string
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}