# Serenity Healthcare Platform - EKS Module Outputs

output "cluster_id" {
  description = "The ID of the EKS cluster"
  value       = aws_eks_cluster.main.id
}

output "cluster_arn" {
  description = "The Amazon Resource Name (ARN) of the cluster"
  value       = aws_eks_cluster.main.arn
}

output "cluster_name" {
  description = "The name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "The endpoint for your EKS Kubernetes API"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_version" {
  description = "The Kubernetes server version for the EKS cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = aws_iam_role.cluster.name
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = aws_iam_role.cluster.arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_primary_security_group_id" {
  description = "The cluster primary security group ID created by the EKS cluster on 1.14 or later"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "node_group_arn" {
  description = "Amazon Resource Name (ARN) of the EKS Node Group"
  value       = aws_eks_node_group.main.arn
}

output "node_group_status" {
  description = "Status of the EKS Node Group"
  value       = aws_eks_node_group.main.status
}

output "node_group_capacity_type" {
  description = "Type of capacity associated with the EKS Node Group"
  value       = aws_eks_node_group.main.capacity_type
}

output "node_group_instance_types" {
  description = "Set of instance types associated with the EKS Node Group"
  value       = aws_eks_node_group.main.instance_types
}

output "node_group_asg_name" {
  description = "The Auto Scaling Group name associated with the EKS Node Group"
  value       = aws_eks_node_group.main.resources[0].autoscaling_groups[0].name
}

output "node_group_remote_access_ec2_ssh_key" {
  description = "EC2 Key Pair name that provides access for SSH communication with the worker nodes"
  value       = try(aws_eks_node_group.main.remote_access[0].ec2_ssh_key, null)
}

output "node_group_launch_template_id" {
  description = "The ID of the launch template"
  value       = aws_launch_template.node_group.id
}

output "node_group_launch_template_arn" {
  description = "The ARN of the launch template"
  value       = aws_launch_template.node_group.arn
}

output "node_group_launch_template_latest_version" {
  description = "The latest version of the launch template"
  value       = aws_launch_template.node_group.latest_version
}

output "oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "oidc_provider_arn" {
  description = "The ARN of the OIDC Identity Provider if enabled"
  value       = aws_iam_openid_connect_provider.cluster.arn
}

output "vpc_cni_role_arn" {
  description = "The ARN of the VPC CNI IAM role"
  value       = aws_iam_role.vpc_cni.arn
}

output "ebs_csi_role_arn" {
  description = "The ARN of the EBS CSI driver IAM role"
  value       = aws_iam_role.ebs_csi.arn
}

output "cluster_log_group_name" {
  description = "Name of cloudwatch log group for cluster logging"
  value       = aws_cloudwatch_log_group.cluster.name
}

output "cluster_log_group_arn" {
  description = "ARN of cloudwatch log group for cluster logging"
  value       = aws_cloudwatch_log_group.cluster.arn
}

# Spot node group outputs (if enabled)
output "spot_node_group_arn" {
  description = "Amazon Resource Name (ARN) of the EKS Spot Node Group"
  value       = var.enable_spot_instances ? aws_eks_node_group.spot[0].arn : null
}

output "spot_node_group_status" {
  description = "Status of the EKS Spot Node Group"
  value       = var.enable_spot_instances ? aws_eks_node_group.spot[0].status : null
}

# Useful for kubectl configuration
output "kubeconfig_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

# Add-on information
output "addons" {
  description = "Map of attribute maps for all EKS managed add-ons enabled"
  value = {
    vpc_cni = {
      name    = aws_eks_addon.vpc_cni.addon_name
      version = aws_eks_addon.vpc_cni.addon_version
      arn     = aws_eks_addon.vpc_cni.arn
    }
    coredns = {
      name    = aws_eks_addon.core_dns.addon_name
      version = aws_eks_addon.core_dns.addon_version
      arn     = aws_eks_addon.core_dns.arn
    }
    kube_proxy = {
      name    = aws_eks_addon.kube_proxy.addon_name
      version = aws_eks_addon.kube_proxy.addon_version
      arn     = aws_eks_addon.kube_proxy.arn
    }
    ebs_csi_driver = {
      name    = aws_eks_addon.ebs_csi_driver.addon_name
      version = aws_eks_addon.ebs_csi_driver.addon_version
      arn     = aws_eks_addon.ebs_csi_driver.arn
    }
  }
}