/**
 * Base Healthcare Agent Class
 * HIPAA-compliant foundation for all AI agents in the recovery platform
 * Built with BMAD Method for rapid, secure healthcare development
 */

import { supabase } from '@/integrations/supabase/client';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';
import { EnhancedInputValidator } from '@/utils/enhancedInputValidator';
import { secureUserDataService } from '@/services/secureUserDataService';

export interface AgentContext {
  userId: string;
  sessionId: string;
  userRole: 'patient' | 'provider' | 'support_member';
  metadata?: Record<string, any>;
  previousInteractions?: AgentInteraction[];
}

export interface AgentInteraction {
  id: string;
  timestamp: Date;
  input: string;
  output: string;
  agentType: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  message: string;
  actions?: AgentAction[];
  confidence: number;
  requiresEscalation?: boolean;
  metadata?: Record<string, any>;
}

export interface AgentAction {
  type: 'notify' | 'alert' | 'log' | 'escalate' | 'store';
  target?: string;
  data: any;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentConfig {
  name: string;
  version: string;
  capabilities: string[];
  maxTokens?: number;
  temperature?: number;
  responseTimeout?: number;
  rateLimitPerHour?: number;
  requiresEncryption?: boolean;
  auditLevel?: 'minimal' | 'standard' | 'detailed';
}

/**
 * Abstract base class for all healthcare AI agents
 * Provides HIPAA-compliant infrastructure and common functionality
 */
export abstract class HealthcareAgent {
  protected config: AgentConfig;
  protected context: AgentContext | null = null;
  protected rateLimitMap: Map<string, number[]> = new Map();
  protected auditService = EnhancedSecurityAuditService;
  protected validator = EnhancedInputValidator;

  constructor(config: AgentConfig) {
    this.config = {
      ...config,
      responseTimeout: config.responseTimeout || 30000,
      rateLimitPerHour: config.rateLimitPerHour || 60,
      requiresEncryption: config.requiresEncryption !== false,
      auditLevel: config.auditLevel || 'standard'
    };
  }

  /**
   * Initialize agent with user context
   */
  async initialize(context: AgentContext): Promise<void> {
    // Validate context
    if (!context.userId || !context.sessionId) {
      throw new Error('Invalid agent context: missing required fields');
    }

    // Verify user permissions
    const hasPermission = await this.verifyUserPermissions(context);
    if (!hasPermission) {
      await this.auditService.logSecurityEvent({
        eventType: 'agent_access_denied',
        userId: context.userId,
        metadata: { agentName: this.config.name }
      });
      throw new Error('User does not have permission to access this agent');
    }

    this.context = context;

    // Log initialization
    await this.auditService.logActivity({
      action: 'agent_initialized',
      userId: context.userId,
      metadata: {
        agentName: this.config.name,
        agentVersion: this.config.version,
        sessionId: context.sessionId
      }
    });
  }

  /**
   * Process user input and generate response
   */
  async processInput(input: string): Promise<AgentResponse> {
    if (!this.context) {
      throw new Error('Agent not initialized');
    }

    // Validate and sanitize input
    const sanitizedInput = this.validator.sanitizeInput(input);
    if (!this.validator.validateTextInput(sanitizedInput, {
      maxLength: 5000,
      allowedPatterns: [/^[\w\s\.\,\!\?\-\'\"]+$/]
    })) {
      throw new Error('Invalid input format');
    }

    // Check rate limiting
    await this.checkRateLimit(this.context.userId);

    // Log interaction start
    const interactionId = crypto.randomUUID();
    await this.logInteractionStart(interactionId, sanitizedInput);

    try {
      // Process with agent-specific logic
      const response = await this.process(sanitizedInput, this.context);

      // Validate response
      this.validateResponse(response);

      // Store interaction
      await this.storeInteraction({
        id: interactionId,
        timestamp: new Date(),
        input: sanitizedInput,
        output: response.message,
        agentType: this.config.name,
        confidence: response.confidence,
        metadata: response.metadata
      });

      // Execute any required actions
      if (response.actions) {
        await this.executeActions(response.actions);
      }

      // Log successful completion
      await this.logInteractionComplete(interactionId, response);

      return response;
    } catch (error) {
      // Log error
      await this.logInteractionError(interactionId, error);
      throw error;
    }
  }

  /**
   * Abstract method for agent-specific processing logic
   */
  protected abstract process(
    input: string,
    context: AgentContext
  ): Promise<AgentResponse>;

  /**
   * Verify user has appropriate permissions
   */
  protected async verifyUserPermissions(context: AgentContext): Promise<boolean> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id, role, is_active')
        .eq('id', context.userId)
        .single();

      if (!user || !user.is_active) {
        return false;
      }

      // Check role-based permissions
      return this.checkRolePermissions(user.role, context.userRole);
    } catch (error) {
      console.error('Permission verification failed:', error);
      return false;
    }
  }

  /**
   * Check role-based permissions
   */
  protected checkRolePermissions(userRole: string, contextRole: string): boolean {
    // Providers have access to all agents
    if (userRole === 'provider' || contextRole === 'provider') {
      return true;
    }

    // Support members have limited access
    if (contextRole === 'support_member') {
      return ['RecoveryCoach', 'ProgressTracking'].includes(this.config.name);
    }

    // Patients have access to patient-facing agents
    if (contextRole === 'patient') {
      return ['RecoveryCoach', 'CrisisSupport', 'ProgressTracking'].includes(
        this.config.name
      );
    }

    return false;
  }

  /**
   * Check rate limiting for user
   */
  protected async checkRateLimit(userId: string): Promise<void> {
    const now = Date.now();
    const hourAgo = now - 3600000;

    // Get user's request timestamps
    let timestamps = this.rateLimitMap.get(userId) || [];
    
    // Filter out old timestamps
    timestamps = timestamps.filter(t => t > hourAgo);

    // Check if limit exceeded
    if (timestamps.length >= this.config.rateLimitPerHour!) {
      await this.auditService.logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        userId,
        metadata: {
          agentName: this.config.name,
          attempts: timestamps.length
        }
      });
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Add current timestamp
    timestamps.push(now);
    this.rateLimitMap.set(userId, timestamps);
  }

  /**
   * Validate agent response
   */
  protected validateResponse(response: AgentResponse): void {
    if (!response.message || response.message.trim().length === 0) {
      throw new Error('Invalid response: empty message');
    }

    if (response.confidence < 0 || response.confidence > 1) {
      throw new Error('Invalid response: confidence must be between 0 and 1');
    }

    // Validate actions if present
    if (response.actions) {
      for (const action of response.actions) {
        if (!['notify', 'alert', 'log', 'escalate', 'store'].includes(action.type)) {
          throw new Error(`Invalid action type: ${action.type}`);
        }
      }
    }
  }

  /**
   * Store interaction in database
   */
  protected async storeInteraction(interaction: AgentInteraction): Promise<void> {
    if (!this.context) return;

    try {
      // Encrypt sensitive data if required
      const dataToStore = this.config.requiresEncryption
        ? await this.encryptInteraction(interaction)
        : interaction;

      await supabase.from('agent_interactions').insert({
        user_id: this.context.userId,
        session_id: this.context.sessionId,
        agent_type: interaction.agentType,
        input: dataToStore.input,
        output: dataToStore.output,
        confidence: interaction.confidence,
        metadata: dataToStore.metadata,
        created_at: interaction.timestamp
      });
    } catch (error) {
      console.error('Failed to store interaction:', error);
      // Don't throw - continue processing even if storage fails
    }
  }

  /**
   * Encrypt interaction data
   */
  protected async encryptInteraction(
    interaction: AgentInteraction
  ): Promise<AgentInteraction> {
    try {
      const encrypted = await secureUserDataService.encryptSensitiveData({
        input: interaction.input,
        output: interaction.output,
        metadata: interaction.metadata
      });

      return {
        ...interaction,
        input: encrypted.input,
        output: encrypted.output,
        metadata: encrypted.metadata
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt interaction data');
    }
  }

  /**
   * Execute agent actions
   */
  protected async executeActions(actions: AgentAction[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'notify':
            await this.executeNotification(action);
            break;
          case 'alert':
            await this.executeAlert(action);
            break;
          case 'log':
            await this.executeLog(action);
            break;
          case 'escalate':
            await this.executeEscalation(action);
            break;
          case 'store':
            await this.executeStore(action);
            break;
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
        // Continue with other actions
      }
    }
  }

  /**
   * Execute notification action
   */
  protected async executeNotification(action: AgentAction): Promise<void> {
    await supabase.from('notifications').insert({
      user_id: action.target || this.context?.userId,
      type: 'agent_notification',
      title: `${this.config.name} Update`,
      message: action.data.message || 'New update available',
      priority: action.priority || 'medium',
      metadata: action.data
    });
  }

  /**
   * Execute alert action
   */
  protected async executeAlert(action: AgentAction): Promise<void> {
    await supabase.from('alerts').insert({
      user_id: action.target || this.context?.userId,
      agent_type: this.config.name,
      alert_type: action.data.type || 'general',
      message: action.data.message,
      severity: action.priority || 'medium',
      requires_action: true,
      metadata: action.data
    });
  }

  /**
   * Execute log action
   */
  protected async executeLog(action: AgentAction): Promise<void> {
    await this.auditService.logActivity({
      action: `agent_action_${action.type}`,
      userId: this.context?.userId || 'system',
      metadata: {
        agentName: this.config.name,
        actionData: action.data
      }
    });
  }

  /**
   * Execute escalation action
   */
  protected async executeEscalation(action: AgentAction): Promise<void> {
    // Find available provider
    const { data: provider } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'provider')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (provider) {
      await supabase.from('escalations').insert({
        patient_id: this.context?.userId,
        provider_id: provider.id,
        agent_type: this.config.name,
        reason: action.data.reason,
        priority: action.priority || 'high',
        context: action.data
      });
    }
  }

  /**
   * Execute store action
   */
  protected async executeStore(action: AgentAction): Promise<void> {
    await supabase.from('agent_data_store').insert({
      user_id: this.context?.userId,
      agent_type: this.config.name,
      data_type: action.data.type,
      data: action.data.content,
      metadata: action.data.metadata
    });
  }

  /**
   * Log interaction start
   */
  protected async logInteractionStart(
    interactionId: string,
    input: string
  ): Promise<void> {
    if (this.config.auditLevel === 'minimal') return;

    await this.auditService.logActivity({
      action: 'agent_interaction_start',
      userId: this.context?.userId || 'unknown',
      metadata: {
        interactionId,
        agentName: this.config.name,
        inputLength: input.length
      }
    });
  }

  /**
   * Log interaction completion
   */
  protected async logInteractionComplete(
    interactionId: string,
    response: AgentResponse
  ): Promise<void> {
    if (this.config.auditLevel === 'minimal') return;

    await this.auditService.logActivity({
      action: 'agent_interaction_complete',
      userId: this.context?.userId || 'unknown',
      metadata: {
        interactionId,
        agentName: this.config.name,
        confidence: response.confidence,
        requiresEscalation: response.requiresEscalation,
        actionCount: response.actions?.length || 0
      }
    });
  }

  /**
   * Log interaction error
   */
  protected async logInteractionError(
    interactionId: string,
    error: any
  ): Promise<void> {
    await this.auditService.logSecurityEvent({
      eventType: 'agent_interaction_error',
      userId: this.context?.userId || 'unknown',
      metadata: {
        interactionId,
        agentName: this.config.name,
        error: error.message || 'Unknown error'
      }
    });
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): string[] {
    return [...this.config.capabilities];
  }
}