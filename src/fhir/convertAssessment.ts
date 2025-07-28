import { Observation, CodeableConcept } from './index'

export const assessmentToObservation = (
  userId: string,
  assessment: 'phq2' | 'gad2' | 'cssrs' | 'phq9' | 'gad7' | 'audit',
  score: number
): Observation => {
  const coding: CodeableConcept = {
    coding: [
      {
        system: 'http://loinc.org',
        code:
          assessment === 'phq2'
            ? '44249-1'
            : assessment === 'gad2'
            ? '69729-8'
            : assessment === 'cssrs'
            ? '70120-5'
            : assessment === 'phq9'
            ? '44261-6'
            : assessment === 'gad7'
            ? '69737-5'
            : '88037-7', // AUDIT
        display: assessment.toUpperCase()
      }
    ],
    text: assessment.toUpperCase()
  }
  return {
    resourceType: 'Observation',
    status: 'final',
    code: coding,
    subject: { reference: `Patient/${userId}` },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: score,
      unit: 'score'
    }
  }
}
