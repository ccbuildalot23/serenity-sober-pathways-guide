/**
 * Patient Journey Agent
 * 
 * BMAD Framework Implementation:
 * - Business: Optimize patient outcomes through personalized journey tracking
 * - Mental Model: Predictive analytics for recovery pathways and intervention timing
 * - Architecture: Event-sourced patient journey with ML-driven insights
 * - Delivery: Real-time patient engagement metrics and personalized recommendations
 */

import { DynamoDBClient, PutItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { PersonalizeClient, GetRecommendationsCommand, PutEventsCommand } from '@aws-sdk/client-personalize';
import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { EventBridgeClient, PutEventsCommand as EBPutEventsCommand } from '@aws-sdk/client-eventbridge';
import { ComprehendMedicalClient, InferICD10CMCommand } from '@aws-sdk/client-comprehendmedical';
import logger from '../../services/loggerService';

interface PatientProfile {
  patientId: string;
  demographics: {
    age: number;
    gender: string;
    location: string;
    socioeconomicFactors?: string[];
  };
  clinicalHistory: {
    diagnoses: Diagnosis[];
    medications: Medication[];
    allergies: string[];
    previousTreatments: Treatment[];
  };
  recoveryProfile: {
    substanceHistory: SubstanceUse[];
    sobrietyDate?: Date;
    relapseHistory: RelapseEvent[];
    triggers: string[];
    copingStrategies: string[];
  };
  supportNetwork: {
    primarySupporter?: string;
    supporterCount: number;
    groupParticipation: boolean;
    therapistAssigned: boolean;
  };
  riskProfile: RiskAssessment;
}

interface Diagnosis {
  code: string; // ICD-10
  description: string;
  date: Date;
  severity: 'mild' | 'moderate' | 'severe';
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  adherence: number; // 0-100%
}

interface Treatment {
  type: string;
  provider: string;
  startDate: Date;
  endDate?: Date;
  outcome: 'successful' | 'partial' | 'unsuccessful';
}

interface SubstanceUse {
  substance: string;
  startAge: number;
  lastUse?: Date;
  frequency: string;
  severity: 'mild' | 'moderate' | 'severe';
}

interface RelapseEvent {
  date: Date;
  triggers: string[];
  duration: number; // days
  severity: 'minor' | 'moderate' | 'major';
  interventions: string[];
}

interface RiskAssessment {
  relapseRisk: RiskLevel;
  suicideRisk: RiskLevel;
  overdoseRisk: RiskLevel;
  dropoutRisk: RiskLevel;
  overallRisk: RiskLevel;
  lastAssessed: Date;
  factors: RiskFactor[];
}

interface RiskLevel {
  score: number; // 0-100
  category: 'low' | 'medium' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'worsening';
}

interface RiskFactor {
  name: string;
  impact: 'positive' | 'negative';
  weight: number;
  modifiable: boolean;
}

interface JourneyEvent {
  eventId: string;
  patientId: string;
  timestamp: Date;
  type: EventType;
  category: 'clinical' | 'behavioral' | 'social' | 'system';
  details: Record<string, unknown>;
  sentiment?: 'positive' | 'neutral' | 'negative';
  impact?: 'high' | 'medium' | 'low';
}

type EventType = 
  | 'check_in' | 'appointment' | 'medication_taken' | 'medication_missed'
  | 'group_attended' | 'crisis_event' | 'relapse' | 'milestone_achieved'
  | 'support_interaction' | 'mood_logged' | 'goal_set' | 'goal_completed';

// Milestone tracking for patient achievements
// Milestone tracking for patient achievements - currently unused
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _JourneyMilestone {
  id: string;
  name: string;
  description: string;
  achievedDate?: Date;
  category: 'sobriety' | 'treatment' | 'social' | 'personal';
  points: number;
  badge?: string;
}

interface JourneyInsight {
  id: string;
  patientId: string;
  type: 'pattern' | 'prediction' | 'recommendation' | 'alert';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  evidence: string[];
  actionable: boolean;
  suggestedActions?: string[];
  validUntil: Date;
}

interface PersonalizedIntervention {
  id: string;
  patientId: string;
  type: 'message' | 'content' | 'activity' | 'connection' | 'clinical';
  timing: 'immediate' | 'scheduled' | 'triggered';
  scheduledFor?: Date;
  trigger?: string;
  content: {
    title: string;
    body: string;
    cta?: string;
    resources?: string[];
  };
  effectiveness?: number; // 0-100, based on engagement
}

interface JourneyAnalytics {
  patientId: string;
  period: {
    start: Date;
    end: Date;
  };
  engagement: EngagementMetrics;
  clinical: ClinicalMetrics;
  recovery: RecoveryMetrics;
  predictions: PredictiveMetrics;
}

interface EngagementMetrics {
  dailyActiveRate: number;
  averageSessionLength: number;
  featureUsage: Record<string, number>;
  contentEngagement: number;
  supportInteractions: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

interface ClinicalMetrics {
  medicationAdherence: number;
  appointmentAttendance: number;
  symptomSeverity: number;
  functionalImprovement: number;
}

interface RecoveryMetrics {
  sobrietyDays: number;
  relapseFreedays: number;
  copingSkillsUsage: number;
  socialConnectedness: number;
  qualityOfLife: number;
}

interface PredictiveMetrics {
  thirtyDayRelapseRisk: number;
  treatmentSuccessProbability: number;
  expectedTimeToStability: number; // days
  recommendedInterventions: string[];
}

export class PatientJourneyAgent {
  private dynamoClient: DynamoDBClient;
  private personalizeClient: PersonalizeClient;
  private sageMakerClient: SageMakerRuntimeClient;
  private kinesisClient: KinesisClient;
  private cloudWatchClient: CloudWatchClient;
  private eventBridgeClient: EventBridgeClient;
  private comprehendMedicalClient: ComprehendMedicalClient;

  private readonly journeyStages = [
    'intake',
    'assessment', 
    'early_recovery',
    'active_treatment',
    'sustained_recovery',
    'maintenance',
    'alumni'
  ];

  private readonly criticalEvents = [
    'relapse',
    'crisis_event',
    'medication_missed',
    'appointment_missed',
    'high_risk_behavior'
  ];

  constructor(region: string = 'us-east-1') {
    this.dynamoClient = new DynamoDBClient({ region });
    this.personalizeClient = new PersonalizeClient({ region });
    this.sageMakerClient = new SageMakerRuntimeClient({ region });
    this.kinesisClient = new KinesisClient({ region });
    this.cloudWatchClient = new CloudWatchClient({ region });
    this.eventBridgeClient = new EventBridgeClient({ region });
    this.comprehendMedicalClient = new ComprehendMedicalClient({ region });
  }

  /**
   * Track and analyze patient journey
   */
  public async trackPatientJourney(
    patientId: string,
    event?: JourneyEvent
  ): Promise<{
    profile: PatientProfile;
    insights: JourneyInsight[];
    interventions: PersonalizedIntervention[];
    analytics: JourneyAnalytics;
  }> {
    logger.info(`Tracking journey for patient`, {
      component: 'PatientJourneyAgent',
      action: 'journey_tracking_start',
      patientId
    });

    // Record event if provided
    if (event) {
      await this.recordJourneyEvent(event);
    }

    // Get or create patient profile
    const profile = await this.getPatientProfile(patientId);

    // Analyze journey patterns
    const insights = await this.analyzeJourneyPatterns(patientId, profile);

    // Generate personalized interventions
    const interventions = await this.generateInterventions(profile, insights);

    // Calculate analytics
    const analytics = await this.calculateJourneyAnalytics(patientId, profile);

    // Update risk assessment
    await this.updateRiskAssessment(patientId, profile, analytics);

    // Check for critical conditions
    await this.checkCriticalConditions(profile, insights);

    // Send journey metrics
    await this.sendJourneyMetrics(analytics);

    return {
      profile,
      insights,
      interventions,
      analytics
    };
  }

  /**
   * Record journey event
   */
  private async recordJourneyEvent(event: JourneyEvent): Promise<void> {
    try {
      // Store in DynamoDB
      await this.dynamoClient.send(new PutItemCommand({
        TableName: 'PatientJourneyEvents',
        Item: {
          patientId: { S: event.patientId },
          eventId: { S: event.eventId },
          timestamp: { N: event.timestamp.getTime().toString() },
          type: { S: event.type },
          category: { S: event.category },
          details: { S: JSON.stringify(event.details) },
          sentiment: { S: event.sentiment || 'neutral' },
          impact: { S: event.impact || 'medium' }
        }
      }));

      // Stream to Kinesis for real-time processing
      await this.kinesisClient.send(new PutRecordCommand({
        StreamName: 'patient-journey-stream',
        Data: Buffer.from(JSON.stringify(event)),
        PartitionKey: event.patientId
      }));

      // Send to Personalize for recommendations
      if (process.env.PERSONALIZE_DATASET_ARN) {
        await this.personalizeClient.send(new PutEventsCommand({
          trackingId: process.env.PERSONALIZE_TRACKING_ID,
          userId: event.patientId,
          sessionId: `session-${event.patientId}`,
          eventList: [{
            eventType: event.type,
            eventValue: event.impact === 'high' ? 1 : 0.5,
            sentAt: event.timestamp
          }]
        }));
      }
    } catch (error) {
      console.error('Failed to record journey event:', error);
    }
  }

  /**
   * Get patient profile
   */
  private async getPatientProfile(patientId: string): Promise<PatientProfile> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: 'PatientProfiles',
        KeyConditionExpression: 'patientId = :pid',
        ExpressionAttributeValues: {
          ':pid': { S: patientId }
        }
      }));

      if (result.Items && result.Items.length > 0) {
        return this.unmarshallProfile(result.Items[0]);
      }
    } catch (error) {
      console.error('Error fetching patient profile:', error);
    }

    // Return default profile if not found
    return this.createDefaultProfile(patientId);
  }

  /**
   * Analyze journey patterns using ML
   */
  private async analyzeJourneyPatterns(
    patientId: string,
    profile: PatientProfile
  ): Promise<JourneyInsight[]> {
    const insights: JourneyInsight[] = [];

    // Get recent events
    const recentEvents = await this.getRecentEvents(patientId, 30);

    // Analyze patterns
    const patterns = this.detectPatterns(recentEvents);
    
    // Check for concerning patterns
    if (patterns.missedMedications > 3) {
      insights.push({
        id: `insight-${Date.now()}-1`,
        patientId,
        type: 'alert',
        priority: 'high',
        title: 'Medication Adherence Concern',
        description: `Patient has missed ${patterns.missedMedications} medications in the past week`,
        evidence: ['Medication tracking data shows declining adherence'],
        actionable: true,
        suggestedActions: [
          'Schedule medication review appointment',
          'Enable medication reminders',
          'Consider simplifying medication regimen'
        ],
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }

    // Positive pattern detection
    if (patterns.consistentCheckIns >= 7) {
      insights.push({
        id: `insight-${Date.now()}-2`,
        patientId,
        type: 'pattern',
        priority: 'low',
        title: 'Consistent Engagement',
        description: 'Patient has maintained daily check-ins for a week',
        evidence: [`${patterns.consistentCheckIns} consecutive days of check-ins`],
        actionable: true,
        suggestedActions: ['Send encouragement message', 'Award milestone badge'],
        validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      });
    }

    // Use SageMaker for advanced predictions
    if (process.env.SAGEMAKER_ENDPOINT) {
      const predictions = await this.getPredictions(profile, recentEvents);
      insights.push(...predictions);
    }

    // Analyze clinical notes with Comprehend Medical
    if (profile.clinicalHistory.diagnoses.length > 0) {
      const clinicalInsights = await this.analyzeClinicalNotes(profile);
      insights.push(...clinicalInsights);
    }

    return insights;
  }

  /**
   * Generate personalized interventions
   */
  private async generateInterventions(
    profile: PatientProfile,
    insights: JourneyInsight[]
  ): Promise<PersonalizedIntervention[]> {
    const interventions: PersonalizedIntervention[] = [];

    // High-priority insights require immediate intervention
    const highPriorityInsights = insights.filter(i => i.priority === 'high');
    
    for (const insight of highPriorityInsights) {
      if (insight.type === 'alert' && insight.actionable) {
        interventions.push({
          id: `intervention-${Date.now()}`,
          patientId: profile.patientId,
          type: 'message',
          timing: 'immediate',
          content: {
            title: 'Important: ' + insight.title,
            body: insight.description,
            cta: 'View Recommendations',
            resources: insight.suggestedActions
          }
        });
      }
    }

    // Get personalized content recommendations
    if (process.env.PERSONALIZE_CAMPAIGN_ARN) {
      try {
        const recommendations = await this.personalizeClient.send(
          new GetRecommendationsCommand({
            campaignArn: process.env.PERSONALIZE_CAMPAIGN_ARN,
            userId: profile.patientId,
            numResults: 5
          })
        );

        for (const item of recommendations.itemList || []) {
          interventions.push({
            id: `intervention-content-${item.itemId}`,
            patientId: profile.patientId,
            type: 'content',
            timing: 'scheduled',
            scheduledFor: this.getOptimalDeliveryTime(profile),
            content: {
              title: 'Recommended for You',
              body: `Based on your recovery journey, we think this content might help`,
              cta: 'View Content',
              resources: [item.itemId || '']
            }
          });
        }
      } catch (error) {
        console.error('Failed to get Personalize recommendations:', error);
      }
    }

    // Risk-based interventions
    if (profile.riskProfile.relapseRisk.category === 'high') {
      interventions.push({
        id: `intervention-risk-${Date.now()}`,
        patientId: profile.patientId,
        type: 'clinical',
        timing: 'immediate',
        content: {
          title: 'Check-In Required',
          body: 'Your care team would like to check in with you',
          cta: 'Schedule Call',
          resources: ['crisis_hotline', 'therapist_contact']
        }
      });
    }

    return interventions;
  }

  /**
   * Calculate journey analytics
   */
  private async calculateJourneyAnalytics(
    patientId: string,
    profile: PatientProfile
  ): Promise<JourneyAnalytics> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const events = await this.getRecentEvents(patientId, 30);

    // Calculate engagement metrics
    const engagement = this.calculateEngagement(events);
    
    // Calculate clinical metrics
    const clinical = this.calculateClinicalMetrics(events, profile);
    
    // Calculate recovery metrics
    const recovery = this.calculateRecoveryMetrics(events, profile);
    
    // Generate predictions
    const predictions = await this.generatePredictions(profile, events);

    return {
      patientId,
      period: { start: startDate, end: endDate },
      engagement,
      clinical,
      recovery,
      predictions
    };
  }

  /**
   * Update risk assessment based on recent data
   */
  private async updateRiskAssessment(
    patientId: string,
    profile: PatientProfile,
    analytics: JourneyAnalytics
  ): Promise<void> {
    const factors: RiskFactor[] = [];

    // Engagement factors
    if (analytics.engagement.dailyActiveRate < 0.3) {
      factors.push({
        name: 'Low engagement',
        impact: 'negative',
        weight: 0.3,
        modifiable: true
      });
    }

    // Clinical factors
    if (analytics.clinical.medicationAdherence < 0.8) {
      factors.push({
        name: 'Poor medication adherence',
        impact: 'negative',
        weight: 0.4,
        modifiable: true
      });
    }

    // Recovery factors
    if (analytics.recovery.sobrietyDays < 30) {
      factors.push({
        name: 'Early recovery phase',
        impact: 'negative',
        weight: 0.5,
        modifiable: false
      });
    }

    // Calculate risk scores
    const relapseRisk = this.calculateRiskScore(factors, 'relapse');
    const dropoutRisk = this.calculateRiskScore(factors, 'dropout');

    profile.riskProfile = {
      relapseRisk,
      suicideRisk: { score: 10, category: 'low', trend: 'stable' }, // Would use proper assessment
      overdoseRisk: { score: 15, category: 'low', trend: 'stable' },
      dropoutRisk,
      overallRisk: this.calculateOverallRisk([relapseRisk, dropoutRisk]),
      lastAssessed: new Date(),
      factors
    };

    // Update profile in database
    await this.updatePatientProfile(profile);
  }

  /**
   * Helper methods
   */
  private async getRecentEvents(patientId: string, days: number): Promise<JourneyEvent[]> {
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: 'PatientJourneyEvents',
        KeyConditionExpression: 'patientId = :pid AND #ts > :start',
        ExpressionAttributeNames: {
          '#ts': 'timestamp'
        },
        ExpressionAttributeValues: {
          ':pid': { S: patientId },
          ':start': { N: startTime.toString() }
        },
        ScanIndexForward: false // Most recent first
      }));

      return (result.Items || []).map(item => this.unmarshallEvent(item));
    } catch (error) {
      console.error('Error fetching recent events:', error);
      return [];
    }
  }

  private detectPatterns(events: JourneyEvent[]): Record<string, unknown> {
    const patterns = {
      missedMedications: 0,
      consistentCheckIns: 0,
      moodTrend: 'stable' as 'improving' | 'stable' | 'declining',
      socialInteractions: 0,
      crisisEvents: 0
    };

    // Count missed medications
    patterns.missedMedications = events.filter(e => 
      e.type === 'medication_missed' && 
      e.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    // Count consistent check-ins
    const checkInDates = new Set(
      events
        .filter(e => e.type === 'check_in')
        .map(e => e.timestamp.toISOString().split('T')[0])
    );
    patterns.consistentCheckIns = checkInDates.size;

    // Count crisis events
    patterns.crisisEvents = events.filter(e => e.type === 'crisis_event').length;

    return patterns;
  }

  private async getPredictions(
    profile: PatientProfile,
    events: JourneyEvent[]
  ): Promise<JourneyInsight[]> {
    const insights: JourneyInsight[] = [];

    // Prepare features for ML model
    const features = this.prepareMLFeatures(profile, events);

    try {
      // Call SageMaker endpoint
      const response = await this.sageMakerClient.send(new InvokeEndpointCommand({
        EndpointName: process.env.SAGEMAKER_ENDPOINT || '',
        ContentType: 'application/json',
        Body: JSON.stringify(features)
      }));

      const predictions = JSON.parse(new TextDecoder().decode(response.Body));

      if (predictions.relapseRisk > 0.7) {
        insights.push({
          id: `prediction-${Date.now()}`,
          patientId: profile.patientId,
          type: 'prediction',
          priority: 'high',
          title: 'Elevated Relapse Risk',
          description: `ML model predicts ${(predictions.relapseRisk * 100).toFixed(0)}% chance of relapse in next 30 days`,
          evidence: ['Recent pattern changes', 'Historical risk factors'],
          actionable: true,
          suggestedActions: [
            'Increase check-in frequency',
            'Schedule provider appointment',
            'Activate support network'
          ],
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      }
    } catch (error) {
      console.error('Failed to get ML predictions:', error);
    }

    return insights;
  }

  private async analyzeClinicalNotes(profile: PatientProfile): Promise<JourneyInsight[]> {
    const insights: JourneyInsight[] = [];

    // Analyze diagnoses for medication recommendations
    try {
      for (const diagnosis of profile.clinicalHistory.diagnoses) {
        const result = await this.comprehendMedicalClient.send(
          new InferICD10CMCommand({
            Text: diagnosis.description
          })
        );

        // Check for high-risk conditions
        const highRiskCodes = ['F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19'];
        const hasHighRisk = result.Entities?.some(e => 
          highRiskCodes.some(code => e.ICD10CMConcepts?.some(c => c.Code?.startsWith(code)))
        );

        if (hasHighRisk) {
          insights.push({
            id: `clinical-${Date.now()}`,
            patientId: profile.patientId,
            type: 'alert',
            priority: 'medium',
            title: 'Clinical Risk Factor Identified',
            description: 'Substance use disorder diagnosis requires specialized care coordination',
            evidence: [diagnosis.description],
            actionable: true,
            suggestedActions: ['Review treatment plan', 'Consider MAT options'],
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });
        }
      }
    } catch (error) {
      console.error('Failed to analyze clinical notes:', error);
    }

    return insights;
  }

  private calculateEngagement(events: JourneyEvent[]): EngagementMetrics {
    const dailyEvents = new Map<string, number>();
    
    events.forEach(e => {
      const date = e.timestamp.toISOString().split('T')[0];
      dailyEvents.set(date, (dailyEvents.get(date) || 0) + 1);
    });

    const daysActive = dailyEvents.size;
    const totalDays = 30;

    return {
      dailyActiveRate: daysActive / totalDays,
      averageSessionLength: 15, // Would calculate from actual session data
      featureUsage: this.calculateFeatureUsage(events),
      contentEngagement: 0.65, // Placeholder
      supportInteractions: events.filter(e => e.type === 'support_interaction').length,
      trend: daysActive > 20 ? 'increasing' : daysActive > 10 ? 'stable' : 'decreasing'
    };
  }

  private calculateFeatureUsage(events: JourneyEvent[]): Record<string, number> {
    const usage: Record<string, number> = {};
    
    events.forEach(e => {
      usage[e.type] = (usage[e.type] || 0) + 1;
    });

    return usage;
  }

  private calculateClinicalMetrics(
    events: JourneyEvent[],
    _profile: PatientProfile
  ): ClinicalMetrics {
    const medicationEvents = events.filter(e => 
      e.type === 'medication_taken' || e.type === 'medication_missed'
    );
    
    const takenCount = medicationEvents.filter(e => e.type === 'medication_taken').length;
    const adherence = medicationEvents.length > 0 ? takenCount / medicationEvents.length : 1;

    const appointmentEvents = events.filter(e => e.type === 'appointment');
    const attendedCount = appointmentEvents.filter(e => e.details.attended === true).length;
    const attendance = appointmentEvents.length > 0 ? attendedCount / appointmentEvents.length : 1;

    return {
      medicationAdherence: adherence,
      appointmentAttendance: attendance,
      symptomSeverity: 30, // Would calculate from symptom tracking
      functionalImprovement: 65 // Would calculate from assessment scores
    };
  }

  private calculateRecoveryMetrics(
    _events: JourneyEvent[],
    profile: PatientProfile
  ): RecoveryMetrics {
    const lastRelapse = _events
      .filter(e => e.type === 'relapse')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    const sobrietyDays = profile.recoveryProfile.sobrietyDate
      ? Math.floor((Date.now() - profile.recoveryProfile.sobrietyDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const relapseFreedays = lastRelapse
      ? Math.floor((Date.now() - lastRelapse.timestamp.getTime()) / (1000 * 60 * 60 * 24))
      : sobrietyDays;

    return {
      sobrietyDays,
      relapseFreedays,
      copingSkillsUsage: 0.7, // Would calculate from skill tracking
      socialConnectedness: profile.supportNetwork.supporterCount > 0 ? 0.8 : 0.3,
      qualityOfLife: 65 // Would calculate from QOL assessments
    };
  }

  private async generatePredictions(
    profile: PatientProfile,
    _events: JourneyEvent[]
  ): Promise<PredictiveMetrics> {
    // Simplified prediction logic - would use ML models
    const riskFactors = profile.riskProfile.factors.filter(f => f.impact === 'negative').length;
    const protectiveFactors = profile.riskProfile.factors.filter(f => f.impact === 'positive').length;

    const relapseRisk = Math.min(100, riskFactors * 15);
    const successProbability = Math.max(0, 100 - relapseRisk + (protectiveFactors * 10));

    return {
      thirtyDayRelapseRisk: relapseRisk,
      treatmentSuccessProbability: successProbability,
      expectedTimeToStability: 90 - (successProbability * 0.5),
      recommendedInterventions: this.getRecommendedInterventions(profile, relapseRisk)
    };
  }

  private getRecommendedInterventions(profile: PatientProfile, relapseRisk: number): string[] {
    const interventions: string[] = [];

    if (relapseRisk > 70) {
      interventions.push('Intensive outpatient program');
      interventions.push('Daily check-ins');
      interventions.push('Crisis planning session');
    } else if (relapseRisk > 40) {
      interventions.push('Increase therapy frequency');
      interventions.push('Peer support group');
      interventions.push('Medication review');
    } else {
      interventions.push('Continue current treatment');
      interventions.push('Monthly progress review');
    }

    return interventions;
  }

  private calculateRiskScore(factors: RiskFactor[], _type: string): RiskLevel {
    const negativeWeight = factors
      .filter(f => f.impact === 'negative')
      .reduce((sum, f) => sum + f.weight, 0);
    
    const positiveWeight = factors
      .filter(f => f.impact === 'positive')
      .reduce((sum, f) => sum + f.weight, 0);

    const score = Math.min(100, Math.max(0, (negativeWeight - positiveWeight) * 100));

    return {
      score,
      category: score > 70 ? 'critical' : score > 50 ? 'high' : score > 30 ? 'medium' : 'low',
      trend: 'stable' // Would calculate actual trend
    };
  }

  private calculateOverallRisk(risks: RiskLevel[]): RiskLevel {
    const avgScore = risks.reduce((sum, r) => sum + r.score, 0) / risks.length;
    
    return {
      score: avgScore,
      category: avgScore > 70 ? 'critical' : avgScore > 50 ? 'high' : avgScore > 30 ? 'medium' : 'low',
      trend: 'stable'
    };
  }

  private getOptimalDeliveryTime(_profile: PatientProfile): Date {
    // Deliver content at 10 AM patient's local time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow;
  }

  private prepareMLFeatures(profile: PatientProfile, events: JourneyEvent[]): Record<string, unknown> {
    return {
      age: profile.demographics.age,
      sobrietyDays: this.calculateRecoveryMetrics(events, profile).sobrietyDays,
      relapseCount: profile.recoveryProfile.relapseHistory.length,
      supportNetworkSize: profile.supportNetwork.supporterCount,
      medicationAdherence: this.calculateClinicalMetrics(events, profile).medicationAdherence,
      engagementRate: this.calculateEngagement(events).dailyActiveRate
    };
  }

  private async checkCriticalConditions(
    profile: PatientProfile,
    insights: JourneyInsight[]
  ): Promise<void> {
    const criticalInsights = insights.filter(i => i.priority === 'high' && i.type === 'alert');
    
    if (criticalInsights.length > 0 || profile.riskProfile.overallRisk.category === 'critical') {
      // Trigger crisis response
      await this.eventBridgeClient.send(new EBPutEventsCommand({
        Entries: [{
          Source: 'patient.journey',
          DetailType: 'CriticalCondition',
          Detail: JSON.stringify({
            patientId: profile.patientId,
            riskLevel: profile.riskProfile.overallRisk,
            insights: criticalInsights
          })
        }]
      }));
    }
  }

  private async sendJourneyMetrics(analytics: JourneyAnalytics): Promise<void> {
    try {
      await this.cloudWatchClient.send(new PutMetricDataCommand({
        Namespace: 'Serenity/PatientJourney',
        MetricData: [
          {
            MetricName: 'EngagementRate',
            Value: analytics.engagement.dailyActiveRate,
            Unit: 'Percent',
            Timestamp: new Date()
          },
          {
            MetricName: 'MedicationAdherence',
            Value: analytics.clinical.medicationAdherence,
            Unit: 'Percent',
            Timestamp: new Date()
          },
          {
            MetricName: 'RelapseRisk',
            Value: analytics.predictions.thirtyDayRelapseRisk,
            Unit: 'Percent',
            Timestamp: new Date()
          }
        ]
      }));
    } catch (error) {
      console.error('Failed to send journey metrics:', error);
    }
  }

  private unmarshallProfile(item: Record<string, unknown>): PatientProfile {
    // Convert DynamoDB item to PatientProfile
    // Simplified - would have proper unmarshalling
    return JSON.parse(item.profileData.S);
  }

  private unmarshallEvent(item: Record<string, unknown>): JourneyEvent {
    return {
      eventId: item.eventId.S,
      patientId: item.patientId.S,
      timestamp: new Date(parseInt(item.timestamp.N)),
      type: item.type.S as EventType,
      category: item.category.S as any,
      details: JSON.parse(item.details.S),
      sentiment: item.sentiment?.S as any,
      impact: item.impact?.S as any
    };
  }

  private createDefaultProfile(patientId: string): PatientProfile {
    return {
      patientId,
      demographics: {
        age: 0,
        gender: 'unknown',
        location: 'unknown'
      },
      clinicalHistory: {
        diagnoses: [],
        medications: [],
        allergies: [],
        previousTreatments: []
      },
      recoveryProfile: {
        substanceHistory: [],
        relapseHistory: [],
        triggers: [],
        copingStrategies: []
      },
      supportNetwork: {
        supporterCount: 0,
        groupParticipation: false,
        therapistAssigned: false
      },
      riskProfile: {
        relapseRisk: { score: 50, category: 'medium', trend: 'stable' },
        suicideRisk: { score: 10, category: 'low', trend: 'stable' },
        overdoseRisk: { score: 10, category: 'low', trend: 'stable' },
        dropoutRisk: { score: 30, category: 'medium', trend: 'stable' },
        overallRisk: { score: 25, category: 'low', trend: 'stable' },
        lastAssessed: new Date(),
        factors: []
      }
    };
  }

  private async updatePatientProfile(profile: PatientProfile): Promise<void> {
    try {
      await this.dynamoClient.send(new UpdateItemCommand({
        TableName: 'PatientProfiles',
        Key: {
          patientId: { S: profile.patientId }
        },
        UpdateExpression: 'SET profileData = :data, lastUpdated = :now',
        ExpressionAttributeValues: {
          ':data': { S: JSON.stringify(profile) },
          ':now': { N: Date.now().toString() }
        }
      }));
    } catch (error) {
      console.error('Failed to update patient profile:', error);
    }
  }
}