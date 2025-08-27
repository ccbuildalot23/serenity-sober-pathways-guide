/**
 * Crisis Responder Agent - Mental Health Emergency Response
 * Handles crisis detection, intervention, escalation, and post-crisis follow-up
 */

import { BMADAgent } from '../core/agent.js';

export class CrisisResponderAgent extends BMADAgent {
  constructor() {
    super({
      name: 'crisis-responder',
      role: 'emergency',
      capabilities: ['crisis-detection', 'risk-assessment', 'intervention', 'escalation', 'follow-up']
    });
    
    this.riskFactors = {
      suicidalIdeation: { weight: 10, critical: true },
      suicidePlan: { weight: 20, critical: true },
      suicideMeans: { weight: 25, critical: true },
      previousAttempts: { weight: 15, critical: true },
      substanceUse: { weight: 5, critical: false },
      recentLoss: { weight: 3, critical: false },
      socialIsolation: { weight: 4, critical: false },
      chronicPain: { weight: 3, critical: false },
      mentalHealthHistory: { weight: 4, critical: false },
      familyHistory: { weight: 2, critical: false },
      impulsivity: { weight: 5, critical: false },
      agitation: { weight: 4, critical: false }
    };
    
    this.protectiveFactors = {
      socialSupport: { weight: -5 },
      treatmentEngagement: { weight: -4 },
      copingSkills: { weight: -3 },
      futureOrientation: { weight: -3 },
      religiousBelief: { weight: -2 },
      petOwnership: { weight: -1 },
      employment: { weight: -2 },
      familyObligations: { weight: -3 }
    };
    
    this.interventionLevels = {
      minimal: { score: 0, color: 'green', response: 'routine' },
      low: { score: 5, color: 'yellow', response: 'enhanced' },
      moderate: { score: 10, color: 'orange', response: 'urgent' },
      high: { score: 20, color: 'red', response: 'immediate' },
      critical: { score: 30, color: 'red', response: 'emergency' }
    };
  }

  async detectCrisis(data) {
    const detection = {
      timestamp: new Date().toISOString(),
      source: data.source,
      signals: [],
      riskLevel: 'minimal',
      confidence: 0,
      recommended_action: null
    };

    // Analyze text content for crisis signals
    if (data.text) {
      const textSignals = await this.analyzeTextForCrisis(data.text);
      detection.signals.push(...textSignals);
    }

    // Analyze behavioral patterns
    if (data.behaviors) {
      const behaviorSignals = await this.analyzeBehaviors(data.behaviors);
      detection.signals.push(...behaviorSignals);
    }

    // Analyze assessment scores
    if (data.assessments) {
      const assessmentSignals = await this.analyzeAssessments(data.assessments);
      detection.signals.push(...assessmentSignals);
    }

    // Analyze biometric data if available
    if (data.biometrics) {
      const biometricSignals = await this.analyzeBiometrics(data.biometrics);
      detection.signals.push(...biometricSignals);
    }

    // Calculate overall risk
    const riskScore = this.calculateRiskScore(detection.signals);
    detection.riskLevel = this.determineRiskLevel(riskScore);
    detection.confidence = this.calculateConfidence(detection.signals);
    
    // Determine recommended action
    detection.recommended_action = this.determineAction(detection.riskLevel, detection.confidence);

    // Trigger alert if needed
    if (detection.riskLevel === 'high' || detection.riskLevel === 'critical') {
      await this.triggerCrisisAlert(detection);
    }

    return detection;
  }

  async analyzeTextForCrisis(text) {
    const signals = [];
    const lowerText = text.toLowerCase();

    // Critical phrases
    const criticalPhrases = [
      'want to die',
      'kill myself',
      'end it all',
      'not worth living',
      'better off dead',
      'suicide',
      'overdose',
      'jump off',
      'hang myself',
      'cut myself'
    ];

    // Warning phrases
    const warningPhrases = [
      'cant go on',
      'no hope',
      'worthless',
      'burden',
      'no point',
      'give up',
      'cant take it',
      'too much pain',
      'no way out',
      'trapped'
    ];

    // Check for critical phrases
    for (const phrase of criticalPhrases) {
      if (lowerText.includes(phrase)) {
        signals.push({
          type: 'critical_phrase',
          content: phrase,
          severity: 'critical',
          weight: 20
        });
      }
    }

    // Check for warning phrases
    for (const phrase of warningPhrases) {
      if (lowerText.includes(phrase)) {
        signals.push({
          type: 'warning_phrase',
          content: phrase,
          severity: 'high',
          weight: 10
        });
      }
    }

    // Analyze emotional tone
    const emotionalTone = await this.analyzeEmotionalTone(text);
    if (emotionalTone.despair > 0.7) {
      signals.push({
        type: 'emotional_tone',
        content: 'high_despair',
        severity: 'high',
        weight: 8,
        confidence: emotionalTone.despair
      });
    }

    // Check for goodbye messages
    if (this.detectGoodbyeMessage(text)) {
      signals.push({
        type: 'goodbye_message',
        content: 'farewell_detected',
        severity: 'critical',
        weight: 15
      });
    }

    return signals;
  }

  async performRiskAssessment(patientId, context) {
    const assessment = {
      patientId,
      timestamp: new Date().toISOString(),
      riskFactors: {},
      protectiveFactors: {},
      totalRiskScore: 0,
      riskLevel: 'minimal',
      interventionPlan: null,
      documentation: []
    };

    // Evaluate each risk factor
    for (const [factor, config] of Object.entries(this.riskFactors)) {
      const evaluation = await this.evaluateRiskFactor(patientId, factor, context);
      if (evaluation.present) {
        assessment.riskFactors[factor] = {
          present: true,
          severity: evaluation.severity,
          score: config.weight * evaluation.severity,
          critical: config.critical,
          evidence: evaluation.evidence
        };
        assessment.totalRiskScore += config.weight * evaluation.severity;
      }
    }

    // Evaluate protective factors
    for (const [factor, config] of Object.entries(this.protectiveFactors)) {
      const evaluation = await this.evaluateProtectiveFactor(patientId, factor, context);
      if (evaluation.present) {
        assessment.protectiveFactors[factor] = {
          present: true,
          strength: evaluation.strength,
          score: config.weight * evaluation.strength,
          evidence: evaluation.evidence
        };
        assessment.totalRiskScore += config.weight * evaluation.strength;
      }
    }

    // Determine overall risk level
    assessment.riskLevel = this.determineRiskLevel(assessment.totalRiskScore);

    // Create intervention plan
    assessment.interventionPlan = await this.createInterventionPlan(
      assessment.riskLevel,
      assessment.riskFactors,
      assessment.protectiveFactors
    );

    // Generate documentation
    assessment.documentation = this.generateRiskAssessmentDocumentation(assessment);

    return assessment;
  }

  async initiateIntervention(crisisData) {
    const intervention = {
      interventionId: this.generateInterventionId(),
      patientId: crisisData.patientId,
      startTime: new Date().toISOString(),
      riskLevel: crisisData.riskLevel,
      type: this.selectInterventionType(crisisData.riskLevel),
      status: 'active',
      actions: [],
      resources: [],
      outcome: null
    };

    // Step 1: Safety check
    const safetyCheck = await this.performSafetyCheck(crisisData.patientId);
    intervention.actions.push({
      type: 'safety_check',
      timestamp: new Date().toISOString(),
      result: safetyCheck
    });

    // Step 2: De-escalation techniques
    if (crisisData.riskLevel !== 'critical') {
      const deescalation = await this.applyDeescalationTechniques(crisisData);
      intervention.actions.push({
        type: 'deescalation',
        timestamp: new Date().toISOString(),
        techniques: deescalation.techniques,
        effectiveness: deescalation.effectiveness
      });
    }

    // Step 3: Safety planning
    const safetyPlan = await this.createSafetyPlan(crisisData.patientId, crisisData.riskLevel);
    intervention.actions.push({
      type: 'safety_plan',
      timestamp: new Date().toISOString(),
      plan: safetyPlan
    });

    // Step 4: Activate support system
    const supportActivation = await this.activateSupport(crisisData.patientId, crisisData.riskLevel);
    intervention.actions.push({
      type: 'support_activation',
      timestamp: new Date().toISOString(),
      contacts: supportActivation.contacted,
      responses: supportActivation.responses
    });

    // Step 5: Professional resources
    if (crisisData.riskLevel === 'high' || crisisData.riskLevel === 'critical') {
      const professional = await this.engageProfessionalHelp(crisisData);
      intervention.resources.push(professional);
      intervention.actions.push({
        type: 'professional_engagement',
        timestamp: new Date().toISOString(),
        resource: professional
      });
    }

    // Step 6: Emergency services if needed
    if (crisisData.riskLevel === 'critical' || safetyCheck.immediateDanger) {
      const emergency = await this.activateEmergencyServices(crisisData);
      intervention.actions.push({
        type: 'emergency_activation',
        timestamp: new Date().toISOString(),
        service: emergency.service,
        eta: emergency.eta
      });
    }

    return intervention;
  }

  async applyDeescalationTechniques(crisisData) {
    const deescalation = {
      techniques: [],
      effectiveness: 0,
      patientResponse: null
    };

    // Select appropriate techniques based on crisis type
    const techniques = {
      grounding: {
        name: '5-4-3-2-1 Grounding',
        description: 'Sensory awareness technique',
        script: 'Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste'
      },
      breathing: {
        name: 'Box Breathing',
        description: 'Controlled breathing technique',
        script: 'Breathe in for 4, hold for 4, out for 4, hold for 4'
      },
      validation: {
        name: 'Emotional Validation',
        description: 'Acknowledge and validate feelings',
        script: 'I hear that you\'re in a lot of pain right now. That must be really difficult.'
      },
      distraction: {
        name: 'Cognitive Distraction',
        description: 'Redirect attention',
        script: 'Can you help me understand what led to these feelings today?'
      },
      safety: {
        name: 'Safety Affirmation',
        description: 'Reinforce safety and support',
        script: 'You are safe right now. I\'m here with you, and we\'ll get through this together.'
      }
    };

    // Apply techniques based on risk level
    if (crisisData.riskLevel === 'high') {
      deescalation.techniques.push(techniques.safety, techniques.breathing, techniques.validation);
    } else if (crisisData.riskLevel === 'moderate') {
      deescalation.techniques.push(techniques.grounding, techniques.breathing, techniques.distraction);
    } else {
      deescalation.techniques.push(techniques.validation, techniques.grounding);
    }

    // Monitor effectiveness
    deescalation.effectiveness = await this.monitorDeescalationEffectiveness(
      crisisData.patientId,
      deescalation.techniques
    );

    return deescalation;
  }

  async createSafetyPlan(patientId, riskLevel) {
    const safetyPlan = {
      patientId,
      createdAt: new Date().toISOString(),
      riskLevel,
      warningSignals: [],
      copingStrategies: [],
      distractions: [],
      supportContacts: [],
      professionalContacts: [],
      safeEnvironment: [],
      reasonsToLive: []
    };

    // Warning signals to watch for
    safetyPlan.warningSignals = [
      'Feeling overwhelmed or hopeless',
      'Increased isolation from others',
      'Trouble sleeping or sleeping too much',
      'Loss of interest in activities',
      'Increased substance use'
    ];

    // Internal coping strategies
    safetyPlan.copingStrategies = await this.getPersonalizedCopingStrategies(patientId);

    // Distraction activities
    safetyPlan.distractions = [
      'Go for a walk',
      'Listen to music',
      'Watch a favorite show',
      'Call a friend',
      'Practice mindfulness',
      'Engage in hobby'
    ];

    // Support contacts
    safetyPlan.supportContacts = await this.getSupportContacts(patientId);

    // Professional contacts
    safetyPlan.professionalContacts = [
      {
        name: 'Crisis Hotline',
        number: '988',
        available: '24/7'
      },
      {
        name: 'Therapist',
        number: await this.getTherapistContact(patientId),
        available: 'Business hours'
      },
      {
        name: 'Emergency Services',
        number: '911',
        available: '24/7'
      }
    ];

    // Safe environment steps
    safetyPlan.safeEnvironment = [
      'Remove or secure harmful items',
      'Limit access to medications',
      'Avoid alcohol and drugs',
      'Stay with supportive people'
    ];

    // Reasons to live
    safetyPlan.reasonsToLive = await this.getPersonalizedReasonsToLive(patientId);

    return safetyPlan;
  }

  async manageCrisisEscalation(interventionId, escalationReason) {
    const escalation = {
      interventionId,
      escalatedAt: new Date().toISOString(),
      reason: escalationReason,
      previousLevel: null,
      newLevel: null,
      actions: [],
      notifications: []
    };

    // Get current intervention
    const intervention = await this.getIntervention(interventionId);
    escalation.previousLevel = intervention.riskLevel;

    // Determine new risk level
    escalation.newLevel = this.escalateRiskLevel(intervention.riskLevel);

    // Take escalation actions based on new level
    switch (escalation.newLevel) {
      case 'moderate':
        // Increase check-in frequency
        escalation.actions.push({
          type: 'increase_monitoring',
          frequency: 'every_30_minutes',
          method: 'automated_check_in'
        });
        
        // Notify primary support
        const primarySupport = await this.notifyPrimarySupport(intervention.patientId);
        escalation.notifications.push(primarySupport);
        break;
        
      case 'high':
        // Initiate continuous monitoring
        escalation.actions.push({
          type: 'continuous_monitoring',
          method: 'real_time_tracking'
        });
        
        // Activate crisis team
        const crisisTeam = await this.activateCrisisTeam(intervention.patientId);
        escalation.notifications.push(...crisisTeam);
        
        // Schedule urgent session
        const urgentSession = await this.scheduleUrgentSession(intervention.patientId);
        escalation.actions.push(urgentSession);
        break;
        
      case 'critical':
        // Initiate welfare check
        escalation.actions.push({
          type: 'welfare_check',
          method: 'in_person',
          dispatcher: 'emergency_services'
        });
        
        // Activate emergency protocol
        const emergencyProtocol = await this.activateEmergencyProtocol(intervention.patientId);
        escalation.actions.push(emergencyProtocol);
        
        // Notify all stakeholders
        const allContacts = await this.notifyAllEmergencyContacts(intervention.patientId);
        escalation.notifications.push(...allContacts);
        break;
    }

    // Update intervention status
    await this.updateInterventionStatus(interventionId, escalation);

    return escalation;
  }

  async conductPostCrisisFollowUp(interventionId) {
    const followUp = {
      interventionId,
      followUpDate: new Date().toISOString(),
      assessments: [],
      adjustments: [],
      recommendations: [],
      nextSteps: []
    };

    // Get intervention details
    const intervention = await this.getIntervention(interventionId);

    // Assess current status (24 hours post-crisis)
    const currentAssessment = await this.performRiskAssessment(
      intervention.patientId,
      { postCrisis: true }
    );
    followUp.assessments.push({
      type: '24_hour',
      riskLevel: currentAssessment.riskLevel,
      improvement: this.calculateImprovement(intervention.riskLevel, currentAssessment.riskLevel)
    });

    // Review safety plan adherence
    const planAdherence = await this.assessSafetyPlanAdherence(intervention.patientId);
    followUp.assessments.push({
      type: 'safety_plan_adherence',
      adherence: planAdherence.rate,
      challenges: planAdherence.challenges
    });

    // Adjust treatment plan
    if (currentAssessment.riskLevel !== 'minimal') {
      followUp.adjustments.push({
        type: 'increase_session_frequency',
        from: 'weekly',
        to: 'twice_weekly'
      });
      
      followUp.adjustments.push({
        type: 'add_check_ins',
        frequency: 'daily',
        duration: '2_weeks'
      });
    }

    // Generate recommendations
    followUp.recommendations = await this.generatePostCrisisRecommendations(
      intervention,
      currentAssessment
    );

    // Schedule follow-ups
    followUp.nextSteps = [
      {
        type: '48_hour_check',
        scheduledFor: new Date(Date.now() + 48 * 3600000).toISOString()
      },
      {
        type: '1_week_assessment',
        scheduledFor: new Date(Date.now() + 7 * 86400000).toISOString()
      },
      {
        type: '1_month_review',
        scheduledFor: new Date(Date.now() + 30 * 86400000).toISOString()
      }
    ];

    // Create crisis prevention plan
    const preventionPlan = await this.createCrisisPreventionPlan(
      intervention.patientId,
      intervention.triggers
    );
    followUp.preventionPlan = preventionPlan;

    return followUp;
  }

  async createCrisisProtocol(organizationId) {
    const protocol = {
      organizationId,
      version: '1.0',
      createdAt: new Date().toISOString(),
      stages: {},
      escalationMatrix: {},
      responsibilities: {},
      resources: {},
      training: {}
    };

    // Define stages of crisis response
    protocol.stages = {
      detection: {
        description: 'Identify crisis signals',
        timeframe: 'immediate',
        actions: [
          'Monitor automated alerts',
          'Review patient communications',
          'Check assessment scores',
          'Evaluate behavioral changes'
        ]
      },
      assessment: {
        description: 'Evaluate risk level',
        timeframe: 'within_15_minutes',
        actions: [
          'Complete risk assessment',
          'Document risk factors',
          'Evaluate protective factors',
          'Determine intervention level'
        ]
      },
      intervention: {
        description: 'Implement crisis response',
        timeframe: 'within_30_minutes',
        actions: [
          'Apply de-escalation techniques',
          'Create/update safety plan',
          'Activate support network',
          'Engage professional help if needed'
        ]
      },
      stabilization: {
        description: 'Ensure patient safety',
        timeframe: 'ongoing',
        actions: [
          'Monitor continuously',
          'Adjust interventions as needed',
          'Coordinate care team',
          'Document all actions'
        ]
      },
      followUp: {
        description: 'Post-crisis care',
        timeframe: '24_72_hours',
        actions: [
          'Conduct follow-up assessment',
          'Review and adjust treatment',
          'Schedule additional sessions',
          'Create prevention plan'
        ]
      }
    };

    // Define escalation matrix
    protocol.escalationMatrix = {
      minimal: {
        responder: 'automated_system',
        notification: 'none',
        documentation: 'routine'
      },
      low: {
        responder: 'care_coordinator',
        notification: 'therapist',
        documentation: 'enhanced'
      },
      moderate: {
        responder: 'therapist',
        notification: 'supervisor',
        documentation: 'detailed'
      },
      high: {
        responder: 'crisis_team',
        notification: 'all_stakeholders',
        documentation: 'comprehensive'
      },
      critical: {
        responder: 'emergency_services',
        notification: 'immediate_all',
        documentation: 'legal_compliant'
      }
    };

    // Define responsibilities
    protocol.responsibilities = {
      automated_system: [
        'Monitor for crisis signals',
        'Generate alerts',
        'Document observations'
      ],
      care_coordinator: [
        'Initial assessment',
        'Support activation',
        'Documentation'
      ],
      therapist: [
        'Clinical assessment',
        'Direct intervention',
        'Treatment adjustment'
      ],
      crisis_team: [
        'Comprehensive response',
        'Multi-disciplinary coordination',
        'Family engagement'
      ],
      emergency_services: [
        'Immediate safety',
        'Transport if needed',
        'Medical evaluation'
      ]
    };

    return protocol;
  }

  // Helper methods
  calculateRiskScore(signals) {
    return signals.reduce((total, signal) => total + (signal.weight || 0), 0);
  }

  determineRiskLevel(score) {
    for (const [level, config] of Object.entries(this.interventionLevels).reverse()) {
      if (score >= config.score) return level;
    }
    return 'minimal';
  }

  calculateConfidence(signals) {
    if (signals.length === 0) return 0;
    const weights = signals.map(s => s.weight || 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return Math.min(100, (totalWeight / signals.length) * 10);
  }

  determineAction(riskLevel, confidence) {
    if (confidence < 50) return 'monitor';
    
    const actions = {
      minimal: 'continue_routine_care',
      low: 'increase_monitoring',
      moderate: 'urgent_assessment',
      high: 'immediate_intervention',
      critical: 'emergency_response'
    };
    
    return actions[riskLevel];
  }

  async analyzeEmotionalTone(text) {
    // Simplified emotional analysis
    const negativeWords = ['sad', 'hopeless', 'worthless', 'pain', 'hurt', 'alone', 'scared'];
    const words = text.toLowerCase().split(/\s+/);
    const negativeCount = words.filter(w => negativeWords.includes(w)).length;
    
    return {
      despair: Math.min(1, negativeCount / words.length * 5)
    };
  }

  detectGoodbyeMessage(text) {
    const goodbyePhrases = ['goodbye', 'farewell', 'sorry for everything', 'thank you for everything'];
    const lowerText = text.toLowerCase();
    return goodbyePhrases.some(phrase => lowerText.includes(phrase));
  }

  async triggerCrisisAlert(detection) {
    console.log('CRISIS ALERT TRIGGERED:', detection);
    // Implement actual alert system
  }

  generateInterventionId() {
    return `INT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  selectInterventionType(riskLevel) {
    const types = {
      minimal: 'self_help',
      low: 'guided_support',
      moderate: 'clinical_intervention',
      high: 'intensive_intervention',
      critical: 'emergency_intervention'
    };
    return types[riskLevel];
  }

  escalateRiskLevel(currentLevel) {
    const levels = ['minimal', 'low', 'moderate', 'high', 'critical'];
    const currentIndex = levels.indexOf(currentLevel);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  calculateImprovement(previousLevel, currentLevel) {
    const levels = ['minimal', 'low', 'moderate', 'high', 'critical'];
    const prevIndex = levels.indexOf(previousLevel);
    const currIndex = levels.indexOf(currentLevel);
    return ((prevIndex - currIndex) / prevIndex * 100).toFixed(1);
  }

  // Placeholder methods for external integrations
  async evaluateRiskFactor(patientId, factor, context) {
    return { present: false, severity: 0, evidence: [] };
  }
  
  async evaluateProtectiveFactor(patientId, factor, context) {
    return { present: true, strength: 1, evidence: [] };
  }
  
  async createInterventionPlan(riskLevel, riskFactors, protectiveFactors) {
    return { level: riskLevel, actions: [] };
  }
  
  generateRiskAssessmentDocumentation(assessment) {
    return [`Risk level: ${assessment.riskLevel}`, `Score: ${assessment.totalRiskScore}`];
  }
  
  async performSafetyCheck(patientId) {
    return { safe: true, immediateDanger: false };
  }
  
  async activateSupport(patientId, riskLevel) {
    return { contacted: [], responses: [] };
  }
  
  async engageProfessionalHelp(crisisData) {
    return { type: 'therapist', contact: 'scheduled' };
  }
  
  async activateEmergencyServices(crisisData) {
    return { service: '911', eta: '10 minutes' };
  }
  
  async monitorDeescalationEffectiveness(patientId, techniques) {
    return 0.75;
  }
  
  async getPersonalizedCopingStrategies(patientId) {
    return ['Deep breathing', 'Progressive muscle relaxation', 'Mindfulness'];
  }
  
  async getSupportContacts(patientId) {
    return [{ name: 'Emergency Contact', phone: '555-0100' }];
  }
  
  async getTherapistContact(patientId) {
    return '555-0200';
  }
  
  async getPersonalizedReasonsToLive(patientId) {
    return ['Family', 'Goals', 'Pets'];
  }
  
  async getIntervention(interventionId) {
    return { patientId: 'patient-123', riskLevel: 'moderate' };
  }
  
  async notifyPrimarySupport(patientId) {
    return { contact: 'primary', notified: true };
  }
  
  async activateCrisisTeam(patientId) {
    return [{ member: 'therapist', notified: true }];
  }
  
  async scheduleUrgentSession(patientId) {
    return { type: 'urgent_session', scheduled: true };
  }
  
  async activateEmergencyProtocol(patientId) {
    return { type: 'emergency_protocol', activated: true };
  }
  
  async notifyAllEmergencyContacts(patientId) {
    return [{ contact: 'all', notified: true }];
  }
  
  async updateInterventionStatus(interventionId, escalation) {
    console.log('Updating intervention:', interventionId);
  }
  
  async assessSafetyPlanAdherence(patientId) {
    return { rate: 0.8, challenges: [] };
  }
  
  async generatePostCrisisRecommendations(intervention, assessment) {
    return ['Increase session frequency', 'Review medications'];
  }
  
  async createCrisisPreventionPlan(patientId, triggers) {
    return { patientId, triggers: [], strategies: [] };
  }
  
  async analyzeBehaviors(behaviors) {
    return [];
  }
  
  async analyzeAssessments(assessments) {
    return [];
  }
  
  async analyzeBiometrics(biometrics) {
    return [];
  }
}

export default CrisisResponderAgent;