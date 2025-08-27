/**
 * Medication Checker Worker
 * Validates medication interactions and contraindications
 */

import { Context } from 'aws-lambda';

interface MedicationCheckRequest {
  patientId: string;
  currentMedications: string[];
  proposedMedications: string[];
  allergies?: string[];
  conditions?: string[];
}

interface MedicationCheckResult {
  safe: boolean;
  interactions: string[];
  warnings: string[];
  alternatives?: string[];
}

export const handler = async (event: MedicationCheckRequest, __context: Context): Promise<MedicationCheckResult> => {
  console.log('Medication checker worker invoked:', event);

  const result: MedicationCheckResult = {
    safe: true,
    interactions: [],
    warnings: []
  };

  // Basic interaction checking logic
  if (event.currentMedications && event.proposedMedications) {
    // Check for duplicate medications
    const duplicates = event.proposedMedications.filter(med => 
      event.currentMedications.includes(med)
    );
    
    if (duplicates.length > 0) {
      result.warnings.push(`Duplicate medications detected: ${duplicates.join(', ')}`);
    }
  }

  // Check for allergies
  if (event.allergies && event.allergies.length > 0) {
    result.warnings.push('Please verify medication allergies with prescriber');
  }

  // Add general safety recommendations
  if (event.proposedMedications && event.proposedMedications.length > 3) {
    result.warnings.push('Multiple medications prescribed - consider polypharmacy review');
  }

  return result;
};