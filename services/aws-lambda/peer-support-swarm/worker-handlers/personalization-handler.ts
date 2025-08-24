/**
 * Personalization Worker Agent
 * Learns user preferences and customizes responses for maximum engagement
 * Uses adaptive learning algorithms to improve over time
 */

import { Context } from 'aws-lambda';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });
const dynamodb = new DynamoDB({ region: process.env.AWS_REGION });

interface PersonalizationRequest {
  action: string;
  payload: {
    content?: any;
    userId?: string;
    preferences?: any;
    historicalInteractions?: any[];
    context?: any;
  };
  agentConfig: any;
}

interface PersonalizationResponse {
  message: string;
  personalizedElements: string[];
  adaptations: string[];
  confidence: number;
  learningInsights?: any;
  preferenceUpdates?: any;
}

interface UserProfile {
  userId: string;
  preferences: {
    communicationStyle: 'formal' | 'casual' | 'supportive' | 'direct';
    contentLength: 'brief' | 'moderate' | 'detailed';
    responseTime: 'morning' | 'afternoon' | 'evening' | 'night';
    engagementLevel: 'low' | 'medium' | 'high';
    supportNeeds: string[];
    triggers: string[];
    strengths: string[];
  };
  learningMetrics: {
    interactionCount: number;
    avgEngagementScore: number;
    preferredTopics: string[];
    responsePatterns: any;
  };
}

/**
 * Lambda handler for personalization worker
 */
export const handler = async (
  event: PersonalizationRequest,
  _context: Context
): Promise<PersonalizationResponse> => {
  const startTime = Date.now();
  
  try {
    // Report worker health
    await reportWorkerHealth('personalization');
    
    switch (event.action) {
      case 'personalize':
        return await personalizeContent(event.payload);
      
      case 'learnPreferences':
        return await learnUserPreferences(event.payload);
      
      case 'optimizeTiming':
        return await optimizeDeliveryTiming(event.payload);
      
      case 'adaptStyle':
        return await adaptCommunicationStyle(event.payload);
      
      default:
        return await personalizeContent(event.payload);
    }
  } catch (error) {
    console.error('Personalization error:', error);
    await reportError(error as Error, context.requestId);
    
    // Return minimally personalized response
    return {
      message: event.payload.content?.message || 'Here to support you.',
      personalizedElements: [],
      adaptations: ['default_style'],
      confidence: 0.3
    };
  } finally {
    // Report processing time
    await reportMetric('ProcessingTime', Date.now() - startTime, 'personalization');
  }
};

/**
 * Main personalization function
 */
async function personalizeContent(
  payload: any
): Promise<PersonalizationResponse> {
  const { content, userId, preferences, historicalInteractions } = payload;
  
  // Load or create user profile
  const userProfile = await loadUserProfile(userId, preferences);
  
  // Analyze historical interactions for patterns
  const patterns = analyzeInteractionPatterns(historicalInteractions);
  
  // Apply personalization layers
  let personalizedMessage = content?.message || '';
  const personalizedElements: string[] = [];
  const adaptations: string[] = [];
  
  // 1. Communication style adaptation
  personalizedMessage = adaptCommunicationTone(
    personalizedMessage,
    userProfile.preferences.communicationStyle
  );
  adaptations.push(`style:${userProfile.preferences.communicationStyle}`);
  
  // 2. Content length optimization
  personalizedMessage = optimizeContentLength(
    personalizedMessage,
    userProfile.preferences.contentLength
  );
  adaptations.push(`length:${userProfile.preferences.contentLength}`);
  
  // 3. Add personal touches based on history
  const personalTouches = addPersonalTouches(userProfile, patterns);
  if (personalTouches.length > 0) {
    personalizedMessage += '\n\n' + personalTouches.join(' ');
    personalizedElements.push(...personalTouches);
  }
  
  // 4. Avoid triggers
  personalizedMessage = avoidTriggers(personalizedMessage, userProfile.preferences.triggers);
  
  // 5. Emphasize strengths
  personalizedMessage = emphasizeStrengths(personalizedMessage, userProfile.preferences.strengths);
  
  // 6. Time-appropriate greeting
  const greeting = getTimeAppropriateGreeting(userProfile.preferences.responseTime);
  if (greeting) {
    personalizedMessage = greeting + ' ' + personalizedMessage;
    personalizedElements.push('time_greeting');
  }
  
  // Update learning metrics
  if (userId) {
    await updateLearningMetrics(userId, {
      timestamp: Date.now(),
      contentType: content?.type,
      adaptations
    });
  }
  
  return {
    message: personalizedMessage,
    personalizedElements,
    adaptations,
    confidence: calculatePersonalizationConfidence(userProfile, patterns),
    learningInsights: patterns,
    preferenceUpdates: await suggestPreferenceUpdates(userProfile, patterns)
  };
}

/**
 * Learn and update user preferences from interactions
 */
async function learnUserPreferences(
  payload: any
): Promise<PersonalizationResponse> {
  const { userId, historicalInteractions } = payload;
  
  if (!userId || !historicalInteractions || historicalInteractions.length === 0) {
    return {
      message: 'Unable to learn preferences without interaction history',
      personalizedElements: [],
      adaptations: [],
      confidence: 0
    };
  }
  
  // Analyze interaction patterns
  const patterns = analyzeInteractionPatterns(historicalInteractions);
  
  // Extract preference signals
  const preferences = extractPreferenceSignals(patterns);
  
  // Update user profile
  await updateUserProfile(userId, preferences);
  
  // Generate insights
  const insights = generateLearningInsights(patterns, preferences);
  
  return {
    message: 'User preferences updated based on interaction patterns',
    personalizedElements: Object.keys(preferences),
    adaptations: [`learned_${historicalInteractions.length}_interactions`],
    confidence: Math.min(0.9, historicalInteractions.length / 20),
    learningInsights: insights,
    preferenceUpdates: preferences
  };
}

/**
 * Optimize content delivery timing
 */
async function optimizeDeliveryTiming(
  payload: any
): Promise<PersonalizationResponse> {
  const { userId, context } = payload;
  
  const userProfile = await loadUserProfile(userId);
  const currentHour = new Date().getHours();
  
  // Determine optimal timing
  const optimalTime = determineOptimalTiming(userProfile, currentHour);
  
  // Generate timing recommendation
  let message = '';
  const adaptations = [];
  
  if (optimalTime.shouldDelay) {
    message = `Consider sending this message at ${optimalTime.recommendedTime} for better engagement.`;
    adaptations.push('timing_delayed');
  } else {
    message = 'Current timing is optimal for user engagement.';
    adaptations.push('timing_optimal');
  }
  
  return {
    message,
    personalizedElements: [`optimal_time:${optimalTime.recommendedTime}`],
    adaptations,
    confidence: optimalTime.confidence
  };
}

/**
 * Adapt communication style based on user preferences
 */
async function adaptCommunicationStyle(
  payload: any
): Promise<PersonalizationResponse> {
  const { content, userId } = payload;
  
  const userProfile = await loadUserProfile(userId);
  const style = userProfile.preferences.communicationStyle;
  
  // Apply style transformation
  const adaptedContent = transformContentStyle(content, style);
  
  return {
    message: adaptedContent,
    personalizedElements: [`communication_style:${style}`],
    adaptations: [style],
    confidence: 0.85
  };
}

// Helper functions

async function loadUserProfile(
  userId?: string, 
  preferences?: any
): Promise<UserProfile> {
  if (!userId) {
    return createDefaultProfile('anonymous', preferences);
  }
  
  try {
    // Try to load existing profile
    const result = await dynamodb.getItem({
      TableName: 'UserProfiles',
      Key: { userId: { S: userId } }
    });
    
    if (result.Item?.personalizedProfile) {
      return JSON.parse(result.Item.personalizedProfile.S);
    }
  } catch (error) {
    console.error('Failed to load user profile:', error);
  }
  
  // Create new profile
  return createDefaultProfile(userId, preferences);
}

function createDefaultProfile(userId: string, preferences?: any): UserProfile {
  return {
    userId,
    preferences: {
      communicationStyle: preferences?.style || 'supportive',
      contentLength: preferences?.length || 'moderate',
      responseTime: preferences?.time || 'afternoon',
      engagementLevel: 'medium',
      supportNeeds: preferences?.needs || [],
      triggers: preferences?.triggers || [],
      strengths: preferences?.strengths || []
    },
    learningMetrics: {
      interactionCount: 0,
      avgEngagementScore: 0,
      preferredTopics: [],
      responsePatterns: {}
    }
  };
}

function analyzeInteractionPatterns(interactions: any[]): any {
  if (!interactions || interactions.length === 0) {
    return { patterns: [], insights: [] };
  }
  
  const patterns = {
    mostActiveTime: getMostActiveTime(interactions),
    preferredContentTypes: getPreferredContentTypes(interactions),
    engagementTrends: getEngagementTrends(interactions),
    commonThemes: getCommonThemes(interactions)
  };
  
  return patterns;
}

function getMostActiveTime(interactions: any[]): string {
  const hourCounts: Record<number, number> = {};
  
  interactions.forEach(i => {
    const hour = new Date(i.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const peakHour = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || '14';
  
  const hourNum = parseInt(peakHour);
  if (hourNum < 6) return 'night';
  if (hourNum < 12) return 'morning';
  if (hourNum < 17) return 'afternoon';
  if (hourNum < 21) return 'evening';
  return 'night';
}

function getPreferredContentTypes(interactions: any[]): string[] {
  const typeCounts: Record<string, number> = {};
  
  interactions.forEach(i => {
    if (i.contentType) {
      typeCounts[i.contentType] = (typeCounts[i.contentType] || 0) + 1;
    }
  });
  
  return Object.entries(typeCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type);
}

function getEngagementTrends(interactions: any[]): any {
  // Simple engagement trend analysis
  const recent = interactions.slice(-10);
  const older = interactions.slice(-20, -10);
  
  const recentAvg = recent.reduce((sum, i) => sum + (i.engagementScore || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, i) => sum + (i.engagementScore || 0), 0) / older.length;
  
  return {
    trend: recentAvg > olderAvg ? 'increasing' : 'decreasing',
    currentLevel: recentAvg > 0.7 ? 'high' : recentAvg > 0.4 ? 'medium' : 'low'
  };
}

function getCommonThemes(interactions: any[]): string[] {
  const themes: Record<string, number> = {};
  
  interactions.forEach(i => {
    if (i.themes) {
      i.themes.forEach((theme: string) => {
        themes[theme] = (themes[theme] || 0) + 1;
      });
    }
  });
  
  return Object.entries(themes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([theme]) => theme);
}

function adaptCommunicationTone(message: string, style: string): string {
  switch (style) {
    case 'formal':
      return message.replace(/you're/gi, 'you are')
                   .replace(/won't/gi, 'will not')
                   .replace(/can't/gi, 'cannot');
    
    case 'casual':
      return message.replace(/\. /g, '. ')
                   .replace(/!+/g, '! 😊');
    
    case 'supportive':
      if (!message.includes('proud') && !message.includes('great')) {
        message = 'You\'re doing great. ' + message;
      }
      return message;
    
    case 'direct':
      return message.replace(/perhaps|maybe|might/gi, '')
                   .replace(/I think|I believe/gi, '');
    
    default:
      return message;
  }
}

function optimizeContentLength(message: string, length: string): string {
  const sentences = message.split('. ');
  
  switch (length) {
    case 'brief':
      return sentences.slice(0, 2).join('. ') + '.';
    
    case 'detailed':
      // Keep full message, maybe add context
      return message;
    
    case 'moderate':
    default:
      return sentences.slice(0, 4).join('. ') + '.';
  }
}

function addPersonalTouches(profile: UserProfile, patterns: any): string[] {
  const touches = [];
  
  // Add strength recognition
  if (profile.preferences.strengths.length > 0) {
    const strength = profile.preferences.strengths[0];
    touches.push(`Your ${strength} continues to inspire.`);
  }
  
  // Add progress acknowledgment
  if (profile.learningMetrics.interactionCount > 10) {
    touches.push('Your consistent engagement shows real commitment.');
  }
  
  // Add theme-based encouragement
  if (patterns.commonThemes?.includes('anxiety')) {
    touches.push('Remember the coping strategies that have worked for you.');
  }
  
  return touches;
}

function avoidTriggers(message: string, triggers: string[]): string {
  let safe = message;
  
  triggers.forEach(trigger => {
    const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
    safe = safe.replace(regex, '[...]');
  });
  
  return safe;
}

function emphasizeStrengths(message: string, strengths: string[]): string {
  let emphasized = message;
  
  strengths.forEach(strength => {
    if (message.toLowerCase().includes(strength.toLowerCase())) {
      const regex = new RegExp(`\\b(${strength})\\b`, 'gi');
      emphasized = emphasized.replace(regex, '**$1**');
    }
  });
  
  return emphasized;
}

function getTimeAppropriateGreeting(preferredTime: string): string {
  const hour = new Date().getHours();
  
  if (hour < 6) return 'Good evening!';
  if (hour < 12) return 'Good morning!';
  if (hour < 17) return 'Good afternoon!';
  if (hour < 21) return 'Good evening!';
  return 'Hello!';
}

function calculatePersonalizationConfidence(profile: UserProfile, patterns: any): number {
  let confidence = 0.5;
  
  // More interactions = higher confidence
  confidence += Math.min(0.2, profile.learningMetrics.interactionCount / 50);
  
  // Clear patterns = higher confidence
  if (patterns.engagementTrends?.currentLevel === 'high') confidence += 0.1;
  if (patterns.preferredContentTypes?.length > 0) confidence += 0.1;
  if (patterns.commonThemes?.length > 0) confidence += 0.1;
  
  return Math.min(0.95, confidence);
}

function extractPreferenceSignals(patterns: any): any {
  return {
    responseTime: patterns.mostActiveTime,
    preferredTopics: patterns.commonThemes,
    engagementLevel: patterns.engagementTrends?.currentLevel || 'medium',
    contentTypes: patterns.preferredContentTypes
  };
}

async function updateUserProfile(userId: string, updates: any): Promise<void> {
  try {
    const profile = await loadUserProfile(userId);
    
    // Merge updates
    Object.assign(profile.preferences, updates);
    profile.learningMetrics.interactionCount++;
    
    // Save updated profile
    await dynamodb.putItem({
      TableName: 'UserProfiles',
      Item: {
        userId: { S: userId },
        personalizedProfile: { S: JSON.stringify(profile) },
        updatedAt: { N: Date.now().toString() }
      }
    });
  } catch (error) {
    console.error('Failed to update user profile:', error);
  }
}

function generateLearningInsights(patterns: any, preferences: any): any {
  return {
    patterns,
    preferences,
    recommendations: [
      `User most active during ${patterns.mostActiveTime}`,
      `Prefers ${preferences.contentTypes?.join(', ')} content`,
      `Engagement level: ${patterns.engagementTrends?.currentLevel}`
    ]
  };
}

async function suggestPreferenceUpdates(profile: UserProfile, patterns: any): Promise<any> {
  const suggestions: any = {};
  
  // Suggest time adjustment
  if (patterns.mostActiveTime && patterns.mostActiveTime !== profile.preferences.responseTime) {
    suggestions.responseTime = patterns.mostActiveTime;
  }
  
  // Suggest engagement level adjustment
  if (patterns.engagementTrends?.currentLevel !== profile.preferences.engagementLevel) {
    suggestions.engagementLevel = patterns.engagementTrends.currentLevel;
  }
  
  return suggestions;
}

function determineOptimalTiming(profile: UserProfile, currentHour: number): any {
  const preferredTimeMap: Record<string, number[]> = {
    'morning': [6, 7, 8, 9, 10, 11],
    'afternoon': [12, 13, 14, 15, 16],
    'evening': [17, 18, 19, 20],
    'night': [21, 22, 23, 0, 1, 2]
  };
  
  const preferredHours = preferredTimeMap[profile.preferences.responseTime];
  const isOptimal = preferredHours.includes(currentHour);
  
  return {
    shouldDelay: !isOptimal,
    recommendedTime: isOptimal ? 'now' : `${preferredHours[0]}:00`,
    confidence: 0.75
  };
}

function transformContentStyle(content: any, style: string): string {
  const baseMessage = content?.message || content || '';
  
  const styleTransformations: Record<string, (msg: string) => string> = {
    'formal': (msg) => `We would like to inform you that: ${msg}`,
    'casual': (msg) => `Hey! ${msg}`,
    'supportive': (msg) => `We're here for you. ${msg}`,
    'direct': (msg) => msg.replace(/[!?]/g, '.')
  };
  
  const transform = styleTransformations[style] || ((msg) => msg);
  return transform(baseMessage);
}

async function updateLearningMetrics(userId: string, interaction: any): Promise<void> {
  try {
    await dynamodb.putItem({
      TableName: process.env.ACTIVITY_TABLE || 'PeerSupportActivity',
      Item: {
        id: { S: `learning-${userId}-${Date.now()}` },
        userId: { S: userId },
        type: { S: 'learning_metrics' },
        data: { S: JSON.stringify(interaction) },
        timestamp: { N: Date.now().toString() },
        ttl: { N: Math.floor(Date.now() / 1000 + 86400 * 90).toString() }
      }
    });
  } catch (error) {
    console.error('Failed to update learning metrics:', error);
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