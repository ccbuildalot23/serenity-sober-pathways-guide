/**
 * AWS Intelligent Agents
 * Export all agent classes for use in Lambda functions and other services
 */

export { InfrastructureHealthAgent } from './InfrastructureHealthAgent';
export { SecuritySentinelAgent } from './SecuritySentinelAgent';
export { CrisisResponseOrchestrator } from './CrisisResponseOrchestrator';
export { ComplianceAuditorAgent } from './ComplianceAuditorAgent';
export { CostIntelligenceAgent } from './CostIntelligenceAgent';
export { PatientJourneyAgent } from './PatientJourneyAgent';
export { ProviderEfficiencyAgent } from './ProviderEfficiencyAgent';

// Agent types and interfaces
export type AgentType = 
  | 'infrastructure'
  | 'security'
  | 'crisis'
  | 'compliance'
  | 'cost'
  | 'patient'
  | 'provider';

export interface AgentConfig {
  region: string;
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics: boolean;
  enableAlerts: boolean;
}

export interface AgentExecutionContext {
  requestId: string;
  timestamp: Date;
  triggerSource: 'scheduled' | 'event' | 'manual';
  parameters?: Record<string, unknown>;
}

export interface AgentResponse {
  success: boolean;
  agentType: AgentType;
  executionTime: number;
  results?: unknown;
  errors?: string[];
  metrics?: Record<string, number>;
}