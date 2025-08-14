/**
 * AI Safety Middleware
 * Automatically integrates safety checks into all AI agent responses
 * Ensures bias detection, hallucination prevention, and ethical compliance
 */

import { AISafetyGuard, AIOutput, SafetyCheck } from '@/services/AISafetyGuard';
import { AgentResponse } from '@/agents/base/HealthcareAgent';
import { enhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

export interface SafetyEnabledResponse extends AgentResponse {
  safetyChecks?: SafetyCheck[];
  safetyScore?: number;
  requiresReview?: boolean;
  safetyRemediation?: string[];
}

export class AISafetyMiddleware {
  private static instance: AISafetyMiddleware;
  private aiSafety: AISafetyGuard;
  private enabledAgents: Set<string>;
  private safetyThreshold: number;
  private autoRemediate: boolean;

  private constructor() {
    this.aiSafety = AISafetyGuard.getInstance();
    this.enabledAgents = new Set();
    this.safetyThreshold = 0.85; // 85% safety score required
    this.autoRemediate = true;
    this.initializeDefaultAgents();
  }

  static getInstance(): AISafetyMiddleware {
    if (!AISafetyMiddleware.instance) {
      AISafetyMiddleware.instance = new AISafetyMiddleware();
    }
    return AISafetyMiddleware.instance;
  }

  /**
   * Initialize safety checks for default agents
   */
  private initializeDefaultAgents(): void {
    const criticalAgents = [
      'ClinicalDocumentationAgent',
      'RecoveryCoachAgent',
      'CrisisSupportAgent',
      'CareCoordinationAgent',
      'BehavioralHealthAgent',
      'MedicationManagementAgent'
    ];
    
    criticalAgents.forEach(agent => this.enableAgent(agent));
  }

  /**
   * Enable safety checks for a specific agent
   */
  enableAgent(agentId: string): void {
    this.enabledAgents.add(agentId);
    console.log(`AI Safety enabled for agent: ${agentId}`);
  }

  /**
   * Disable safety checks for a specific agent
   */
  disableAgent(agentId: string): void {
    this.enabledAgents.delete(agentId);
    console.log(`AI Safety disabled for agent: ${agentId}`);
  }

  /**
   * Process agent response through safety checks
   */
  async processAgentResponse(
    agentId: string,
    agentType: string,
    input: string,
    response: AgentResponse,
    context: Record<string, any> = {}
  ): Promise<SafetyEnabledResponse> {
    // Skip if agent is not enabled for safety checks
    if (!this.enabledAgents.has(agentId)) {
      return response;
    }

    try {
      // Create AI output for safety checking
      const aiOutput: AIOutput = {
        agentId,
        agentType,
        input,
        output: response.message,
        context: {
          ...context,
          metadata: response.metadata,
          confidence: response.confidence
        },
        patientId: context.patientId,
        providerId: context.providerId,
        timestamp: new Date()
      };

      // Run safety checks
      const safetyChecks = await this.aiSafety.checkSafety(aiOutput);
      
      // Calculate overall safety score
      const safetyScore = this.calculateSafetyScore(safetyChecks);
      
      // Determine if human review is needed
      const requiresReview = this.determineReviewNeed(safetyChecks, safetyScore);
      
      // Get remediation suggestions
      const safetyRemediation = this.getRemediationSuggestions(safetyChecks);
      
      // Create enhanced response
      const enhancedResponse: SafetyEnabledResponse = {
        ...response,
        safetyChecks,
        safetyScore,
        requiresReview,
        safetyRemediation
      };

      // Apply auto-remediation if needed and enabled
      if (this.autoRemediate && safetyScore < this.safetyThreshold) {
        return await this.applyAutoRemediation(enhancedResponse, safetyChecks);
      }

      // Log safety check results
      await this.logSafetyResults(agentId, safetyScore, requiresReview);

      return enhancedResponse;
    } catch (error) {
      console.error('AI Safety check failed:', error);
      // Return original response on error but log the issue
      await this.logSafetyError(agentId, error);
      return response;
    }
  }

  /**
   * Apply automatic remediation to unsafe content
   */
  private async applyAutoRemediation(
    response: SafetyEnabledResponse,
    safetyChecks: SafetyCheck[]
  ): Promise<SafetyEnabledResponse> {
    let remediatedMessage = response.message;
    
    // Apply remediation based on safety concerns
    for (const check of safetyChecks) {
      if (!check.passed) {
        switch (check.checkType) {
          case 'bias':
            remediatedMessage = this.remediateBias(remediatedMessage, check);
            break;
          case 'hallucination':
            remediatedMessage = this.remediateHallucination(remediatedMessage, check);
            break;
          case 'toxicity':
            remediatedMessage = this.remediateToxicity(remediatedMessage, check);
            break;
          case 'medical_accuracy':
            remediatedMessage = this.remediateMedicalInaccuracy(remediatedMessage, check);
            break;
          case 'ethical':
            remediatedMessage = this.remediateEthicalViolation(remediatedMessage, check);
            break;
        }
      }
    }
    
    // Add disclaimer if content was modified
    if (remediatedMessage !== response.message) {
      remediatedMessage += '\n\n*Note: This response has been automatically adjusted for safety and accuracy. Please consult with your healthcare provider for personalized medical advice.*';
      
      response.message = remediatedMessage;
      response.metadata = {
        ...response.metadata,
        safetyRemediated: true,
        originalMessageHash: this.hashMessage(response.message)
      };
    }
    
    return response;
  }

  /**
   * Remediation methods for different safety concerns
   */
  private remediateBias(message: string, check: SafetyCheck): string {
    // Remove biased language and replace with neutral alternatives
    let remediated = message;
    
    const biasReplacements: Record<string, string> = {
      'addict': 'person with substance use disorder',
      'alcoholic': 'person with alcohol use disorder',
      'crazy': 'experiencing mental health challenges',
      'insane': 'experiencing severe symptoms',
      'normal people': 'individuals',
      'typical': 'common'
    };
    
    for (const [biased, neutral] of Object.entries(biasReplacements)) {
      const regex = new RegExp(`\\b${biased}\\b`, 'gi');
      remediated = remediated.replace(regex, neutral);
    }
    
    return remediated;
  }

  private remediateHallucination(message: string, check: SafetyCheck): string {
    // Remove specific claims and add qualifiers
    let remediated = message;
    
    // Remove unsupported statistics
    remediated = remediated.replace(/\d+(\.\d+)?%\s+of\s+\w+/gi, 'many');
    
    // Add uncertainty qualifiers
    remediated = remediated.replace(/will\s+definitely/gi, 'may');
    remediated = remediated.replace(/always\s+/gi, 'often ');
    remediated = remediated.replace(/never\s+/gi, 'rarely ');
    
    // Remove false personalization
    remediated = remediated.replace(/I\s+remember\s+when\s+you/gi, 'Based on general experience');
    remediated = remediated.replace(/last\s+time\s+we\s+met/gi, 'in previous sessions');
    
    return remediated;
  }

  private remediateToxicity(message: string, check: SafetyCheck): string {
    // For toxic content, return a safe alternative message
    if (check.concerns.some(c => c.severity === 'critical')) {
      return "I understand you're going through a difficult time. Your wellbeing is important. Please reach out to your healthcare provider or a crisis helpline if you need immediate support. You are valued and there is help available.";
    }
    
    // Remove potentially triggering content
    let remediated = message;
    const triggerWords = ['suicide', 'self-harm', 'overdose', 'kill'];
    
    for (const word of triggerWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      remediated = remediated.replace(regex, '[content removed for safety]');
    }
    
    return remediated;
  }

  private remediateMedicalInaccuracy(message: string, check: SafetyCheck): string {
    // Add medical disclaimer and remove specific medical advice
    let remediated = message;
    
    // Remove dosage recommendations
    remediated = remediated.replace(/\d+\s*mg/gi, '[dosage]');
    
    // Remove diagnostic statements
    remediated = remediated.replace(/you\s+have\s+/gi, 'you may be experiencing symptoms of ');
    remediated = remediated.replace(/I\s+diagnose/gi, 'This could indicate');
    
    // Add disclaimer
    if (!remediated.includes('consult')) {
      remediated += ' Please consult with your healthcare provider for medical advice tailored to your specific situation.';
    }
    
    return remediated;
  }

  private remediateEthicalViolation(message: string, check: SafetyCheck): string {
    // Maintain professional boundaries
    let remediated = message;
    
    // Remove boundary violations
    remediated = remediated.replace(/I\s+love\s+you/gi, 'I care about your wellbeing');
    remediated = remediated.replace(/let's\s+be\s+friends/gi, 'I'm here to support you professionally');
    remediated = remediated.replace(/call\s+me\s+personally/gi, 'contact your care team');
    
    // Respect autonomy
    remediated = remediated.replace(/you\s+must/gi, 'you might consider');
    remediated = remediated.replace(/you\s+have\s+no\s+choice/gi, 'there are options available');
    
    return remediated;
  }

  /**
   * Calculate overall safety score from checks
   */
  private calculateSafetyScore(checks: SafetyCheck[]): number {
    if (checks.length === 0) return 1.0;
    
    const weights: Record<string, number> = {
      'toxicity': 0.3,
      'medical_accuracy': 0.25,
      'ethical': 0.2,
      'bias': 0.15,
      'hallucination': 0.1
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const check of checks) {
      const weight = weights[check.checkType] || 0.1;
      weightedSum += check.confidence * (check.passed ? 1 : 0) * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Determine if human review is needed
   */
  private determineReviewNeed(checks: SafetyCheck[], score: number): boolean {
    // Review needed if score below threshold
    if (score < this.safetyThreshold) return true;
    
    // Review needed if any critical concerns
    const hasCriticalConcerns = checks.some(check => 
      check.concerns.some(concern => concern.severity === 'critical')
    );
    
    // Review needed if explicitly required by any check
    const explicitReviewRequired = checks.some(check => check.requiresHumanReview);
    
    return hasCriticalConcerns || explicitReviewRequired;
  }

  /**
   * Get remediation suggestions from safety checks
   */
  private getRemediationSuggestions(checks: SafetyCheck[]): string[] {
    const suggestions: string[] = [];
    
    for (const check of checks) {
      if (!check.passed) {
        suggestions.push(...check.recommendations);
      }
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Log safety check results
   */
  private async logSafetyResults(
    agentId: string,
    safetyScore: number,
    requiresReview: boolean
  ): Promise<void> {
    await enhancedSecurityAuditService.logSecurityEvent({
      eventType: 'ai_safety_check',
      userId: 'system',
      metadata: {
        agent_id: agentId,
        safety_score: safetyScore,
        requires_review: requiresReview,
        threshold: this.safetyThreshold
      }
    });
  }

  /**
   * Log safety check errors
   */
  private async logSafetyError(agentId: string, error: any): Promise<void> {
    await enhancedSecurityAuditService.logSecurityEvent({
      eventType: 'ai_safety_error',
      userId: 'system',
      metadata: {
        agent_id: agentId,
        error: error.message || 'Unknown error',
        stack: error.stack
      }
    });
  }

  /**
   * Hash message for tracking
   */
  private hashMessage(message: string): string {
    // Simple hash for demo - would use crypto in production
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Configure safety settings
   */
  configureSafety(settings: {
    threshold?: number;
    autoRemediate?: boolean;
    enabledAgents?: string[];
  }): void {
    if (settings.threshold !== undefined) {
      this.safetyThreshold = settings.threshold;
    }
    
    if (settings.autoRemediate !== undefined) {
      this.autoRemediate = settings.autoRemediate;
    }
    
    if (settings.enabledAgents) {
      this.enabledAgents.clear();
      settings.enabledAgents.forEach(agent => this.enableAgent(agent));
    }
  }

  /**
   * Get current safety configuration
   */
  getConfiguration(): {
    threshold: number;
    autoRemediate: boolean;
    enabledAgents: string[];
  } {
    return {
      threshold: this.safetyThreshold,
      autoRemediate: this.autoRemediate,
      enabledAgents: Array.from(this.enabledAgents)
    };
  }
}

export const aiSafetyMiddleware = AISafetyMiddleware.getInstance();