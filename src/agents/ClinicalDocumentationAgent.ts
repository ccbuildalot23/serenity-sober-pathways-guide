/**
 * Clinical Documentation Agent
 * Auto-generates clinical notes with CPT/ICD10 code suggestions
 * HIPAA-compliant billing and documentation support for healthcare providers
 */

import { HealthcareAgent, AgentContext, AgentResponse, AgentConfig } from './base/HealthcareAgent';
import { supabase } from '@/integrations/supabase/client';
import { enhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

interface ClinicalSession {
  id: string;
  patientId: string;
  providerId: string;
  sessionDate: Date;
  sessionType: 'individual' | 'group' | 'family' | 'couples' | 'crisis';
  duration: number; // minutes
  modality: 'in_person' | 'telehealth' | 'phone' | 'crisis_intervention';
  presentingConcerns: string[];
  treatmentGoals: string[];
  interventionsUsed: string[];
  patientResponse: string;
  riskAssessment: RiskAssessmentData;
  prognosisUpdate?: string;
  nextSessionPlan?: string;
  medicationReview?: MedicationReview;
  rawNotes?: string;
}

interface RiskAssessmentData {
  suicidalIdeation: 'none' | 'passive' | 'active' | 'intent' | 'plan';
  selfHarmRisk: 'low' | 'moderate' | 'high' | 'imminent';
  substanceUseRisk: 'none' | 'low' | 'moderate' | 'high' | 'severe';
  functionalImpairment: 'none' | 'mild' | 'moderate' | 'severe';
  safetyPlan: boolean;
  emergencyContacts: boolean;
}

interface MedicationReview {
  currentMedications: MedicationInfo[];
  adherenceAssessment: 'excellent' | 'good' | 'poor' | 'unknown';
  sideEffects: string[];
  effectiveness: 'very_effective' | 'somewhat_effective' | 'not_effective' | 'too_early';
  recommendations: string[];
}

interface MedicationInfo {
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
  adherence: 'taking_as_prescribed' | 'missed_doses' | 'not_taking';
}

interface DocumentationPreferences {
  providerId: string;
  preferredFormat: 'SOAP' | 'BIRP' | 'GIRP' | 'narrative';
  includeCPTSuggestions: boolean;
  includeICD10Suggestions: boolean;
  autoGenerateTreatmentPlan: boolean;
  includeRiskAssessment: boolean;
  templateCustomizations: Record<string, any>;
}

interface GeneratedNote {
  sessionId: string;
  format: string;
  sections: NoteSections;
  suggestedCPTCodes: CPTCodeSuggestion[];
  suggestedICD10Codes: ICD10CodeSuggestion[];
  billableTime: number;
  complianceChecks: ComplianceCheck[];
  confidence: number;
  reviewRequired: boolean;
  generatedAt: Date;
}

interface NoteSections {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  // BIRP format
  behavior?: string;
  intervention?: string;
  response?: string;
  // Additional sections
  riskAssessment?: string;
  treatmentGoals?: string;
  homework?: string;
  nextSession?: string;
}

interface CPTCodeSuggestion {
  code: string;
  description: string;
  confidence: number;
  justification: string;
  reimbursementRate: number;
  timeRequirement: number;
  modifiers?: string[];
}

interface ICD10CodeSuggestion {
  code: string;
  description: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe' | 'unspecified';
  justification: string;
  primaryDiagnosis: boolean;
}

interface ComplianceCheck {
  area: 'documentation' | 'billing' | 'privacy' | 'safety';
  status: 'compliant' | 'warning' | 'non_compliant';
  message: string;
  recommendation?: string;
}

interface TreatmentPlan {
  patientId: string;
  goals: TreatmentGoal[];
  interventions: PlannedIntervention[];
  timeline: string;
  outcomeMetrics: string[];
  reviewDate: Date;
  providerNotes: string;
}

interface TreatmentGoal {
  id: string;
  description: string;
  measurable: boolean;
  timeframe: string;
  status: 'active' | 'achieved' | 'modified' | 'discontinued';
  progressNotes: string[];
}

interface PlannedIntervention {
  type: string;
  frequency: string;
  duration: string;
  expectedOutcome: string;
}

export class ClinicalDocumentationAgent extends HealthcareAgent {
  private providerPreferences: Map<string, DocumentationPreferences> = new Map();
  private cptCodeDatabase: Map<string, any> = new Map();
  private icd10Database: Map<string, any> = new Map();

  constructor() {
    const config: AgentConfig = {
      name: 'ClinicalDocumentation',
      version: '1.0.0',
      capabilities: [
        'clinical_note_generation',
        'cpt_code_suggestion',
        'icd10_code_suggestion',
        'treatment_plan_generation',
        'billing_optimization',
        'compliance_checking',
        'documentation_templates'
      ],
      maxTokens: 8000,
      temperature: 0.2, // Lower temperature for more consistent clinical documentation
      responseTimeout: 30000,
      rateLimitPerHour: 200,
      requiresEncryption: true,
      auditLevel: 'detailed'
    };

    super(config);
    this.initializeCodeDatabases();
  }

  async initialize(context: AgentContext): Promise<void> {
    await super.initialize(context);
    await this.loadDocumentationPreferences(context.userId);
  }

  protected async process(input: string, context: AgentContext): Promise<AgentResponse> {
    try {
      const intent = await this.parseDocumentationIntent(input);
      
      switch (intent.type) {
        case 'generate_note':
          return await this.generateClinicalNote(intent.sessionData, context);
        
        case 'suggest_codes':
          return await this.suggestBillingCodes(intent.sessionData, context);
        
        case 'create_treatment_plan':
          return await this.generateTreatmentPlan(intent.planData, context);
        
        case 'compliance_check':
          return await this.performComplianceCheck(intent.noteData, context);
        
        case 'template_customization':
          return await this.customizeTemplate(intent.templateData, context);
        
        case 'billing_optimization':
          return await this.optimizeBilling(intent.sessionData, context);
        
        default:
          return await this.provideDocumentationGuidance(input, context);
      }
    } catch (error) {
      await enhancedSecurityAuditService.logSecurityEvent(
        'CLINICAL_DOCUMENTATION_ERROR',
        { providerId: context.userId, error: error.message },
        'medium'
      );

      return {
        message: "I encountered an issue generating the clinical documentation. Let me provide general guidance instead.",
        confidence: 0.3,
        requiresEscalation: false,
        actions: [{
          type: 'log',
          data: { error: error.message, context: 'clinical_documentation' },
          priority: 'medium'
        }]
      };
    }
  }

  /**
   * Generate comprehensive clinical note with SOAP/BIRP format
   */
  private async generateClinicalNote(sessionData: ClinicalSession, context: AgentContext): Promise<AgentResponse> {
    try {
      const preferences = this.providerPreferences.get(context.userId);
      const format = preferences?.preferredFormat || 'SOAP';

      // Generate note sections based on format
      const sections = await this.buildNoteSections(sessionData, format);
      
      // Suggest appropriate codes
      const cptSuggestions = await this.suggestCPTCodes(sessionData);
      const icd10Suggestions = await this.suggestICD10Codes(sessionData);
      
      // Calculate billable time
      const billableTime = this.calculateBillableTime(sessionData, cptSuggestions);
      
      // Perform compliance checks
      const complianceChecks = await this.performDocumentationCompliance(sections, sessionData);
      
      const generatedNote: GeneratedNote = {
        sessionId: sessionData.id,
        format,
        sections,
        suggestedCPTCodes: cptSuggestions,
        suggestedICD10Codes: icd10Suggestions,
        billableTime,
        complianceChecks,
        confidence: this.calculateNoteConfidence(sections, sessionData),
        reviewRequired: this.requiresReview(complianceChecks, sessionData),
        generatedAt: new Date()
      };

      // Store the generated note
      await this.storeClinicalNote(generatedNote);

      // Format response
      const formattedNote = this.formatClinicalNote(generatedNote);
      const billingInfo = this.formatBillingInformation(generatedNote);

      const message = `${formattedNote}\n\n${billingInfo}`;

      return {
        message,
        confidence: generatedNote.confidence,
        requiresEscalation: generatedNote.reviewRequired,
        actions: [
          {
            type: 'store',
            data: { 
              type: 'clinical_note',
              content: generatedNote,
              providerId: context.userId
            },
            priority: 'medium'
          }
        ],
        metadata: {
          format: generatedNote.format,
          cptCodesCount: generatedNote.suggestedCPTCodes.length,
          icd10CodesCount: generatedNote.suggestedICD10Codes.length,
          billableTime: generatedNote.billableTime,
          reviewRequired: generatedNote.reviewRequired
        }
      };
    } catch (error) {
      await enhancedSecurityAuditService.logSecurityEvent(
        'CLINICAL_NOTE_GENERATION_FAILED',
        { sessionId: sessionData.id, error: error.message },
        'medium'
      );
      throw error;
    }
  }

  /**
   * Load provider documentation preferences
   */
  private async loadDocumentationPreferences(providerId: string): Promise<void> {
    const { data: preferences } = await supabase
      .from('provider_documentation_preferences')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (preferences) {
      this.providerPreferences.set(providerId, {
        providerId,
        preferredFormat: preferences.preferred_format || 'SOAP',
        includeCPTSuggestions: preferences.include_cpt_suggestions ?? true,
        includeICD10Suggestions: preferences.include_icd10_suggestions ?? true,
        autoGenerateTreatmentPlan: preferences.auto_generate_treatment_plan ?? true,
        includeRiskAssessment: preferences.include_risk_assessment ?? true,
        templateCustomizations: preferences.template_customizations || {}
      });
    } else {
      // Set default preferences
      this.providerPreferences.set(providerId, {
        providerId,
        preferredFormat: 'SOAP',
        includeCPTSuggestions: true,
        includeICD10Suggestions: true,
        autoGenerateTreatmentPlan: true,
        includeRiskAssessment: true,
        templateCustomizations: {}
      });
    }
  }

  /**
   * Initialize CPT and ICD-10 code databases
   */
  private initializeCodeDatabases(): void {
    // Initialize CPT codes for mental health and substance abuse
    const cptCodes = [
      {
        code: '90791',
        description: 'Psychiatric diagnostic evaluation',
        timeRequirement: 60,
        reimbursementRate: 300,
        category: 'evaluation'
      },
      {
        code: '90834',
        description: 'Psychotherapy, 45 minutes',
        timeRequirement: 45,
        reimbursementRate: 150,
        category: 'therapy'
      },
      {
        code: '90837',
        description: 'Psychotherapy, 60 minutes',
        timeRequirement: 60,
        reimbursementRate: 180,
        category: 'therapy'
      },
      {
        code: '90847',
        description: 'Family psychotherapy with patient present',
        timeRequirement: 50,
        reimbursementRate: 170,
        category: 'family_therapy'
      },
      {
        code: '90853',
        description: 'Group psychotherapy',
        timeRequirement: 90,
        reimbursementRate: 80,
        category: 'group_therapy'
      },
      {
        code: '99490',
        description: 'Chronic care management, 20+ minutes',
        timeRequirement: 20,
        reimbursementRate: 42,
        category: 'care_management'
      },
      {
        code: '99484',
        description: 'Behavioral health integration',
        timeRequirement: 30,
        reimbursementRate: 157,
        category: 'integration'
      }
    ];

    cptCodes.forEach(code => {
      this.cptCodeDatabase.set(code.code, code);
    });

    // Initialize ICD-10 codes for common mental health and substance abuse diagnoses
    const icd10Codes = [
      {
        code: 'F41.1',
        description: 'Generalized anxiety disorder',
        category: 'anxiety',
        commonlyUsed: true
      },
      {
        code: 'F32.9',
        description: 'Major depressive disorder, single episode, unspecified',
        category: 'depression',
        commonlyUsed: true
      },
      {
        code: 'F33.9',
        description: 'Major depressive disorder, recurrent, unspecified',
        category: 'depression',
        commonlyUsed: true
      },
      {
        code: 'F10.20',
        description: 'Alcohol use disorder, moderate',
        category: 'substance_abuse',
        commonlyUsed: true
      },
      {
        code: 'F10.10',
        description: 'Alcohol use disorder, mild',
        category: 'substance_abuse',
        commonlyUsed: true
      },
      {
        code: 'F43.10',
        description: 'Post-traumatic stress disorder, unspecified',
        category: 'trauma',
        commonlyUsed: true
      },
      {
        code: 'F40.10',
        description: 'Social phobia, unspecified',
        category: 'anxiety',
        commonlyUsed: false
      }
    ];

    icd10Codes.forEach(code => {
      this.icd10Database.set(code.code, code);
    });
  }

  /**
   * Build note sections based on format preference
   */
  private async buildNoteSections(session: ClinicalSession, format: string): Promise<NoteSections> {
    const sections: NoteSections = {};

    if (format === 'SOAP') {
      sections.subjective = await this.generateSubjective(session);
      sections.objective = await this.generateObjective(session);
      sections.assessment = await this.generateAssessment(session);
      sections.plan = await this.generatePlan(session);
    } else if (format === 'BIRP') {
      sections.behavior = await this.generateBehavior(session);
      sections.intervention = await this.generateIntervention(session);
      sections.response = await this.generateResponse(session);
      sections.plan = await this.generatePlan(session);
    }

    // Add risk assessment if required
    sections.riskAssessment = await this.generateRiskAssessment(session);

    return sections;
  }

  /**
   * Suggest appropriate CPT codes based on session data
   */
  private async suggestCPTCodes(session: ClinicalSession): Promise<CPTCodeSuggestion[]> {
    const suggestions: CPTCodeSuggestion[] = [];
    
    // Determine primary service code based on session type and duration
    if (session.sessionType === 'individual') {
      if (session.duration >= 53 && session.duration <= 67) {
        const code = this.cptCodeDatabase.get('90837');
        suggestions.push({
          code: '90837',
          description: code.description,
          confidence: 0.95,
          justification: `Individual session lasting ${session.duration} minutes fits 90837 criteria`,
          reimbursementRate: code.reimbursementRate,
          timeRequirement: code.timeRequirement
        });
      } else if (session.duration >= 38 && session.duration <= 52) {
        const code = this.cptCodeDatabase.get('90834');
        suggestions.push({
          code: '90834',
          description: code.description,
          confidence: 0.95,
          justification: `Individual session lasting ${session.duration} minutes fits 90834 criteria`,
          reimbursementRate: code.reimbursementRate,
          timeRequirement: code.timeRequirement
        });
      }
    } else if (session.sessionType === 'family') {
      const code = this.cptCodeDatabase.get('90847');
      suggestions.push({
        code: '90847',
        description: code.description,
        confidence: 0.9,
        justification: 'Family therapy session with patient present',
        reimbursementRate: code.reimbursementRate,
        timeRequirement: code.timeRequirement
      });
    } else if (session.sessionType === 'group') {
      const code = this.cptCodeDatabase.get('90853');
      suggestions.push({
        code: '90853',
        description: code.description,
        confidence: 0.9,
        justification: 'Group therapy session',
        reimbursementRate: code.reimbursementRate,
        timeRequirement: code.timeRequirement
      });
    }

    // Add telehealth modifier if applicable
    if (session.modality === 'telehealth') {
      suggestions.forEach(suggestion => {
        suggestion.modifiers = ['95'];
      });
    }

    // Add care management codes if applicable
    if (session.treatmentGoals.length > 0 && session.duration >= 20) {
      const ccmCode = this.cptCodeDatabase.get('99490');
      suggestions.push({
        code: '99490',
        description: ccmCode.description,
        confidence: 0.7,
        justification: 'Session included care management activities',
        reimbursementRate: ccmCode.reimbursementRate,
        timeRequirement: ccmCode.timeRequirement
      });
    }

    return suggestions;
  }

  /**
   * Suggest appropriate ICD-10 codes based on session data
   */
  private async suggestICD10Codes(session: ClinicalSession): Promise<ICD10CodeSuggestion[]> {
    const suggestions: ICD10CodeSuggestion[] = [];

    // Analyze presenting concerns and interventions to suggest diagnoses
    const concerns = session.presentingConcerns.join(' ').toLowerCase();
    const interventions = session.interventionsUsed.join(' ').toLowerCase();

    // Depression indicators
    if (concerns.includes('depression') || concerns.includes('depressed') || 
        concerns.includes('sad') || interventions.includes('depression')) {
      const code = this.icd10Database.get('F33.9');
      suggestions.push({
        code: 'F33.9',
        description: code.description,
        confidence: 0.8,
        severity: 'unspecified',
        justification: 'Presenting concerns indicate depression symptoms',
        primaryDiagnosis: true
      });
    }

    // Anxiety indicators
    if (concerns.includes('anxiety') || concerns.includes('anxious') || 
        concerns.includes('worry') || interventions.includes('anxiety')) {
      const code = this.icd10Database.get('F41.1');
      suggestions.push({
        code: 'F41.1',
        description: code.description,
        confidence: 0.8,
        severity: 'unspecified',
        justification: 'Presenting concerns indicate anxiety symptoms',
        primaryDiagnosis: suggestions.length === 0
      });
    }

    // Substance abuse indicators
    if (concerns.includes('alcohol') || concerns.includes('drinking') || 
        concerns.includes('substance') || interventions.includes('substance')) {
      const code = this.icd10Database.get('F10.20');
      suggestions.push({
        code: 'F10.20',
        description: code.description,
        confidence: 0.75,
        severity: 'moderate',
        justification: 'Presenting concerns indicate alcohol use issues',
        primaryDiagnosis: suggestions.length === 0
      });
    }

    // PTSD indicators
    if (concerns.includes('trauma') || concerns.includes('ptsd') || 
        concerns.includes('flashback') || interventions.includes('trauma')) {
      const code = this.icd10Database.get('F43.10');
      suggestions.push({
        code: 'F43.10',
        description: code.description,
        confidence: 0.7,
        severity: 'unspecified',
        justification: 'Presenting concerns indicate trauma-related symptoms',
        primaryDiagnosis: suggestions.length === 0
      });
    }

    return suggestions;
  }

  /**
   * Calculate billable time based on session and CPT codes
   */
  private calculateBillableTime(session: ClinicalSession, cptSuggestions: CPTCodeSuggestion[]): number {
    if (cptSuggestions.length === 0) {
      return session.duration;
    }

    // Use the primary CPT code's time requirement
    const primaryCode = cptSuggestions.find(s => s.confidence > 0.8);
    return primaryCode ? Math.min(session.duration, primaryCode.timeRequirement) : session.duration;
  }

  /**
   * Perform compliance checks on documentation
   */
  private async performDocumentationCompliance(sections: NoteSections, session: ClinicalSession): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    // Check for required risk assessment
    if (session.riskAssessment.suicidalIdeation !== 'none' && !sections.riskAssessment) {
      checks.push({
        area: 'safety',
        status: 'non_compliant',
        message: 'Risk assessment section required for elevated suicide risk',
        recommendation: 'Add detailed risk assessment documentation'
      });
    }

    // Check for treatment goals documentation
    if (session.treatmentGoals.length === 0) {
      checks.push({
        area: 'documentation',
        status: 'warning',
        message: 'No treatment goals documented',
        recommendation: 'Consider documenting specific treatment goals'
      });
    }

    // Check for adequate progress note length
    const totalLength = Object.values(sections).join('').length;
    if (totalLength < 200) {
      checks.push({
        area: 'documentation',
        status: 'warning',
        message: 'Progress note may be too brief for billing compliance',
        recommendation: 'Expand documentation to support medical necessity'
      });
    }

    // Check HIPAA compliance
    const containsPHI = this.checkForExcessivePHI(sections);
    if (containsPHI) {
      checks.push({
        area: 'privacy',
        status: 'warning',
        message: 'Note may contain excessive PHI',
        recommendation: 'Review note for minimum necessary information'
      });
    }

    return checks;
  }

  // Note generation methods
  private async generateSubjective(session: ClinicalSession): Promise<string> {
    let subjective = `Patient presented for ${session.sessionType} ${session.modality} session. `;
    
    if (session.presentingConcerns.length > 0) {
      subjective += `Reported concerns include: ${session.presentingConcerns.join(', ')}. `;
    }

    if (session.rawNotes) {
      subjective += session.rawNotes;
    }

    return subjective;
  }

  private async generateObjective(session: ClinicalSession): Promise<string> {
    let objective = `Session lasted ${session.duration} minutes. `;
    
    if (session.interventionsUsed.length > 0) {
      objective += `Interventions included: ${session.interventionsUsed.join(', ')}. `;
    }

    objective += `Patient appeared ${this.assessAppearance(session)}. `;
    
    return objective;
  }

  private async generateAssessment(session: ClinicalSession): Promise<string> {
    let assessment = `Patient demonstrated ${session.patientResponse}. `;
    
    if (session.treatmentGoals.length > 0) {
      assessment += `Progress toward treatment goals: ${session.treatmentGoals.join(', ')}. `;
    }

    assessment += this.assessFunctioning(session);
    
    return assessment;
  }

  private async generatePlan(session: ClinicalSession): Promise<string> {
    let plan = 'Continue current treatment approach. ';
    
    if (session.nextSessionPlan) {
      plan += session.nextSessionPlan + ' ';
    }

    if (session.medicationReview) {
      plan += 'Medication management discussed. ';
    }

    plan += 'Next session scheduled in 1-2 weeks.';
    
    return plan;
  }

  private async generateRiskAssessment(session: ClinicalSession): Promise<string> {
    const risk = session.riskAssessment;
    
    let assessment = `Risk Assessment: `;
    assessment += `Suicidal ideation: ${risk.suicidalIdeation}. `;
    assessment += `Self-harm risk: ${risk.selfHarmRisk}. `;
    assessment += `Substance use risk: ${risk.substanceUseRisk}. `;
    assessment += `Functional impairment: ${risk.functionalImpairment}. `;
    
    if (risk.safetyPlan) {
      assessment += 'Safety plan reviewed and updated. ';
    }
    
    if (risk.emergencyContacts) {
      assessment += 'Emergency contacts confirmed. ';
    }
    
    return assessment;
  }

  // BIRP format methods
  private async generateBehavior(session: ClinicalSession): Promise<string> {
    return `Patient presented with ${session.presentingConcerns.join(', ')} and demonstrated ${session.patientResponse}.`;
  }

  private async generateIntervention(session: ClinicalSession): Promise<string> {
    return `Provided ${session.interventionsUsed.join(', ')} over ${session.duration} minutes via ${session.modality}.`;
  }

  private async generateResponse(session: ClinicalSession): Promise<string> {
    return `Patient ${session.patientResponse} and engaged appropriately in treatment.`;
  }

  // Helper methods
  private assessAppearance(session: ClinicalSession): string {
    // Simple assessment based on available data
    if (session.riskAssessment.functionalImpairment === 'severe') {
      return 'distressed with significant impairment';
    } else if (session.riskAssessment.functionalImpairment === 'moderate') {
      return 'mildly distressed but cooperative';
    } else {
      return 'alert and cooperative';
    }
  }

  private assessFunctioning(session: ClinicalSession): string {
    const impairment = session.riskAssessment.functionalImpairment;
    return `Current functional impairment assessed as ${impairment}.`;
  }

  private calculateNoteConfidence(sections: NoteSections, session: ClinicalSession): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on available data
    if (session.presentingConcerns.length > 0) confidence += 0.1;
    if (session.interventionsUsed.length > 0) confidence += 0.1;
    if (session.treatmentGoals.length > 0) confidence += 0.1;
    if (session.riskAssessment) confidence += 0.1;
    if (session.rawNotes) confidence += 0.1;
    
    return Math.min(0.95, confidence);
  }

  private requiresReview(checks: ComplianceCheck[], session: ClinicalSession): boolean {
    const hasNonCompliant = checks.some(c => c.status === 'non_compliant');
    const hasHighRisk = session.riskAssessment.suicidalIdeation !== 'none' || 
                       session.riskAssessment.selfHarmRisk === 'high';
    
    return hasNonCompliant || hasHighRisk;
  }

  private checkForExcessivePHI(sections: NoteSections): boolean {
    // Simple check for excessive PHI - would be more sophisticated in practice
    const allText = Object.values(sections).join(' ');
    return allText.length > 2000; // Arbitrary threshold
  }

  // Formatting methods
  private formatClinicalNote(note: GeneratedNote): string {
    let formatted = `=== ${note.format.toUpperCase()} NOTE ===\n\n`;
    
    if (note.format === 'SOAP') {
      if (note.sections.subjective) formatted += `SUBJECTIVE:\n${note.sections.subjective}\n\n`;
      if (note.sections.objective) formatted += `OBJECTIVE:\n${note.sections.objective}\n\n`;
      if (note.sections.assessment) formatted += `ASSESSMENT:\n${note.sections.assessment}\n\n`;
      if (note.sections.plan) formatted += `PLAN:\n${note.sections.plan}\n\n`;
    } else if (note.format === 'BIRP') {
      if (note.sections.behavior) formatted += `BEHAVIOR:\n${note.sections.behavior}\n\n`;
      if (note.sections.intervention) formatted += `INTERVENTION:\n${note.sections.intervention}\n\n`;
      if (note.sections.response) formatted += `RESPONSE:\n${note.sections.response}\n\n`;
      if (note.sections.plan) formatted += `PLAN:\n${note.sections.plan}\n\n`;
    }
    
    if (note.sections.riskAssessment) {
      formatted += `RISK ASSESSMENT:\n${note.sections.riskAssessment}\n\n`;
    }
    
    return formatted;
  }

  private formatBillingInformation(note: GeneratedNote): string {
    let billing = `=== BILLING INFORMATION ===\n\n`;
    
    if (note.suggestedCPTCodes.length > 0) {
      billing += `SUGGESTED CPT CODES:\n`;
      note.suggestedCPTCodes.forEach(code => {
        billing += `• ${code.code} - ${code.description} (Confidence: ${Math.round(code.confidence * 100)}%)\n`;
      });
      billing += '\n';
    }
    
    if (note.suggestedICD10Codes.length > 0) {
      billing += `SUGGESTED ICD-10 CODES:\n`;
      note.suggestedICD10Codes.forEach(code => {
        billing += `• ${code.code} - ${code.description} (${code.primaryDiagnosis ? 'Primary' : 'Secondary'})\n`;
      });
      billing += '\n';
    }
    
    billing += `BILLABLE TIME: ${note.billableTime} minutes\n`;
    
    if (note.complianceChecks.length > 0) {
      billing += `\nCOMPLIANCE NOTES:\n`;
      note.complianceChecks.forEach(check => {
        billing += `• ${check.area}: ${check.status} - ${check.message}\n`;
      });
    }
    
    return billing;
  }

  // Storage and database operations
  private async storeClinicalNote(note: GeneratedNote): Promise<void> {
    await supabase.from('generated_clinical_notes').insert({
      session_id: note.sessionId,
      format: note.format,
      sections: note.sections,
      suggested_cpt_codes: note.suggestedCPTCodes,
      suggested_icd10_codes: note.suggestedICD10Codes,
      billable_time: note.billableTime,
      compliance_checks: note.complianceChecks,
      confidence: note.confidence,
      review_required: note.reviewRequired,
      generated_at: note.generatedAt
    });
  }

  // Stub methods for additional functionality
  private async parseDocumentationIntent(input: string): Promise<any> {
    if (input.toLowerCase().includes('generate note') || input.toLowerCase().includes('create note')) {
      return { type: 'generate_note', sessionData: {} };
    }
    return { type: 'guidance' };
  }

  private async suggestBillingCodes(sessionData: any, context: AgentContext): Promise<AgentResponse> {
    return {
      message: "I'll help you identify the most appropriate billing codes for this session.",
      confidence: 0.8,
      requiresEscalation: false
    };
  }

  private async generateTreatmentPlan(planData: any, context: AgentContext): Promise<AgentResponse> {
    return {
      message: "I'll help you create a comprehensive treatment plan based on the patient's needs and goals.",
      confidence: 0.8,
      requiresEscalation: false
    };
  }

  private async performComplianceCheck(noteData: any, context: AgentContext): Promise<AgentResponse> {
    return {
      message: "I'll review your documentation for compliance with billing and clinical standards.",
      confidence: 0.8,
      requiresEscalation: false
    };
  }

  private async customizeTemplate(templateData: any, context: AgentContext): Promise<AgentResponse> {
    return {
      message: "I'll help you customize your documentation templates to match your practice preferences.",
      confidence: 0.8,
      requiresEscalation: false
    };
  }

  private async optimizeBilling(sessionData: any, context: AgentContext): Promise<AgentResponse> {
    return {
      message: "I'll analyze your session data to optimize billing accuracy and reimbursement potential.",
      confidence: 0.8,
      requiresEscalation: false
    };
  }

  private async provideDocumentationGuidance(input: string, context: AgentContext): Promise<AgentResponse> {
    return {
      message: "I can help with clinical note generation, CPT/ICD-10 code suggestions, treatment planning, and billing optimization. What specific documentation support do you need?",
      confidence: 0.7,
      requiresEscalation: false,
      metadata: {
        capabilities: this.getCapabilities()
      }
    };
  }
}