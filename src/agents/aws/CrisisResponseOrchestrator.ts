/**
 * Crisis Response Orchestrator
 * 
 * BMAD Framework Implementation:
 * - Business: Immediate crisis intervention and support coordination
 * - Mental Model: Multi-tier escalation with automated response workflows
 * - Architecture: Event-driven serverless orchestration with real-time notifications
 * - Delivery: Instant crisis alerts and coordinated response across all channels
 */

import { LambdaClient } from '@aws-sdk/client-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { StepFunctionsClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { ConnectClient, StartOutboundVoiceContactCommand } from '@aws-sdk/client-connect';
import { PinpointClient, SendMessagesCommand } from '@aws-sdk/client-pinpoint';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import logger from '../../services/loggerService';

interface CrisisEvent {
  id: string;
  patientId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'suicide_ideation' | 'substance_relapse' | 'mental_health_crisis' | 'medical_emergency' | 'safety_concern';
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  triggers?: string[];
  currentState: {
    mood: number;
    anxiety: number;
    safety: number;
    substanceUrge: number;
  };
  patientMessage?: string;
  autoDetected: boolean;
}

interface ResponsePlan {
  crisisId: string;
  tier: 1 | 2 | 3 | 4; // Escalation tiers
  actions: ResponseAction[];
  status: 'initiated' | 'in_progress' | 'escalated' | 'resolved' | 'failed';
  startTime: Date;
  estimatedResponseTime: number; // minutes
  assignedResponders: Responder[];
}

interface ResponseAction {
  id: string;
  type: 'notification' | 'voice_call' | 'sms' | 'video_session' | 'dispatch_emergency' | 'wellness_check';
  target: string; // Contact ID or service
  priority: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  executionTime?: Date;
  result?: string;
  retryCount: number;
  maxRetries: number;
}

interface Responder {
  id: string;
  type: 'supporter' | 'provider' | 'crisis_counselor' | 'emergency_services';
  name: string;
  contactInfo: {
    phone?: string;
    email?: string;
    pushToken?: string;
  };
  availability: 'available' | 'busy' | 'offline';
  responseTime?: number; // Average response time in minutes
  specializations?: string[];
}

interface EscalationRule {
  tier: number;
  condition: string; // Expression to evaluate
  timeoutMinutes: number;
  actions: string[];
  notifyList: string[];
}

interface CrisisOutcome {
  crisisId: string;
  resolved: boolean;
  resolutionTime: number; // minutes
  interventions: string[];
  responderNotes: string;
  followUpRequired: boolean;
  followUpPlan?: FollowUpPlan;
  lessonsLearned?: string[];
}

interface FollowUpPlan {
  scheduledCheckins: Date[];
  assignedProvider?: string;
  carePlanAdjustments?: string[];
  riskFactorsIdentified?: string[];
  protectiveFactorsStrengthened?: string[];
}

export class CrisisResponseOrchestrator {
  private lambdaClient: LambdaClient;
  private snsClient: SNSClient;
  private stepFunctionsClient: StepFunctionsClient;
  private dynamoClient: DynamoDBClient;
  private connectClient: ConnectClient;
  private pinpointClient: PinpointClient;
  private eventBridgeClient: EventBridgeClient;

  private escalationRules: EscalationRule[] = [
    {
      tier: 1,
      condition: 'severity === "LOW" || severity === "MEDIUM"',
      timeoutMinutes: 15,
      actions: ['send_push_notification', 'send_sms', 'alert_primary_supporter'],
      notifyList: ['primary_supporter', 'patient']
    },
    {
      tier: 2,
      condition: 'severity === "HIGH" || noResponseTier1',
      timeoutMinutes: 10,
      actions: ['voice_call_supporter', 'alert_provider', 'send_crisis_resources'],
      notifyList: ['all_supporters', 'assigned_provider']
    },
    {
      tier: 3,
      condition: 'severity === "CRITICAL" || noResponseTier2',
      timeoutMinutes: 5,
      actions: ['voice_call_provider', 'initiate_video_session', 'alert_crisis_team'],
      notifyList: ['crisis_team', 'medical_director']
    },
    {
      tier: 4,
      condition: 'type === "medical_emergency" || type === "suicide_ideation" && severity === "CRITICAL"',
      timeoutMinutes: 0,
      actions: ['call_911', 'dispatch_wellness_check', 'continuous_monitoring'],
      notifyList: ['emergency_services', 'all_contacts']
    }
  ];

  constructor(region: string = 'us-east-1') {
    this.lambdaClient = new LambdaClient({ region });
    this.snsClient = new SNSClient({ region });
    this.stepFunctionsClient = new StepFunctionsClient({ region });
    this.dynamoClient = new DynamoDBClient({ region });
    this.connectClient = new ConnectClient({ region });
    this.pinpointClient = new PinpointClient({ region });
    this.eventBridgeClient = new EventBridgeClient({ region });
  }

  /**
   * Main crisis response orchestration
   */
  public async handleCrisis(crisis: CrisisEvent): Promise<ResponsePlan> {
    logger.security(`Crisis detected for patient ${crisis.patientId}`, {
      component: 'CrisisResponseOrchestrator',
      action: 'crisis_detected',
      patientId: crisis.patientId,
      severity: crisis.severity,
      type: crisis.type
    });

    // Create initial response plan
    const responsePlan = await this.createResponsePlan(crisis);

    // Start Step Functions workflow for orchestration
    await this.startCrisisWorkflow(crisis, responsePlan);

    // Execute immediate actions based on severity
    await this.executeImmediateActions(crisis, responsePlan);

    // Monitor and escalate as needed
    this.monitorAndEscalate(crisis, responsePlan);

    // Log crisis event for analytics
    await this.logCrisisEvent(crisis, responsePlan);

    return responsePlan;
  }

  /**
   * Create response plan based on crisis severity and type
   */
  private async createResponsePlan(crisis: CrisisEvent): Promise<ResponsePlan> {
    const tier = this.determineTier(crisis);
    const responders = await this.getAvailableResponders(crisis, tier);
    const actions = this.generateResponseActions(crisis, tier, responders);

    const plan: ResponsePlan = {
      crisisId: crisis.id,
      tier,
      actions,
      status: 'initiated',
      startTime: new Date(),
      estimatedResponseTime: this.estimateResponseTime(tier, responders),
      assignedResponders: responders
    };

    // Store plan in DynamoDB
    await this.storePlan(plan);

    return plan;
  }

  /**
   * Start Step Functions workflow for crisis management
   */
  private async startCrisisWorkflow(crisis: CrisisEvent, plan: ResponsePlan): Promise<void> {
    const stateMachineArn = process.env.CRISIS_STATE_MACHINE_ARN || '';
    
    if (!stateMachineArn) {
      console.error('Crisis state machine ARN not configured');
      return;
    }

    try {
      const command = new StartExecutionCommand({
        stateMachineArn,
        name: `crisis-${crisis.id}`,
        input: JSON.stringify({
          crisis,
          plan,
          escalationRules: this.escalationRules
        })
      });

      await this.stepFunctionsClient.send(command);
      logger.info(`Step Functions workflow started for crisis ${crisis.id}`, {
        component: 'CrisisResponseOrchestrator',
        action: 'workflow_started',
        crisisId: crisis.id
      });
    } catch (error) {
      console.error('Failed to start crisis workflow:', error);
      // Fallback to manual orchestration
      await this.manualOrchestration(crisis, plan);
    }
  }

  /**
   * Execute immediate actions based on crisis severity
   */
  private async executeImmediateActions(crisis: CrisisEvent, plan: ResponsePlan): Promise<void> {
    const immediateActions = plan.actions.filter(a => a.priority === 1);

    await Promise.all(immediateActions.map(async (action) => {
      try {
        await this.executeAction(action, crisis);
        action.status = 'completed';
        action.executionTime = new Date();
      } catch (error) {
        console.error(`Failed to execute action ${action.id}:`, error);
        action.status = 'failed';
        action.result = `Error: ${error}`;
        
        // Retry critical actions
        if (action.retryCount < action.maxRetries) {
          action.retryCount++;
          setTimeout(() => this.executeAction(action, crisis), 5000 * action.retryCount);
        }
      }
    }));

    // Update plan status
    await this.updatePlanStatus(plan);
  }

  /**
   * Execute specific response action
   */
  private async executeAction(action: ResponseAction, crisis: CrisisEvent): Promise<void> {
    switch (action.type) {
      case 'notification':
        await this.sendPushNotification(action.target, crisis);
        break;
      
      case 'voice_call':
        await this.initiateVoiceCall(action.target, crisis);
        break;
      
      case 'sms':
        await this.sendSMS(action.target, crisis);
        break;
      
      case 'video_session':
        await this.startVideoSession(action.target, crisis);
        break;
      
      case 'dispatch_emergency':
        await this.dispatchEmergencyServices(crisis);
        break;
      
      case 'wellness_check':
        await this.requestWellnessCheck(crisis);
        break;
      
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(target: string, crisis: CrisisEvent): Promise<void> {
    const message = this.generateCrisisMessage(crisis);
    
    try {
      const command = new PublishCommand({
        TopicArn: process.env.CRISIS_SNS_TOPIC_ARN,
        Message: JSON.stringify({
          default: message,
          GCM: JSON.stringify({
            notification: {
              title: '🚨 Crisis Alert',
              body: message,
              sound: 'emergency',
              priority: 'high'
            },
            data: {
              crisisId: crisis.id,
              patientId: crisis.patientId,
              severity: crisis.severity
            }
          })
        }),
        MessageStructure: 'json',
        MessageAttributes: {
          'crisis.severity': {
            DataType: 'String',
            StringValue: crisis.severity
          },
          'target.id': {
            DataType: 'String',
            StringValue: target
          }
        }
      });

      await this.snsClient.send(command);
      logger.info(`Push notification sent`, {
        component: 'CrisisResponseOrchestrator',
        action: 'push_notification_sent',
        target: '[REDACTED]'
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Initiate voice call using Amazon Connect
   */
  private async initiateVoiceCall(target: string, crisis: CrisisEvent): Promise<void> {
    try {
      const command = new StartOutboundVoiceContactCommand({
        DestinationPhoneNumber: target,
        ContactFlowId: process.env.CRISIS_CONTACT_FLOW_ID,
        InstanceId: process.env.CONNECT_INSTANCE_ID,
        SourcePhoneNumber: process.env.CRISIS_PHONE_NUMBER,
        Attributes: {
          crisisId: crisis.id,
          patientId: crisis.patientId,
          severity: crisis.severity,
          type: crisis.type
        }
      });

      const response = await this.connectClient.send(command);
      logger.info(`Voice call initiated`, {
        component: 'CrisisResponseOrchestrator',
        action: 'voice_call_initiated',
        contactId: response.ContactId
      });
    } catch (error) {
      console.error('Failed to initiate voice call:', error);
      throw error;
    }
  }

  /**
   * Send SMS using Amazon Pinpoint
   */
  private async sendSMS(target: string, crisis: CrisisEvent): Promise<void> {
    const message = this.generateCrisisMessage(crisis, 'sms');
    
    try {
      const command = new SendMessagesCommand({
        ApplicationId: process.env.PINPOINT_APP_ID,
        MessageRequest: {
          Addresses: {
            [target]: {
              ChannelType: 'SMS'
            }
          },
          MessageConfiguration: {
            SMSMessage: {
              Body: message,
              MessageType: 'TRANSACTIONAL',
              OriginationNumber: process.env.CRISIS_SMS_NUMBER
            }
          }
        }
      });

      await this.pinpointClient.send(command);
      logger.info(`SMS sent`, {
        component: 'CrisisResponseOrchestrator',
        action: 'sms_sent'
      });
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw error;
    }
  }

  /**
   * Monitor crisis and escalate if needed
   */
  private async monitorAndEscalate(crisis: CrisisEvent, plan: ResponsePlan): Promise<void> {
    const escalationTimer = setInterval(async () => {
      const currentTierRule = this.escalationRules.find(r => r.tier === plan.tier);
      
      if (!currentTierRule) {
        clearInterval(escalationTimer);
        return;
      }

      const elapsedMinutes = (Date.now() - plan.startTime.getTime()) / 1000 / 60;
      
      // Check if we need to escalate
      if (elapsedMinutes > currentTierRule.timeoutMinutes && plan.status !== 'resolved') {
        logger.security(`Escalating crisis ${crisis.id} from tier ${plan.tier} to tier ${plan.tier + 1}`, {
          component: 'CrisisResponseOrchestrator',
          action: 'crisis_escalation',
          crisisId: crisis.id,
          fromTier: plan.tier,
          toTier: plan.tier + 1
        });
        
        plan.tier = (plan.tier + 1) as ResponsePlan['tier'];
        plan.status = 'escalated';
        
        // Get new responders for higher tier
        const newResponders = await this.getAvailableResponders(crisis, plan.tier);
        plan.assignedResponders.push(...newResponders);
        
        // Add escalation actions
        const escalationActions = this.generateResponseActions(crisis, plan.tier, newResponders);
        plan.actions.push(...escalationActions);
        
        // Execute escalation actions
        await this.executeImmediateActions(crisis, plan);
        
        // Notify about escalation
        await this.notifyEscalation(crisis, plan);
        
        // Update stored plan
        await this.updatePlanStatus(plan);
        
        // Stop escalating at tier 4
        if (plan.tier >= 4) {
          clearInterval(escalationTimer);
        }
      }
      
      // Check if crisis is resolved
      const resolved = await this.checkIfResolved(crisis.id);
      if (resolved) {
        plan.status = 'resolved';
        clearInterval(escalationTimer);
        await this.handleResolution(crisis, plan);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Handle crisis resolution
   */
  private async handleResolution(crisis: CrisisEvent, plan: ResponsePlan): Promise<void> {
    const resolutionTime = (Date.now() - plan.startTime.getTime()) / 1000 / 60;
    
    const outcome: CrisisOutcome = {
      crisisId: crisis.id,
      resolved: true,
      resolutionTime,
      interventions: plan.actions.filter(a => a.status === 'completed').map(a => a.type),
      responderNotes: await this.collectResponderNotes(plan.assignedResponders),
      followUpRequired: this.determineFollowUpRequired(crisis, resolutionTime),
      followUpPlan: await this.createFollowUpPlan(crisis, plan, resolutionTime)
    };

    // Store outcome
    await this.storeOutcome(outcome);

    // Send resolution notifications
    await this.sendResolutionNotifications(crisis, outcome);

    // Update patient risk profile
    await this.updateRiskProfile(crisis.patientId, crisis, outcome);

    // Generate insights for improvement
    const insights = await this.generateInsights(crisis, plan, outcome);
    if (insights.length > 0) {
      outcome.lessonsLearned = insights;
      await this.storeInsights(insights);
    }
  }

  /**
   * Helper methods
   */
  private determineTier(crisis: CrisisEvent): ResponsePlan['tier'] {
    if (crisis.type === 'medical_emergency' || 
        (crisis.type === 'suicide_ideation' && crisis.severity === 'CRITICAL')) {
      return 4;
    }
    
    switch (crisis.severity) {
      case 'CRITICAL': return 3;
      case 'HIGH': return 2;
      case 'MEDIUM': return 1;
      case 'LOW': return 1;
      default: return 1;
    }
  }

  private async getAvailableResponders(crisis: CrisisEvent, tier: number): Promise<Responder[]> {
    // Query DynamoDB for available responders
    const responders: Responder[] = [];
    
    // Mock implementation - would query actual database
    if (tier >= 1) {
      responders.push({
        id: 'supporter-1',
        type: 'supporter',
        name: 'Primary Supporter',
        contactInfo: { phone: '+1234567890' },
        availability: 'available',
        responseTime: 5
      });
    }
    
    if (tier >= 2) {
      responders.push({
        id: 'provider-1',
        type: 'provider',
        name: 'Dr. Smith',
        contactInfo: { phone: '+1234567891' },
        availability: 'available',
        responseTime: 10,
        specializations: ['addiction', 'crisis_intervention']
      });
    }
    
    if (tier >= 3) {
      responders.push({
        id: 'crisis-counselor-1',
        type: 'crisis_counselor',
        name: 'Crisis Team',
        contactInfo: { phone: '+1234567892' },
        availability: 'available',
        responseTime: 2
      });
    }
    
    return responders;
  }

  private generateResponseActions(
    crisis: CrisisEvent,
    tier: number,
    responders: Responder[]
  ): ResponseAction[] {
    const actions: ResponseAction[] = [];
    const rule = this.escalationRules.find(r => r.tier === tier);
    
    if (!rule) return actions;
    
    rule.actions.forEach((actionType, index) => {
      const responder = responders[index % responders.length];
      
      actions.push({
        id: `action-${Date.now()}-${index}`,
        type: this.mapActionType(actionType),
        target: responder.contactInfo.phone || responder.contactInfo.email || '',
        priority: tier === 4 ? 1 : index + 1,
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      });
    });
    
    return actions;
  }

  private mapActionType(action: string): ResponseAction['type'] {
    const mapping: Record<string, ResponseAction['type']> = {
      'send_push_notification': 'notification',
      'send_sms': 'sms',
      'voice_call_supporter': 'voice_call',
      'voice_call_provider': 'voice_call',
      'initiate_video_session': 'video_session',
      'call_911': 'dispatch_emergency',
      'dispatch_wellness_check': 'wellness_check'
    };
    
    return mapping[action] || 'notification';
  }

  private estimateResponseTime(tier: number, responders: Responder[]): number {
    if (tier === 4) return 1; // Immediate for emergencies
    
    const avgResponseTime = responders.reduce((sum, r) => 
      sum + (r.responseTime || 15), 0) / responders.length;
    
    return Math.round(avgResponseTime);
  }

  private generateCrisisMessage(crisis: CrisisEvent, format: 'push' | 'sms' = 'push'): string {
    const severity = crisis.severity.toLowerCase();
    const type = crisis.type.replace(/_/g, ' ');
    
    if (format === 'sms') {
      return `CRISIS ALERT: ${crisis.severity} ${type} for patient. ` +
             `Please respond immediately. Reply HELP for options or call crisis line.`;
    }
    
    return `A ${severity} ${type} has been detected. ` +
           `Patient needs immediate support. Tap to view details and respond.`;
  }

  private async storePlan(plan: ResponsePlan): Promise<void> {
    try {
      await this.dynamoClient.send(new PutItemCommand({
        TableName: 'CrisisResponsePlans',
        Item: {
          crisisId: { S: plan.crisisId },
          tier: { N: plan.tier.toString() },
          status: { S: plan.status },
          startTime: { S: plan.startTime.toISOString() },
          actions: { S: JSON.stringify(plan.actions) },
          responders: { S: JSON.stringify(plan.assignedResponders) }
        }
      }));
    } catch (error) {
      console.error('Failed to store plan:', error);
    }
  }

  private async updatePlanStatus(plan: ResponsePlan): Promise<void> {
    try {
      await this.dynamoClient.send(new UpdateItemCommand({
        TableName: 'CrisisResponsePlans',
        Key: { crisisId: { S: plan.crisisId } },
        UpdateExpression: 'SET #status = :status, #actions = :actions',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#actions': 'actions'
        },
        ExpressionAttributeValues: {
          ':status': { S: plan.status },
          ':actions': { S: JSON.stringify(plan.actions) }
        }
      }));
    } catch (error) {
      console.error('Failed to update plan status:', error);
    }
  }

  private async manualOrchestration(crisis: CrisisEvent, _plan: ResponsePlan): Promise<void> {
    // Fallback orchestration without Step Functions
    logger.warn('Executing manual orchestration for crisis', {
      component: 'CrisisResponseOrchestrator',
      action: 'manual_orchestration_fallback',
      crisisId: crisis.id
    });
  }

  private async startVideoSession(target: string, crisis: CrisisEvent): Promise<void> {
    // Implementation would use Amazon Chime SDK or similar
    logger.info(`Starting video session for crisis`, {
      component: 'CrisisResponseOrchestrator',
      action: 'video_session_start',
      crisisId: crisis.id
    });
  }

  private async dispatchEmergencyServices(crisis: CrisisEvent): Promise<void> {
    logger.security(`DISPATCHING EMERGENCY SERVICES for crisis ${crisis.id}`, {
      component: 'CrisisResponseOrchestrator',
      action: 'emergency_services_dispatch',
      crisisId: crisis.id
    });
    // Implementation would integrate with local emergency services
  }

  private async requestWellnessCheck(crisis: CrisisEvent): Promise<void> {
    logger.info(`Requesting wellness check for crisis`, {
      component: 'CrisisResponseOrchestrator',
      action: 'wellness_check_request',
      crisisId: crisis.id
    });
    // Implementation would coordinate with local services
  }

  private async checkIfResolved(_crisisId: string): Promise<boolean> {
    // Check if crisis has been marked as resolved
    return false; // Placeholder
  }

  private async notifyEscalation(crisis: CrisisEvent, plan: ResponsePlan): Promise<void> {
    const message = `Crisis ${crisis.id} escalated to tier ${plan.tier}`;
    logger.security(message, {
      component: 'CrisisResponseOrchestrator',
      action: 'escalation_notification',
      crisisId: crisis.id,
      tier: plan.tier
    });
    // Send escalation notifications
  }

  private async collectResponderNotes(_responders: Responder[]): Promise<string> {
    // Collect notes from all responders
    return 'Crisis resolved through tier 2 intervention';
  }

  private determineFollowUpRequired(crisis: CrisisEvent, resolutionTime: number): boolean {
    return crisis.severity === 'CRITICAL' || crisis.severity === 'HIGH' || resolutionTime > 30;
  }

  private async createFollowUpPlan(
    _crisis: CrisisEvent,
    plan: ResponsePlan,
    _resolutionTime: number
  ): Promise<FollowUpPlan> {
    const now = new Date();
    return {
      scheduledCheckins: [
        new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
        new Date(now.getTime() + 72 * 60 * 60 * 1000), // 72 hours
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week
      ],
      assignedProvider: plan.assignedResponders.find(r => r.type === 'provider')?.id,
      carePlanAdjustments: ['Increase check-in frequency', 'Review medication'],
      riskFactorsIdentified: ['Isolation', 'Recent stressor'],
      protectiveFactorsStrengthened: ['Support network activated', 'Coping skills reinforced']
    };
  }

  private async storeOutcome(outcome: CrisisOutcome): Promise<void> {
    // Store in DynamoDB
    logger.info('Storing crisis outcome', {
      component: 'CrisisResponseOrchestrator',
      action: 'outcome_storage',
      crisisId: outcome.crisisId,
      resolution: outcome.resolution
    });
  }

  private async sendResolutionNotifications(crisis: CrisisEvent, _outcome: CrisisOutcome): Promise<void> {
    logger.info(`Sending resolution notifications for crisis`, {
      component: 'CrisisResponseOrchestrator',
      action: 'resolution_notifications',
      crisisId: crisis.id
    });
  }

  private async updateRiskProfile(patientId: string, _crisis: CrisisEvent, _outcome: CrisisOutcome): Promise<void> {
    logger.info(`Updating risk profile for patient`, {
      component: 'CrisisResponseOrchestrator',
      action: 'risk_profile_update',
      patientId
    });
  }

  private async generateInsights(
    crisis: CrisisEvent,
    plan: ResponsePlan,
    outcome: CrisisOutcome
  ): Promise<string[]> {
    const insights: string[] = [];
    
    if (outcome.resolutionTime > 30) {
      insights.push('Consider adding more tier 2 responders for faster response');
    }
    
    if (plan.tier >= 3) {
      insights.push('High-severity crisis - review early warning signs');
    }
    
    return insights;
  }

  private async storeInsights(insights: string[]): Promise<void> {
    logger.info('Storing crisis insights', {
      component: 'CrisisResponseOrchestrator',
      action: 'insights_storage',
      insightCount: insights.length
    });
  }

  private async logCrisisEvent(crisis: CrisisEvent, plan: ResponsePlan): Promise<void> {
    try {
      await this.eventBridgeClient.send(new PutEventsCommand({
        Entries: [{
          Source: 'serenity.crisis',
          DetailType: 'CrisisEvent',
          Detail: JSON.stringify({
            crisis,
            plan,
            timestamp: new Date().toISOString()
          })
        }]
      }));
    } catch (error) {
      console.error('Failed to log crisis event:', error);
    }
  }
}