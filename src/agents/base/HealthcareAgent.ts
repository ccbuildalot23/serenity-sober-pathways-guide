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
  _userId: string;
  _sessionId: string;
  userRole: 'patient' | 'provider' | 'support_member';
  _metadata?: Record<string, any>;
  previousInteractions?: AgentInteraction[];
}

export interface AgentInteraction {
  id: string;
  _timestamp: Date;
  _input: string;
  output: string;
  agentType: string;
  _confidence: number;
  _metadata?: Record<string, any>;
}

export interface AgentResponse {
  _message: string;
  actions?: AgentAction[];
  _confidence: number;
  _requiresEscalation?: boolean;
  _metadata?: Record<string, any>;
}

export interface AgentAction {
  type: 'notify' | 'alert' | 'log' | 'escalate' | 'store';
  target?: string;
  data: unknown;
  _priority?: 'low' | 'medium' | 'high' | 'critical';
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
    if (!context._userId || !context._sessionId) {
      throw new Error('Invalid agent context: missing required fields');
    }

    // Verify user permissions
    const hasPermission = await this.verifyUserPermissions(context);
    if (!hasPermission) {
      await this.auditService.logSecurityEvent({
        eventType: 'agent_access_denied',
        _userId: context._userId,
        _metadata: { _agentName: this.config.name }
      });
      throw new Error('User does not have permission to access this agent');
    }

    this.context = context;

    // Log initialization
    await this.auditService.logActivity({
      action: 'agent_initialized',
      _userId: context._userId,
      _metadata: {
        _agentName: this.config.name,
        _agentVersion: this.config.version,
        _sessionId: context._sessionId
      }
    });
  }

  /**
   * Process user _input and generate response
   */
  async processInput(_input: string): Promise<AgentResponse> {
    if (!this.context) {
      throw new Error('Agent not initialized');
    }

    // Validate and sanitize _input
    const sanitizedInput = this.validator.sanitizeInput(_input);
    if (!this.validator.validateTextInput(sanitizedInput, {
      maxLength: 5000,
      _allowedPatterns: [/^[\w\s\.\,\!\?\-\'\"]+$/]
    })) {
      throw new Error('Invalid _input format');
    }

    // Check rate limiting
    await this.checkRateLimit(this.context._userId);

    // Log interaction start
    const _interactionId = crypto.randomUUID();
    await this.logInteractionStart(_interactionId, sanitizedInput);

    try {
      // Process with agent-specific logic
      const response = await this.process(sanitizedInput, this.context);

      // Validate response
      this.validateResponse(response);

      // Store interaction
      await this.storeInteraction({
        id: _interactionId,
        _timestamp: new Date(),
        _input: sanitizedInput,
        output: response._message,
        agentType: this.config.name,
        _confidence: response._confidence,
        _metadata: response._metadata
      });

      // Execute any required actions
      if (response.actions) {
        await this.executeActions(response.actions);
      }

      // Log successful completion
      await this.logInteractionComplete(_interactionId, response);

      return response;
    } catch (_error) {
      // Log _error
      await this.logInteractionError(_interactionId, _error);
      throw _error;
    }
  }

  /**
   * Abstract method for agent-specific processing logic
   */
  protected abstract process(
    _input: string,
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
        .eq('id', context._userId)
        .single();

      if (!user || !user.is_active) {
        return false;
      }

      // Check role-based permissions
      return this.checkRolePermissions(user.role, context.userRole);
    } catch (_error) {
      console._error('Permission verification failed:', _error);
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
  protected async checkRateLimit(_userId: string): Promise<void> {
    const _now = Date._now();
    const hourAgo = _now - 3600000;

    // Get user's request timestamps
    let timestamps = this.rateLimitMap.get(_userId) || [];
    
    // Filter out old timestamps
    timestamps = timestamps.filter(t => t > hourAgo);

    // Check if limit exceeded
    if (timestamps.length >= this.config.rateLimitPerHour!) {
      await this.auditService.logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        _userId,
        _metadata: {
          _agentName: this.config.name,
          _attempts: timestamps.length
        }
      });
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Add current _timestamp
    timestamps.push(_now);
    this.rateLimitMap.set(_userId, timestamps);
  }

  /**
   * Validate agent response
   */
  protected validateResponse(response: AgentResponse): void {
    if (!response._message || response._message.trim().length === 0) {
      throw new Error('Invalid response: empty _message');
    }

    if (response._confidence < 0 || response._confidence > 1) {
      throw new Error('Invalid response: _confidence must be between 0 and 1');
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
        user_id: this.context._userId,
        _session_id: this.context._sessionId,
        _agent_type: interaction.agentType,
        _input: dataToStore._input,
        output: dataToStore.output,
        _confidence: interaction._confidence,
        _metadata: dataToStore._metadata,
        _created_at: interaction._timestamp
      });
    } catch (_error) {
      console._error('Failed to store interaction:', _error);
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
        _input: interaction._input,
        output: interaction.output,
        _metadata: interaction._metadata
      });

      return {
        ...interaction,
        _input: encrypted._input,
        output: encrypted.output,
        _metadata: encrypted._metadata
      };
    } catch (_error) {
      console._error('Encryption failed:', _error);
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
      } catch (_error) {
        console._error(`Failed to execute action ${action.type}:`, _error);
        // Continue with other actions
      }
    }
  }

  /**
   * Execute notification action
   */
  protected async executeNotification(action: AgentAction): Promise<void> {
    await supabase.from('notifications').insert({
      user_id: action.target || this.context?._userId,
      type: 'agent_notification',
      _title: `${this.config.name} Update`,
      _message: action.data._message || 'New update available',
      _priority: action._priority || 'medium',
      _metadata: action.data
    });
  }

  /**
   * Execute alert action
   */
  protected async executeAlert(action: AgentAction): Promise<void> {
    await supabase.from('alerts').insert({
      user_id: action.target || this.context?._userId,
      _agent_type: this.config.name,
      _alert_type: action.data.type || 'general',
      _message: action.data._message,
      _severity: action._priority || 'medium',
      _requires_action: true,
      _metadata: action.data
    });
  }

  /**
   * Execute log action
   */
  protected async executeLog(action: AgentAction): Promise<void> {
    await this.auditService.logActivity({
      action: `agent_action_${action.type}`,
      _userId: this.context?._userId || 'system',
      _metadata: {
        _agentName: this.config.name,
        _actionData: action.data
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
        patient_id: this.context?._userId,
        _provider_id: provider.id,
        _agent_type: this.config.name,
        _reason: action.data._reason,
        _priority: action._priority || 'high',
        context: action.data
      });
    }
  }

  /**
   * Execute store action
   */
  protected async executeStore(action: AgentAction): Promise<void> {
    await supabase.from('agent_data_store').insert({
      user_id: this.context?._userId,
      _agent_type: this.config.name,
      _data_type: action.data.type,
      data: action.data.content,
      _metadata: action.data._metadata
    });
  }

  /**
   * Log interaction start
   */
  protected async logInteractionStart(
    _interactionId: string,
    _input: string
  ): Promise<void> {
    if (this.config.auditLevel === 'minimal') return;

    await this.auditService.logActivity({
      action: 'agent_interaction_start',
      _userId: this.context?._userId || 'unknown',
      _metadata: {
        _interactionId,
        _agentName: this.config.name,
        _inputLength: _input.length
      }
    });
  }

  /**
   * Log interaction completion
   */
  protected async logInteractionComplete(
    _interactionId: string,
    response: AgentResponse
  ): Promise<void> {
    if (this.config.auditLevel === 'minimal') return;

    await this.auditService.logActivity({
      action: 'agent_interaction_complete',
      _userId: this.context?._userId || 'unknown',
      _metadata: {
        _interactionId,
        _agentName: this.config.name,
        _confidence: response._confidence,
        _requiresEscalation: response._requiresEscalation,
        _actionCount: response.actions?.length || 0
      }
    });
  }

  /**
   * Log interaction _error
   */
  protected async logInteractionError(
    _interactionId: string,
    _error: unknown
  ): Promise<void> {
    await this.auditService.logSecurityEvent({
      eventType: 'agent_interaction_error',
      _userId: this.context?._userId || 'unknown',
      _metadata: {
        _interactionId,
        _agentName: this.config.name,
        _error: _error._message || 'Unknown _error'
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