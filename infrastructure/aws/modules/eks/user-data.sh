#!/bin/bash

# EKS Node Group User Data Script
# This script bootstraps EC2 instances to join the EKS cluster

set -o xtrace

# Bootstrap the node to the EKS cluster
/etc/eks/bootstrap.sh ${cluster_name} ${bootstrap_arguments}

# Additional customizations for HIPAA compliance
echo "Configuring HIPAA compliance settings..."

# Enable CloudWatch agent
yum install -y amazon-cloudwatch-agent

# Configure log rotation
cat > /etc/logrotate.d/kubernetes <<EOF
/var/log/pods/*/*/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 root root
    postrotate
        /bin/kill -HUP \$(cat /var/run/rsyslogd.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
EOF

# Set up enhanced security
echo "Configuring enhanced security..."

# Disable root SSH login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/g' /etc/ssh/sshd_config

# Enable fail2ban for SSH protection
yum install -y epel-release fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Configure automatic security updates
yum install -y yum-cron
sed -i 's/update_cmd = default/update_cmd = security/' /etc/yum/yum-cron.conf
sed -i 's/apply_updates = no/apply_updates = yes/' /etc/yum/yum-cron.conf
systemctl enable yum-cron
systemctl start yum-cron

# Set up audit logging
echo "Configuring audit logging..."
cat > /etc/audit/rules.d/kubernetes.rules <<EOF
# Kubernetes audit rules
-w /etc/kubernetes/ -p wa -k kubernetes_config
-w /var/lib/kubelet/ -p wa -k kubelet_config
-w /var/log/pods/ -p wa -k pod_logs
-w /opt/cni/ -p wa -k cni_config
EOF

service auditd restart

# Configure container runtime security
echo "Configuring container runtime security..."

# Set up resource limits
cat > /etc/security/limits.d/kubernetes.conf <<EOF
* soft nofile 1048576
* hard nofile 1048576
* soft nproc 1048576
* hard nproc 1048576
EOF

# Configure kernel parameters for security
cat > /etc/sysctl.d/99-kubernetes.conf <<EOF
# Network security
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1

# Security enhancements
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
kernel.yama.ptrace_scope = 1
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
EOF

sysctl -p /etc/sysctl.d/99-kubernetes.conf

# Install and configure monitoring agents
echo "Installing monitoring agents..."

# Install Node Exporter for Prometheus
useradd --no-create-home --shell /bin/false node_exporter
curl -L https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz -o /tmp/node_exporter.tar.gz
tar -xzf /tmp/node_exporter.tar.gz -C /tmp/
cp /tmp/node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
chown node_exporter:node_exporter /usr/local/bin/node_exporter

# Create systemd service for Node Exporter
cat > /etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

# Configure log shipping to CloudWatch
echo "Configuring CloudWatch logging..."

# Install and configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<EOF
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/messages",
                        "log_group_name": "/aws/eks/${cluster_name}/system",
                        "log_stream_name": "{instance_id}/messages"
                    },
                    {
                        "file_path": "/var/log/secure",
                        "log_group_name": "/aws/eks/${cluster_name}/security",
                        "log_stream_name": "{instance_id}/secure"
                    },
                    {
                        "file_path": "/var/log/audit/audit.log",
                        "log_group_name": "/aws/eks/${cluster_name}/audit",
                        "log_stream_name": "{instance_id}/audit"
                    }
                ]
            }
        }
    },
    "metrics": {
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60,
                "totalcpu": false
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "diskio": {
                "measurement": [
                    "io_time"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            },
            "netstat": {
                "measurement": [
                    "tcp_established",
                    "tcp_time_wait"
                ],
                "metrics_collection_interval": 60
            },
            "swap": {
                "measurement": [
                    "swap_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

# Start CloudWatch agent
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# Final security hardening
echo "Performing final security hardening..."

# Remove unnecessary packages
yum remove -y telnet rsh-server rsh ypbind ypserv tftp-server tftp xinetd

# Set proper file permissions
chmod 600 /etc/ssh/sshd_config
chmod 644 /etc/passwd
chmod 644 /etc/group
chmod 600 /etc/shadow

# Clean up
rm -rf /tmp/node_exporter*

echo "Node setup completed successfully!"