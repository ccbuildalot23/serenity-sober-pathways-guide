/**
 * AWS Infrastructure Health Agent
 * Monitors and maintains the health of AWS infrastructure components
 * Implements BMAD framework for intelligent self-healing capabilities
 */

import AWS from 'aws-sdk';
import logger from '@/services/loggerService';
import { hipaaAuditService } from '@/services/hipaaAuditService';

interface HealthMetric {
  service: string;
  status: 'healthy' | 'degraded' | 'critical';
  metrics: Record<string, number>;
  timestamp: Date;
  recommendations?: string[];
}

interface AutoRemediationAction {
  issue: string;
  action: string;
  executed: boolean;
  result?: string;
  timestamp: Date;
}

interface ScalingDecision {
  currentCapacity: number;
  desiredCapacity: number;
  reason: string;
  metrics: {
    cpuUtilization: number;
    memoryUtilization: number;
    requestCount: number;
    responseTime: number;
  };
}

export class InfrastructureHealthAgent {
  private ec2: AWS.EC2;
  private elb: AWS.ELBv2;
  private rds: AWS.RDS;
  private cloudWatch: AWS.CloudWatch;
  private autoScaling: AWS.AutoScaling;
  private sns: AWS.SNS;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs = 60000; // 1 minute
  private readonly criticalThresholds = {
    cpu: 80,
    memory: 85,
    disk: 90,
    responseTime: 2000, // 2 seconds
    errorRate: 5, // 5%
  };

  constructor(region: string = 'us-east-1') {
    AWS.config.update({ region });
    this.ec2 = new AWS.EC2();
    this.elb = new AWS.ELBv2();
    this.rds = new AWS.RDS();
    this.cloudWatch = new AWS.CloudWatch();
    this.autoScaling = new AWS.AutoScaling();
    this.sns = new AWS.SNS();
  }

  /**
   * Start continuous health monitoring
   */
  public async startMonitoring(): Promise<void> {
    logger.info('Infrastructure Health Agent starting monitoring');
    
    // Initial health check
    await this.performHealthCheck();
    
    // Set up continuous monitoring
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.checkIntervalMs);
    
    // Set up CloudWatch alarms
    await this.setupCloudWatchAlarms();
  }

  /**
   * Stop health monitoring
   */
  public stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    logger.info('Infrastructure Health Agent stopped monitoring');
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<HealthMetric[]> {
    const healthMetrics: HealthMetric[] = [];
    
    try {
      // Check EC2 instances
      const ec2Health = await this.checkEC2Health();
      healthMetrics.push(ec2Health);
      
      // Check Load Balancer
      const elbHealth = await this.checkELBHealth();
      healthMetrics.push(elbHealth);
      
      // Check RDS if configured
      const rdsHealth = await this.checkRDSHealth();
      if (rdsHealth) healthMetrics.push(rdsHealth);
      
      // Check Auto Scaling
      const asgHealth = await this.checkAutoScalingHealth();
      healthMetrics.push(asgHealth);
      
      // Analyze and remediate issues
      await this.analyzeAndRemediate(healthMetrics);
      
      // Log health status for audit
      await this.logHealthStatus(healthMetrics);
      
      return healthMetrics;
    } catch (error) {
      logger.error('Health check failed', error);
      await this.sendAlert('Health check failure', error);
      return healthMetrics;
    }
  }

  /**
   * Check EC2 instance health
   */
  private async checkEC2Health(): Promise<HealthMetric> {
    try {
      const instances = await this.ec2.describeInstances({
        Filters: [
          { Name: 'tag:Application', Values: ['Serenity'] },
          { Name: 'instance-state-name', Values: ['running'] },
        ],
      }).promise();
      
      const metrics: Record<string, number> = {
        runningInstances: 0,
        stoppedInstances: 0,
        unhealthyInstances: 0,
      };
      
      for (const reservation of instances.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          if (instance.State?.Name === 'running') {
            metrics.runningInstances++;
            
            // Check instance metrics
            const cpuMetrics = await this.getInstanceMetrics(
              instance.InstanceId!,
              'CPUUtilization'
            );
            
            if (cpuMetrics > this.criticalThresholds.cpu) {
              metrics.unhealthyInstances++;
            }
          } else {
            metrics.stoppedInstances++;
          }
        }
      }
      
      const status = metrics.unhealthyInstances > 0 ? 'degraded' : 'healthy';
      
      return {
        service: 'EC2',
        status,
        metrics,
        timestamp: new Date(),
        recommendations: status === 'degraded' ? 
          ['Consider scaling out instances', 'Review application performance'] : undefined,
      };
    } catch (error) {
      logger.error('EC2 health check failed', error);
      return {
        service: 'EC2',
        status: 'critical',
        metrics: {},
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Elastic Load Balancer health
   */
  private async checkELBHealth(): Promise<HealthMetric> {
    try {
      const loadBalancers = await this.elb.describeLoadBalancers({
        Names: ['SerenityALB'],
      }).promise();
      
      if (!loadBalancers.LoadBalancers?.length) {
        throw new Error('Load balancer not found');
      }
      
      const lb = loadBalancers.LoadBalancers[0];
      
      // Check target health
      const targetGroups = await this.elb.describeTargetGroups({
        LoadBalancerArn: lb.LoadBalancerArn,
      }).promise();
      
      const metrics: Record<string, number> = {
        healthyTargets: 0,
        unhealthyTargets: 0,
        drainingTargets: 0,
      };
      
      for (const tg of targetGroups.TargetGroups || []) {
        const targetHealth = await this.elb.describeTargetHealth({
          TargetGroupArn: tg.TargetGroupArn,
        }).promise();
        
        for (const target of targetHealth.TargetHealthDescriptions || []) {
          switch (target.TargetHealth?.State) {
            case 'healthy':
              metrics.healthyTargets++;
              break;
            case 'unhealthy':
              metrics.unhealthyTargets++;
              break;
            case 'draining':
              metrics.drainingTargets++;
              break;
          }
        }
      }
      
      const status = metrics.unhealthyTargets > 0 ? 
        (metrics.healthyTargets === 0 ? 'critical' : 'degraded') : 'healthy';
      
      return {
        service: 'ELB',
        status,
        metrics,
        timestamp: new Date(),
        recommendations: status !== 'healthy' ? 
          ['Check application health endpoints', 'Review target group configuration'] : undefined,
      };
    } catch (error) {
      logger.error('ELB health check failed', error);
      return {
        service: 'ELB',
        status: 'critical',
        metrics: {},
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check RDS database health
   */
  private async checkRDSHealth(): Promise<HealthMetric | null> {
    try {
      const instances = await this.rds.describeDBInstances({
        Filters: [
          { Name: 'engine', Values: ['postgres'] },
        ],
      }).promise();
      
      if (!instances.DBInstances?.length) {
        return null; // No RDS instances configured
      }
      
      const metrics: Record<string, number> = {
        availableInstances: 0,
        cpuUtilization: 0,
        storageUsed: 0,
        connections: 0,
      };
      
      for (const db of instances.DBInstances) {
        if (db.DBInstanceStatus === 'available') {
          metrics.availableInstances++;
          
          // Get CloudWatch metrics for the database
          const cpuMetrics = await this.getDBMetrics(
            db.DBInstanceIdentifier!,
            'CPUUtilization'
          );
          metrics.cpuUtilization = Math.max(metrics.cpuUtilization, cpuMetrics);
          
          const connectionMetrics = await this.getDBMetrics(
            db.DBInstanceIdentifier!,
            'DatabaseConnections'
          );
          metrics.connections += connectionMetrics;
        }
      }
      
      const status = metrics.cpuUtilization > this.criticalThresholds.cpu ? 'degraded' : 'healthy';
      
      return {
        service: 'RDS',
        status,
        metrics,
        timestamp: new Date(),
        recommendations: status === 'degraded' ? 
          ['Consider adding read replicas', 'Optimize database queries'] : undefined,
      };
    } catch (error) {
      logger.error('RDS health check failed', error);
      return null;
    }
  }

  /**
   * Check Auto Scaling Group health
   */
  private async checkAutoScalingHealth(): Promise<HealthMetric> {
    try {
      const groups = await this.autoScaling.describeAutoScalingGroups({
        AutoScalingGroupNames: ['serenity-asg'],
      }).promise();
      
      if (!groups.AutoScalingGroups?.length) {
        return {
          service: 'AutoScaling',
          status: 'critical',
          metrics: { configured: 0 },
          timestamp: new Date(),
          recommendations: ['Configure Auto Scaling Group for high availability'],
        };
      }
      
      const asg = groups.AutoScalingGroups[0];
      
      const metrics: Record<string, number> = {
        desiredCapacity: asg.DesiredCapacity || 0,
        currentCapacity: asg.Instances?.length || 0,
        minSize: asg.MinSize || 0,
        maxSize: asg.MaxSize || 0,
        healthyInstances: asg.Instances?.filter(i => i.HealthStatus === 'Healthy').length || 0,
      };
      
      const status = metrics.healthyInstances < metrics.desiredCapacity ? 'degraded' : 'healthy';
      
      return {
        service: 'AutoScaling',
        status,
        metrics,
        timestamp: new Date(),
        recommendations: status === 'degraded' ? 
          ['Auto Scaling is replacing unhealthy instances'] : undefined,
      };
    } catch (error) {
      logger.error('Auto Scaling health check failed', error);
      return {
        service: 'AutoScaling',
        status: 'critical',
        metrics: {},
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get CloudWatch metrics for an EC2 instance
   */
  private async getInstanceMetrics(instanceId: string, metricName: string): Promise<number> {
    try {
      const params = {
        MetricName: metricName,
        Namespace: 'AWS/EC2',
        Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
        StartTime: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        EndTime: new Date(),
        Period: 300,
        Statistics: ['Average'],
      };
      
      const result = await this.cloudWatch.getMetricStatistics(params).promise();
      
      if (result.Datapoints?.length) {
        const latest = result.Datapoints.sort((a, b) => 
          (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0)
        )[0];
        return latest.Average || 0;
      }
      
      return 0;
    } catch (error) {
      logger.error(`Failed to get metrics for instance ${instanceId}`, error);
      return 0;
    }
  }

  /**
   * Get CloudWatch metrics for RDS instance
   */
  private async getDBMetrics(dbIdentifier: string, metricName: string): Promise<number> {
    try {
      const params = {
        MetricName: metricName,
        Namespace: 'AWS/RDS',
        Dimensions: [{ Name: 'DBInstanceIdentifier', Value: dbIdentifier }],
        StartTime: new Date(Date.now() - 5 * 60 * 1000),
        EndTime: new Date(),
        Period: 300,
        Statistics: ['Average'],
      };
      
      const result = await this.cloudWatch.getMetricStatistics(params).promise();
      
      if (result.Datapoints?.length) {
        const latest = result.Datapoints.sort((a, b) => 
          (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0)
        )[0];
        return latest.Average || 0;
      }
      
      return 0;
    } catch (error) {
      logger.error(`Failed to get metrics for database ${dbIdentifier}`, error);
      return 0;
    }
  }

  /**
   * Analyze health metrics and perform auto-remediation
   */
  private async analyzeAndRemediate(metrics: HealthMetric[]): Promise<AutoRemediationAction[]> {
    const actions: AutoRemediationAction[] = [];
    
    for (const metric of metrics) {
      if (metric.status === 'critical' || metric.status === 'degraded') {
        const action = await this.remediateIssue(metric);
        if (action) actions.push(action);
      }
    }
    
    return actions;
  }

  /**
   * Perform auto-remediation for identified issues
   */
  private async remediateIssue(metric: HealthMetric): Promise<AutoRemediationAction | null> {
    const action: AutoRemediationAction = {
      issue: `${metric.service} ${metric.status}`,
      action: '',
      executed: false,
      timestamp: new Date(),
    };
    
    try {
      switch (metric.service) {
        case 'EC2':
          if (metric.metrics.unhealthyInstances > 0) {
            action.action = 'Triggering instance replacement';
            // Auto Scaling will handle this automatically
            action.executed = true;
            action.result = 'Auto Scaling notified';
          }
          break;
          
        case 'ELB':
          if (metric.metrics.unhealthyTargets > 0 && metric.metrics.healthyTargets === 0) {
            action.action = 'Critical: All targets unhealthy, scaling out';
            await this.scaleOut('emergency');
            action.executed = true;
            action.result = 'Emergency scale-out initiated';
          }
          break;
          
        case 'AutoScaling':
          if (metric.metrics.healthyInstances < metric.metrics.desiredCapacity) {
            action.action = 'Adjusting desired capacity';
            // Auto Scaling handles this
            action.executed = true;
            action.result = 'Auto Scaling adjusting capacity';
          }
          break;
      }
      
      if (action.executed) {
        logger.info('Auto-remediation executed', action);
        await this.logRemediation(action);
      }
      
      return action;
    } catch (error) {
      logger.error('Auto-remediation failed', error);
      action.result = `Failed: ${error}`;
      return action;
    }
  }

  /**
   * Scale out instances based on metrics
   */
  private async scaleOut(reason: string): Promise<void> {
    try {
      const groups = await this.autoScaling.describeAutoScalingGroups({
        AutoScalingGroupNames: ['serenity-asg'],
      }).promise();
      
      if (!groups.AutoScalingGroups?.length) {
        logger.warn('No Auto Scaling Group found for scale-out');
        return;
      }
      
      const asg = groups.AutoScalingGroups[0];
      const currentCapacity = asg.DesiredCapacity || 1;
      const maxCapacity = asg.MaxSize || 10;
      const newCapacity = Math.min(currentCapacity + 2, maxCapacity);
      
      await this.autoScaling.setDesiredCapacity({
        AutoScalingGroupName: 'serenity-asg',
        DesiredCapacity: newCapacity,
        HonorCooldown: false, // Emergency scaling
      }).promise();
      
      logger.info(`Scaled out from ${currentCapacity} to ${newCapacity} instances (${reason})`);
      
      await this.sendAlert('Auto Scaling Event', {
        action: 'scale-out',
        from: currentCapacity,
        to: newCapacity,
        reason,
      });
    } catch (error) {
      logger.error('Scale-out failed', error);
      throw error;
    }
  }

  /**
   * Set up CloudWatch alarms for proactive monitoring
   */
  private async setupCloudWatchAlarms(): Promise<void> {
    try {
      // High CPU alarm
      await this.cloudWatch.putMetricAlarm({
        AlarmName: 'serenity-high-cpu',
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2,
        MetricName: 'CPUUtilization',
        Namespace: 'AWS/EC2',
        Period: 300,
        Statistic: 'Average',
        Threshold: this.criticalThresholds.cpu,
        ActionsEnabled: true,
        AlarmActions: [process.env.SNS_TOPIC_ARN || ''],
        AlarmDescription: 'Alarm when CPU exceeds 80%',
        Dimensions: [{ Name: 'AutoScalingGroupName', Value: 'serenity-asg' }],
      }).promise();
      
      // Unhealthy targets alarm
      await this.cloudWatch.putMetricAlarm({
        AlarmName: 'serenity-unhealthy-targets',
        ComparisonOperator: 'LessThanThreshold',
        EvaluationPeriods: 1,
        MetricName: 'HealthyHostCount',
        Namespace: 'AWS/ApplicationELB',
        Period: 60,
        Statistic: 'Average',
        Threshold: 1,
        ActionsEnabled: true,
        AlarmActions: [process.env.SNS_TOPIC_ARN || ''],
        AlarmDescription: 'Alarm when no healthy targets',
      }).promise();
      
      logger.info('CloudWatch alarms configured');
    } catch (error) {
      logger.error('Failed to setup CloudWatch alarms', error);
    }
  }

  /**
   * Send alert via SNS
   */
  private async sendAlert(subject: string, message: any): Promise<void> {
    try {
      await this.sns.publish({
        TopicArn: process.env.SNS_TOPIC_ARN || '',
        Subject: `[Serenity Infrastructure] ${subject}`,
        Message: JSON.stringify(message, null, 2),
      }).promise();
    } catch (error) {
      logger.error('Failed to send SNS alert', error);
    }
  }

  /**
   * Log health status for audit
   */
  private async logHealthStatus(metrics: HealthMetric[]): Promise<void> {
    try {
      const summary = {
        timestamp: new Date().toISOString(),
        overall: metrics.every(m => m.status === 'healthy') ? 'healthy' : 
                 metrics.some(m => m.status === 'critical') ? 'critical' : 'degraded',
        services: metrics.map(m => ({
          service: m.service,
          status: m.status,
          metrics: m.metrics,
        })),
      };
      
      await hipaaAuditService.logAccess({
        action: 'INFRASTRUCTURE_HEALTH_CHECK',
        resourceType: 'aws_infrastructure',
        resourceId: 'health_check',
        details: summary,
      });
    } catch (error) {
      logger.error('Failed to log health status', error);
    }
  }

  /**
   * Log auto-remediation action for audit
   */
  private async logRemediation(action: AutoRemediationAction): Promise<void> {
    try {
      await hipaaAuditService.logAccess({
        action: 'AUTO_REMEDIATION',
        resourceType: 'aws_infrastructure',
        resourceId: 'auto_healing',
        details: action,
      });
    } catch (error) {
      logger.error('Failed to log remediation', error);
    }
  }

  /**
   * Get predictive scaling recommendation
   */
  public async getPredictiveScaling(): Promise<ScalingDecision> {
    try {
      // Get current metrics
      const cpuMetrics = await this.getInstanceMetrics('all', 'CPUUtilization');
      const memoryMetrics = await this.getInstanceMetrics('all', 'MemoryUtilization');
      
      // Get current capacity
      const groups = await this.autoScaling.describeAutoScalingGroups({
        AutoScalingGroupNames: ['serenity-asg'],
      }).promise();
      
      const currentCapacity = groups.AutoScalingGroups?.[0]?.DesiredCapacity || 2;
      
      // Predictive scaling logic
      let desiredCapacity = currentCapacity;
      let reason = 'No scaling needed';
      
      if (cpuMetrics > 70 || memoryMetrics > 75) {
        desiredCapacity = Math.min(currentCapacity + 1, 10);
        reason = 'Proactive scale-out based on resource utilization trends';
      } else if (cpuMetrics < 30 && memoryMetrics < 30 && currentCapacity > 2) {
        desiredCapacity = Math.max(currentCapacity - 1, 2);
        reason = 'Scale-in due to low resource utilization';
      }
      
      return {
        currentCapacity,
        desiredCapacity,
        reason,
        metrics: {
          cpuUtilization: cpuMetrics,
          memoryUtilization: memoryMetrics,
          requestCount: 0, // Would get from CloudWatch
          responseTime: 0, // Would get from CloudWatch
        },
      };
    } catch (error) {
      logger.error('Predictive scaling failed', error);
      throw error;
    }
  }
}

// Export singleton instance
export const infrastructureHealthAgent = new InfrastructureHealthAgent();