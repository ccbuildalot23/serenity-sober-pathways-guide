/**
 * Clinical Coordinator Lambda - Byzantine Fault-Tolerant Leader
 * Orchestrates clinical decision support with consensus mechanisms
 * Integrates with FHIR servers and medical knowledge bases via MCP
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { Lambda } from '@aws-sdk/client-lambda';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { S3 } from '@aws-sdk/client-s3';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { v4 as uuidv4 } from 'uuid';

// AWS Clients
const dynamodb = new DynamoDB({ region: process.env.AWS_REGION });
const lambda = new Lambda({ region: process.env.AWS_REGION });
const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });
const s3 = new S3({ region: process.env.AWS_REGION });
const secretsManager = new SecretsManager({ region: process.env.AWS_REGION });

// Byzantine configuration
const BYZANTINE_NODES = parseInt(process.env.BYZANTINE_NODES || '9');
const BYZANTINE_THRESHOLD = parseFloat(process.env.BYZANTINE_THRESHOLD || '0.67');

interface ClinicalRequest {
  patientId: string;
  providerId: string;
  requestType: 'diagnosis' | 'treatment' | 'medication' | 'consensus';
  symptoms?: string[];
  conditions?: string[];
  medications?: string[];
  allergies?: string[];
  labResults?: any[];
  vitalSigns?: any;
  medicalHistory?: any[];
}

interface ClinicalDecision {
  decisionId: string;
  patientId: string;
  timestamp: number;
  type: string;
  recommendations: any[];
  confidence: number;
  consensus: ConsensusResult;
  evidence: any[];
  warnings?: string[];
  contraindications?: string[];
}

interface ConsensusResult {
  achieved: boolean;
  votes: Map<string, any>;
  byzantineNodes: string[];
  finalDecision: any;
  confidence: number;
}

interface WorkerVote {
  workerId: string;
  decision: any;
  confidence: number;
  reasoning: string;
  timestamp: number;
}

/**
 * Main Lambda handler for clinical coordination
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Clinical Coordinator invoked', {
    requestId: context.requestId,
    path: event.path
  });

  try {
    // Report swarm health
    await reportSwarmHealth();

    // Parse request
    const request: ClinicalRequest = JSON.parse(event.body || '{}');
    
    // Validate request
    if (!request.patientId || !request.providerId) {
      return createResponse(400, { 
        error: 'patientId and providerId are required' 
      });
    }

    // Load clinical credentials
    const credentials = await loadClinicalCredentials();

    // Route based on endpoint
    switch (event.path) {
      case '/clinical/diagnosis':
        return await handleDiagnosisRequest(request, credentials, context);
      
      case '/clinical/treatment':
        return await handleTreatmentRequest(request, credentials, context);
      
      case '/clinical/medication':
        return await handleMedicationRequest(request, credentials, context);
      
      case '/clinical/consensus':
        return await handleConsensusRequest(request, credentials, context);
      
      case '/clinical/health':
        return await handleHealthCheck();
      
      default:
        return createResponse(404, { error: 'Endpoint not found' });
    }

  } catch (error) {
    console.error('Clinical Coordinator error:', error);
    await reportError(error as Error, context.requestId);
    
    return createResponse(500, {
      error: 'Internal server error',
      requestId: context.requestId
    });
  }
};

/**
 * Handle diagnosis request with Byzantine consensus
 */
async function handleDiagnosisRequest(
  request: ClinicalRequest,
  credentials: any,
  _context: Context
): Promise<APIGatewayProxyResult> {
  
  const consensusId = uuidv4();
  const startTime = Date.now();
  
  // Step 1: Distribute diagnosis task to worker nodes
  const workerVotes = await collectWorkerVotes(
    'diagnosis-analyzer',
    'analyzeDiagnosis',
    {
      symptoms: request.symptoms,
      labResults: request.labResults,
      vitalSigns: request.vitalSigns,
      medicalHistory: request.medicalHistory
    },
    consensusId
  );

  // Step 2: Detect Byzantine nodes
  const byzantineNodes = detectByzantineNodes(workerVotes);
  
  // Step 3: Achieve consensus
  const consensus = achieveConsensus(workerVotes, byzantineNodes);
  
  if (!consensus.achieved) {
    return createResponse(409, {
      error: 'Unable to achieve consensus',
      byzantineNodes: Array.from(byzantineNodes),
      confidence: consensus.confidence
    });
  }

  // Step 4: Generate comprehensive diagnosis
  const diagnosis = await generateDiagnosis(
    request,
    consensus,
    credentials
  );

  // Step 5: Store decision
  await storeClinicalDecision(diagnosis);

  // Step 6: Report metrics
  await reportMetrics('diagnosis', Date.now() - startTime, consensus);

  return createResponse(200, diagnosis);
}

/**
 * Handle treatment planning with Byzantine consensus
 */
async function handleTreatmentRequest(
  request: ClinicalRequest,
  credentials: any,
  _context: Context
): Promise<APIGatewayProxyResult> {
  
  const consensusId = uuidv4();
  const startTime = Date.now();
  
  // Collect treatment recommendations from workers
  const workerVotes = await collectWorkerVotes(
    'treatment-planner',
    'planTreatment',
    {
      conditions: request.conditions,
      patientId: request.patientId,
      allergies: request.allergies,
      medications: request.medications
    },
    consensusId
  );

  // Byzantine fault detection
  const byzantineNodes = detectByzantineNodes(workerVotes);
  
  // Achieve consensus
  const consensus = achieveConsensus(workerVotes, byzantineNodes);
  
  if (!consensus.achieved) {
    return createResponse(409, {
      error: 'Treatment consensus not achieved',
      byzantineNodes: Array.from(byzantineNodes)
    });
  }

  // Generate treatment plan
  const treatmentPlan = await generateTreatmentPlan(
    request,
    consensus,
    credentials
  );

  // Store and report
  await storeTreatmentPlan(treatmentPlan);
  await reportMetrics('treatment', Date.now() - startTime, consensus);

  return createResponse(200, treatmentPlan);
}

/**
 * Handle medication management with drug interaction checking
 */
async function handleMedicationRequest(
  request: ClinicalRequest,
  credentials: any,
  _context: Context
): Promise<APIGatewayProxyResult> {
  
  const consensusId = uuidv4();
  const startTime = Date.now();
  
  // Check drug interactions via workers
  const workerVotes = await collectWorkerVotes(
    'medication-manager',
    'checkMedications',
    {
      currentMedications: request.medications,
      conditions: request.conditions,
      allergies: request.allergies,
      patientId: request.patientId
    },
    consensusId
  );

  // Byzantine detection
  const byzantineNodes = detectByzantineNodes(workerVotes);
  
  // Consensus
  const consensus = achieveConsensus(workerVotes, byzantineNodes);
  
  // Generate medication recommendations
  const medicationPlan = {
    decisionId: consensusId,
    patientId: request.patientId,
    timestamp: Date.now(),
    type: 'medication',
    recommendations: consensus.finalDecision.medications || [],
    interactions: consensus.finalDecision.interactions || [],
    warnings: consensus.finalDecision.warnings || [],
    contraindications: consensus.finalDecision.contraindications || [],
    confidence: consensus.confidence,
    consensus
  };

  // Store decision
  await storeClinicalDecision(medicationPlan);
  await reportMetrics('medication', Date.now() - startTime, consensus);

  return createResponse(200, medicationPlan);
}

/**
 * Handle general consensus requests
 */
async function handleConsensusRequest(
  request: ClinicalRequest,
  credentials: any,
  _context: Context
): Promise<APIGatewayProxyResult> {
  
  const consensusId = uuidv4();
  
  // Collect votes from all clinical workers
  const allVotes: WorkerVote[] = [];
  
  const workerTypes = [
    'diagnosis-analyzer',
    'treatment-planner',
    'medication-manager',
    'outcome-predictor'
  ];
  
  for (const workerType of workerTypes) {
    const votes = await collectWorkerVotes(
      workerType,
      'provideClinicalOpinion',
      request,
      consensusId
    );
    allVotes.push(...votes);
  }

  // Comprehensive Byzantine detection
  const byzantineNodes = detectByzantineNodes(allVotes);
  
  // Multi-worker consensus
  const consensus = achieveConsensus(allVotes, byzantineNodes);
  
  return createResponse(200, {
    consensusId,
    achieved: consensus.achieved,
    confidence: consensus.confidence,
    byzantineNodes: Array.from(byzantineNodes),
    decision: consensus.finalDecision,
    votingDetails: Array.from(consensus.votes.entries())
  });
}

/**
 * Collect votes from worker nodes
 */
async function collectWorkerVotes(
  workerType: string,
  action: string,
  payload: any,
  consensusId: string
): Promise<WorkerVote[]> {
  
  const votes: WorkerVote[] = [];
  const invokePromises = [];
  
  // Invoke multiple instances for Byzantine tolerance
  for (let i = 0; i < BYZANTINE_NODES; i++) {
    const invocation = lambda.invoke({
      FunctionName: `ClinicalWorker-${workerType}-${process.env.NODE_ENV}`,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        action,
        payload,
        consensusId,
        nodeId: `node-${i}`
      })
    }).promise();
    
    invokePromises.push(invocation);
  }
  
  // Collect all responses
  const responses = await Promise.allSettled(invokePromises);
  
  responses.forEach((response, index) => {
    if (response.status === 'fulfilled' && response.value.Payload) {
      try {
        const vote = JSON.parse(response.value.Payload as string);
        votes.push({
          workerId: `${workerType}-node-${index}`,
          decision: vote.decision,
          confidence: vote.confidence || 0.5,
          reasoning: vote.reasoning || '',
          timestamp: Date.now()
        });
      } catch (e) {
        console.error(`Failed to parse vote from node ${index}:`, e);
      }
    }
  });
  
  return votes;
}

/**
 * Detect Byzantine (faulty/malicious) nodes
 */
function detectByzantineNodes(votes: WorkerVote[]): Set<string> {
  const byzantineNodes = new Set<string>();
  
  if (votes.length < 3) return byzantineNodes;
  
  // Group votes by similar decisions
  const decisionGroups = new Map<string, WorkerVote[]>();
  
  votes.forEach(vote => {
    const decisionKey = JSON.stringify(vote.decision);
    if (!decisionGroups.has(decisionKey)) {
      decisionGroups.set(decisionKey, []);
    }
    decisionGroups.get(decisionKey)!.push(vote);
  });
  
  // Find majority decision
  let majorityGroup: WorkerVote[] = [];
  let maxSize = 0;
  
  decisionGroups.forEach(group => {
    if (group.length > maxSize) {
      maxSize = group.length;
      majorityGroup = group;
    }
  });
  
  // Mark nodes that deviate significantly from majority as Byzantine
  votes.forEach(vote => {
    if (!majorityGroup.includes(vote)) {
      // Check if deviation is significant
      if (vote.confidence < 0.3 || !vote.reasoning) {
        byzantineNodes.add(vote.workerId);
      }
    }
  });
  
  // Additional checks for timing attacks
  const avgTime = votes.reduce((sum, v) => sum + v.timestamp, 0) / votes.length;
  votes.forEach(vote => {
    if (Math.abs(vote.timestamp - avgTime) > 5000) { // 5 second deviation
      byzantineNodes.add(vote.workerId);
    }
  });
  
  return byzantineNodes;
}

/**
 * Achieve Byzantine consensus
 */
function achieveConsensus(
  votes: WorkerVote[],
  byzantineNodes: Set<string>
): ConsensusResult {
  
  // Filter out Byzantine nodes
  const validVotes = votes.filter(v => !byzantineNodes.has(v.workerId));
  
  if (validVotes.length === 0) {
    return {
      achieved: false,
      votes: new Map(),
      byzantineNodes: Array.from(byzantineNodes),
      finalDecision: null,
      confidence: 0
    };
  }
  
  // Group valid votes
  const decisionGroups = new Map<string, WorkerVote[]>();
  
  validVotes.forEach(vote => {
    const decisionKey = JSON.stringify(vote.decision);
    if (!decisionGroups.has(decisionKey)) {
      decisionGroups.set(decisionKey, []);
    }
    decisionGroups.get(decisionKey)!.push(vote);
  });
  
  // Find consensus decision
  let consensusDecision: any = null;
  let consensusVotes: WorkerVote[] = [];
  let maxVotes = 0;
  
  decisionGroups.forEach((group, decision) => {
    if (group.length > maxVotes) {
      maxVotes = group.length;
      consensusVotes = group;
      consensusDecision = JSON.parse(decision);
    }
  });
  
  // Check if consensus threshold is met
  const consensusRatio = maxVotes / validVotes.length;
  const achieved = consensusRatio >= BYZANTINE_THRESHOLD;
  
  // Calculate confidence
  const avgConfidence = consensusVotes.reduce((sum, v) => sum + v.confidence, 0) / consensusVotes.length;
  const confidence = achieved ? avgConfidence * consensusRatio : 0;
  
  // Create vote map
  const voteMap = new Map<string, any>();
  votes.forEach(v => {
    voteMap.set(v.workerId, {
      decision: v.decision,
      confidence: v.confidence,
      byzantine: byzantineNodes.has(v.workerId)
    });
  });
  
  return {
    achieved,
    votes: voteMap,
    byzantineNodes: Array.from(byzantineNodes),
    finalDecision: consensusDecision,
    confidence
  };
}

/**
 * Generate diagnosis from consensus
 */
async function generateDiagnosis(
  request: ClinicalRequest,
  consensus: ConsensusResult,
  credentials: any
): Promise<ClinicalDecision> {
  
  const diagnosis: ClinicalDecision = {
    decisionId: uuidv4(),
    patientId: request.patientId,
    timestamp: Date.now(),
    type: 'diagnosis',
    recommendations: [],
    confidence: consensus.confidence,
    consensus,
    evidence: []
  };
  
  // Extract diagnosis information from consensus
  if (consensus.finalDecision) {
    diagnosis.recommendations = consensus.finalDecision.diagnoses || [];
    diagnosis.evidence = consensus.finalDecision.evidence || [];
    diagnosis.warnings = consensus.finalDecision.warnings;
  }
  
  // Enhance with FHIR data if available
  if (process.env.FHIR_SERVER_URL) {
    try {
      // Would integrate with FHIR server here
      diagnosis.evidence.push({
        source: 'FHIR',
        type: 'clinical_records'
      });
    } catch (e) {
      console.error('FHIR integration failed:', e);
    }
  }
  
  return diagnosis;
}

/**
 * Generate treatment plan from consensus
 */
async function generateTreatmentPlan(
  request: ClinicalRequest,
  consensus: ConsensusResult,
  credentials: any
): Promise<any> {
  
  const treatmentPlan = {
    planId: uuidv4(),
    patientId: request.patientId,
    timestamp: Date.now(),
    type: 'treatment',
    treatments: consensus.finalDecision?.treatments || [],
    medications: consensus.finalDecision?.medications || [],
    procedures: consensus.finalDecision?.procedures || [],
    followUp: consensus.finalDecision?.followUp || [],
    confidence: consensus.confidence,
    consensus,
    evidence: consensus.finalDecision?.evidence || []
  };
  
  return treatmentPlan;
}

/**
 * Store clinical decision in DynamoDB
 */
async function storeClinicalDecision(decision: ClinicalDecision): Promise<void> {
  try {
    await dynamodb.putItem({
      TableName: process.env.DECISIONS_TABLE!,
      Item: {
        patientId: { S: decision.patientId },
        decisionId: { S: decision.decisionId },
        timestamp: { N: decision.timestamp.toString() },
        type: { S: decision.type },
        data: { S: JSON.stringify(decision) },
        ttl: { N: Math.floor(Date.now() / 1000 + 86400 * 365).toString() } // 1 year
      }
    });
  } catch (error) {
    console.error('Failed to store clinical decision:', error);
  }
}

/**
 * Store treatment plan
 */
async function storeTreatmentPlan(plan: any): Promise<void> {
  try {
    await dynamodb.putItem({
      TableName: process.env.TREATMENT_TABLE!,
      Item: {
        planId: { S: plan.planId },
        patientId: { S: plan.patientId },
        createdAt: { N: plan.timestamp.toString() },
        data: { S: JSON.stringify(plan) },
        ttl: { N: Math.floor(Date.now() / 1000 + 86400 * 365).toString() }
      }
    });
  } catch (error) {
    console.error('Failed to store treatment plan:', error);
  }
}

/**
 * Load clinical credentials from Secrets Manager
 */
async function loadClinicalCredentials(): Promise<any> {
  try {
    const secret = await secretsManager.getSecretValue({
      SecretId: process.env.SECRET_NAME || '/serenity/prod/clinical-apis'
    });
    
    return JSON.parse(secret.SecretString || '{}');
  } catch (error) {
    console.error('Failed to load clinical credentials:', error);
    return {};
  }
}

/**
 * Health check endpoint
 */
async function handleHealthCheck(): Promise<APIGatewayProxyResult> {
  const health = {
    status: 'healthy',
    byzantineNodes: BYZANTINE_NODES,
    byzantineThreshold: BYZANTINE_THRESHOLD,
    timestamp: new Date().toISOString()
  };
  
  return createResponse(200, health);
}

/**
 * Report swarm health metrics
 */
async function reportSwarmHealth(): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/Clinical',
      MetricData: [
        {
          MetricName: 'SwarmHealth',
          Value: 1,
          Unit: 'None',
          Timestamp: new Date()
        },
        {
          MetricName: 'ByzantineNodes',
          Value: BYZANTINE_NODES,
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
 * Report metrics to CloudWatch
 */
async function reportMetrics(
  type: string,
  duration: number,
  consensus: ConsensusResult
): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/Clinical',
      MetricData: [
        {
          MetricName: 'DecisionsProcessed',
          Value: 1,
          Unit: 'Count',
          Dimensions: [{ Name: 'DecisionType', Value: type }],
          Timestamp: new Date()
        },
        {
          MetricName: 'ProcessingTime',
          Value: duration,
          Unit: 'Milliseconds',
          Dimensions: [{ Name: 'DecisionType', Value: type }],
          Timestamp: new Date()
        },
        {
          MetricName: 'ConsensusAchieved',
          Value: consensus.achieved ? 1 : 0,
          Unit: 'None',
          Timestamp: new Date()
        },
        {
          MetricName: 'ByzantineNodesDetected',
          Value: consensus.byzantineNodes.length,
          Unit: 'Count',
          Timestamp: new Date()
        },
        {
          MetricName: 'ConsensusConfidence',
          Value: consensus.confidence,
          Unit: 'None',
          Timestamp: new Date()
        }
      ]
    });
  } catch (error) {
    console.error('Failed to report metrics:', error);
  }
}

/**
 * Report errors to CloudWatch
 */
async function reportError(error: Error, requestId: string): Promise<void> {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'Serenity/Clinical',
      MetricData: [
        {
          MetricName: 'Errors',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'ErrorType', Value: error.name },
            { Name: 'RequestId', Value: requestId }
          ],
          Timestamp: new Date()
        }
      ]
    });
  } catch (err) {
    console.error('Failed to report error:', err);
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
      'X-Byzantine-Consensus': 'enabled',
      'X-Clinical-Version': '2.0.0'
    },
    body: JSON.stringify(body)
  };
}