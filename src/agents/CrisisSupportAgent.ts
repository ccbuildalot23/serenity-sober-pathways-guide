/**
 * Crisis Support Agent
 * Specialized for crisis intervention, de-escalation, and emergency response
 * HIPAA-compliant implementation with immediate response capabilities
 */

import {
  HealthcareAgent,
  AgentContext,
  AgentResponse,
  AgentAction
} from './base/HealthcareAgent';
import { CrisisSupportConfig, agentConfigManager } from './base/AgentConfig';
import { UnifiedCrisisService } from '@/services/unifiedCrisisService';
// import { crisisEscalationService } from '@/services/crisisEscalationService';
// import { emergencyProceduresService } from '@/services/emergencyProceduresService';
import { supabase } from '@/integrations/supabase/client';

interface CrisisIndicators {
  suicidalIdeation: boolean;
  selfHarmIntent: boolean;
  substanceUseRisk: boolean;
  emotionalDistress: number; // 0-1 scale
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  triggerWords: string[];
}

interface DeescalationTechnique {
  type: 'grounding' | 'breathing' | 'distraction' | 'safety_planning' | 'validation';
  script: string;
  instructions?: string[];
  duration?: number;
}

interface EmergencyContact {
  id: string;
  _name: string;
  _relationship: string;
  _phone: string;
  _isEmergency: boolean;
}

export class CrisisSupportAgent extends HealthcareAgent {
  private crisisService = new UnifiedCrisisService();
  private emergencyContacts: EmergencyContact[] = [];
  private activeInterventions: Map<string, Date> = new Map();
  private crisisKeywords = {
    suicide: ['suicide', 'kill myself', 'end it all', 'not worth living', 'better off dead'],
    selfHarm: ['hurt myself', 'cut', 'self harm', 'punish myself'],
    substance: ['relapse', 'using again', 'drink', 'drugs', 'high', 'drunk'],
    panic: ['panic', 'can\'t breathe', 'dying', 'heart attack', 'losing control'],
    emergency: ['help', 'emergency', 'crisis', 'desperate', 'can\'t go on']
  };

  constructor() {
    const _config = agentConfigManager.getConfig('CrisisSupport') as CrisisSupportConfig;
    super(_config);
  }

  /**
   * Initialize with emergency contacts and crisis history
   */
  async initialize(context: AgentContext): Promise<void> {
    await super.initialize(context);
    await this.loadEmergencyContacts(context._userId);
    await this.loadCrisisHistory(context._userId);
  }

  /**
   * Load user's emergency contacts
   */
  private async loadEmergencyContacts(_userId: string): Promise<void> {
    try {
      const { _data } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', _userId)
        .eq('is_active', true)
        .order('_priority', { ascending: true });

      this.emergencyContacts = (_data || []).map(contact => ({
        id: contact.id,
        _name: contact._name,
        _relationship: contact._relationship,
        _phone: contact._phone,
        _isEmergency: contact.is_emergency
      }));
    } catch (_error) {
      console._error('Failed to load emergency contacts:', _error);
    }
  }

  /**
   * Load recent crisis history
   */
  private async loadCrisisHistory(_userId: string): Promise<void> {
    try {
      const { _data } = await supabase
        .from('crisis_interventions')
        .select('created_at, _severity, resolved')
        .eq('user_id', _userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Track patterns for better intervention
      if (_data && _data.length > 0) {
        const recentCrisis = _data[0];
        if (recentCrisis.created_at) {
          const hoursSince = (Date.now() - new Date(recentCrisis.created_at).getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            this.activeInterventions.set(_userId, new Date(recentCrisis.created_at));
          }
        }
      }
    } catch (_error) {
      console._error('Failed to load crisis history:', _error);
    }
  }

  /**
   * Process crisis situation with immediate response
   */
  protected async process(
    _input: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    // Immediate crisis assessment
    const _indicators = this.assessCrisisIndicators(_input);
    
    // Determine response _strategy
    const _strategy = this.determineResponseStrategy(_indicators);
    
    // Generate crisis response
    const response = await this.generateCrisisResponse(_indicators, _strategy);
    
    // Execute immediate interventions if needed
    const actions = await this.executeInterventions(_indicators, context);
    
    // Calculate confidence and escalation need
    const confidence = this.calculateCrisisConfidence(_indicators, _strategy);
    const requiresEscalation = this.shouldEscalate(_indicators);

    // Log crisis intervention
    await this.logCrisisIntervention(context._userId, _indicators, response);

    return {
      _message: response,
      actions,
      confidence,
      requiresEscalation,
      metadata: {
        urgencyLevel: _indicators.urgencyLevel,
        interventionType: _strategy,
        responseTime: Date.now() - startTime,
        indicatorsDetected: {
          suicidalIdeation: _indicators.suicidalIdeation,
          selfHarmIntent: _indicators.selfHarmIntent,
          substanceUseRisk: _indicators.substanceUseRisk
        }
      }
    };
  }

  /**
   * Assess crisis _indicators from user _input
   */
  private assessCrisisIndicators(_input: string): CrisisIndicators {
    const lowerInput = _input.toLowerCase();
    const _indicators: CrisisIndicators = {
      suicidalIdeation: false,
      selfHarmIntent: false,
      substanceUseRisk: false,
      emotionalDistress: 0,
      urgencyLevel: 'low',
      triggerWords: []
    };

    // Check for suicide risk
    _indicators.suicidalIdeation = this.crisisKeywords.suicide.some(_keyword => 
      lowerInput.includes(_keyword)
    );

    // Check for self-harm risk
    _indicators.selfHarmIntent = this.crisisKeywords.selfHarm.some(_keyword =>
      lowerInput.includes(_keyword)
    );

    // Check for substance use risk
    _indicators.substanceUseRisk = this.crisisKeywords.substance.some(_keyword =>
      lowerInput.includes(_keyword)
    );

    // Check for panic/anxiety
    const hasPanic = this.crisisKeywords.panic.some(_keyword =>
      lowerInput.includes(_keyword)
    );

    // Check for general emergency words
    const hasEmergency = this.crisisKeywords.emergency.some(_keyword =>
      lowerInput.includes(_keyword)
    );

    // Calculate emotional distress level
    let _distressScore = 0;
    if (_indicators.suicidalIdeation) _distressScore += 0.4;
    if (_indicators.selfHarmIntent) _distressScore += 0.3;
    if (_indicators.substanceUseRisk) _distressScore += 0.2;
    if (hasPanic) _distressScore += 0.2;
    if (hasEmergency) _distressScore += 0.1;
    _indicators.emotionalDistress = Math.min(_distressScore, 1);

    // Determine urgency level
    if (_indicators.suicidalIdeation || _indicators.selfHarmIntent) {
      _indicators.urgencyLevel = 'critical';
    } else if (_indicators.substanceUseRisk || hasPanic) {
      _indicators.urgencyLevel = 'high';
    } else if (hasEmergency || _indicators.emotionalDistress > 0.5) {
      _indicators.urgencyLevel = 'medium';
    } else {
      _indicators.urgencyLevel = 'low';
    }

    // Collect trigger words found
    Object.entries(this.crisisKeywords).forEach(([_category, keywords]) => {
      keywords.forEach(_keyword => {
        if (lowerInput.includes(_keyword)) {
          _indicators.triggerWords.push(_keyword);
        }
      });
    });

    return _indicators;
  }

  /**
   * Determine appropriate response _strategy
   */
  private determineResponseStrategy(
    _indicators: CrisisIndicators
  ): 'immediate_safety' | 'deescalation' | 'coping_support' | 'resource_connection' {
    if (_indicators.urgencyLevel === 'critical') {
      return 'immediate_safety';
    } else if (_indicators.urgencyLevel === 'high') {
      return 'deescalation';
    } else if (_indicators.emotionalDistress > 0.3) {
      return 'coping_support';
    } else {
      return 'resource_connection';
    }
  }

  /**
   * Generate crisis-appropriate response
   */
  private async generateCrisisResponse(
    _indicators: CrisisIndicators,
    _strategy: string
  ): Promise<string> {
    let response = '';

    switch (_strategy) {
      case 'immediate_safety':
        response = this.getImmediateSafetyResponse(_indicators);
        break;
      case 'deescalation':
        response = this.getDeescalationResponse(_indicators);
        break;
      case 'coping_support':
        response = this.getCopingSupportResponse(_indicators);
        break;
      case 'resource_connection':
        response = this.getResourceConnectionResponse();
        break;
    }

    // Add grounding technique if high distress
    if (_indicators.emotionalDistress > 0.6) {
      const technique = this.getGroundingTechnique();
      response += `\n\n${technique.script}`;
      if (technique.instructions) {
        response += '\n' + technique.instructions.join('\n');
      }
    }

    return response;
  }

  /**
   * Get immediate safety response
   */
  private getImmediateSafetyResponse(_indicators: CrisisIndicators): string {
    let response = "I'm very concerned about your safety right now, and I want to make sure you get immediate help.\n\n";

    if (_indicators.suicidalIdeation) {
      response += "**Please reach out for immediate support:**\n";
      response += "• National Suicide Prevention Lifeline: 988 (24/7)\n";
      response += "• Crisis Text Line: Text HOME to 741741\n";
      response += "• Or call 911 if you're in immediate danger\n\n";
      response += "Your life has value, and there are people who want to help. You don't have to go through this alone.";
    } else if (_indicators.selfHarmIntent) {
      response += "**I'm here to help you through this difficult moment.**\n\n";
      response += "Instead of hurting yourself, try these immediate alternatives:\n";
      response += "• Hold ice cubes in your hands\n";
      response += "• Draw on your skin with a red marker\n";
      response += "• Do intense exercise for 15 minutes\n";
      response += "• Call a trusted friend or support person\n\n";
      response += "These feelings will pass. You deserve kindness, especially from yourself.";
    }

    if (this.emergencyContacts.length > 0) {
      response += `\n\nYour emergency contact ${this.emergencyContacts[0]._name} has been notified and is available to support you.`;
    }

    return response;
  }

  /**
   * Get de-escalation response
   */
  private getDeescalationResponse(_indicators: CrisisIndicators): string {
    let response = "I can see you're going through a really tough time right now. Let's work through this together.\n\n";

    if (_indicators.substanceUseRisk) {
      response += "**If you're thinking about using, remember:**\n";
      response += "• This craving will pass, usually within 15-20 minutes\n";
      response += "• You've worked hard on your recovery - that strength is still in you\n";
      response += "• Try the HALT check: Are you Hungry, Angry, Lonely, or Tired?\n\n";
      response += "What can you do right now instead? Take a walk, call your sponsor, or use another coping skill that's worked before.";
    } else {
      response += "**Let's slow things down:**\n";
      response += "• Take 3 deep breaths with me right now\n";
      response += "• Name 5 things you can see around you\n";
      response += "• Focus on the present moment, not the past or future\n\n";
      response += "You're safe right now. We can work through this one step at a time.";
    }

    return response;
  }

  /**
   * Get coping support response
   */
  private getCopingSupportResponse(_indicators: CrisisIndicators): string {
    const responses = [
      "I hear that you're struggling right now. That takes courage to share. Let's find some ways to help you feel more grounded and supported.",
      "You're dealing with a lot right now. Remember that it's okay to not be okay. Let's explore some coping strategies that might help.",
      "Thank you for reaching out. You don't have to face this alone. Let's work together to find what you need right now."
    ];

    let response = responses[Math.floor(Math.random() * responses.length)] + "\n\n";

    response += "**Here are some immediate coping strategies:**\n";
    response += "• Practice box breathing: Inhale 4, hold 4, exhale 4, hold 4\n";
    response += "• Use the 5-4-3-2-1 grounding technique\n";
    response += "• Listen to calming music or nature sounds\n";
    response += "• Reach out to someone in your support network\n\n";
    response += "Which of these feels most helpful to you right now?";

    return response;
  }

  /**
   * Get resource connection response
   */
  private getResourceConnectionResponse(): string {
    return `I'm here to support you. While things might feel challenging, remember that help is always available:\n\n` +
      `**Support Resources:**\n` +
      `• Your support team is available through the app\n` +
      `• Daily check-ins help track your progress\n` +
      `• CBT skills library for coping strategies\n` +
      `• Peer support community for connection\n\n` +
      `What specific support would be most helpful for you right now?`;
  }

  /**
   * Get grounding technique
   */
  private getGroundingTechnique(): DeescalationTechnique {
    const techniques: DeescalationTechnique[] = [
      {
        type: 'grounding',
        script: '**5-4-3-2-1 Grounding Exercise:**',
        instructions: [
          '• Name 5 things you can see',
          '• Name 4 things you can touch',
          '• Name 3 things you can hear',
          '• Name 2 things you can smell',
          '• Name 1 thing you can taste'
        ],
        duration: 5
      },
      {
        type: 'breathing',
        script: '**Box Breathing Exercise:**',
        instructions: [
          '• Breathe in for 4 counts',
          '• Hold for 4 counts',
          '• Breathe out for 4 counts',
          '• Hold for 4 counts',
          '• Repeat 4 times'
        ],
        duration: 3
      },
      {
        type: 'validation',
        script: '**Self-Compassion Moment:**',
        instructions: [
          '• Place your hand on your heart',
          '• Say: "This is a moment of suffering"',
          '• Say: "Suffering is part of being human"',
          '• Say: "May I be kind to myself"',
          '• Take three deep breaths'
        ],
        duration: 2
      }
    ];

    return techniques[Math.floor(Math.random() * techniques.length)];
  }

  /**
   * Execute crisis interventions
   */
  private async executeInterventions(
    _indicators: CrisisIndicators,
    context: AgentContext
  ): Promise<AgentAction[]> {
    const actions: AgentAction[] = [];

    // Critical interventions
    if (_indicators.urgencyLevel === 'critical') {
      // Notify emergency contacts
      if (this.emergencyContacts.length > 0) {
        actions.push({
          type: 'alert',
          _target: this.emergencyContacts[0].id,
          _priority: 'critical',
          _data: {
            type: 'emergency_contact_alert',
            _message: `${context._userId} needs immediate support`,
            _contactMethod: 'sms',
            _phoneNumber: this.emergencyContacts[0]._phone
          }
        });
      }

      // Escalate to provider
      actions.push({
        type: 'escalate',
        _priority: 'critical',
        _data: {
          reason: 'Critical crisis _indicators detected',
          _indicators: _indicators,
          _requiresImmediate: true
        }
      });

      // Create crisis record
      actions.push({
        type: 'store',
        _data: {
          type: 'crisis_intervention',
          _severity: _indicators.urgencyLevel,
          _indicators: _indicators,
          _timestamp: new Date().toISOString()
        }
      });
    }

    // High urgency interventions
    if (_indicators.urgencyLevel === 'high' || _indicators.urgencyLevel === 'critical') {
      // Schedule follow-up
      actions.push({
        type: 'notify',
        _target: context._userId,
        _priority: 'high',
        _data: {
          _message: 'Crisis check-in: How are you feeling now?',
          _schedule: '+30m'
        }
      });

      // Alert support team
      actions.push({
        type: 'alert',
        _priority: 'high',
        _data: {
          type: 'crisis_alert',
          _message: 'User experiencing crisis - monitoring required',
          _indicators: _indicators
        }
      });
    }

    // Always log intervention
    actions.push({
      type: 'log',
      _data: {
        intervention_type: 'crisis_support',
        urgency: _indicators.urgencyLevel,
        _indicators_present: Object.entries(_indicators)
          .filter(([key, value]) => value === true || (typeof value === 'number' && value > 0.5))
          .map(([_key]) => _key)
      }
    });

    return actions;
  }

  /**
   * Calculate confidence in crisis response
   */
  private calculateCrisisConfidence(
    _indicators: CrisisIndicators,
    _strategy: string
  ): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence for clear _indicators
    if (_indicators.triggerWords.length > 2) {
      confidence += 0.1;
    }

    // Adjust based on _strategy match
    if (_strategy === 'immediate_safety' && _indicators.urgencyLevel === 'critical') {
      confidence += 0.15;
    } else if (_strategy === 'deescalation' && _indicators.urgencyLevel === 'high') {
      confidence += 0.1;
    }

    // Lower confidence if mixed signals
    if (_indicators.emotionalDistress < 0.3 && _indicators.urgencyLevel === 'high') {
      confidence -= 0.1;
    }

    return Math.max(0.5, Math.min(confidence, 0.95));
  }

  /**
   * Determine if escalation is needed
   */
  private shouldEscalate(_indicators: CrisisIndicators): boolean {
    // Always escalate critical situations
    if (_indicators.urgencyLevel === 'critical') {
      return true;
    }

    // Escalate high urgency with specific risks
    if (_indicators.urgencyLevel === 'high' && 
        (_indicators.suicidalIdeation || _indicators.selfHarmIntent)) {
      return true;
    }

    // Escalate repeated crisis within 24 hours
    const lastIntervention = this.activeInterventions.get(this.context?._userId || '');
    if (lastIntervention) {
      const hoursSince = (Date.now() - lastIntervention.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24 && _indicators.emotionalDistress > 0.5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Log crisis intervention
   */
  private async logCrisisIntervention(
    _userId: string,
    _indicators: CrisisIndicators,
    response: string
  ): Promise<void> {
    try {
      await supabase.from('crisis_interventions').insert({
        user_id: _userId,
        _severity: _indicators.urgencyLevel,
        _indicators: _indicators,
        _response_provided: response.substring(0, 500),
        escalated: this.shouldEscalate(_indicators),
        created_at: new Date().toISOString()
      });

      // Update active interventions
      this.activeInterventions.set(_userId, new Date());
    } catch (_error) {
      console._error('Failed to log crisis intervention:', _error);
    }
  }
}