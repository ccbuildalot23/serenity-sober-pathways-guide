/**
 * Emergency Coordinator Lambda
 * Manages crisis response and emergency notifications
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { Lambda } from '@aws-sdk/client-lambda';
import { SNS } from '@aws-sdk/client-sns';
import { StepFunctions } from '@aws-sdk/client-sfn';
import { v4 as uuidv4 } from 'uuid';

const dynamodb = new DynamoDB({ region: process.env.AWS_REGION });
const lambda = new Lambda({ region: process.env.AWS_REGION });
const sns = new SNS({ region: process.env.AWS_REGION });
const stepFunctions = new StepFunctions({ region: process.env.AWS_REGION });

interface EmergencyRequest {
  type: 'crisis' | 'alert' | 'escalation' | 'status';
  patientId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  contacts?: string[];
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Emergency Coordinator invoked:', event);

  try {
    const request: EmergencyRequest = JSON.parse(event.body || '{}');
    const emergencyId = uuidv4();
    
    // Store emergency event
    await dynamodb.putItem({
      TableName: process.env.EMERGENCY_TABLE_NAME || 'EmergencyEvents-dev',
      Item: {
        emergencyId: { S: emergencyId },
        timestamp: { N: Date.now().toString() },
        patientId: { S: request.patientId },
        type: { S: request.type },
        severity: { S: request.severity },
        status: { S: 'active' },
        description: { S: request.description || '' }
      }
    });

    // Handle based on type and severity
    let response: any = {
      emergencyId,
      status: 'processing'
    };

    switch (request.type) {
      case 'crisis':
        // Trigger immediate response
        await handleCrisis(emergencyId, request);
        response.message = 'Crisis response initiated';
        break;
        
      case 'alert':
        // Send notifications
        await sendAlerts(emergencyId, request);
        response.message = 'Alerts sent successfully';
        break;
        
      case 'escalation':
        // Escalate to higher level
        await escalateEmergency(emergencyId, request);
        response.message = 'Emergency escalated';
        break;
        
      case 'status':
        // Get emergency status
        const status = await getEmergencyStatus(request.patientId);
        response = { ...response, ...status };
        break;
    }

    // Start state machine for complex workflows
    if (request.severity === 'critical') {
      await startEmergencyWorkflow(emergencyId, request);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    console.error('Emergency coordinator error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Emergency response failed',
        message: 'Please call 911 immediately'
      })
    };
  }
};

async function handleCrisis(emergencyId: string, request: EmergencyRequest): Promise<void> {
  // Invoke crisis response workers
  const workers = ['location-tracker', 'first-responder', 'notification-sender'];
  
  for (const worker of workers) {
    await lambda.invoke({
      FunctionName: `EmergencyWorker-${worker}-${process.env.ENVIRONMENT}`,
      InvocationType: 'Event',
      Payload: JSON.stringify({
        emergencyId,
        ...request
      })
    });
  }
}

async function sendAlerts(emergencyId: string, request: EmergencyRequest): Promise<void> {
  // Send SNS notifications
  if (process.env.EMERGENCY_TOPIC_ARN) {
    await sns.publish({
      TopicArn: process.env.EMERGENCY_TOPIC_ARN,
      Subject: `Emergency Alert: ${request.severity.toUpperCase()}`,
      Message: JSON.stringify({
        emergencyId,
        patientId: request.patientId,
        severity: request.severity,
        description: request.description,
        timestamp: new Date().toISOString()
      })
    });
  }
}

async function escalateEmergency(emergencyId: string, request: EmergencyRequest): Promise<void> {
  // Update severity and notify supervisors
  await dynamodb.updateItem({
    TableName: process.env.EMERGENCY_TABLE_NAME || 'EmergencyEvents-dev',
    Key: {
      emergencyId: { S: emergencyId },
      timestamp: { N: Date.now().toString() }
    },
    UpdateExpression: 'SET severity = :severity, escalatedAt = :time',
    ExpressionAttributeValues: {
      ':severity': { S: 'critical' },
      ':time': { S: new Date().toISOString() }
    }
  });
}

async function getEmergencyStatus(patientId: string): Promise<any> {
  // Query recent emergency events
  const response = await dynamodb.query({
    TableName: process.env.EMERGENCY_TABLE_NAME || 'EmergencyEvents-dev',
    IndexName: 'PatientIdIndex',
    KeyConditionExpression: 'patientId = :pid',
    ExpressionAttributeValues: {
      ':pid': { S: patientId }
    },
    Limit: 1,
    ScanIndexForward: false
  });
  
  if (response.Items && response.Items.length > 0) {
    return {
      hasActiveEmergency: true,
      lastEmergency: response.Items[0]
    };
  }
  
  return { hasActiveEmergency: false };
}

async function startEmergencyWorkflow(emergencyId: string, request: EmergencyRequest): Promise<void> {
  // Start Step Functions state machine for complex emergency workflows
  if (process.env.STATE_MACHINE_ARN) {
    await stepFunctions.startExecution({
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      name: `emergency-${emergencyId}`,
      input: JSON.stringify({
        emergencyId,
        ...request
      })
    });
  }
}