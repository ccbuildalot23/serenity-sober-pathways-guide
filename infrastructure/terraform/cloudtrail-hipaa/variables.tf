variable "region" {
  description = "AWS region to deploy CloudTrail resources"
  type        = string
}

variable "trail_name" {
  description = "Name of the CloudTrail trail"
  type        = string
  default     = "serenity-hipaa-trail"
}

variable "logs_bucket_name" {
  description = "S3 bucket to store CloudTrail logs"
  type        = string
}

variable "create_bucket" {
  description = "Whether to create the S3 bucket (true) or use an existing one (false)"
  type        = bool
  default     = false
}

variable "s3_key_prefix" {
  description = "Prefix under which CloudTrail will deliver logs"
  type        = string
  default     = "cloudtrail-logs"
}

variable "phi_bucket_name" {
  description = "S3 bucket that stores PHI; enables S3 data events"
  type        = string
}

variable "kms_key_alias" {
  description = "Alias for the KMS key used by CloudTrail"
  type        = string
  default     = "alias/serenity-cloudtrail-key"
}

variable "cloudwatch_retention_days" {
  description = "CloudWatch Logs retention in days (e.g., 2555 ≈ 7 years)"
  type        = number
  default     = 2555
}

variable "s3_retention_days" {
  description = "S3 object retention in days for CloudTrail logs"
  type        = number
  default     = 2555
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}




