/**
 * Notification Sender Worker
 * Sends emergency notifications to contacts
 */

import { Context } from 'aws-lambda';
import { SNS } from '@aws-sdk/client-sns';

const sns = new SNS({ region: process.env.AWS_REGION });

interface NotificationRequest {
  emergencyId: string;
  patientId: string;
  severity: string;
  contacts?: string[];
  message?: string;
}

interface NotificationResult {
  sent: number;
  failed: number;
  recipients: string[];
}

export const handler = async (event: NotificationRequest, _context: Context): Promise<NotificationResult> => {
  console.log('Notification sender worker invoked');

  const result: NotificationResult = {
    sent: 0,
    failed: 0,
    recipients: []
  };

  const message = event.message || generateEmergencyMessage(event);
  const contacts = event.contacts || getDefaultContacts(event.patientId);

  for (const contact of contacts) {
    try {
      // In production, this would send SMS/email based on contact preferences
      if (process.env.EMERGENCY_TOPIC_ARN) {
        await sns.publish({
          TopicArn: process.env.EMERGENCY_TOPIC_ARN,
          Subject: `Emergency Alert - ${event.severity.toUpperCase()}`,
          Message: message,
          MessageAttributes: {
            emergencyId: { DataType: 'String', StringValue: event.emergencyId },
            patientId: { DataType: 'String', StringValue: event.patientId },
            severity: { DataType: 'String', StringValue: event.severity }
          }
        });
      }
      
      result.sent++;
      result.recipients.push(contact);
    } catch (error) {
      console.error(`Failed to notify contact ${contact}:`, error);
      result.failed++;
    }
  }

  return result;
};

function generateEmergencyMessage(event: NotificationRequest): string {
  return `EMERGENCY ALERT: A ${event.severity} level emergency has been reported. ` +
         `Emergency ID: ${event.emergencyId}. ` +
         `Please respond immediately or contact emergency services.`;
}

function getDefaultContacts(patientId: string): string[] {
  // In production, this would fetch from database
  return ['emergency-contact-1', 'emergency-contact-2'];
}