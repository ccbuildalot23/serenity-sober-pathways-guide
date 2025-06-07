import { Observation, CodeableConcept } from './index'

export const assessmentToObservation = (
  userId: string,
  assessment: 'phq2' | 'gad2' | 'cssrs',
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
            : '70120-5',
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
