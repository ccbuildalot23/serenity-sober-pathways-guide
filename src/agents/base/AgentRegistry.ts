/**
 * Agent Registry Service
 * Manages registration, discovery, and lifecycle of healthcare AI agents
 * BMAD Method implementation for agent orchestration
 */

import { HealthcareAgent, AgentConfig, AgentContext } from './HealthcareAgent';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

export interface AgentRegistration {
  agent: HealthcareAgent;
  config: AgentConfig;
  status: 'active' | 'inactive' | 'maintenance';
  lastActivity?: Date;
  metrics?: AgentMetrics;
}

export interface AgentMetrics {
  totalInteractions: number;
  averageResponseTime: number;
  averageConfidence: number;
  escalationRate: number;
  errorRate: number;
}

export interface AgentSelectionCriteria {
  capability?: string;
  userRole?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  context?: string;
}

/**
 * Singleton registry for managing all healthcare AI agents
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AgentRegistration> = new Map();
  private activeContexts: Map<string, AgentContext> = new Map();
  private auditService = EnhancedSecurityAuditService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register a new agent
   */
  async registerAgent(agent: HealthcareAgent): Promise<void> {
    const config = agent.getConfig();
    const agentName = config.name;

    // Check if agent already registered
    if (this.agents.has(agentName)) {
      throw new Error(`Agent ${agentName} is already registered`);
    }

    // Create registration
    const registration: AgentRegistration = {
      agent,
      config,
      status: 'active',
      lastActivity: new Date(),
      metrics: {
        totalInteractions: 0,
        averageResponseTime: 0,
        averageConfidence: 0,
        escalationRate: 0,
        errorRate: 0
      }
    };

    // Store registration
    this.agents.set(agentName, registration);

    // Log registration
    await this.auditService.logActivity({
      action: 'agent_registered',
      userId: 'system',
      metadata: {
        agentName,
        version: config.version,
        capabilities: config.capabilities
      }
    });

    console.log(`Agent registered: ${agentName} v${config.version}`);
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentName: string): Promise<void> {
    if (!this.agents.has(agentName)) {
      throw new Error(`Agent ${agentName} not found`);
    }

    // Remove agent
    this.agents.delete(agentName);

    // Log unregistration
    await this.auditService.logActivity({
      action: 'agent_unregistered',
      userId: 'system',
      metadata: { agentName }
    });

    console.log(`Agent unregistered: ${agentName}`);
  }

  /**
   * Get a specific agent
   */
  getAgent(agentName: string): HealthcareAgent | null {
    const registration = this.agents.get(agentName);
    if (!registration || registration.status !== 'active') {
      return null;
    }
    return registration.agent;
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): HealthcareAgent[] {
    return Array.from(this.agents.values())
      .filter(reg => reg.status === 'active')
      .map(reg => reg.agent);
  }

  /**
   * Find agents by capability
   */
  findAgentsByCapability(capability: string): HealthcareAgent[] {
    return Array.from(this.agents.values())
      .filter(reg => 
        reg.status === 'active' &&
        reg.config.capabilities.includes(capability)
      )
      .map(reg => reg.agent);
  }

  /**
   * Select best agent for a given context
   */
  selectAgent(criteria: AgentSelectionCriteria): HealthcareAgent | null {
    const candidates = Array.from(this.agents.values()).filter(reg => {
      if (reg.status !== 'active') return false;

      // Check capability match
      if (criteria.capability) {
        if (!reg.config.capabilities.includes(criteria.capability)) {
          return false;
        }
      }

      // Check role compatibility
      if (criteria.userRole) {
        // Agent-specific role checking would go here
        // For now, allow all active agents
      }

      return true;
    });

    if (candidates.length === 0) {
      return null;
    }

    // Sort by metrics (prefer agents with better performance)
    candidates.sort((a, b) => {
      const scoreA = this.calculateAgentScore(a);
      const scoreB = this.calculateAgentScore(b);
      return scoreB - scoreA;
    });

    return candidates[0].agent;
  }

  /**
   * Calculate agent performance score
   */
  private calculateAgentScore(registration: AgentRegistration): number {
    if (!registration.metrics) return 0;

    const metrics = registration.metrics;
    
    // Calculate weighted score
    const confidenceWeight = 0.3;
    const responseTimeWeight = 0.2;
    const escalationWeight = 0.3;
    const errorWeight = 0.2;

    // Normalize metrics (higher is better)
    const confidenceScore = metrics.averageConfidence;
    const responseTimeScore = Math.max(0, 1 - (metrics.averageResponseTime / 10000));
    const escalationScore = Math.max(0, 1 - metrics.escalationRate);
    const errorScore = Math.max(0, 1 - metrics.errorRate);

    return (
      confidenceScore * confidenceWeight +
      responseTimeScore * responseTimeWeight +
      escalationScore * escalationWeight +
      errorScore * errorWeight
    );
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    agentName: string,
    status: 'active' | 'inactive' | 'maintenance'
  ): Promise<void> {
    const registration = this.agents.get(agentName);
    if (!registration) {
      throw new Error(`Agent ${agentName} not found`);
    }

    const previousStatus = registration.status;
    registration.status = status;

    // Log status change
    await this.auditService.logActivity({
      action: 'agent_status_changed',
      userId: 'system',
      metadata: {
        agentName,
        previousStatus,
        newStatus: status
      }
    });
  }

  /**
   * Update agent metrics
   */
  updateAgentMetrics(
    agentName: string,
    interaction: {
      responseTime: number;
      confidence: number;
      escalated: boolean;
      error: boolean;
    }
  ): void {
    const registration = this.agents.get(agentName);
    if (!registration || !registration.metrics) {
      return;
    }

    const metrics = registration.metrics;
    const totalInteractions = metrics.totalInteractions;

    // Update running averages
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * totalInteractions + interaction.responseTime) /
      (totalInteractions + 1);

    metrics.averageConfidence =
      (metrics.averageConfidence * totalInteractions + interaction.confidence) /
      (totalInteractions + 1);

    // Update rates
    if (interaction.escalated) {
      metrics.escalationRate =
        (metrics.escalationRate * totalInteractions + 1) / (totalInteractions + 1);
    } else {
      metrics.escalationRate =
        (metrics.escalationRate * totalInteractions) / (totalInteractions + 1);
    }

    if (interaction.error) {
      metrics.errorRate =
        (metrics.errorRate * totalInteractions + 1) / (totalInteractions + 1);
    } else {
      metrics.errorRate =
        (metrics.errorRate * totalInteractions) / (totalInteractions + 1);
    }

    metrics.totalInteractions++;
    registration.lastActivity = new Date();
  }

  /**
   * Create or update user context
   */
  setUserContext(userId: string, context: AgentContext): void {
    this.activeContexts.set(userId, context);
  }

  /**
   * Get user context
   */
  getUserContext(userId: string): AgentContext | undefined {
    return this.activeContexts.get(userId);
  }

  /**
   * Clear user context
   */
  clearUserContext(userId: string): void {
    this.activeContexts.delete(userId);
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalAgents: number;
    activeAgents: number;
    inactiveAgents: number;
    maintenanceAgents: number;
    totalInteractions: number;
    averageConfidence: number;
  } {
    const agents = Array.from(this.agents.values());
    
    const stats = {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      inactiveAgents: agents.filter(a => a.status === 'inactive').length,
      maintenanceAgents: agents.filter(a => a.status === 'maintenance').length,
      totalInteractions: 0,
      averageConfidence: 0
    };

    // Calculate aggregate metrics
    let totalConfidence = 0;
    let agentsWithMetrics = 0;

    for (const agent of agents) {
      if (agent.metrics) {
        stats.totalInteractions += agent.metrics.totalInteractions;
        if (agent.metrics.averageConfidence > 0) {
          totalConfidence += agent.metrics.averageConfidence;
          agentsWithMetrics++;
        }
      }
    }

    if (agentsWithMetrics > 0) {
      stats.averageConfidence = totalConfidence / agentsWithMetrics;
    }

    return stats;
  }

  /**
   * Health check for all agents
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, registration] of this.agents.entries()) {
      try {
        // Check if agent responds to a test context
        const testContext: AgentContext = {
          userId: 'health-check',
          sessionId: 'health-check',
          userRole: 'provider'
        };

        await registration.agent.initialize(testContext);
        results.set(name, true);
      } catch (error) {
        console.error(`Health check failed for ${name}:`, error);
        results.set(name, false);
      }
    }

    return results;
  }

  /**
   * Reset registry (for testing)
   */
  reset(): void {
    this.agents.clear();
    this.activeContexts.clear();
  }
}

// Export singleton instance
export const agentRegistry = AgentRegistry.getInstance();