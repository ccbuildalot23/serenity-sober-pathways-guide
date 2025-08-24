/**
 * Cost Intelligence Agent
 * 
 * BMAD Framework Implementation:
 * - Business: Optimize healthcare delivery costs while maintaining quality
 * - Mental Model: Predictive cost analysis with proactive optimization
 * - Architecture: Serverless cost analytics with automated recommendations
 * - Delivery: Real-time cost insights and automated savings implementation
 */

import { CostExplorerClient, GetCostAndUsageCommand, GetReservationUtilizationCommand, GetSavingsPlansPurchaseRecommendationCommand, GetRightsizingRecommendationCommand } from '@aws-sdk/client-cost-explorer';
import { EC2Client, DescribeInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { S3Client, ListBucketsCommand, GetBucketLifecycleConfigurationCommand, PutBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import logger from '../../services/loggerService';

interface CostAnalysis {
  period: {
    start: Date;
    end: Date;
  };
  totalCost: number;
  costByService: ServiceCost[];
  costTrend: TrendAnalysis;
  anomalies: CostAnomaly[];
  forecast: CostForecast;
}

interface ServiceCost {
  service: string;
  cost: number;
  percentageOfTotal: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  utilizationRate?: number;
}

interface TrendAnalysis {
  dailyAverage: number;
  weeklyChange: number;
  monthlyChange: number;
  projectedMonthlyRun: number;
}

interface CostAnomaly {
  id: string;
  service: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detectedAt: Date;
  description: string;
  impact: number; // Dollar amount
  rootCause?: string;
}

interface CostForecast {
  nextDay: number;
  nextWeek: number;
  nextMonth: number;
  confidence: number; // 0-100
  assumptions: string[];
}

interface OptimizationOpportunity {
  id: string;
  type: 'reserved_instance' | 'savings_plan' | 'rightsizing' | 'unused_resources' | 'lifecycle_policy' | 'spot_instance';
  service: string;
  resourceId?: string;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
  actionRequired: string[];
  automationAvailable: boolean;
}

interface CostGovernance {
  budgets: Budget[];
  policies: CostPolicy[];
  alerts: CostAlert[];
  compliance: ComplianceStatus;
}

interface Budget {
  id: string;
  name: string;
  limit: number;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  spent: number;
  remaining: number;
  percentageUsed: number;
  forecast: number;
  alertThresholds: number[];
}

interface CostPolicy {
  id: string;
  name: string;
  type: 'tagging' | 'instance_type' | 'region' | 'service_limit';
  rules: PolicyRule[];
  violations: PolicyViolation[];
  enforced: boolean;
}

interface PolicyRule {
  condition: string;
  action: 'alert' | 'prevent' | 'remediate';
  parameters: Record<string, any>;
}

interface PolicyViolation {
  resourceId: string;
  rule: string;
  detectedAt: Date;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  remediation?: string;
}

interface CostAlert {
  id: string;
  type: 'budget_exceeded' | 'anomaly_detected' | 'forecast_warning' | 'optimization_available';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface ComplianceStatus {
  taggingCompliance: number; // Percentage
  budgetAdherence: number; // Percentage
  policyCompliance: number; // Percentage
  overallScore: number; // 0-100
}

interface AutomatedAction {
  id: string;
  type: 'stop_instance' | 'resize_instance' | 'delete_resource' | 'apply_lifecycle' | 'purchase_ri';
  targetResource: string;
  scheduledAt?: Date;
  executedAt?: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  result?: string;
  savingsRealized?: number;
}

export class CostIntelligenceAgent {
  private costExplorerClient: CostExplorerClient;
  private ec2Client: EC2Client;
  private rdsClient: RDSClient;
  private s3Client: S3Client;
  private cloudWatchClient: CloudWatchClient;
  private snsClient: SNSClient;
  private dynamoClient: DynamoDBClient;

  private costThresholds = {
    dailyLimit: 500,
    weeklyLimit: 3000,
    monthlyLimit: 10000,
    anomalyThreshold: 1.5, // 50% above average
    utilizationTarget: 0.75 // 75% utilization target
  };

  constructor(region: string = 'us-east-1') {
    this.costExplorerClient = new CostExplorerClient({ region });
    this.ec2Client = new EC2Client({ region });
    this.rdsClient = new RDSClient({ region });
    this.s3Client = new S3Client({ region });
    this.cloudWatchClient = new CloudWatchClient({ region });
    this.snsClient = new SNSClient({ region });
    this.dynamoClient = new DynamoDBClient({ region });
  }

  /**
   * Main cost analysis and optimization loop
   */
  public async analyzeCostsAndOptimize(): Promise<{
    analysis: CostAnalysis;
    opportunities: OptimizationOpportunity[];
    governance: CostGovernance;
    automatedActions: AutomatedAction[];
  }> {
    logger.info('Starting cost intelligence analysis', {
      component: 'CostIntelligenceAgent',
      action: 'cost_analysis_start'
    });

    // Analyze current costs
    const analysis = await this.performCostAnalysis();

    // Identify optimization opportunities
    const opportunities = await this.identifyOptimizations();

    // Check governance and compliance
    const governance = await this.checkGovernance();

    // Execute automated optimizations
    const automatedActions = await this.executeAutomatedOptimizations(opportunities);

    // Send cost alerts if needed
    await this.sendCostAlerts(analysis, opportunities, governance);

    // Update metrics
    await this.updateCostMetrics(analysis, opportunities);

    return {
      analysis,
      opportunities,
      governance,
      automatedActions
    };
  }

  /**
   * Perform comprehensive cost analysis
   */
  private async performCostAnalysis(): Promise<CostAnalysis> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    try {
      // Get cost and usage data
      const costData = await this.costExplorerClient.send(new GetCostAndUsageCommand({
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0]
        },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost', 'UsageQuantity'],
        GroupBy: [{
          Type: 'DIMENSION',
          Key: 'SERVICE'
        }]
      }));

      // Process cost data
      const totalCost = this.calculateTotalCost(costData);
      const costByService = this.analyzeCostByService(costData);
      const costTrend = this.analyzeTrend(costData);
      const anomalies = this.detectAnomalies(costData);
      const forecast = this.generateForecast(costData);

      return {
        period: { start: startDate, end: endDate },
        totalCost,
        costByService,
        costTrend,
        anomalies,
        forecast
      };
    } catch (error) {
      console.error('Error analyzing costs:', error);
      throw error;
    }
  }

  /**
   * Identify cost optimization opportunities
   */
  private async identifyOptimizations(): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    // Check for Reserved Instance opportunities
    try {
      const riRecommendations = await this.getReservedInstanceRecommendations();
      opportunities.push(...riRecommendations);
    } catch (error) {
      console.error('Error getting RI recommendations:', error);
    }

    // Check for Savings Plans opportunities
    try {
      const spRecommendations = await this.getSavingsPlansRecommendations();
      opportunities.push(...spRecommendations);
    } catch (error) {
      console.error('Error getting Savings Plans recommendations:', error);
    }

    // Check for rightsizing opportunities
    try {
      const rightsizingRecommendations = await this.getRightsizingRecommendations();
      opportunities.push(...rightsizingRecommendations);
    } catch (error) {
      console.error('Error getting rightsizing recommendations:', error);
    }

    // Check for unused resources
    const unusedResources = await this.identifyUnusedResources();
    opportunities.push(...unusedResources);

    // Check for S3 lifecycle opportunities
    const s3Opportunities = await this.identifyS3Optimizations();
    opportunities.push(...s3Opportunities);

    // Sort by savings potential
    return opportunities.sort((a, b) => 
      b.estimatedAnnualSavings - a.estimatedAnnualSavings
    );
  }

  /**
   * Get Reserved Instance recommendations
   */
  private async getReservedInstanceRecommendations(): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    try {
      const utilization = await this.costExplorerClient.send(
        new GetReservationUtilizationCommand({
          TimePeriod: {
            Start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            End: new Date().toISOString().split('T')[0]
          }
        })
      );

      // Check if we should purchase more RIs based on utilization
      if (utilization.Total?.UtilizationPercentage) {
        const utilizationRate = parseFloat(utilization.Total.UtilizationPercentage);
        
        if (utilizationRate > 90) {
          opportunities.push({
            id: `ri-opp-${Date.now()}`,
            type: 'reserved_instance',
            service: 'EC2',
            estimatedMonthlySavings: 500, // Placeholder calculation
            estimatedAnnualSavings: 6000,
            implementationEffort: 'LOW',
            risk: 'LOW',
            recommendation: 'High RI utilization detected. Consider purchasing additional Reserved Instances.',
            actionRequired: [
              'Review On-Demand usage patterns',
              'Calculate break-even point',
              'Purchase 1-year or 3-year RIs'
            ],
            automationAvailable: false
          });
        }
      }
    } catch (error) {
      console.error('Error getting RI utilization:', error);
    }

    return opportunities;
  }

  /**
   * Get Savings Plans recommendations
   */
  private async getSavingsPlansRecommendations(): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    try {
      const recommendations = await this.costExplorerClient.send(
        new GetSavingsPlansPurchaseRecommendationCommand({
          SavingsPlansType: 'COMPUTE_SP',
          TermInYears: 'ONE_YEAR',
          PaymentOption: 'ALL_UPFRONT',
          LookbackPeriodInDays: 'THIRTY_DAYS'
        })
      );

      if (recommendations.SavingsPlansPurchaseRecommendation) {
        const rec = recommendations.SavingsPlansPurchaseRecommendation;
        
        opportunities.push({
          id: `sp-opp-${Date.now()}`,
          type: 'savings_plan',
          service: 'Compute',
          estimatedMonthlySavings: parseFloat(rec.EstimatedMonthlySavingsAmount || '0'),
          estimatedAnnualSavings: parseFloat(rec.EstimatedMonthlySavingsAmount || '0') * 12,
          implementationEffort: 'LOW',
          risk: 'LOW',
          recommendation: `Purchase Compute Savings Plan for ${rec.EstimatedSavingsPercentage}% savings`,
          actionRequired: [
            'Review compute usage patterns',
            'Purchase Savings Plan',
            'Monitor utilization'
          ],
          automationAvailable: false
        });
      }
    } catch (error) {
      console.error('Error getting Savings Plans recommendations:', error);
    }

    return opportunities;
  }

  /**
   * Get rightsizing recommendations
   */
  private async getRightsizingRecommendations(): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    try {
      const recommendations = await this.costExplorerClient.send(
        new GetRightsizingRecommendationCommand({
          Service: 'EC2'
        })
      );

      for (const rec of recommendations.RightsizingRecommendations || []) {
        if (rec.ModifyRecommendationDetail) {
          const savings = parseFloat(rec.EstimatedMonthlySavings || '0');
          
          opportunities.push({
            id: `rightsizing-${rec.ResourceId}`,
            type: 'rightsizing',
            service: 'EC2',
            resourceId: rec.ResourceId,
            estimatedMonthlySavings: savings,
            estimatedAnnualSavings: savings * 12,
            implementationEffort: 'MEDIUM',
            risk: 'MEDIUM',
            recommendation: `Rightsize ${rec.ResourceId} from ${rec.CurrentInstance} to ${rec.ModifyRecommendationDetail.TargetInstances?.[0]?.InstanceType}`,
            actionRequired: [
              'Review application requirements',
              'Schedule maintenance window',
              'Resize instance',
              'Monitor performance'
            ],
            automationAvailable: true
          });
        }
      }
    } catch (error) {
      console.error('Error getting rightsizing recommendations:', error);
    }

    return opportunities;
  }

  /**
   * Identify unused resources
   */
  private async identifyUnusedResources(): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    // Check for unused EC2 instances
    try {
      const instances = await this.ec2Client.send(new DescribeInstancesCommand({}));
      
      for (const reservation of instances.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          // Check if instance has low CPU utilization
          // This would need CloudWatch metrics integration
          if (instance.State?.Name === 'stopped' && instance.LaunchTime) {
            const stoppedDays = Math.floor(
              (Date.now() - new Date(instance.LaunchTime).getTime()) / (1000 * 60 * 60 * 24)
            );
            
            if (stoppedDays > 7) {
              opportunities.push({
                id: `unused-ec2-${instance.InstanceId}`,
                type: 'unused_resources',
                service: 'EC2',
                resourceId: instance.InstanceId,
                estimatedMonthlySavings: 50, // Placeholder based on instance type
                estimatedAnnualSavings: 600,
                implementationEffort: 'LOW',
                risk: 'LOW',
                recommendation: `Terminate stopped instance ${instance.InstanceId} (stopped for ${stoppedDays} days)`,
                actionRequired: [
                  'Verify instance is not needed',
                  'Create AMI backup if needed',
                  'Terminate instance'
                ],
                automationAvailable: true
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking EC2 instances:', error);
    }

    // Check for unused RDS instances
    try {
      const dbInstances = await this.rdsClient.send(new DescribeDBInstancesCommand({}));
      
      for (const db of dbInstances.DBInstances || []) {
        // Check if database has no connections (would need CloudWatch metrics)
        if (db.DBInstanceStatus === 'stopped') {
          opportunities.push({
            id: `unused-rds-${db.DBInstanceIdentifier}`,
            type: 'unused_resources',
            service: 'RDS',
            resourceId: db.DBInstanceIdentifier,
            estimatedMonthlySavings: 100, // Placeholder
            estimatedAnnualSavings: 1200,
            implementationEffort: 'LOW',
            risk: 'MEDIUM',
            recommendation: `Delete stopped RDS instance ${db.DBInstanceIdentifier}`,
            actionRequired: [
              'Create final snapshot',
              'Verify data is backed up',
              'Delete instance'
            ],
            automationAvailable: false
          });
        }
      }
    } catch (error) {
      console.error('Error checking RDS instances:', error);
    }

    return opportunities;
  }

  /**
   * Identify S3 optimization opportunities
   */
  private async identifyS3Optimizations(): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    try {
      const buckets = await this.s3Client.send(new ListBucketsCommand({}));
      
      for (const bucket of buckets.Buckets || []) {
        try {
          // Check for lifecycle policies
          const lifecycle = await this.s3Client.send(
            new GetBucketLifecycleConfigurationCommand({ Bucket: bucket.Name })
          );
          
          if (!lifecycle.Rules || lifecycle.Rules.length === 0) {
            opportunities.push({
              id: `s3-lifecycle-${bucket.Name}`,
              type: 'lifecycle_policy',
              service: 'S3',
              resourceId: bucket.Name,
              estimatedMonthlySavings: 20, // Placeholder
              estimatedAnnualSavings: 240,
              implementationEffort: 'LOW',
              risk: 'LOW',
              recommendation: `Add lifecycle policy to ${bucket.Name} to transition old data to cheaper storage`,
              actionRequired: [
                'Analyze access patterns',
                'Define lifecycle rules',
                'Apply Intelligent-Tiering or Glacier transitions'
              ],
              automationAvailable: true
            });
          }
        } catch (error: any) {
          if (error.name !== 'NoSuchLifecycleConfiguration') {
            console.error(`Error checking lifecycle for ${bucket.Name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error checking S3 buckets:', error);
    }

    return opportunities;
  }

  /**
   * Execute automated optimizations
   */
  private async executeAutomatedOptimizations(
    opportunities: OptimizationOpportunity[]
  ): Promise<AutomatedAction[]> {
    const actions: AutomatedAction[] = [];
    const autoOpportunities = opportunities.filter(o => o.automationAvailable);

    for (const opportunity of autoOpportunities) {
      // Only auto-execute low risk, high savings opportunities
      if (opportunity.risk === 'LOW' && opportunity.estimatedAnnualSavings > 1000) {
        const action = await this.executeOptimization(opportunity);
        if (action) {
          actions.push(action);
        }
      }
    }

    return actions;
  }

  /**
   * Execute a single optimization
   */
  private async executeOptimization(
    opportunity: OptimizationOpportunity
  ): Promise<AutomatedAction | null> {
    const action: AutomatedAction = {
      id: `action-${Date.now()}`,
      type: 'stop_instance', // Default, will be updated
      targetResource: opportunity.resourceId || '',
      status: 'pending',
      scheduledAt: new Date()
    };

    try {
      switch (opportunity.type) {
        case 'unused_resources':
          if (opportunity.service === 'EC2' && opportunity.resourceId) {
            // Stop unused EC2 instance
            await this.ec2Client.send(new StopInstancesCommand({
              InstanceIds: [opportunity.resourceId]
            }));
            
            action.type = 'stop_instance';
            action.status = 'completed';
            action.executedAt = new Date();
            action.result = 'Instance stopped successfully';
            action.savingsRealized = opportunity.estimatedMonthlySavings;
          }
          break;

        case 'rightsizing':
          // Schedule rightsizing for maintenance window
          action.type = 'resize_instance';
          action.status = 'pending';
          action.scheduledAt = this.getNextMaintenanceWindow();
          break;

        case 'lifecycle_policy':
          if (opportunity.service === 'S3' && opportunity.resourceId) {
            // Apply basic lifecycle policy
            await this.applyS3LifecyclePolicy(opportunity.resourceId);
            
            action.type = 'apply_lifecycle';
            action.status = 'completed';
            action.executedAt = new Date();
            action.result = 'Lifecycle policy applied';
            action.savingsRealized = opportunity.estimatedMonthlySavings;
          }
          break;
      }

      // Store action in DynamoDB
      await this.storeAction(action);
      
      return action;
    } catch (error) {
      console.error(`Failed to execute optimization for ${opportunity.id}:`, error);
      action.status = 'failed';
      action.result = `Error: ${error}`;
      return action;
    }
  }

  /**
   * Apply S3 lifecycle policy
   */
  private async applyS3LifecyclePolicy(bucketName: string): Promise<void> {
    const lifecycleConfig = {
      Rules: [
        {
          Id: 'auto-archive',
          Status: 'Enabled',
          Transitions: [
            {
              Days: 30,
              StorageClass: 'STANDARD_IA'
            },
            {
              Days: 90,
              StorageClass: 'GLACIER'
            }
          ],
          NoncurrentVersionTransitions: [
            {
              NoncurrentDays: 7,
              StorageClass: 'GLACIER'
            }
          ],
          NoncurrentVersionExpiration: {
            NoncurrentDays: 365
          }
        }
      ]
    };

    await this.s3Client.send(new PutBucketLifecycleConfigurationCommand({
      Bucket: bucketName,
      LifecycleConfiguration: lifecycleConfig
    }));
  }

  /**
   * Check cost governance and compliance
   */
  private async checkGovernance(): Promise<CostGovernance> {
    const budgets = await this.checkBudgets();
    const policies = await this.checkPolicies();
    const alerts = await this.getRecentAlerts();
    const compliance = this.calculateCompliance(budgets, policies);

    return {
      budgets,
      policies,
      alerts,
      compliance
    };
  }

  /**
   * Helper methods
   */
  private calculateTotalCost(costData: any): number {
    let total = 0;
    for (const result of costData.ResultsByTime || []) {
      for (const group of result.Groups || []) {
        total += parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
      }
    }
    return total;
  }

  private analyzeCostByService(costData: any): ServiceCost[] {
    const serviceCosts: Record<string, number> = {};
    const totalCost = this.calculateTotalCost(costData);

    for (const result of costData.ResultsByTime || []) {
      for (const group of result.Groups || []) {
        const service = group.Keys?.[0] || 'Unknown';
        const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
        serviceCosts[service] = (serviceCosts[service] || 0) + cost;
      }
    }

    return Object.entries(serviceCosts)
      .map(([service, cost]) => ({
        service,
        cost,
        percentageOfTotal: (cost / totalCost) * 100,
        trend: 'stable' as const // Would calculate actual trend
      }))
      .sort((a, b) => b.cost - a.cost);
  }

  private analyzeTrend(costData: any): TrendAnalysis {
    const dailyCosts: number[] = [];
    
    for (const result of costData.ResultsByTime || []) {
      let dailyTotal = 0;
      for (const group of result.Groups || []) {
        dailyTotal += parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
      }
      dailyCosts.push(dailyTotal);
    }

    const dailyAverage = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length;
    const lastWeek = dailyCosts.slice(-7).reduce((a, b) => a + b, 0);
    const previousWeek = dailyCosts.slice(-14, -7).reduce((a, b) => a + b, 0);
    const weeklyChange = ((lastWeek - previousWeek) / previousWeek) * 100;

    return {
      dailyAverage,
      weeklyChange,
      monthlyChange: 0, // Would calculate actual monthly change
      projectedMonthlyRun: dailyAverage * 30
    };
  }

  private detectAnomalies(costData: any): CostAnomaly[] {
    const anomalies: CostAnomaly[] = [];
    const dailyCosts: number[] = [];
    
    for (const result of costData.ResultsByTime || []) {
      let dailyTotal = 0;
      for (const group of result.Groups || []) {
        dailyTotal += parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
      }
      dailyCosts.push(dailyTotal);
    }

    const average = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length;
    const threshold = average * this.costThresholds.anomalyThreshold;

    dailyCosts.forEach((cost, index) => {
      if (cost > threshold) {
        anomalies.push({
          id: `anomaly-${index}`,
          service: 'Multiple',
          severity: cost > threshold * 1.5 ? 'HIGH' : 'MEDIUM',
          detectedAt: new Date(Date.now() - (dailyCosts.length - index) * 24 * 60 * 60 * 1000),
          description: `Daily cost ${cost.toFixed(2)} exceeds threshold ${threshold.toFixed(2)}`,
          impact: cost - average
        });
      }
    });

    return anomalies;
  }

  private generateForecast(costData: any): CostForecast {
    const trend = this.analyzeTrend(costData);
    
    return {
      nextDay: trend.dailyAverage,
      nextWeek: trend.dailyAverage * 7,
      nextMonth: trend.projectedMonthlyRun,
      confidence: 75, // Simplified confidence calculation
      assumptions: [
        'Based on last 30 days average',
        'No seasonal adjustments applied',
        'Assumes consistent usage patterns'
      ]
    };
  }

  private async checkBudgets(): Promise<Budget[]> {
    // This would integrate with AWS Budgets API
    return [
      {
        id: 'monthly-budget',
        name: 'Monthly Infrastructure Budget',
        limit: this.costThresholds.monthlyLimit,
        period: 'MONTHLY',
        spent: 7500,
        remaining: 2500,
        percentageUsed: 75,
        forecast: 9500,
        alertThresholds: [80, 90, 100]
      }
    ];
  }

  private async checkPolicies(): Promise<CostPolicy[]> {
    // Check tagging compliance, instance types, etc.
    return [
      {
        id: 'tagging-policy',
        name: 'Required Tags Policy',
        type: 'tagging',
        rules: [
          {
            condition: 'All resources must have Environment tag',
            action: 'alert',
            parameters: { requiredTag: 'Environment' }
          }
        ],
        violations: [],
        enforced: true
      }
    ];
  }

  private async getRecentAlerts(): Promise<CostAlert[]> {
    // Query recent cost alerts from DynamoDB
    return [];
  }

  private calculateCompliance(budgets: Budget[], policies: CostPolicy[]): ComplianceStatus {
    const budgetAdherence = budgets.reduce((acc, b) => acc + (100 - b.percentageUsed), 0) / budgets.length;
    const policyCompliance = policies.filter(p => p.violations.length === 0).length / policies.length * 100;

    return {
      taggingCompliance: 85, // Would calculate actual tagging compliance
      budgetAdherence,
      policyCompliance,
      overallScore: (85 + budgetAdherence + policyCompliance) / 3
    };
  }

  private getNextMaintenanceWindow(): Date {
    // Next Sunday at 2 AM
    const next = new Date();
    next.setDate(next.getDate() + (7 - next.getDay()));
    next.setHours(2, 0, 0, 0);
    return next;
  }

  private async storeAction(action: AutomatedAction): Promise<void> {
    try {
      await this.dynamoClient.send(new PutItemCommand({
        TableName: 'CostOptimizationActions',
        Item: {
          actionId: { S: action.id },
          type: { S: action.type },
          targetResource: { S: action.targetResource },
          status: { S: action.status },
          scheduledAt: { S: action.scheduledAt?.toISOString() || '' },
          executedAt: { S: action.executedAt?.toISOString() || '' },
          result: { S: action.result || '' },
          savingsRealized: { N: (action.savingsRealized || 0).toString() }
        }
      }));
    } catch (error) {
      console.error('Failed to store action:', error);
    }
  }

  private async sendCostAlerts(
    analysis: CostAnalysis,
    opportunities: OptimizationOpportunity[],
    governance: CostGovernance
  ): Promise<void> {
    const alerts: string[] = [];

    // Check for budget alerts
    for (const budget of governance.budgets) {
      if (budget.percentageUsed > 90) {
        alerts.push(`⚠️ Budget Alert: ${budget.name} is ${budget.percentageUsed}% used`);
      }
    }

    // Check for high-value optimization opportunities
    const highValueOpps = opportunities.filter(o => o.estimatedAnnualSavings > 5000);
    if (highValueOpps.length > 0) {
      alerts.push(`💰 ${highValueOpps.length} high-value optimization opportunities available (potential savings: $${highValueOpps.reduce((sum, o) => sum + o.estimatedAnnualSavings, 0).toFixed(0)}/year)`);
    }

    // Check for anomalies
    const criticalAnomalies = analysis.anomalies.filter(a => a.severity === 'HIGH');
    if (criticalAnomalies.length > 0) {
      alerts.push(`🚨 ${criticalAnomalies.length} cost anomalies detected`);
    }

    // Send alerts via SNS
    if (alerts.length > 0) {
      try {
        await this.snsClient.send(new PublishCommand({
          TopicArn: process.env.COST_ALERTS_SNS_TOPIC_ARN,
          Subject: 'Cost Intelligence Alert',
          Message: alerts.join('\n\n')
        }));
      } catch (error) {
        console.error('Failed to send cost alerts:', error);
      }
    }
  }

  private async updateCostMetrics(
    analysis: CostAnalysis,
    opportunities: OptimizationOpportunity[]
  ): Promise<void> {
    try {
      await this.cloudWatchClient.send(new PutMetricDataCommand({
        Namespace: 'Serenity/CostOptimization',
        MetricData: [
          {
            MetricName: 'TotalCost',
            Value: analysis.totalCost,
            Unit: 'None',
            Timestamp: new Date()
          },
          {
            MetricName: 'PotentialSavings',
            Value: opportunities.reduce((sum, o) => sum + o.estimatedAnnualSavings, 0),
            Unit: 'None',
            Timestamp: new Date()
          },
          {
            MetricName: 'CostAnomalies',
            Value: analysis.anomalies.length,
            Unit: 'Count',
            Timestamp: new Date()
          }
        ]
      }));
    } catch (error) {
      console.error('Failed to update cost metrics:', error);
    }
  }
}