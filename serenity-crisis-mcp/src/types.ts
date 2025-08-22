export interface CrisisAlertRequest {
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  supporter_tiers: SupporterTier[];
}

export interface SupporterTier {
  tier: 'primary' | 'secondary' | 'emergency';
  contacts: Contact[];
}

export interface Contact {
  name: string;
  phone?: string;
  email?: string;
  relationship: string;
  priority: number;
}

export interface CrisisResponse {
  success: boolean;
  message: string;
  alerts_sent: number;
  timestamp: string;
  escalation_level: string;
  alert_id?: string;
}

export interface CrisisHandlerConfig {
  enable_sms: boolean;
  enable_email: boolean;
  enable_push: boolean;
  escalation_delay_minutes: number;
  max_retries: number;
}
