/**
 * First Responder Worker
 * Coordinates with emergency services
 */

import { Context } from 'aws-lambda';

interface FirstResponderRequest {
  emergencyId: string;
  patientId: string;
  severity: string;
  location?: any;
  description?: string;
}

interface FirstResponderResponse {
  dispatched: boolean;
  responders: string[];
  estimatedArrival?: string;
  instructions?: string[];
}

export const handler = async (event: FirstResponderRequest, _context: Context): Promise<FirstResponderResponse> => {
  console.log('First responder worker invoked');

  const response: FirstResponderResponse = {
    dispatched: false,
    responders: [],
    instructions: []
  };

  // Determine response based on severity
  switch (event.severity) {
    case 'critical':
      response.dispatched = true;
      response.responders = ['EMS', 'Crisis Team'];
      response.estimatedArrival = '3-5 minutes';
      response.instructions = [
        'Stay with the patient',
        'Keep them calm and safe',
        'Do not leave them alone',
        'Emergency services are on the way'
      ];
      break;
      
    case 'high':
      response.dispatched = true;
      response.responders = ['Crisis Team'];
      response.estimatedArrival = '10-15 minutes';
      response.instructions = [
        'Monitor the patient closely',
        'Remove any harmful objects',
        'Contact support network'
      ];
      break;
      
    case 'medium':
      response.responders = ['Support Specialist'];
      response.instructions = [
        'Provide emotional support',
        'Use de-escalation techniques',
        'Schedule follow-up care'
      ];
      break;
      
    default:
      response.instructions = [
        'Continue monitoring',
        'Document the incident',
        'Follow standard protocols'
      ];
  }

  return response;
};