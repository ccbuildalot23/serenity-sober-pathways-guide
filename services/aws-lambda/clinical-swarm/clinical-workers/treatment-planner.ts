/**
 * Treatment Planner Worker
 * Analyzes patient data and recommends treatment plans
 */

import { Context } from 'aws-lambda';

interface TreatmentRequest {
  patientId: string;
  diagnosis: string[];
  symptoms: string[];
  medicalHistory?: any[];
  currentMedications?: string[];
}

interface TreatmentPlan {
  planId: string;
  recommendations: string[];
  medications?: string[];
  therapies?: string[];
  followUpSchedule?: string;
  contraindications?: string[];
}

export const handler = async (event: TreatmentRequest, context: Context): Promise<TreatmentPlan> => {
  console.log('Treatment planner worker invoked:', event);

  const plan: TreatmentPlan = {
    planId: `plan-${Date.now()}`,
    recommendations: [
      'Cognitive Behavioral Therapy (CBT)',
      'Regular monitoring and assessment',
      'Medication adherence support'
    ],
    therapies: [
      'Individual therapy sessions',
      'Group therapy participation'
    ],
    followUpSchedule: '2 weeks',
    contraindications: []
  };

  // Add medication recommendations if appropriate
  if (event.diagnosis && event.diagnosis.length > 0) {
    plan.medications = [
      'Consult with psychiatrist for medication evaluation'
    ];
  }

  return plan;
};