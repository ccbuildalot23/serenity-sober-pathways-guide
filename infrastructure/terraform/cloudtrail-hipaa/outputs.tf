output "trail_arn" {
  description = "CloudTrail ARN"
  value       = aws_cloudtrail.this.arn
}

output "kms_key_arn" {
  description = "KMS key ARN used for CloudTrail SSE-KMS"
  value       = aws_kms_key.this.arn
}

output "logs_bucket_name" {
  description = "Name of S3 bucket receiving CloudTrail logs"
  value       = local.bucket_id
}

output "cloudwatch_log_group_name" {
  description = "CloudWatch log group used by CloudTrail"
  value       = aws_cloudwatch_log_group.this.name
}






















