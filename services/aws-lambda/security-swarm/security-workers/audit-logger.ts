/**
 * Audit Logger Worker
 * Handles HIPAA-compliant audit logging
 */

import { Context } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDB({ region: process.env.AWS_REGION });

interface AuditEvent {
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export const handler = async (event: AuditEvent, context: Context): Promise<any> => {
  console.log('Audit logger worker invoked');

  const auditRecord = {
    eventId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
    lambdaRequestId: context.requestId
  };

  try {
    // Store audit log in DynamoDB
    await dynamodb.putItem({
      TableName: process.env.AUDIT_TABLE_NAME || 'SecurityAuditLogs-dev',
      Item: {
        eventId: { S: auditRecord.eventId },
        userId: { S: auditRecord.userId },
        action: { S: auditRecord.action },
        resource: { S: auditRecord.resource },
        timestamp: { S: auditRecord.timestamp },
        details: { S: JSON.stringify(auditRecord.details || {}) }
      }
    });

    return {
      success: true,
      eventId: auditRecord.eventId,
      loggedAt: auditRecord.timestamp
    };
  } catch (error) {
    console.error('Failed to log audit event:', error);
    throw error;
  }
};