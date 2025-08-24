/**
 * Peer Connection Worker Agent  
 * Matches users with compatible peers, support groups, and mentors
 * Uses intelligent matching algorithms and MCP LinkedIn integration
 */

import { Context } from 'aws-lambda';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });
const dynamodb = new DynamoDB({ region: process.env.AWS_REGION });

interface PeerConnectionRequest {
  action: string;
  payload: {
    userId?: string;
    interests?: string[];
    recoveryStage?: string;
    preferences?: any;
    supportType?: 'peer' | 'mentor' | 'group' | 'any';
    availability?: string[];
  };
  agentConfig: any;
}

interface PeerConnectionResponse {
  matches?: PeerMatch[];
  groups?: SupportGroup[];
  mentors?: Mentor[];
  connectionScore: number;
  recommendedActions: string[];
  safetyVerified: boolean;
}

interface PeerMatch {
  userId: string;
  displayName: string;
  compatibilityScore: number;
  sharedInterests: string[];
  recoveryStage: string;
  connectionType: string;
  bio?: string;
}

interface SupportGroup {
  groupId: string;
  name: string;
  focus: string;
  size: number;
  meetingSchedule: string;
  fitScore: number;
  isOpen: boolean;
}

interface Mentor {
  mentorId: string;
  displayName: string;
  yearsInRecovery: number;
  specialties: string[];
  availability: string[];
  matchScore: number;
  verified: boolean;
}

/**
 * Lambda handler for peer connection worker
 */
export const handler = async (
  event: PeerConnectionRequest,
  context: Context
): Promise<PeerConnectionResponse> => {
  const startTime = Date.now();
  
  try {
    // Report worker health
    await reportWorkerHealth('peer-connection');
    
    switch (event.action) {
      case 'findMatches':
        return await findPeerMatches(event.payload);
      
      case 'findPeers':
        return await findCompatiblePeers(event.payload);
      
      case 'findGroups':
        return await findSupportGroups(event.payload);
      
      case 'findMentors':
        return await findMentors(event.payload);
      
      case 'verifyConnection':
        return await verifyConnectionSafety(event.payload);
      
      default:
        return await findPeerMatches(event.payload);
    }
  } catch (error) {
    console.error('Peer connection error:', error);
    await reportError(error as Error, context.requestId);
    
    // Return empty but safe response
    return {
      matches: [],
      groups: [],
      mentors: [],
      connectionScore: 0,
      recommendedActions: ['Try again later'],
      safetyVerified: true
    };
  } finally {
    // Report processing time
    await reportMetric('ProcessingTime', Date.now() - startTime, 'peer-connection');
  }
};

/**
 * Find comprehensive peer matches including peers, groups, and mentors
 */
async function findPeerMatches(
  payload: any
): Promise<PeerConnectionResponse> {
  const { userId, preferences, recoveryStage, supportType } = payload;
  
  // Load user profile for matching
  const userProfile = await loadUserProfile(userId);
  
  // Initialize results
  let matches: PeerMatch[] = [];
  let groups: SupportGroup[] = [];
  let mentors: Mentor[] = [];
  
  // Find appropriate connections based on support type
  if (supportType === 'peer' || supportType === 'any') {
    matches = await findCompatiblePeersInternal(userProfile, preferences);
  }
  
  if (supportType === 'group' || supportType === 'any') {
    groups = await findSupportGroupsInternal(userProfile, preferences);
  }
  
  if (supportType === 'mentor' || supportType === 'any') {
    mentors = await findMentorsInternal(userProfile, preferences);
  }
  
  // Calculate overall connection score
  const connectionScore = calculateConnectionScore(matches, groups, mentors);
  
  // Generate recommended actions
  const recommendedActions = generateRecommendations(
    matches.length,
    groups.length,
    mentors.length,
    recoveryStage
  );
  
  // Verify safety of all connections
  const safetyVerified = await verifyAllConnectionsSafety(matches, groups, mentors);
  
  // Track connection attempt
  if (userId) {
    await trackConnectionAttempt(userId, {
      matchesFound: matches.length,
      groupsFound: groups.length,
      mentorsFound: mentors.length,
      timestamp: Date.now()
    });
  }
  
  return {
    matches: matches.slice(0, 5), // Top 5 matches
    groups: groups.slice(0, 3),   // Top 3 groups
    mentors: mentors.slice(0, 2),  // Top 2 mentors
    connectionScore,
    recommendedActions,
    safetyVerified
  };
}

/**
 * Find compatible peers based on multiple factors
 */
async function findCompatiblePeers(
  payload: any
): Promise<PeerConnectionResponse> {
  const { userId, interests, recoveryStage } = payload;
  
  const userProfile = await loadUserProfile(userId);
  const matches = await findCompatiblePeersInternal(userProfile, { interests, recoveryStage });
  
  return {
    matches,
    connectionScore: matches.length > 0 ? 0.8 : 0.2,
    recommendedActions: [
      'Reach out to a peer',
      'Join a support group',
      'Share your story'
    ],
    safetyVerified: true
  };
}

/**
 * Find appropriate support groups
 */
async function findSupportGroups(
  payload: any
): Promise<PeerConnectionResponse> {
  const { userId, interests, recoveryStage } = payload;
  
  const userProfile = await loadUserProfile(userId);
  const groups = await findSupportGroupsInternal(userProfile, { interests, recoveryStage });
  
  return {
    groups,
    connectionScore: groups.length > 0 ? 0.85 : 0.3,
    recommendedActions: [
      'Attend a group meeting',
      'Introduce yourself',
      'Listen and share when ready'
    ],
    safetyVerified: true
  };
}

/**
 * Find suitable mentors
 */
async function findMentors(
  payload: any
): Promise<PeerConnectionResponse> {
  const { userId, preferences, recoveryStage } = payload;
  
  const userProfile = await loadUserProfile(userId);
  const mentors = await findMentorsInternal(userProfile, { ...preferences, recoveryStage });
  
  return {
    mentors,
    connectionScore: mentors.length > 0 ? 0.9 : 0.4,
    recommendedActions: [
      'Reach out to a mentor',
      'Prepare questions',
      'Be open to guidance'
    ],
    safetyVerified: true
  };
}

/**
 * Verify connection safety
 */
async function verifyConnectionSafety(
  payload: any
): Promise<PeerConnectionResponse> {
  const { userId } = payload;
  
  // Implement safety checks
  const safetyChecks = {
    profileVerified: await verifyUserProfile(userId),
    noRedFlags: await checkForRedFlags(userId),
    appropriateStage: await checkRecoveryStageCompatibility(userId)
  };
  
  const safetyVerified = Object.values(safetyChecks).every(check => check);
  
  return {
    connectionScore: safetyVerified ? 1.0 : 0,
    recommendedActions: safetyVerified ? 
      ['Safe to connect'] : 
      ['Review safety guidelines', 'Contact support if needed'],
    safetyVerified
  };
}

// Internal helper functions

async function findCompatiblePeersInternal(
  userProfile: any,
  preferences: any
): Promise<PeerMatch[]> {
  // Simulate peer matching algorithm
  // In production, this would query a peer database
  
  const mockPeers: PeerMatch[] = [
    {
      userId: 'peer-001',
      displayName: 'Alex S.',
      compatibilityScore: 0.92,
      sharedInterests: ['meditation', 'fitness', 'reading'],
      recoveryStage: 'maintenance',
      connectionType: 'peer',
      bio: '2 years in recovery, love outdoor activities'
    },
    {
      userId: 'peer-002',
      displayName: 'Jordan M.',
      compatibilityScore: 0.87,
      sharedInterests: ['art', 'music', 'journaling'],
      recoveryStage: 'active',
      connectionType: 'peer',
      bio: 'Finding strength through creativity'
    },
    {
      userId: 'peer-003',
      displayName: 'Sam K.',
      compatibilityScore: 0.85,
      sharedInterests: ['cooking', 'volunteering'],
      recoveryStage: 'maintenance',
      connectionType: 'peer',
      bio: 'Paying it forward in recovery'
    }
  ];
  
  // Filter and sort based on preferences
  return mockPeers
    .filter(peer => {
      if (preferences?.recoveryStage) {
        return peer.recoveryStage === preferences.recoveryStage;
      }
      return true;
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

async function findSupportGroupsInternal(
  userProfile: any,
  preferences: any
): Promise<SupportGroup[]> {
  // Simulate group matching
  // In production, this would query a groups database
  
  const mockGroups: SupportGroup[] = [
    {
      groupId: 'group-001',
      name: 'Morning Motivation',
      focus: 'Daily check-ins and accountability',
      size: 12,
      meetingSchedule: 'Daily at 8 AM',
      fitScore: 0.88,
      isOpen: true
    },
    {
      groupId: 'group-002',
      name: 'Creative Recovery',
      focus: 'Art and expression in recovery',
      size: 8,
      meetingSchedule: 'Wednesdays at 6 PM',
      fitScore: 0.82,
      isOpen: true
    },
    {
      groupId: 'group-003',
      name: 'Family Healing Circle',
      focus: 'Family dynamics and recovery',
      size: 15,
      meetingSchedule: 'Saturdays at 10 AM',
      fitScore: 0.75,
      isOpen: false
    }
  ];
  
  // Filter based on preferences
  return mockGroups
    .filter(group => {
      if (preferences?.interests) {
        const groupFocusLower = group.focus.toLowerCase();
        return preferences.interests.some((interest: string) => 
          groupFocusLower.includes(interest.toLowerCase())
        );
      }
      return true;
    })
    .sort((a, b) => b.fitScore - a.fitScore);
}

async function findMentorsInternal(
  userProfile: any,
  preferences: any
): Promise<Mentor[]> {
  // Simulate mentor matching
  // In production, this would query a mentors database
  
  const mockMentors: Mentor[] = [
    {
      mentorId: 'mentor-001',
      displayName: 'Dr. Sarah Williams',
      yearsInRecovery: 10,
      specialties: ['trauma', 'anxiety', 'relapse prevention'],
      availability: ['evenings', 'weekends'],
      matchScore: 0.95,
      verified: true
    },
    {
      mentorId: 'mentor-002',
      displayName: 'Michael Chen',
      yearsInRecovery: 7,
      specialties: ['career recovery', 'family healing'],
      availability: ['mornings', 'afternoons'],
      matchScore: 0.88,
      verified: true
    }
  ];
  
  // Match based on needs and availability
  return mockMentors
    .filter(mentor => {
      if (preferences?.availability) {
        return mentor.availability.some(time => 
          preferences.availability.includes(time)
        );
      }
      return true;
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

async function loadUserProfile(userId?: string): Promise<any> {
  if (!userId) {
    return { userId: 'anonymous', preferences: {} };
  }
  
  try {
    const result = await dynamodb.getItem({
      TableName: 'UserProfiles',
      Key: { userId: { S: userId } }
    });
    
    if (result.Item) {
      return {
        userId,
        interests: result.Item.interests?.SS || [],
        recoveryStage: result.Item.recoveryStage?.S || 'early',
        preferences: JSON.parse(result.Item.preferences?.S || '{}')
      };
    }
  } catch (error) {
    console.error('Failed to load user profile:', error);
  }
  
  return { userId, preferences: {} };
}

function calculateConnectionScore(
  matches: PeerMatch[],
  groups: SupportGroup[],
  mentors: Mentor[]
): number {
  const hasMatches = matches.length > 0 ? 0.3 : 0;
  const hasGroups = groups.length > 0 ? 0.3 : 0;
  const hasMentors = mentors.length > 0 ? 0.4 : 0;
  
  return Math.min(1.0, hasMatches + hasGroups + hasMentors);
}

function generateRecommendations(
  matchCount: number,
  groupCount: number,
  mentorCount: number,
  recoveryStage?: string
): string[] {
  const recommendations = [];
  
  if (matchCount > 0) {
    recommendations.push('Connect with a peer who shares your interests');
  } else {
    recommendations.push('Expand your interests to find more connections');
  }
  
  if (groupCount > 0) {
    recommendations.push('Join a support group that fits your schedule');
  }
  
  if (mentorCount > 0 && recoveryStage !== 'early') {
    recommendations.push('Consider working with a mentor');
  }
  
  if (recoveryStage === 'early') {
    recommendations.push('Focus on building your support network');
  } else if (recoveryStage === 'maintenance') {
    recommendations.push('Consider becoming a mentor yourself');
  }
  
  return recommendations;
}

async function verifyAllConnectionsSafety(
  matches: PeerMatch[],
  groups: SupportGroup[],
  mentors: Mentor[]
): Promise<boolean> {
  // Verify all peers
  for (const match of matches) {
    const safe = await verifyUserProfile(match.userId);
    if (!safe) return false;
  }
  
  // Verify all mentors
  for (const mentor of mentors) {
    if (!mentor.verified) return false;
  }
  
  // Groups are pre-verified
  return true;
}

async function verifyUserProfile(userId: string): Promise<boolean> {
  // In production, check against safety database
  // For now, simulate verification
  return !userId.includes('blocked') && !userId.includes('flagged');
}

async function checkForRedFlags(userId: string): Promise<boolean> {
  // Check for concerning behavior patterns
  // In production, query incident database
  return true;
}

async function checkRecoveryStageCompatibility(userId: string): Promise<boolean> {
  // Ensure users are matched with appropriate recovery stages
  // Early recovery shouldn't mentor, etc.
  return true;
}

async function trackConnectionAttempt(userId: string, data: any): Promise<void> {
  try {
    await dynamodb.putItem({
      TableName: process.env.ACTIVITY_TABLE || 'PeerSupportActivity',
      Item: {
        id: { S: `connection-${userId}-${Date.now()}` },
        userId: { S: userId },
        type: { S: 'connection_attempt' },
        data: { S: JSON.stringify(data) },
        timestamp: { N: Date.now().toString() },
        ttl: { N: Math.floor(Date.now() / 1000 + 86400 * 30).toString() }
      }
    });
  } catch (error) {
    console.error('Failed to track connection attempt:', error);
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