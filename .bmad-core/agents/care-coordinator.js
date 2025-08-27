/**
 * Care Coordinator Agent - Clinical Workflow Management
 * Manages patient care plans, assessments, and treatment coordination
 */

import { BMADAgent } from '../core/agent.js';

export class CareCoordinatorAgent extends BMADAgent {
  constructor() {
    super({
      name: 'care-coordinator',
      role: 'clinical',
      capabilities: ['assessment', 'care-planning', 'referral', 'monitoring', 'documentation']
    });
    
    this.assessmentTools = {
      PHQ9: { name: 'Patient Health Questionnaire-9', domain: 'depression', maxScore: 27 },
      GAD7: { name: 'Generalized Anxiety Disorder-7', domain: 'anxiety', maxScore: 21 },
      AUDIT: { name: 'Alcohol Use Disorders Identification Test', domain: 'alcohol', maxScore: 40 },
      DAST10: { name: 'Drug Abuse Screening Test-10', domain: 'substance', maxScore: 10 },
      PCL5: { name: 'PTSD Checklist for DSM-5', domain: 'trauma', maxScore: 80 }
    };
    
    this.riskLevels = {
      minimal: { color: 'green', action: 'routine_followup' },
      mild: { color: 'yellow', action: 'enhanced_monitoring' },
      moderate: { color: 'orange', action: 'clinical_review' },
      severe: { color: 'red', action: 'immediate_intervention' }
    };
  }

  async performIntake(patientData) {
    const intake = {
      patientId: patientData.id,
      timestamp: new Date().toISOString(),
      status: 'in_progress',
      components: []
    };

    // Step 1: Verify insurance
    const insurance = await this.verifyInsurance(patientData.insurance);
    intake.components.push({
      name: 'insurance_verification',
      status: insurance.verified ? 'complete' : 'pending',
      data: insurance
    });

    // Step 2: Collect consent
    const consent = await this.collectConsent(patientData.id);
    intake.components.push({
      name: 'consent',
      status: consent.signed ? 'complete' : 'pending',
      data: consent
    });

    // Step 3: Administer assessments
    const assessments = await this.administerIntakeAssessments(patientData);
    intake.components.push({
      name: 'assessments',
      status: 'complete',
      data: assessments
    });

    // Step 4: Calculate risk stratification
    const risk = await this.stratifyRisk(assessments);
    intake.components.push({
      name: 'risk_stratification',
      status: 'complete',
      data: risk
    });

    // Step 5: Generate initial care plan
    const carePlan = await this.generateInitialCarePlan(patientData, assessments, risk);
    intake.components.push({
      name: 'care_plan',
      status: 'complete',
      data: carePlan
    });

    // Step 6: Schedule first appointment
    const appointment = await this.scheduleInitialAppointment(patientData, risk);
    intake.components.push({
      name: 'appointment_scheduling',
      status: appointment.scheduled ? 'complete' : 'pending',
      data: appointment
    });

    intake.status = 'complete';
    intake.completedAt = new Date().toISOString();
    
    return intake;
  }

  async administerAssessment(patientId, assessmentType, responses) {
    const tool = this.assessmentTools[assessmentType];
    if (!tool) {
      throw new Error(`Unknown assessment type: ${assessmentType}`);
    }

    const score = this.calculateScore(responses);
    const severity = this.interpretScore(assessmentType, score);
    const clinicalInterpretation = this.generateClinicalInterpretation(assessmentType, score, responses);
    
    const assessment = {
      patientId,
      type: assessmentType,
      toolName: tool.name,
      administeredAt: new Date().toISOString(),
      responses,
      score,
      maxScore: tool.maxScore,
      severity,
      interpretation: clinicalInterpretation,
      validityCheck: this.validateResponses(responses),
      nextAssessmentDue: this.calculateNextAssessment(severity)
    };

    // Check for critical items
    const criticalItems = this.checkCriticalItems(assessmentType, responses);
    if (criticalItems.length > 0) {
      assessment.alerts = criticalItems;
      await this.triggerClinicalAlert(patientId, criticalItems);
    }

    return assessment;
  }

  async createCarePlan(patientId, assessments, preferences) {
    const carePlan = {
      patientId,
      createdAt: new Date().toISOString(),
      status: 'active',
      primaryDiagnosis: [],
      goals: [],
      interventions: [],
      medications: [],
      referrals: [],
      barriers: [],
      strengths: []
    };

    // Analyze assessments for diagnosis
    for (const assessment of assessments) {
      const diagnosis = this.suggestDiagnosis(assessment);
      if (diagnosis) {
        carePlan.primaryDiagnosis.push(diagnosis);
      }
    }

    // Generate SMART goals
    carePlan.goals = this.generateSMARTGoals(assessments, preferences);

    // Select evidence-based interventions
    carePlan.interventions = await this.selectInterventions(
      carePlan.primaryDiagnosis,
      assessments,
      preferences
    );

    // Add medication recommendations if appropriate
    if (this.requiresMedication(assessments)) {
      carePlan.medications = await this.recommendMedications(carePlan.primaryDiagnosis);
    }

    // Identify referral needs
    carePlan.referrals = await this.identifyReferrals(assessments, preferences);

    // Assess barriers and strengths
    carePlan.barriers = this.assessBarriers(patientId);
    carePlan.strengths = this.assessStrengths(patientId);

    // Set review date
    carePlan.nextReviewDate = this.calculateReviewDate(carePlan);

    return carePlan;
  }

  async monitorProgress(patientId, carePlanId) {
    const monitoring = {
      patientId,
      carePlanId,
      timestamp: new Date().toISOString(),
      metrics: {},
      trends: {},
      recommendations: []
    };

    // Get recent check-ins
    const checkIns = await this.getRecentCheckIns(patientId, 30);
    
    // Calculate trend metrics
    monitoring.metrics = {
      adherence: this.calculateAdherence(checkIns),
      moodTrend: this.analyzeMoodTrend(checkIns),
      anxietyTrend: this.analyzeAnxietyTrend(checkIns),
      sleepQuality: this.analyzeSleepPattern(checkIns),
      substanceUse: this.analyzeSubstanceUse(checkIns),
      engagement: this.calculateEngagement(checkIns)
    };

    // Identify concerning patterns
    const patterns = this.identifyPatterns(checkIns);
    if (patterns.concerning.length > 0) {
      monitoring.alerts = patterns.concerning;
      monitoring.recommendations.push(...this.generateInterventions(patterns.concerning));
    }

    // Check goal progress
    const goalProgress = await this.assessGoalProgress(carePlanId);
    monitoring.goalProgress = goalProgress;

    // Generate clinical recommendations
    if (monitoring.metrics.adherence < 0.7) {
      monitoring.recommendations.push({
        type: 'engagement',
        priority: 'high',
        action: 'Schedule motivational interviewing session'
      });
    }

    if (monitoring.metrics.moodTrend.direction === 'worsening') {
      monitoring.recommendations.push({
        type: 'clinical',
        priority: 'high',
        action: 'Provider review recommended - mood deterioration detected'
      });
    }

    return monitoring;
  }

  async coordinateProviderHandoff(patientId, fromProviderId, toProviderId, reason) {
    const handoff = {
      patientId,
      fromProvider: fromProviderId,
      toProvider: toProviderId,
      reason,
      timestamp: new Date().toISOString(),
      status: 'pending',
      documents: []
    };

    // Compile transfer summary
    const summary = await this.compileTransferSummary(patientId);
    handoff.documents.push({
      type: 'transfer_summary',
      content: summary
    });

    // Get recent assessments
    const assessments = await this.getRecentAssessments(patientId, 90);
    handoff.documents.push({
      type: 'assessments',
      content: assessments
    });

    // Get current care plan
    const carePlan = await this.getCurrentCarePlan(patientId);
    handoff.documents.push({
      type: 'care_plan',
      content: carePlan
    });

    // Get medication list
    const medications = await this.getCurrentMedications(patientId);
    handoff.documents.push({
      type: 'medications',
      content: medications
    });

    // Schedule handoff meeting
    const meeting = await this.scheduleHandoffMeeting(fromProviderId, toProviderId);
    handoff.meetingScheduled = meeting;

    // Notify all parties
    await this.notifyHandoffParties(handoff);

    handoff.status = 'scheduled';
    
    return handoff;
  }

  async manageCrisis(patientId, crisisData) {
    const crisis = {
      patientId,
      timestamp: new Date().toISOString(),
      severity: this.assessCrisisSeverity(crisisData),
      protocol: [],
      actions: []
    };

    // Step 1: Safety assessment
    const safety = await this.assessSafety(patientId, crisisData);
    crisis.safetyAssessment = safety;
    
    if (safety.immediateDanger) {
      // Initiate emergency protocol
      await this.initiateEmergencyProtocol(patientId, safety);
      crisis.protocol.push('emergency_services_contacted');
      crisis.actions.push({
        type: 'emergency',
        timestamp: new Date().toISOString(),
        action: 'Called 911'
      });
    }

    // Step 2: Activate support network
    const supporters = await this.activateSupportNetwork(patientId, crisis.severity);
    crisis.supportersNotified = supporters;
    crisis.actions.push({
      type: 'notification',
      timestamp: new Date().toISOString(),
      action: `Notified ${supporters.length} supporters`
    });

    // Step 3: Deploy coping strategies
    const copingStrategies = await this.deployCopingStrategies(patientId, crisisData);
    crisis.copingStrategies = copingStrategies;
    crisis.actions.push({
      type: 'intervention',
      timestamp: new Date().toISOString(),
      action: 'Deployed personalized coping strategies'
    });

    // Step 4: Schedule follow-up
    const followUp = await this.scheduleCrisisFollowUp(patientId, crisis.severity);
    crisis.followUp = followUp;
    crisis.actions.push({
      type: 'follow_up',
      timestamp: new Date().toISOString(),
      action: `Scheduled follow-up for ${followUp.scheduledTime}`
    });

    // Step 5: Document incident
    await this.documentCrisisIncident(crisis);
    crisis.documented = true;

    return crisis;
  }

  async generateOutcomeReport(patientId, dateRange) {
    const report = {
      patientId,
      period: dateRange,
      generatedAt: new Date().toISOString(),
      outcomes: {},
      clinicalSummary: '',
      recommendations: []
    };

    // Get baseline and current assessments
    const baseline = await this.getBaselineAssessments(patientId);
    const current = await this.getCurrentAssessments(patientId);

    // Calculate outcome metrics
    report.outcomes = {
      phq9: {
        baseline: baseline.PHQ9?.score || 0,
        current: current.PHQ9?.score || 0,
        change: this.calculatePercentChange(baseline.PHQ9?.score, current.PHQ9?.score),
        clinicallySignificant: Math.abs(baseline.PHQ9?.score - current.PHQ9?.score) >= 5
      },
      gad7: {
        baseline: baseline.GAD7?.score || 0,
        current: current.GAD7?.score || 0,
        change: this.calculatePercentChange(baseline.GAD7?.score, current.GAD7?.score),
        clinicallySignificant: Math.abs(baseline.GAD7?.score - current.GAD7?.score) >= 4
      },
      functioningScore: await this.calculateFunctioningScore(patientId),
      qualityOfLife: await this.assessQualityOfLife(patientId),
      treatmentAdherence: await this.calculateTreatmentAdherence(patientId, dateRange),
      substanceUseDays: await this.calculateSubstanceFreeDays(patientId, dateRange),
      crisisIncidents: await this.countCrisisIncidents(patientId, dateRange),
      hospitalizations: await this.countHospitalizations(patientId, dateRange)
    };

    // Generate clinical summary
    report.clinicalSummary = this.generateClinicalSummary(report.outcomes);

    // Generate recommendations
    if (report.outcomes.phq9.change < -20) {
      report.recommendations.push('Consider medication adjustment - insufficient depression improvement');
    }
    
    if (report.outcomes.treatmentAdherence < 0.8) {
      report.recommendations.push('Address treatment adherence barriers');
    }

    if (report.outcomes.crisisIncidents > 1) {
      report.recommendations.push('Review and update crisis prevention plan');
    }

    return report;
  }

  // Helper methods
  async verifyInsurance(insuranceData) {
    // Integrate with insurance verification API
    return {
      verified: true,
      eligibility: 'active',
      copay: 25,
      deductible: 500,
      deductibleMet: 0.6
    };
  }

  async collectConsent(patientId) {
    return {
      signed: true,
      timestamp: new Date().toISOString(),
      type: 'electronic',
      consentItems: ['treatment', 'medication', 'information_sharing']
    };
  }

  async administerIntakeAssessments(patientData) {
    // Administer standard intake battery
    return {
      PHQ9: { score: 12, severity: 'moderate' },
      GAD7: { score: 8, severity: 'mild' },
      AUDIT: { score: 3, severity: 'minimal' }
    };
  }

  async stratifyRisk(assessments) {
    let riskScore = 0;
    
    if (assessments.PHQ9?.score > 15) riskScore += 3;
    else if (assessments.PHQ9?.score > 10) riskScore += 2;
    else if (assessments.PHQ9?.score > 5) riskScore += 1;
    
    if (assessments.GAD7?.score > 15) riskScore += 2;
    else if (assessments.GAD7?.score > 10) riskScore += 1;
    
    if (assessments.AUDIT?.score > 20) riskScore += 3;
    else if (assessments.AUDIT?.score > 8) riskScore += 1;
    
    if (riskScore >= 7) return 'severe';
    if (riskScore >= 4) return 'moderate';
    if (riskScore >= 2) return 'mild';
    return 'minimal';
  }

  async generateInitialCarePlan(patientData, assessments, risk) {
    const plan = {
      patientId: patientData.id,
      risk,
      primaryConcerns: [],
      initialGoals: [],
      recommendedInterventions: []
    };

    if (assessments.PHQ9?.severity !== 'minimal') {
      plan.primaryConcerns.push('depression');
      plan.initialGoals.push('Reduce PHQ9 score by 50% in 12 weeks');
      plan.recommendedInterventions.push('CBT for depression');
    }

    if (assessments.GAD7?.severity !== 'minimal') {
      plan.primaryConcerns.push('anxiety');
      plan.initialGoals.push('Reduce GAD7 score by 50% in 12 weeks');
      plan.recommendedInterventions.push('Anxiety management techniques');
    }

    return plan;
  }

  async scheduleInitialAppointment(patientData, risk) {
    const urgency = risk === 'severe' ? 'urgent' : 'routine';
    const timeframe = risk === 'severe' ? 24 : 72; // hours
    
    return {
      scheduled: true,
      urgency,
      timeframe,
      appointmentTime: new Date(Date.now() + timeframe * 3600000).toISOString()
    };
  }

  calculateScore(responses) {
    return responses.reduce((sum, response) => sum + response.value, 0);
  }

  interpretScore(assessmentType, score) {
    const thresholds = {
      PHQ9: { minimal: 4, mild: 9, moderate: 14, severe: 19 },
      GAD7: { minimal: 4, mild: 9, moderate: 14, severe: 15 },
      AUDIT: { minimal: 7, mild: 15, moderate: 19, severe: 20 },
      DAST10: { minimal: 2, mild: 4, moderate: 6, severe: 8 },
      PCL5: { minimal: 30, mild: 40, moderate: 50, severe: 60 }
    };

    const threshold = thresholds[assessmentType];
    if (score <= threshold.minimal) return 'minimal';
    if (score <= threshold.mild) return 'mild';
    if (score <= threshold.moderate) return 'moderate';
    return 'severe';
  }

  generateClinicalInterpretation(assessmentType, score, responses) {
    // Generate detailed clinical interpretation
    return `Score of ${score} indicates ${this.interpretScore(assessmentType, score)} severity`;
  }

  validateResponses(responses) {
    // Check for response validity
    return {
      complete: responses.every(r => r.value !== null),
      consistent: true,
      timeToComplete: responses[responses.length - 1]?.timestamp - responses[0]?.timestamp
    };
  }

  calculateNextAssessment(severity) {
    const intervals = {
      minimal: 90,
      mild: 30,
      moderate: 14,
      severe: 7
    };
    
    const days = intervals[severity] || 30;
    return new Date(Date.now() + days * 86400000).toISOString();
  }

  checkCriticalItems(assessmentType, responses) {
    const criticalItems = [];
    
    if (assessmentType === 'PHQ9' && responses[8]?.value > 0) {
      criticalItems.push({
        type: 'suicidal_ideation',
        severity: responses[8].value,
        item: 'PHQ9 Item 9'
      });
    }
    
    return criticalItems;
  }

  async triggerClinicalAlert(patientId, criticalItems) {
    console.log(`CLINICAL ALERT for patient ${patientId}:`, criticalItems);
    // Implement actual alert system
  }

  suggestDiagnosis(assessment) {
    // Map assessment results to ICD-10 codes
    const diagnoses = {
      PHQ9: {
        moderate: { code: 'F32.1', description: 'Major depressive disorder, single episode, moderate' },
        severe: { code: 'F32.2', description: 'Major depressive disorder, single episode, severe' }
      },
      GAD7: {
        moderate: { code: 'F41.1', description: 'Generalized anxiety disorder' },
        severe: { code: 'F41.1', description: 'Generalized anxiety disorder' }
      }
    };
    
    return diagnoses[assessment.type]?.[assessment.severity];
  }

  generateSMARTGoals(assessments, preferences) {
    const goals = [];
    
    for (const assessment of assessments) {
      if (assessment.severity !== 'minimal') {
        goals.push({
          specific: `Reduce ${assessment.type} score`,
          measurable: `By 50% from baseline`,
          achievable: true,
          relevant: `Addresses ${assessment.domain} symptoms`,
          timebound: '12 weeks',
          baseline: assessment.score,
          target: Math.floor(assessment.score * 0.5)
        });
      }
    }
    
    return goals;
  }

  async selectInterventions(diagnoses, assessments, preferences) {
    const interventions = [];
    
    // Evidence-based interventions by diagnosis
    for (const diagnosis of diagnoses) {
      if (diagnosis.code.startsWith('F32')) {
        interventions.push({
          type: 'psychotherapy',
          modality: 'CBT',
          frequency: 'weekly',
          duration: '12 weeks'
        });
      }
      
      if (diagnosis.code.startsWith('F41')) {
        interventions.push({
          type: 'psychotherapy',
          modality: 'CBT for anxiety',
          frequency: 'weekly',
          duration: '8 weeks'
        });
      }
    }
    
    return interventions;
  }

  requiresMedication(assessments) {
    return assessments.some(a => a.severity === 'severe');
  }

  async recommendMedications(diagnoses) {
    const medications = [];
    
    for (const diagnosis of diagnoses) {
      if (diagnosis.code.startsWith('F32')) {
        medications.push({
          class: 'SSRI',
          options: ['sertraline', 'escitalopram', 'fluoxetine'],
          startingDose: 'standard',
          monitoring: 'weekly for 4 weeks'
        });
      }
    }
    
    return medications;
  }

  async identifyReferrals(assessments, preferences) {
    const referrals = [];
    
    for (const assessment of assessments) {
      if (assessment.type === 'AUDIT' && assessment.severity !== 'minimal') {
        referrals.push({
          type: 'substance_abuse',
          specialty: 'addiction_medicine',
          urgency: assessment.severity === 'severe' ? 'urgent' : 'routine'
        });
      }
    }
    
    return referrals;
  }

  assessBarriers(patientId) {
    // Assess common treatment barriers
    return ['transportation', 'work_schedule'];
  }

  assessStrengths(patientId) {
    // Identify patient strengths
    return ['motivated', 'family_support', 'stable_housing'];
  }

  calculateReviewDate(carePlan) {
    // Standard review in 30 days
    return new Date(Date.now() + 30 * 86400000).toISOString();
  }

  calculatePercentChange(baseline, current) {
    if (baseline === 0) return 0;
    return ((current - baseline) / baseline * 100).toFixed(1);
  }

  generateClinicalSummary(outcomes) {
    const improvements = [];
    const concerns = [];
    
    if (outcomes.phq9.change < -30) improvements.push('significant depression improvement');
    else if (outcomes.phq9.change > 10) concerns.push('worsening depression');
    
    if (outcomes.gad7.change < -30) improvements.push('significant anxiety improvement');
    else if (outcomes.gad7.change > 10) concerns.push('worsening anxiety');
    
    return {
      improvements,
      concerns,
      overall: improvements.length > concerns.length ? 'improving' : 'needs_attention'
    };
  }

  // Placeholder methods for database queries
  async getRecentCheckIns(patientId, days) { return []; }
  async assessGoalProgress(carePlanId) { return {}; }
  async compileTransferSummary(patientId) { return {}; }
  async getRecentAssessments(patientId, days) { return []; }
  async getCurrentCarePlan(patientId) { return {}; }
  async getCurrentMedications(patientId) { return []; }
  async scheduleHandoffMeeting(from, to) { return {}; }
  async notifyHandoffParties(handoff) { return true; }
  async assessSafety(patientId, crisisData) { return { immediateDanger: false }; }
  async initiateEmergencyProtocol(patientId, safety) { return true; }
  async activateSupportNetwork(patientId, severity) { return []; }
  async deployCopingStrategies(patientId, crisisData) { return []; }
  async scheduleCrisisFollowUp(patientId, severity) { return { scheduledTime: '' }; }
  async documentCrisisIncident(crisis) { return true; }
  async getBaselineAssessments(patientId) { return {}; }
  async getCurrentAssessments(patientId) { return {}; }
  async calculateFunctioningScore(patientId) { return 0; }
  async assessQualityOfLife(patientId) { return 0; }
  async calculateTreatmentAdherence(patientId, dateRange) { return 0; }
  async calculateSubstanceFreeDays(patientId, dateRange) { return 0; }
  async countCrisisIncidents(patientId, dateRange) { return 0; }
  async countHospitalizations(patientId, dateRange) { return 0; }
  
  calculateAdherence(checkIns) { return 0.85; }
  analyzeMoodTrend(checkIns) { return { direction: 'stable' }; }
  analyzeAnxietyTrend(checkIns) { return { direction: 'improving' }; }
  analyzeSleepPattern(checkIns) { return { quality: 'good' }; }
  analyzeSubstanceUse(checkIns) { return { days_clean: 30 }; }
  calculateEngagement(checkIns) { return 0.9; }
  identifyPatterns(checkIns) { return { concerning: [] }; }
  generateInterventions(patterns) { return []; }
  assessCrisisSeverity(crisisData) { return 'moderate'; }
}

export default CareCoordinatorAgent;