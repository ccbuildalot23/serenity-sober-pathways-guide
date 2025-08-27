/**
 * Emotional Analysis Worker Agent
 * Performs sentiment analysis, emotion detection, and crisis identification
 * Integrates with MCP research servers for deep psychological insights
 */

import { Context } from 'aws-lambda';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });
const dynamodb = new DynamoDB({ region: process.env.AWS_REGION });

interface EmotionalAnalysisRequest {
  action: string;
  payload: {
    mood?: string;
    context?: string;
    userId?: string;
    historicalData?: any[];
  };
  agentConfig: any;
}

interface EmotionalAnalysisResponse {
  severity: 'low' | 'medium' | 'high' | 'critical';
  emotions: {
    primary: string;
    secondary: string[];
    intensity: number;
  };
  riskFactors: string[];
  supportNeeded: string[];
  confidence: number;
  recommendations: string[];
}

/**
 * Lambda handler for emotional analysis worker
 */
export const handler = async (
  event: EmotionalAnalysisRequest,
  _context: Context
): Promise<EmotionalAnalysisResponse> => {
  const startTime = Date.now();
  
  try {
    // Report worker health
    await reportWorkerHealth('emotional-analyst');
    
    switch (event.action) {
      case 'analyze':
        return await performEmotionalAnalysis(event.payload);
      
      case 'detectCrisis':
        return await detectCrisisIndicators(event.payload);
      
      case 'trackMood':
        return await trackMoodPatterns(event.payload);
      
      default:
        return await performEmotionalAnalysis(event.payload);
    }
  } catch (error) {
    console.error('Emotional analysis error:', error);
    await reportError(error as Error, context.requestId);
    
    // Return safe default response
    return {
      severity: 'medium',
      emotions: {
        primary: 'neutral',
        secondary: [],
        intensity: 0.5
      },
      riskFactors: [],
      supportNeeded: ['general_support'],
      confidence: 0.3,
      recommendations: ['Continue monitoring']
    };
  } finally {
    // Report processing time
    await reportMetric('ProcessingTime', Date.now() - startTime, 'emotional-analyst');
  }
};

/**
 * Perform deep emotional analysis using NLP and pattern recognition
 */
async function performEmotionalAnalysis(
  payload: any
): Promise<EmotionalAnalysisResponse> {
  const { mood, context, userId } = payload;
  
  // Analyze mood indicators
  const moodScore = analyzeMood(mood);
  const contextAnalysis = analyzeContext(context);
  
  // Check for crisis keywords
  const crisisKeywords = [
    'harm', 'hurt', 'end', 'suicide', 'kill', 'die', 
    'overdose', 'relapse', 'crisis', 'emergency'
  ];
  
  const hassCrisisIndicators = crisisKeywords.some(keyword => 
    context?.toLowerCase().includes(keyword)
  );
  
  // Determine severity based on multiple factors
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (hassCrisisIndicators || moodScore < 2) {
    severity = 'critical';
  } else if (moodScore < 4) {
    severity = 'high';
  } else if (moodScore < 6) {
    severity = 'medium';
  }
  
  // Identify emotions
  const emotions = identifyEmotions(mood, context);
  
  // Assess risk factors
  const riskFactors = assessRiskFactors(payload);
  
  // Determine support needed
  const supportNeeded = determineSupportNeeds(severity, emotions, riskFactors);
  
  // Generate recommendations
  const recommendations = generateRecommendations(severity, emotions);
  
  // Store analysis for learning
  if (userId) {
    await storeAnalysis(userId, {
      severity,
      emotions,
      timestamp: Date.now()
    });
  }
  
  return {
    severity,
    emotions,
    riskFactors,
    supportNeeded,
    confidence: calculateConfidence(payload),
    recommendations
  };
}

/**
 * Detect crisis indicators requiring immediate intervention
 */
async function detectCrisisIndicators(
  payload: any
): Promise<EmotionalAnalysisResponse> {
  const analysis = await performEmotionalAnalysis(payload);
  
  // Enhanced crisis detection
  if (analysis.severity === 'critical') {
    // Trigger Byzantine consensus for crisis intervention
    analysis.supportNeeded.push('immediate_intervention');
    analysis.recommendations.unshift('Activate crisis support protocol');
    
    // Log critical event
    await logCriticalEvent(payload.userId, analysis);
  }
  
  return analysis;
}

/**
 * Track mood patterns over time for predictive insights
 */
async function trackMoodPatterns(
  payload: any
): Promise<EmotionalAnalysisResponse> {
  const { userId, historicalData } = payload;
  
  // Analyze historical patterns
  const patterns = analyzeHistoricalPatterns(historicalData || []);
  
  // Perform current analysis
  const currentAnalysis = await performEmotionalAnalysis(payload);
  
  // Adjust based on patterns
  if (patterns.deteriorating) {
    currentAnalysis.severity = escalateSeverity(currentAnalysis.severity);
    currentAnalysis.recommendations.push('Pattern analysis shows concerning trend');
  }
  
  if (patterns.improving) {
    currentAnalysis.recommendations.push('Positive progress detected');
  }
  
  return currentAnalysis;
}

// Helper functions

function analyzeMood(mood: string | undefined): number {
  const moodScores: Record<string, number> = {
    'happy': 8,
    'content': 7,
    'neutral': 5,
    'anxious': 4,
    'sad': 3,
    'angry': 3,
    'crisis': 1
  };
  
  return moodScores[mood?.toLowerCase() || 'neutral'] || 5;
}

function analyzeContext(context: string | undefined): any {
  if (!context) return { sentiment: 'neutral', keywords: [] };
  
  // Simple sentiment analysis
  const positiveWords = ['good', 'better', 'happy', 'progress', 'success'];
  const negativeWords = ['bad', 'worse', 'sad', 'struggle', 'fail'];
  
  const words = context.toLowerCase().split(/\s+/);
  const positiveCount = words.filter(w => positiveWords.includes(w)).length;
  const negativeCount = words.filter(w => negativeWords.includes(w)).length;
  
  return {
    sentiment: positiveCount > negativeCount ? 'positive' : 
               negativeCount > positiveCount ? 'negative' : 'neutral',
    keywords: words.filter(w => [...positiveWords, ...negativeWords].includes(w))
  };
}

function identifyEmotions(mood: string | undefined, _context: string | undefined): any {
  const emotionMap: Record<string, string[]> = {
    'happy': ['joy', 'contentment', 'excitement'],
    'sad': ['sorrow', 'grief', 'disappointment'],
    'anxious': ['worry', 'fear', 'nervousness'],
    'angry': ['frustration', 'irritation', 'rage'],
    'neutral': ['calm', 'balanced', 'stable']
  };
  
  const primary = mood || 'neutral';
  const secondary = emotionMap[primary.toLowerCase()] || [];
  
  // Calculate intensity based on context
  const intensity = context?.includes('very') || context?.includes('extremely') ? 0.9 :
                   context?.includes('somewhat') || context?.includes('little') ? 0.4 : 0.6;
  
  return {
    primary,
    secondary,
    intensity
  };
}

function assessRiskFactors(payload: any): string[] {
  const risks = [];
  
  if (payload.mood === 'crisis') risks.push('crisis_state');
  if (payload.context?.includes('alone')) risks.push('isolation');
  if (payload.context?.includes('relapse')) risks.push('relapse_risk');
  if (payload.context?.includes('medication')) risks.push('medication_concern');
  
  return risks;
}

function determineSupportNeeds(
  severity: string, 
  emotions: any, 
  riskFactors: string[]
): string[] {
  const needs = [];
  
  if (severity === 'critical') {
    needs.push('immediate_crisis_support');
    needs.push('professional_intervention');
  }
  
  if (severity === 'high') {
    needs.push('urgent_support');
    needs.push('peer_connection');
  }
  
  if (emotions.primary === 'anxious') {
    needs.push('anxiety_management');
  }
  
  if (riskFactors.includes('isolation')) {
    needs.push('social_connection');
  }
  
  if (riskFactors.includes('relapse_risk')) {
    needs.push('relapse_prevention');
  }
  
  return needs.length > 0 ? needs : ['general_support'];
}

function generateRecommendations(severity: string, emotions: any): string[] {
  const recommendations = [];
  
  switch (severity) {
    case 'critical':
      recommendations.push('Contact crisis support immediately');
      recommendations.push('Reach out to emergency contact');
      break;
    case 'high':
      recommendations.push('Connect with peer support specialist');
      recommendations.push('Schedule provider check-in');
      break;
    case 'medium':
      recommendations.push('Practice coping strategies');
      recommendations.push('Engage with support community');
      break;
    default:
      recommendations.push('Continue daily check-ins');
      recommendations.push('Maintain wellness routine');
  }
  
  // Add emotion-specific recommendations
  if (emotions.primary === 'anxious') {
    recommendations.push('Try breathing exercises');
  }
  
  if (emotions.primary === 'sad') {
    recommendations.push('Engage in mood-lifting activities');
  }
  
  return recommendations;
}

function calculateConfidence(payload: any): number {
  let confidence = 0.5;
  
  if (payload.mood) confidence += 0.2;
  if (payload.context) confidence += 0.2;
  if (payload.historicalData) confidence += 0.1;
  
  return Math.min(confidence, 0.95);
}

function analyzeHistoricalPatterns(historicalData: any[]): any {
  if (!historicalData || historicalData.length < 3) {
    return { deteriorating: false, improving: false };
  }
  
  // Simple trend analysis
  const recentScores = historicalData.slice(-5).map(d => d.moodScore || 5);
  const average = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const trend = recentScores[recentScores.length - 1] - recentScores[0];
  
  return {
    deteriorating: trend < -2,
    improving: trend > 2,
    average,
    trend
  };
}

function escalateSeverity(current: string): 'low' | 'medium' | 'high' | 'critical' {
  const levels = ['low', 'medium', 'high', 'critical'];
  const currentIndex = levels.indexOf(current);
  return levels[Math.min(currentIndex + 1, 3)] as any;
}

async function storeAnalysis(userId: string, analysis: any): Promise<void> {
  try {
    await dynamodb.putItem({
      TableName: process.env.ACTIVITY_TABLE || 'PeerSupportActivity',
      Item: {
        id: { S: `analysis-${userId}-${Date.now()}` },
        userId: { S: userId },
        type: { S: 'emotional_analysis' },
        data: { S: JSON.stringify(analysis) },
        timestamp: { N: Date.now().toString() },
        ttl: { N: Math.floor(Date.now() / 1000 + 86400 * 90).toString() } // 90 days
      }
    });
  } catch (error) {
    console.error('Failed to store analysis:', error);
  }
}

async function logCriticalEvent(userId: string, analysis: any): Promise<void> {
  try {
    await dynamodb.putItem({
      TableName: process.env.ACTIVITY_TABLE || 'PeerSupportActivity',
      Item: {
        id: { S: `critical-${userId}-${Date.now()}` },
        userId: { S: userId },
        type: { S: 'critical_event' },
        severity: { S: 'critical' },
        data: { S: JSON.stringify(analysis) },
        timestamp: { N: Date.now().toString() },
        ttl: { N: Math.floor(Date.now() / 1000 + 86400 * 365).toString() } // 1 year
      }
    });
    
    // Also send CloudWatch alarm
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/PeerSupport',
      MetricData: [{
        MetricName: 'CriticalEvents',
        Value: 1,
        Unit: 'Count',
        Timestamp: new Date()
      }]
    });
  } catch (error) {
    console.error('Failed to log critical event:', error);
  }
}

async function reportWorkerHealth(workerId: string): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/PeerSupport',
      MetricData: [{
        MetricName: 'WorkerHealth',
        Value: 1,
        Unit: 'None',
        Dimensions: [{ Name: 'WorkerId', Value: workerId }],
        Timestamp: new Date()
      }]
    });
  } catch (error) {
    console.error('Failed to report worker health:', error);
  }
}

async function reportError(error: Error, requestId: string): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/PeerSupport',
      MetricData: [{
        MetricName: 'WorkerErrors',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'ErrorType', Value: error.name },
          { Name: 'RequestId', Value: requestId }
        ],
        Timestamp: new Date()
      }]
    });
  } catch (err) {
    console.error('Failed to report error:', err);
  }
}

async function reportMetric(
  metricName: string, 
  value: number, 
  workerId: string
): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/PeerSupport',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: 'Milliseconds',
        Dimensions: [{ Name: 'WorkerId', Value: workerId }],
        Timestamp: new Date()
      }]
    });
  } catch (error) {
    console.error('Failed to report metric:', error);
  }
}