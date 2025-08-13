export type SubscriptionTierId = 'professional' | 'practice' | 'enterprise';

export interface SubscriptionTier {
  id: SubscriptionTierId;
  name: string;
  monthlyPriceUsd: number;
  patientLimit: number | 'unlimited';
  features: string[];
}

export const PRICING_TIERS: Record<SubscriptionTierId, SubscriptionTier> = {
  professional: {
    id: 'professional',
    name: 'Professional',
    monthlyPriceUsd: 299,
    patientLimit: 50,
    features: [
      'Patient dashboard',
      'Sobriety tracking',
      'Clinical assessments (PHQ-9, GAD-7, AUDIT)',
      'HIPAA-compliant notifications',
      'Basic billing support (99490, 99439)',
      'Audit logging',
    ],
  },
  practice: {
    id: 'practice',
    name: 'Practice',
    monthlyPriceUsd: 599,
    patientLimit: 'unlimited',
    features: [
      'Everything in Professional',
      'Care navigation workflows',
      'Automated billing documentation',
      'Practice management integrations',
      'Advanced analytics',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPriceUsd: 1999,
    patientLimit: 'unlimited',
    features: [
      'Everything in Practice',
      'Health system SSO & RBAC',
      'Custom BAA and data retention',
      'SLA and 24/7 support',
      'Enhanced audit exports',
    ],
  },
};

export const ESTIMATED_ANNUAL_VALUE_PER_RETAINED_PATIENT_USD = { min: 4500, max: 9000 } as const;



