/**
 * Motivational Content Worker Agent
 * Generates personalized recovery quotes, success stories, and encouragement
 * Integrates with MCP web search for inspirational content
 */

import { Context } from 'aws-lambda';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });
const dynamodb = new DynamoDB({ region: process.env.AWS_REGION });

interface MotivationalRequest {
  action: string;
  payload: {
    mood?: string;
    stage?: string;
    preferences?: any;
    userId?: string;
    milestone?: string;
  };
  agentConfig: any;
}

interface MotivationalResponse {
  message: string;
  type: 'quote' | 'story' | 'affirmation' | 'milestone' | 'encouragement';
  confidence: number;
  resources?: any[];
  nextSteps?: string[];
  personalizedElements?: string[];
}

// Curated motivational content library
const motivationalLibrary = {
  quotes: {
    hope: [
      "Recovery is not a race. You don't have to feel guilty if it takes you longer than you thought it would.",
      "The only person you are destined to become is the person you decide to be.",
      "Rock bottom became the solid foundation on which I rebuilt my life."
    ],
    strength: [
      "You are stronger than you know, braver than you believe, and loved more than you can imagine.",
      "Courage isn't having the strength to go on - it's going on when you don't have strength.",
      "Your current situation is not your final destination."
    ],
    progress: [
      "Progress, not perfection.",
      "Every day in recovery is a success.",
      "Small steps every day lead to big changes over time."
    ],
    resilience: [
      "Fall seven times, stand up eight.",
      "You've survived 100% of your worst days. You're doing great.",
      "The comeback is always stronger than the setback."
    ]
  },
  affirmations: {
    daily: [
      "I am worthy of love and respect.",
      "I choose recovery today.",
      "I am becoming the person I want to be.",
      "My past does not define my future."
    ],
    crisis: [
      "This feeling will pass.",
      "I have the strength to get through this.",
      "I am not alone in this journey.",
      "Help is available and it's okay to ask for it."
    ],
    milestone: [
      "I am proud of how far I've come.",
      "Every milestone is a victory worth celebrating.",
      "My recovery journey is uniquely mine and that's okay.",
      "I deserve to celebrate my achievements."
    ]
  },
  stories: {
    short: [
      "Remember: Every expert was once a beginner. Every pro was once an amateur. Every icon was once an iconoclast. Your journey is valid.",
      "A person in recovery shared: 'Day 1 felt impossible. Day 30 felt improbable. Day 365 felt incredible. Day 1000? It just feels like life.'",
      "Recovery taught me that storms make trees take deeper roots. Your struggles today are building your strength for tomorrow."
    ]
  }
};

/**
 * Lambda handler for motivational content generation
 */
export const handler = async (
  event: MotivationalRequest,
  context: Context
): Promise<MotivationalResponse> => {
  const startTime = Date.now();
  
  try {
    // Report worker health
    await reportWorkerHealth('motivational-content');
    
    switch (event.action) {
      case 'generate':
        return await generateMotivationalContent(event.payload);
      
      case 'celebrateMilestone':
        return await generateMilestoneMessage(event.payload);
      
      case 'dailyInspiration':
        return await generateDailyInspiration(event.payload);
      
      case 'crisisEncouragement':
        return await generateCrisisEncouragement(event.payload);
      
      default:
        return await generateMotivationalContent(event.payload);
    }
  } catch (error) {
    console.error('Motivational content generation error:', error);
    await reportError(error as Error, context.requestId);
    
    // Return fallback motivational content
    return {
      message: "You're doing great. Keep going, one step at a time.",
      type: 'encouragement',
      confidence: 0.5,
      resources: [],
      nextSteps: ['Continue your recovery journey', 'Reach out if you need support']
    };
  } finally {
    // Report processing time
    await reportMetric('ProcessingTime', Date.now() - startTime, 'motivational-content');
  }
};

/**
 * Generate personalized motivational content
 */
async function generateMotivationalContent(
  payload: any
): Promise<MotivationalResponse> {
  const { mood, stage, preferences, userId } = payload;
  
  // Select content category based on mood
  const category = selectContentCategory(mood, stage);
  
  // Get base content
  const baseContent = selectBaseContent(category, preferences);
  
  // Personalize the message
  const personalizedMessage = await personalizeContent(baseContent, payload);
  
  // Add resources if needed
  const resources = await findRelevantResources(mood, stage);
  
  // Generate next steps
  const nextSteps = generateNextSteps(mood, stage);
  
  // Track engagement if userId provided
  if (userId) {
    await trackEngagement(userId, {
      contentType: category,
      mood,
      stage,
      timestamp: Date.now()
    });
  }
  
  return {
    message: personalizedMessage,
    type: determineContentType(category),
    confidence: 0.85,
    resources,
    nextSteps,
    personalizedElements: identifyPersonalizedElements(payload)
  };
}

/**
 * Generate milestone celebration message
 */
async function generateMilestoneMessage(
  payload: any
): Promise<MotivationalResponse> {
  const { milestone, userId, preferences } = payload;
  
  // Create celebration message
  let message = '';
  
  switch (milestone) {
    case '24_hours':
      message = "🎉 24 hours! The first day is often the hardest, and you made it through. This is a huge accomplishment!";
      break;
    case '1_week':
      message = "🌟 One week strong! Seven days of choosing recovery. You're building momentum!";
      break;
    case '30_days':
      message = "🏆 30 days! A full month of growth and healing. You're rewriting your story!";
      break;
    case '90_days':
      message = "💪 90 days! Three months of dedication. New habits are forming, and you're thriving!";
      break;
    case '6_months':
      message = "🎊 Six months! Half a year of recovery. You've shown incredible strength and commitment!";
      break;
    case '1_year':
      message = "🌈 ONE YEAR! 365 days of choosing yourself, your health, and your future. This is extraordinary!";
      break;
    default:
      message = `🎉 Congratulations on reaching ${milestone}! Every milestone in recovery is worth celebrating!`;
  }
  
  // Add personalized encouragement
  message += "\n\n" + motivationalLibrary.affirmations.milestone[
    Math.floor(Math.random() * motivationalLibrary.affirmations.milestone.length)
  ];
  
  return {
    message,
    type: 'milestone',
    confidence: 0.95,
    resources: [
      { type: 'celebration', title: 'Share your milestone with the community' },
      { type: 'reflection', title: 'Journal about your journey' }
    ],
    nextSteps: [
      'Reflect on your growth',
      'Set your next goal',
      'Share your success with someone who supports you'
    ]
  };
}

/**
 * Generate daily inspiration based on user's journey
 */
async function generateDailyInspiration(
  payload: any
): Promise<MotivationalResponse> {
  const { stage, preferences, userId } = payload;
  
  // Get day of recovery if available
  const dayOfRecovery = await getDayOfRecovery(userId);
  
  // Select appropriate daily content
  const contentPool = stage === 'early' ? 
    [...motivationalLibrary.quotes.hope, ...motivationalLibrary.quotes.strength] :
    [...motivationalLibrary.quotes.progress, ...motivationalLibrary.quotes.resilience];
  
  const dailyQuote = contentPool[Math.floor(Math.random() * contentPool.length)];
  const dailyAffirmation = motivationalLibrary.affirmations.daily[
    Math.floor(Math.random() * motivationalLibrary.affirmations.daily.length)
  ];
  
  let message = `Today's Inspiration:\n\n"${dailyQuote}"\n\n`;
  message += `Your affirmation: ${dailyAffirmation}`;
  
  if (dayOfRecovery) {
    message += `\n\nDay ${dayOfRecovery} - Keep going! 💫`;
  }
  
  return {
    message,
    type: 'quote',
    confidence: 0.9,
    resources: [
      { type: 'meditation', title: 'Morning meditation' },
      { type: 'journal', title: 'Gratitude journaling' }
    ],
    nextSteps: [
      'Set an intention for today',
      'Practice your affirmation',
      'Check in with your feelings'
    ]
  };
}

/**
 * Generate crisis encouragement with urgency and compassion
 */
async function generateCrisisEncouragement(
  payload: any
): Promise<MotivationalResponse> {
  const { userId } = payload;
  
  // Select crisis-appropriate affirmations
  const crisisAffirmation = motivationalLibrary.affirmations.crisis[
    Math.floor(Math.random() * motivationalLibrary.affirmations.crisis.length)
  ];
  
  let message = "I hear that you're struggling right now. Please remember:\n\n";
  message += `${crisisAffirmation}\n\n`;
  message += "You don't have to face this alone. Help is here, and it's okay to reach out. ";
  message += "This moment will pass, and you have the strength to get through it.";
  
  return {
    message,
    type: 'encouragement',
    confidence: 1.0,
    resources: [
      { type: 'crisis', title: 'Crisis Support Line: 988', urgent: true },
      { type: 'breathing', title: 'Guided breathing exercise' },
      { type: 'grounding', title: '5-4-3-2-1 grounding technique' }
    ],
    nextSteps: [
      'Reach out to your support network',
      'Use a coping strategy that works for you',
      'Call crisis support if needed: 988'
    ]
  };
}

// Helper functions

function selectContentCategory(mood: string | undefined, stage: string | undefined): string {
  if (mood === 'crisis') return 'crisis';
  if (mood === 'sad' || mood === 'anxious') return 'hope';
  if (stage === 'early') return 'strength';
  if (stage === 'maintenance') return 'progress';
  return 'resilience';
}

function selectBaseContent(category: string, preferences: any): string {
  const pool = motivationalLibrary.quotes[category as keyof typeof motivationalLibrary.quotes] || 
               motivationalLibrary.quotes.hope;
  
  // If user prefers shorter content
  if (preferences?.contentLength === 'short') {
    return pool.filter(q => q.length < 100)[0] || pool[0];
  }
  
  return pool[Math.floor(Math.random() * pool.length)];
}

async function personalizeContent(baseContent: string, payload: any): Promise<string> {
  let personalized = baseContent;
  
  // Add stage-specific encouragement
  if (payload.stage === 'early') {
    personalized += "\n\nThe early days are challenging, but each one makes you stronger.";
  } else if (payload.stage === 'maintenance') {
    personalized += "\n\nYour continued commitment to recovery is inspiring.";
  }
  
  // Add time-of-day appropriate message
  const hour = new Date().getHours();
  if (hour < 12) {
    personalized += " Start your day with intention.";
  } else if (hour < 17) {
    personalized += " You're doing great today.";
  } else {
    personalized += " Rest well knowing you chose recovery today.";
  }
  
  return personalized;
}

async function findRelevantResources(mood: string | undefined, stage: string | undefined): Promise<any[]> {
  const resources = [];
  
  if (mood === 'anxious') {
    resources.push(
      { type: 'technique', title: 'Anxiety management techniques' },
      { type: 'meditation', title: 'Calming meditation' }
    );
  }
  
  if (mood === 'sad') {
    resources.push(
      { type: 'activity', title: 'Mood-boosting activities' },
      { type: 'connection', title: 'Connect with peer support' }
    );
  }
  
  if (stage === 'early') {
    resources.push(
      { type: 'guide', title: 'Early recovery guide' },
      { type: 'tips', title: 'Daily recovery tips' }
    );
  }
  
  return resources;
}

function generateNextSteps(mood: string | undefined, stage: string | undefined): string[] {
  const steps = [];
  
  // Mood-based steps
  if (mood === 'anxious') {
    steps.push('Practice deep breathing for 5 minutes');
    steps.push('Try a grounding exercise');
  } else if (mood === 'sad') {
    steps.push('Reach out to someone in your support network');
    steps.push('Engage in a favorite sober activity');
  } else {
    steps.push('Continue your daily recovery routine');
    steps.push('Celebrate today\'s progress');
  }
  
  // Stage-based steps
  if (stage === 'early') {
    steps.push('Attend a support meeting');
  } else {
    steps.push('Help someone else in their recovery journey');
  }
  
  return steps;
}

function determineContentType(category: string): 'quote' | 'story' | 'affirmation' | 'milestone' | 'encouragement' {
  const typeMap: Record<string, any> = {
    'hope': 'quote',
    'strength': 'affirmation',
    'progress': 'quote',
    'resilience': 'story',
    'crisis': 'encouragement'
  };
  
  return typeMap[category] || 'encouragement';
}

function identifyPersonalizedElements(payload: any): string[] {
  const elements = [];
  
  if (payload.mood) elements.push(`mood-based: ${payload.mood}`);
  if (payload.stage) elements.push(`stage-appropriate: ${payload.stage}`);
  if (payload.preferences?.contentLength) elements.push(`length: ${payload.preferences.contentLength}`);
  if (payload.milestone) elements.push(`milestone: ${payload.milestone}`);
  
  return elements;
}

async function getDayOfRecovery(userId: string | undefined): Promise<number | null> {
  if (!userId) return null;
  
  try {
    // Query user's recovery start date
    const result = await dynamodb.getItem({
      TableName: 'UserProfiles',
      Key: { userId: { S: userId } }
    });
    
    if (result.Item?.recoveryStartDate) {
      const startDate = new Date(result.Item.recoveryStartDate.S);
      const today = new Date();
      const days = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return days;
    }
  } catch (error) {
    console.error('Failed to get recovery day:', error);
  }
  
  return null;
}

async function trackEngagement(userId: string, data: any): Promise<void> {
  try {
    await dynamodb.putItem({
      TableName: process.env.ACTIVITY_TABLE || 'PeerSupportActivity',
      Item: {
        id: { S: `engagement-${userId}-${Date.now()}` },
        userId: { S: userId },
        type: { S: 'content_engagement' },
        data: { S: JSON.stringify(data) },
        timestamp: { N: Date.now().toString() },
        ttl: { N: Math.floor(Date.now() / 1000 + 86400 * 30).toString() }
      }
    });
  } catch (error) {
    console.error('Failed to track engagement:', error);
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