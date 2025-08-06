/**
 * Agent Configuration System
 * Centralized configuration management for healthcare AI agents
 * BMAD Method implementation for rapid agent deployment
 */

import { z } from 'zod';

/**
 * Configuration schemas for different agent types
 */
export const BaseAgentConfigSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  capabilities: z.array(z.string()),
  maxTokens: z.number().min(100).max(4000).optional(),
  temperature: z.number().min(0).max(1).optional(),
  responseTimeout: z.number().min(1000).max(60000).optional(),
  rateLimitPerHour: z.number().min(1).max(1000).optional(),
  requiresEncryption: z.boolean().optional(),
  auditLevel: z.enum(['minimal', 'standard', 'detailed']).optional()
});

export const RecoveryCoachConfigSchema = BaseAgentConfigSchema.extend({
  motivationalStyle: z.enum(['supportive', 'directive', 'collaborative']),
  responsePersonalization: z.boolean(),
  milestoneTracking: z.boolean(),
  dailyCheckInReminders: z.boolean(),
  inspirationalQuotesEnabled: z.boolean()
});

export const CrisisSupportConfigSchema = BaseAgentConfigSchema.extend({
  escalationThreshold: z.number().min(0).max(1),
  deescalationTechniques: z.array(z.string()),
  emergencyProtocols: z.boolean(),
  suicidePreventionMode: z.boolean(),
  immediateResponseRequired: z.boolean()
});

export const ProgressTrackingConfigSchema = BaseAgentConfigSchema.extend({
  analysisFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly']),
  patternDetectionEnabled: z.boolean(),
  predictiveAnalytics: z.boolean(),
  riskScoringEnabled: z.boolean(),
  visualizationPreferences: z.object({
    charts: z.boolean(),
    trends: z.boolean(),
    heatmaps: z.boolean()
  })
});

export const ClinicalDocumentationConfigSchema = BaseAgentConfigSchema.extend({
  noteFormat: z.enum(['SOAP', 'DAP', 'BIRP', 'GIRP']),
  autoSummarization: z.boolean(),
  icd10Integration: z.boolean(),
  cptCodeSuggestions: z.boolean(),
  hipaaCompliantExport: z.boolean()
});

/**
 * Type definitions
 */
export type BaseAgentConfig = z.infer<typeof BaseAgentConfigSchema>;
export type RecoveryCoachConfig = z.infer<typeof RecoveryCoachConfigSchema>;
export type CrisisSupportConfig = z.infer<typeof CrisisSupportConfigSchema>;
export type ProgressTrackingConfig = z.infer<typeof ProgressTrackingConfigSchema>;
export type ClinicalDocumentationConfig = z.infer<typeof ClinicalDocumentationConfigSchema>;

/**
 * Default configurations for each agent type
 */
export const DEFAULT_CONFIGS = {
  RecoveryCoach: {
    name: 'RecoveryCoach',
    version: '1.0.0',
    capabilities: [
      'motivational_messaging',
      'progress_celebration',
      'daily_affirmations',
      'milestone_tracking',
      'relapse_prevention'
    ],
    maxTokens: 500,
    temperature: 0.7,
    responseTimeout: 10000,
    rateLimitPerHour: 100,
    requiresEncryption: true,
    auditLevel: 'standard' as const,
    motivationalStyle: 'supportive' as const,
    responsePersonalization: true,
    milestoneTracking: true,
    dailyCheckInReminders: true,
    inspirationalQuotesEnabled: true
  },

  CrisisSupport: {
    name: 'CrisisSupport',
    version: '1.0.0',
    capabilities: [
      'crisis_detection',
      'deescalation',
      'emergency_protocols',
      'risk_assessment',
      'provider_escalation'
    ],
    maxTokens: 1000,
    temperature: 0.3,
    responseTimeout: 5000,
    rateLimitPerHour: 200,
    requiresEncryption: true,
    auditLevel: 'detailed' as const,
    escalationThreshold: 0.75,
    deescalationTechniques: [
      'grounding',
      'breathing_exercises',
      'safety_planning',
      'distraction_techniques'
    ],
    emergencyProtocols: true,
    suicidePreventionMode: true,
    immediateResponseRequired: true
  },

  ProgressTracking: {
    name: 'ProgressTracking',
    version: '1.0.0',
    capabilities: [
      'pattern_analysis',
      'trend_detection',
      'risk_scoring',
      'predictive_modeling',
      'insight_generation'
    ],
    maxTokens: 800,
    temperature: 0.5,
    responseTimeout: 15000,
    rateLimitPerHour: 60,
    requiresEncryption: true,
    auditLevel: 'standard' as const,
    analysisFrequency: 'daily' as const,
    patternDetectionEnabled: true,
    predictiveAnalytics: true,
    riskScoringEnabled: true,
    visualizationPreferences: {
      charts: true,
      trends: true,
      heatmaps: true
    }
  },

  ClinicalDocumentation: {
    name: 'ClinicalDocumentation',
    version: '1.0.0',
    capabilities: [
      'note_generation',
      'clinical_summarization',
      'diagnosis_coding',
      'treatment_documentation',
      'compliance_checking'
    ],
    maxTokens: 2000,
    temperature: 0.2,
    responseTimeout: 20000,
    rateLimitPerHour: 50,
    requiresEncryption: true,
    auditLevel: 'detailed' as const,
    noteFormat: 'SOAP' as const,
    autoSummarization: true,
    icd10Integration: true,
    cptCodeSuggestions: true,
    hipaaCompliantExport: true
  }
};

/**
 * Configuration manager class
 */
export class AgentConfigManager {
  private configs: Map<string, any> = new Map();
  
  constructor() {
    // Load default configurations
    this.loadDefaultConfigs();
  }

  /**
   * Load default configurations
   */
  private loadDefaultConfigs(): void {
    Object.entries(DEFAULT_CONFIGS).forEach(([key, config]) => {
      this.configs.set(key, config);
    });
  }

  /**
   * Get configuration for a specific agent
   */
  getConfig(agentName: string): any {
    const config = this.configs.get(agentName);
    if (!config) {
      throw new Error(`Configuration not found for agent: ${agentName}`);
    }
    return { ...config };
  }

  /**
   * Update configuration for an agent
   */
  updateConfig(agentName: string, updates: Partial<any>): void {
    const currentConfig = this.getConfig(agentName);
    const updatedConfig = { ...currentConfig, ...updates };
    
    // Validate updated configuration
    this.validateConfig(agentName, updatedConfig);
    
    this.configs.set(agentName, updatedConfig);
  }

  /**
   * Validate configuration based on agent type
   */
  private validateConfig(agentName: string, config: any): void {
    let schema;
    
    switch (agentName) {
      case 'RecoveryCoach':
        schema = RecoveryCoachConfigSchema;
        break;
      case 'CrisisSupport':
        schema = CrisisSupportConfigSchema;
        break;
      case 'ProgressTracking':
        schema = ProgressTrackingConfigSchema;
        break;
      case 'ClinicalDocumentation':
        schema = ClinicalDocumentationConfigSchema;
        break;
      default:
        schema = BaseAgentConfigSchema;
    }
    
    const result = schema.safeParse(config);
    if (!result.success) {
      throw new Error(`Invalid configuration: ${result.error.message}`);
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(agentName: string): void {
    const defaultConfig = DEFAULT_CONFIGS[agentName as keyof typeof DEFAULT_CONFIGS];
    if (!defaultConfig) {
      throw new Error(`No default configuration for agent: ${agentName}`);
    }
    this.configs.set(agentName, { ...defaultConfig });
  }

  /**
   * Export all configurations
   */
  exportConfigs(): Record<string, any> {
    const exported: Record<string, any> = {};
    this.configs.forEach((config, name) => {
      exported[name] = { ...config };
    });
    return exported;
  }

  /**
   * Import configurations
   */
  importConfigs(configs: Record<string, any>): void {
    Object.entries(configs).forEach(([name, config]) => {
      this.validateConfig(name, config);
      this.configs.set(name, config);
    });
  }

  /**
   * Get configuration schema for an agent type
   */
  getSchema(agentName: string): z.ZodSchema {
    switch (agentName) {
      case 'RecoveryCoach':
        return RecoveryCoachConfigSchema;
      case 'CrisisSupport':
        return CrisisSupportConfigSchema;
      case 'ProgressTracking':
        return ProgressTrackingConfigSchema;
      case 'ClinicalDocumentation':
        return ClinicalDocumentationConfigSchema;
      default:
        return BaseAgentConfigSchema;
    }
  }
}

// Export singleton instance
export const agentConfigManager = new AgentConfigManager();