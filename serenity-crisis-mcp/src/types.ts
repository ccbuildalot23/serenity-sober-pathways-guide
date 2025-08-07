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
}

export interface StaggeredTimingConfig {
  tierDelays: {
    primary: number;     // Tier 1: 30 seconds
    secondary: number;   // Tier 2: 90 seconds
    emergency: number;   // Tier 3: 180 seconds (3 minutes)
  };
  severityMultipliers: {
    critical: number;    // 0.5x (faster)
    high: number;        // 1.0x (standard)
    medium: number;      // 2.0x (slower)
    low: number;         // 4.0x (slowest)
  };
}

export interface CrisisHandlerConfig {
  enable_sms: boolean;
  enable_email: boolean;
  enable_push: boolean;
  escalation_delay_minutes: number;
  max_retries: number;
  staggeredTiming?: StaggeredTimingConfig;
}