/**
 * PeerSupport Queen Lambda Handler
 * Coordinates the peer support swarm and orchestrates responses
 * Integrates with MCP servers and manages Byzantine consensus
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { Lambda } from '@aws-sdk/client-lambda';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { peerSupportSwarm, PeerSupportAgent } from './swarm-config';
import { RecoveryCoachAgent } from '../../../src/agents/RecoveryCoachAgent';

// Initialize AWS clients
const secretsManager = new SecretsManager({ region: process.env.AWS_REGION });
const dynamodb = new DynamoDB({ region: process.env.AWS_REGION });
const lambda = new Lambda({ region: process.env.AWS_REGION });
const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });

// Rate limiting configuration
const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE || 'PeerSupportRateLimit';
const MAX_REQUESTS_PER_MINUTE = 10;

interface PeerMessageRequest {
  userId: string;
  mood?: 'happy' | 'sad' | 'anxious' | 'neutral' | 'crisis';
  context?: string;
  language?: string;
  culturalBackground?: string;
  recoveryStage?: string;
  preferences?: Record<string, any>;
}

interface SwarmResponse {
  message: string;
  supportType: string;
  confidence: number;
  agents: string[];
  resources?: any[];
  nextSteps?: string[];
  culturallyAdapted: boolean;
}

/**
 * Main Lambda handler for peer support requests
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('PeerSupport Queen Lambda invoked', { 
    requestId: context.requestId,
    path: event.path 
  });

  try {
    // Initialize swarm health monitoring
    await reportSwarmHealth();

    // Parse request
    const request: PeerMessageRequest = JSON.parse(event.body || '{}');
    
    // Validate request
    if (!request.userId) {
      return createResponse(400, { error: 'userId is required' });
    }

    // Check rate limiting
    const rateLimitOk = await checkRateLimit(request.userId);
    if (!rateLimitOk) {
      return createResponse(429, { 
        error: 'Rate limit exceeded',
        retryAfter: 60 
      });
    }

    // Load secrets from AWS Secrets Manager
    const credentials = await loadCredentials();

    // Route based on endpoint
    if (event.path === '/peer/message') {
      return await handlePeerMessage(request, credentials);
    } else if (event.path === '/peer/connect') {
      return await handlePeerConnection(request, credentials);
    } else if (event.path === '/peer/crisis') {
      return await handleCrisisSupport(request, credentials);
    } else if (event.path === '/peer/health') {
      return await handleHealthCheck();
    }

    return createResponse(404, { error: 'Endpoint not found' });

  } catch (error) {
    console.error('Error in PeerSupport Queen Lambda:', error);
    
    // Report error to CloudWatch
    await reportError(error as Error, context.requestId);
    
    return createResponse(500, { 
      error: 'Internal server error',
      requestId: context.requestId 
    });
  }
};

/**
 * Handle peer support message requests
 */
async function handlePeerMessage(
  request: PeerMessageRequest,
  credentials: any
): Promise<APIGatewayProxyResult> {
  
  // Step 1: Analyze mood and context with swarm
  const analysisAgents = peerSupportSwarm.findAgentsByCapability('sentiment_analysis');
  const emotionalAnalysis = await invokeWorkerAgent(
    analysisAgents[0],
    'analyze',
    { mood: request.mood, context: request.context }
  );

  // Step 2: Check for crisis indicators
  if (emotionalAnalysis.severity === 'critical' || request.mood === 'crisis') {
    // Byzantine consensus required for crisis
    const consensus = await peerSupportSwarm.requestByzantineConsensus(
      'crisis_intervention',
      { userId: request.userId, analysis: emotionalAnalysis }
    );

    if (consensus.approved) {
      // Escalate to crisis support
      return await handleCrisisSupport(request, credentials);
    }
  }

  // Step 3: Generate personalized motivational content
  const contentAgents = peerSupportSwarm.findAgentsByCapability('motivational_messaging');
  const motivationalContent = await invokeWorkerAgent(
    contentAgents[0],
    'generate',
    {
      mood: request.mood,
      stage: request.recoveryStage,
      preferences: request.preferences
    }
  );

  // Step 4: Apply cultural adaptation
  const culturalAgents = peerSupportSwarm.findAgentsByCapability('cultural_awareness');
  const culturallyAdapted = await invokeWorkerAgent(
    culturalAgents[0],
    'adapt',
    {
      content: motivationalContent,
      culture: request.culturalBackground,
      language: request.language
    }
  );

  // Step 5: Personalize response
  const personalizationAgents = peerSupportSwarm.findAgentsByCapability('user_preference_learning');
  const personalizedResponse = await invokeWorkerAgent(
    personalizationAgents[0],
    'personalize',
    {
      content: culturallyAdapted,
      userId: request.userId,
      preferences: request.preferences
    }
  );

  // Step 6: Find peer connections if needed
  let peerConnections = [];
  if (request.context?.includes('lonely') || request.context?.includes('isolated')) {
    const connectionAgents = peerSupportSwarm.findAgentsByCapability('peer_matching');
    peerConnections = await invokeWorkerAgent(
      connectionAgents[0],
      'findPeers',
      { userId: request.userId, interests: request.preferences }
    );
  }

  // Construct swarm response
  const response: SwarmResponse = {
    message: personalizedResponse.message,
    supportType: personalizedResponse.type || 'motivational',
    confidence: personalizedResponse.confidence || 0.85,
    agents: [
      analysisAgents[0].name,
      contentAgents[0].name,
      culturalAgents[0].name,
      personalizationAgents[0].name
    ],
    resources: personalizedResponse.resources || [],
    nextSteps: personalizedResponse.nextSteps || [],
    culturallyAdapted: true
  };

  // Log successful response
  await logSwarmActivity('peer_message', request.userId, response);

  return createResponse(200, response);
}

/**
 * Handle peer connection requests
 */
async function handlePeerConnection(
  request: PeerMessageRequest,
  credentials: any
): Promise<APIGatewayProxyResult> {
  
  const connectionAgents = peerSupportSwarm.findAgentsByCapability('peer_matching');
  
  const connections = await invokeWorkerAgent(
    connectionAgents[0],
    'findMatches',
    {
      userId: request.userId,
      preferences: request.preferences,
      recoveryStage: request.recoveryStage
    }
  );

  return createResponse(200, {
    connections: connections.matches || [],
    groups: connections.groups || [],
    mentors: connections.mentors || []
  });
}

/**
 * Handle crisis support with Byzantine consensus
 */
async function handleCrisisSupport(
  request: PeerMessageRequest,
  credentials: any
): Promise<APIGatewayProxyResult> {
  
  console.log('🚨 Crisis support activated for user:', request.userId);

  // Get Byzantine consensus for crisis intervention
  const consensus = await peerSupportSwarm.requestByzantineConsensus(
    'crisis_intervention',
    {
      userId: request.userId,
      severity: 'high',
      immediateRisk: true
    }
  );

  if (!consensus.approved) {
    return createResponse(403, {
      error: 'Crisis intervention not approved by consensus',
      votes: Array.from(consensus.votes.entries())
    });
  }

  // Activate crisis response swarm
  const crisisResponse = await lambda.invoke({
    FunctionName: process.env.CRISIS_SWARM_FUNCTION || 'CrisisResponseSwarm',
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({
      userId: request.userId,
      triggerSource: 'peer-support',
      context: request.context
    })
  }).promise();

  return createResponse(200, {
    status: 'crisis_support_activated',
    responseTeam: JSON.parse(crisisResponse.Payload as string)
  });
}

/**
 * Health check endpoint
 */
async function handleHealthCheck(): Promise<APIGatewayProxyResult> {
  const health = peerSupportSwarm.getSwarmHealth();
  
  return createResponse(200, {
    status: 'healthy',
    swarm: health,
    timestamp: new Date().toISOString()
  });
}

/**
 * Invoke a worker agent Lambda
 */
async function invokeWorkerAgent(
  agent: PeerSupportAgent,
  action: string,
  payload: any
): Promise<any> {
  
  const functionName = `PeerSupportWorker-${agent.id}`;
  
  try {
    const response = await lambda.invoke({
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        action,
        payload,
        agentConfig: agent
      })
    }).promise();

    return JSON.parse(response.Payload as string);
  } catch (error) {
    console.error(`Error invoking worker agent ${agent.id}:`, error);
    
    // Fallback to local RecoveryCoachAgent
    const localAgent = new RecoveryCoachAgent();
    return localAgent.processRequest(action, payload);
  }
}

/**
 * Check rate limiting using DynamoDB
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window

  try {
    // Get recent requests
    const result = await dynamodb.query({
      TableName: RATE_LIMIT_TABLE,
      KeyConditionExpression: 'userId = :userId AND requestTime > :windowStart',
      ExpressionAttributeValues: {
        ':userId': { S: userId },
        ':windowStart': { N: windowStart.toString() }
      }
    });

    const requestCount = result.Items?.length || 0;
    
    if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
      return false;
    }

    // Add current request
    await dynamodb.putItem({
      TableName: RATE_LIMIT_TABLE,
      Item: {
        userId: { S: userId },
        requestTime: { N: now.toString() },
        ttl: { N: Math.floor(now / 1000 + 3600).toString() } // Expire after 1 hour
      }
    });

    return true;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Allow request on error
  }
}

/**
 * Load credentials from AWS Secrets Manager
 */
async function loadCredentials(): Promise<any> {
  try {
    const secret = await secretsManager.getSecretValue({
      SecretId: process.env.SECRET_NAME || '/serenity/prod/api-keys'
    });

    return JSON.parse(secret.SecretString || '{}');
  } catch (error) {
    console.error('Failed to load credentials:', error);
    return {};
  }
}

/**
 * Report swarm health to CloudWatch
 */
async function reportSwarmHealth(): Promise<void> {
  const health = peerSupportSwarm.getSwarmHealth();

  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/PeerSupport',
      MetricData: [
        {
          MetricName: 'SwarmHealth',
          Value: health.healthScore,
          Unit: 'None',
          Timestamp: new Date()
        },
        {
          MetricName: 'AverageResponseTime',
          Value: health.averageResponseTime,
          Unit: 'Milliseconds',
          Timestamp: new Date()
        },
        {
          MetricName: 'ActiveAgents',
          Value: health.totalAgents,
          Unit: 'Count',
          Timestamp: new Date()
        }
      ]
    });
  } catch (error) {
    console.error('Failed to report swarm health:', error);
  }
}

/**
 * Report errors to CloudWatch
 */
async function reportError(error: Error, requestId: string): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/PeerSupport',
      MetricData: [
        {
          MetricName: 'Errors',
          Value: 1,
          Unit: 'Count',
          Timestamp: new Date(),
          Dimensions: [
            {
              Name: 'ErrorType',
              Value: error.name || 'Unknown'
            },
            {
              Name: 'RequestId',
              Value: requestId
            }
          ]
        }
      ]
    });
  } catch (err) {
    console.error('Failed to report error metric:', err);
  }
}

/**
 * Log swarm activity to DynamoDB
 */
async function logSwarmActivity(
  action: string,
  userId: string,
  response: any
): Promise<void> {
  try {
    await dynamodb.putItem({
      TableName: process.env.ACTIVITY_TABLE || 'PeerSupportActivity',
      Item: {
        id: { S: `${userId}-${Date.now()}` },
        userId: { S: userId },
        action: { S: action },
        timestamp: { N: Date.now().toString() },
        response: { S: JSON.stringify(response) },
        ttl: { N: Math.floor(Date.now() / 1000 + 86400 * 30).toString() } // 30 days
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * Create API Gateway response
 */
function createResponse(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Swarm-Version': '1.0.0',
      'X-Byzantine-Consensus': 'enabled'
    },
    body: JSON.stringify(body)
  };
}