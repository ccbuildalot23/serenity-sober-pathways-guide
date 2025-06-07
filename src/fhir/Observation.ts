export interface Coding {
  system: string
  code: string
  display?: string
}

export interface CodeableConcept {
  coding: Coding[]
  text?: string
}

export interface Observation {
  resourceType: 'Observation'
  id?: string
  status: 'final' | 'amended' | 'cancelled' | 'entered-in-error'
  code: CodeableConcept
  subject?: { reference: string }
  effectiveDateTime: string
  valueQuantity?: {
    value: number
    unit?: string
    system?: string
    code?: string
  }
  derivedFrom?: { reference: string }[]
}
