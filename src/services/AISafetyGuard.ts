/**
 * AI Safety Guard Service
 * Monitors AI agent outputs for bias, hallucinations, and safety concerns
 * Ensures ethical AI usage in mental health care
 */

import { supabase } from '@/integrations/supabase/client';
import { enhancedSecurityAuditService } from './EnhancedSecurityAuditService';

export interface AIOutput {
  agentId: string;
  agentType: string;
  input: string;
  output: string;
  context: Record<string, any>;
  patientId?: string;
  providerId?: string;
  timestamp: Date;
}

export interface SafetyCheck {
  id: string;
  checkType: 'bias' | 'hallucination' | 'toxicity' | 'medical_accuracy' | 'ethical';
  passed: boolean;
  confidence: number;
  concerns: SafetyConcern[];
  recommendations: string[];
  requiresHumanReview: boolean;
}

export interface SafetyConcern {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  mitigationSuggestion: string;
}

export interface BiasPattern {
  category: string;
  keywords: string[];
  weight: number;
  context: string[];
}

export interface HallucinationIndicator {
  pattern: string;
  confidence: number;
  category: 'factual' | 'medical' | 'statistical' | 'personal';
}

interface SafetyMetrics {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  biasDetections: number;
  hallucinationDetections: number;
  humanReviewsRequired: number;
  averageConfidence: number;
}

export class AISafetyGuard {
  private static instance: AISafetyGuard;
  private biasPatterns: BiasPattern[];
  private hallucinationIndicators: HallucinationIndicator[];
  private toxicityPatterns: RegExp[];
  private medicalTerms: Set<string>;
  private ethicalGuidelines: string[];

  private constructor() {
    this.initializeBiasPatterns();
    this.initializeHallucinationIndicators();
    this.initializeToxicityPatterns();
    this.initializeMedicalTerms();
    this.initializeEthicalGuidelines();
  }

  static getInstance(): AISafetyGuard {
    if (!AISafetyGuard.instance) {
      AISafetyGuard.instance = new AISafetyGuard();
    }
    return AISafetyGuard.instance;
  }

  /**
   * Perform comprehensive safety check on AI output
   */
  async checkSafety(output: AIOutput): Promise<SafetyCheck[]> {
    const checks: SafetyCheck[] = [];

    // Run all safety checks in parallel
    const [biasCheck, hallucinationCheck, toxicityCheck, medicalCheck, ethicalCheck] = 
      await Promise.all([
        this.checkForBias(output),
        this.checkForHallucination(output),
        this.checkForToxicity(output),
        this.checkMedicalAccuracy(output),
        this.checkEthicalCompliance(output)
      ]);

    checks.push(biasCheck, hallucinationCheck, toxicityCheck, medicalCheck, ethicalCheck);

    // Store safety check results
    await this.storeSafetyCheckResults(output, checks);

    // Determine if human review is needed
    const requiresReview = this.determineHumanReviewNeed(checks);

    if (requiresReview) {
      await this.flagForHumanReview(output, checks);
    }

    // Log safety check
    await this.logSafetyCheck(output, checks, requiresReview);

    return checks;
  }

  /**
   * Check for bias in AI output
   */
  private async checkForBias(output: AIOutput): Promise<SafetyCheck> {
    const concerns: SafetyConcern[] = [];
    let biasScore = 0;

    // Check for demographic bias
    const demographicBias = this.detectDemographicBias(output.output);
    if (demographicBias.detected) {
      concerns.push({
        type: 'demographic_bias',
        severity: demographicBias.severity,
        description: `Potential bias detected related to ${demographicBias.category}`,
        evidence: demographicBias.evidence,
        mitigationSuggestion: 'Rephrase to use neutral, inclusive language'
      });
      biasScore += demographicBias.weight;
    }

    // Check for stigmatizing language
    const stigmaCheck = this.detectStigmatizingLanguage(output.output);
    if (stigmaCheck.detected) {
      concerns.push({
        type: 'stigma',
        severity: 'medium',
        description: 'Stigmatizing language detected',
        evidence: stigmaCheck.evidence,
        mitigationSuggestion: 'Use person-first language and avoid labels'
      });
      biasScore += 0.3;
    }

    // Check for treatment bias
    const treatmentBias = this.detectTreatmentBias(output.output);
    if (treatmentBias.detected) {
      concerns.push({
        type: 'treatment_bias',
        severity: 'high',
        description: 'Potential bias in treatment recommendations',
        evidence: treatmentBias.evidence,
        mitigationSuggestion: 'Ensure evidence-based recommendations without preference'
      });
      biasScore += 0.5;
    }

    const passed = biasScore < 0.3;
    const confidence = 1 - biasScore;

    return {
      id: this.generateCheckId(),
      checkType: 'bias',
      passed,
      confidence,
      concerns,
      recommendations: this.generateBiasRecommendations(concerns),
      requiresHumanReview: !passed || biasScore > 0.5
    };
  }

  /**
   * Check for hallucinations in AI output
   */
  private async checkForHallucination(output: AIOutput): Promise<SafetyCheck> {
    const concerns: SafetyConcern[] = [];
    let hallucinationScore = 0;

    // Check for factual inconsistencies
    const factualCheck = this.detectFactualInconsistencies(output.output, output.context);
    if (factualCheck.detected) {
      concerns.push({
        type: 'factual_hallucination',
        severity: 'high',
        description: 'Potential factual inaccuracy detected',
        evidence: factualCheck.evidence,
        mitigationSuggestion: 'Verify facts against reliable sources'
      });
      hallucinationScore += 0.6;
    }

    // Check for made-up statistics
    const statisticsCheck = this.detectMadeUpStatistics(output.output);
    if (statisticsCheck.detected) {
      concerns.push({
        type: 'statistical_hallucination',
        severity: 'high',
        description: 'Unsupported statistics detected',
        evidence: statisticsCheck.evidence,
        mitigationSuggestion: 'Provide citations for all statistics'
      });
      hallucinationScore += 0.5;
    }

    // Check for false personalization
    const personalizationCheck = this.detectFalsePersonalization(output.output, output.patientId);
    if (personalizationCheck.detected) {
      concerns.push({
        type: 'false_personalization',
        severity: 'critical',
        description: 'AI claimed personal knowledge it cannot have',
        evidence: personalizationCheck.evidence,
        mitigationSuggestion: 'Remove false personal claims and maintain professional boundaries'
      });
      hallucinationScore += 0.8;
    }

    const passed = hallucinationScore < 0.3;
    const confidence = 1 - hallucinationScore;

    return {
      id: this.generateCheckId(),
      checkType: 'hallucination',
      passed,
      confidence,
      concerns,
      recommendations: this.generateHallucinationRecommendations(concerns),
      requiresHumanReview: !passed || hallucinationScore > 0.4
    };
  }

  /**
   * Check for toxic content
   */
  private async checkForToxicity(output: AIOutput): Promise<SafetyCheck> {
    const concerns: SafetyConcern[] = [];
    let toxicityScore = 0;

    // Check for harmful language
    for (const pattern of this.toxicityPatterns) {
      if (pattern.test(output.output.toLowerCase())) {
        concerns.push({
          type: 'toxic_language',
          severity: 'critical',
          description: 'Potentially harmful or offensive language detected',
          evidence: output.output.match(pattern)?.[0] || '',
          mitigationSuggestion: 'Remove harmful content immediately'
        });
        toxicityScore += 1.0;
        break;
      }
    }

    // Check for triggering content
    const triggerCheck = this.detectTriggeringContent(output.output);
    if (triggerCheck.detected) {
      concerns.push({
        type: 'triggering_content',
        severity: 'high',
        description: 'Content may be triggering for vulnerable individuals',
        evidence: triggerCheck.evidence,
        mitigationSuggestion: 'Add content warnings or rephrase sensitively'
      });
      toxicityScore += 0.6;
    }

    // Check for inappropriate recommendations
    const inappropriateCheck = this.detectInappropriateRecommendations(output.output);
    if (inappropriateCheck.detected) {
      concerns.push({
        type: 'inappropriate_recommendation',
        severity: 'critical',
        description: 'Potentially harmful recommendation detected',
        evidence: inappropriateCheck.evidence,
        mitigationSuggestion: 'Remove recommendation and consult clinical guidelines'
      });
      toxicityScore += 1.0;
    }

    const passed = toxicityScore === 0;
    const confidence = 1 - Math.min(toxicityScore, 1);

    return {
      id: this.generateCheckId(),
      checkType: 'toxicity',
      passed,
      confidence,
      concerns,
      recommendations: this.generateToxicityRecommendations(concerns),
      requiresHumanReview: !passed
    };
  }

  /**
   * Check medical accuracy
   */
  private async checkMedicalAccuracy(output: AIOutput): Promise<SafetyCheck> {
    const concerns: SafetyConcern[] = [];
    let accuracyScore = 1.0;

    // Check for medical misinformation
    const misinfoCheck = this.detectMedicalMisinformation(output.output);
    if (misinfoCheck.detected) {
      concerns.push({
        type: 'medical_misinformation',
        severity: 'critical',
        description: 'Potential medical misinformation detected',
        evidence: misinfoCheck.evidence,
        mitigationSuggestion: 'Consult clinical guidelines and correct information'
      });
      accuracyScore -= 0.8;
    }

    // Check for unqualified medical advice
    const adviceCheck = this.detectUnqualifiedMedicalAdvice(output.output);
    if (adviceCheck.detected) {
      concerns.push({
        type: 'unqualified_advice',
        severity: 'high',
        description: 'AI providing medical advice beyond scope',
        evidence: adviceCheck.evidence,
        mitigationSuggestion: 'Add disclaimer and encourage professional consultation'
      });
      accuracyScore -= 0.5;
    }

    // Check dosage and medication accuracy
    const medicationCheck = this.checkMedicationAccuracy(output.output);
    if (medicationCheck.issues) {
      concerns.push({
        type: 'medication_error',
        severity: 'critical',
        description: 'Potential medication or dosage error',
        evidence: medicationCheck.evidence,
        mitigationSuggestion: 'Verify all medication information with clinical resources'
      });
      accuracyScore -= 1.0;
    }

    const passed = accuracyScore > 0.7;
    const confidence = accuracyScore;

    return {
      id: this.generateCheckId(),
      checkType: 'medical_accuracy',
      passed,
      confidence,
      concerns,
      recommendations: this.generateMedicalRecommendations(concerns),
      requiresHumanReview: !passed || concerns.some(c => c.severity === 'critical')
    };
  }

  /**
   * Check ethical compliance
   */
  private async checkEthicalCompliance(output: AIOutput): Promise<SafetyCheck> {
    const concerns: SafetyConcern[] = [];
    let ethicsScore = 1.0;

    // Check for boundary violations
    const boundaryCheck = this.detectBoundaryViolations(output.output);
    if (boundaryCheck.detected) {
      concerns.push({
        type: 'boundary_violation',
        severity: 'high',
        description: 'Professional boundary violation detected',
        evidence: boundaryCheck.evidence,
        mitigationSuggestion: 'Maintain professional therapeutic boundaries'
      });
      ethicsScore -= 0.5;
    }

    // Check for autonomy violations
    const autonomyCheck = this.detectAutonomyViolations(output.output);
    if (autonomyCheck.detected) {
      concerns.push({
        type: 'autonomy_violation',
        severity: 'medium',
        description: 'Potential violation of patient autonomy',
        evidence: autonomyCheck.evidence,
        mitigationSuggestion: 'Respect patient choice and self-determination'
      });
      ethicsScore -= 0.3;
    }

    // Check for confidentiality risks
    const confidentialityCheck = this.detectConfidentialityRisks(output.output);
    if (confidentialityCheck.detected) {
      concerns.push({
        type: 'confidentiality_risk',
        severity: 'critical',
        description: 'Potential breach of confidentiality',
        evidence: confidentialityCheck.evidence,
        mitigationSuggestion: 'Remove identifying information and maintain privacy'
      });
      ethicsScore -= 0.8;
    }

    const passed = ethicsScore > 0.7;
    const confidence = ethicsScore;

    return {
      id: this.generateCheckId(),
      checkType: 'ethical',
      passed,
      confidence,
      concerns,
      recommendations: this.generateEthicalRecommendations(concerns),
      requiresHumanReview: !passed || concerns.some(c => c.severity === 'critical')
    };
  }

  /**
   * Flag output for human review
   */
  private async flagForHumanReview(output: AIOutput, checks: SafetyCheck[]): Promise<void> {
    const reviewRequest = {
      id: this.generateCheckId(),
      ai_output: output,
      safety_checks: checks,
      priority: this.calculateReviewPriority(checks),
      status: 'pending',
      created_at: new Date(),
      assigned_to: null,
      due_date: this.calculateReviewDueDate(checks)
    };

    await supabase
      .from('ai_human_review_queue')
      .insert(reviewRequest);

    // Send notification to clinical team
    await this.notifyClinicalTeam(reviewRequest);
  }

  /**
   * Calculate metrics for dashboard
   */
  async getMetrics(timeframe: { start: Date; end: Date }): Promise<SafetyMetrics> {
    const { data: checks } = await supabase
      .from('ai_safety_checks')
      .select('*')
      .gte('created_at', timeframe.start.toISOString())
      .lte('created_at', timeframe.end.toISOString());

    if (!checks || checks.length === 0) {
      return {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        biasDetections: 0,
        hallucinationDetections: 0,
        humanReviewsRequired: 0,
        averageConfidence: 0
      };
    }

    const metrics: SafetyMetrics = {
      totalChecks: checks.length,
      passedChecks: checks.filter(c => c.passed).length,
      failedChecks: checks.filter(c => !c.passed).length,
      biasDetections: checks.filter(c => c.check_type === 'bias' && !c.passed).length,
      hallucinationDetections: checks.filter(c => c.check_type === 'hallucination' && !c.passed).length,
      humanReviewsRequired: checks.filter(c => c.requires_human_review).length,
      averageConfidence: checks.reduce((sum, c) => sum + c.confidence, 0) / checks.length
    };

    return metrics;
  }

  // Detection helper methods
  private detectDemographicBias(text: string): any {
    const biasTerms = {
      age: ['elderly', 'old people', 'youngsters'],
      gender: ['typical male', 'typical female', 'women are', 'men are'],
      race: ['those people', 'your kind', 'ethnic'],
      socioeconomic: ['poor people', 'rich people', 'lower class']
    };

    for (const [category, terms] of Object.entries(biasTerms)) {
      for (const term of terms) {
        if (text.toLowerCase().includes(term)) {
          return {
            detected: true,
            category,
            severity: 'medium' as const,
            evidence: term,
            weight: 0.4
          };
        }
      }
    }

    return { detected: false };
  }

  private detectStigmatizingLanguage(text: string): any {
    const stigmaTerms = ['addict', 'junkie', 'crazy', 'insane', 'psycho', 'mental'];
    
    for (const term of stigmaTerms) {
      if (text.toLowerCase().includes(term)) {
        return {
          detected: true,
          evidence: term
        };
      }
    }

    return { detected: false };
  }

  private detectTreatmentBias(text: string): any {
    const patterns = [
      /only\s+medication\s+works/i,
      /therapy\s+doesn't\s+work/i,
      /you\s+must\s+take/i,
      /alternative\s+medicine\s+is\s+useless/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          detected: true,
          evidence: match[0]
        };
      }
    }

    return { detected: false };
  }

  private detectFactualInconsistencies(text: string, context: Record<string, any>): any {
    // Check for contradictions with known context
    if (context.patientAge && text.includes('age')) {
      const ageMatch = text.match(/(\d+)\s*years?\s*old/i);
      if (ageMatch && parseInt(ageMatch[1]) !== context.patientAge) {
        return {
          detected: true,
          evidence: `Incorrect age: ${ageMatch[0]}`
        };
      }
    }

    return { detected: false };
  }

  private detectMadeUpStatistics(text: string): any {
    const statPattern = /\d+(\.\d+)?%\s+of\s+\w+/i;
    const matches = text.match(statPattern);
    
    if (matches && !text.includes('approximately') && !text.includes('about')) {
      return {
        detected: true,
        evidence: matches[0]
      };
    }

    return { detected: false };
  }

  private detectFalsePersonalization(text: string, patientId?: string): any {
    const personalClaims = [
      /I\s+remember\s+when\s+you/i,
      /last\s+time\s+we\s+met/i,
      /you\s+told\s+me\s+that/i,
      /I\s+know\s+you/i
    ];

    for (const pattern of personalClaims) {
      const match = text.match(pattern);
      if (match) {
        return {
          detected: true,
          evidence: match[0]
        };
      }
    }

    return { detected: false };
  }

  private detectTriggeringContent(text: string): any {
    const triggers = ['suicide', 'self-harm', 'cutting', 'overdose', 'kill'];
    
    for (const trigger of triggers) {
      if (text.toLowerCase().includes(trigger) && !text.includes('prevention')) {
        return {
          detected: true,
          evidence: trigger
        };
      }
    }

    return { detected: false };
  }

  private detectInappropriateRecommendations(text: string): any {
    const inappropriate = [
      /stop\s+taking\s+your\s+medication/i,
      /don't\s+tell\s+your\s+doctor/i,
      /ignore\s+medical\s+advice/i,
      /you\s+don't\s+need\s+therapy/i
    ];

    for (const pattern of inappropriate) {
      const match = text.match(pattern);
      if (match) {
        return {
          detected: true,
          evidence: match[0]
        };
      }
    }

    return { detected: false };
  }

  private detectMedicalMisinformation(text: string): any {
    // This would connect to medical knowledge base
    // Simplified example
    const misinformation = [
      /depression\s+is\s+just\s+weakness/i,
      /addiction\s+is\s+a\s+choice/i,
      /mental\s+illness\s+isn't\s+real/i
    ];

    for (const pattern of misinformation) {
      const match = text.match(pattern);
      if (match) {
        return {
          detected: true,
          evidence: match[0]
        };
      }
    }

    return { detected: false };
  }

  private detectUnqualifiedMedicalAdvice(text: string): any {
    const advicePatterns = [
      /you\s+should\s+take\s+\d+mg/i,
      /increase\s+your\s+dose/i,
      /stop\s+your\s+medication/i,
      /I\s+diagnose\s+you/i
    ];

    for (const pattern of advicePatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          detected: true,
          evidence: match[0]
        };
      }
    }

    return { detected: false };
  }

  private checkMedicationAccuracy(text: string): any {
    // Check for medication dosage ranges
    const medicationMatch = text.match(/(\w+)\s+(\d+)\s*mg/i);
    if (medicationMatch) {
      // Would check against drug database
      // Simplified validation
      const dose = parseInt(medicationMatch[2]);
      if (dose > 1000) {
        return {
          issues: true,
          evidence: medicationMatch[0]
        };
      }
    }

    return { issues: false };
  }

  private detectBoundaryViolations(text: string): any {
    const violations = [
      /I\s+love\s+you/i,
      /you're\s+my\s+favorite/i,
      /let's\s+be\s+friends/i,
      /call\s+me\s+personally/i
    ];

    for (const pattern of violations) {
      const match = text.match(pattern);
      if (match) {
        return {
          detected: true,
          evidence: match[0]
        };
      }
    }

    return { detected: false };
  }

  private detectAutonomyViolations(text: string): any {
    const violations = [
      /you\s+must/i,
      /you\s+have\s+no\s+choice/i,
      /I\s+won't\s+let\s+you/i,
      /you're\s+not\s+allowed/i
    ];

    for (const pattern of violations) {
      const match = text.match(pattern);
      if (match) {
        return {
          detected: true,
          evidence: match[0]
        };
      }
    }

    return { detected: false };
  }

  private detectConfidentialityRisks(text: string): any {
    // Check for PII patterns
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/, // Full names
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ // Email
    ];

    for (const pattern of piiPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          detected: true,
          evidence: '[REDACTED]' // Don't log actual PII
        };
      }
    }

    return { detected: false };
  }

  // Initialization methods
  private initializeBiasPatterns(): void {
    this.biasPatterns = [
      {
        category: 'age',
        keywords: ['elderly', 'old', 'young', 'millennial', 'boomer'],
        weight: 0.3,
        context: ['patient', 'client', 'individual']
      },
      {
        category: 'gender',
        keywords: ['male', 'female', 'masculine', 'feminine'],
        weight: 0.3,
        context: ['typical', 'usually', 'tend to']
      },
      {
        category: 'race',
        keywords: ['white', 'black', 'asian', 'hispanic', 'ethnic'],
        weight: 0.5,
        context: ['people', 'patients', 'individuals']
      }
    ];
  }

  private initializeHallucinationIndicators(): void {
    this.hallucinationIndicators = [
      {
        pattern: 'specific percentage without citation',
        confidence: 0.7,
        category: 'statistical'
      },
      {
        pattern: 'personal memory claim',
        confidence: 0.9,
        category: 'personal'
      },
      {
        pattern: 'future prediction without disclaimer',
        confidence: 0.6,
        category: 'factual'
      }
    ];
  }

  private initializeToxicityPatterns(): void {
    this.toxicityPatterns = [
      /\bhate\s+you\b/i,
      /\bkill\s+yourself\b/i,
      /\bworthless\b/i,
      /\bgive\s+up\b/i,
      /\bstupid\b/i,
      /\bidiot\b/i
    ];
  }

  private initializeMedicalTerms(): void {
    this.medicalTerms = new Set([
      'depression', 'anxiety', 'bipolar', 'schizophrenia',
      'ssri', 'snri', 'benzodiazepine', 'antipsychotic',
      'therapy', 'cbt', 'dbt', 'emdr'
    ]);
  }

  private initializeEthicalGuidelines(): void {
    this.ethicalGuidelines = [
      'Respect patient autonomy',
      'Maintain professional boundaries',
      'Protect confidentiality',
      'Do no harm',
      'Promote beneficence',
      'Ensure justice and fairness'
    ];
  }

  // Helper methods
  private generateCheckId(): string {
    return `check_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private determineHumanReviewNeed(checks: SafetyCheck[]): boolean {
    return checks.some(check => 
      check.requiresHumanReview || 
      !check.passed ||
      check.concerns.some(c => c.severity === 'critical')
    );
  }

  private calculateReviewPriority(checks: SafetyCheck[]): 'low' | 'medium' | 'high' | 'critical' {
    const hasCritical = checks.some(c => c.concerns.some(concern => concern.severity === 'critical'));
    if (hasCritical) return 'critical';
    
    const failedCount = checks.filter(c => !c.passed).length;
    if (failedCount >= 3) return 'high';
    if (failedCount >= 1) return 'medium';
    
    return 'low';
  }

  private calculateReviewDueDate(checks: SafetyCheck[]): Date {
    const priority = this.calculateReviewPriority(checks);
    const now = new Date();
    
    switch (priority) {
      case 'critical':
        return new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour
      case 'high':
        return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
      case 'medium':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      default:
        return new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours
    }
  }

  private generateBiasRecommendations(concerns: SafetyConcern[]): string[] {
    const recommendations: string[] = [];
    
    if (concerns.length > 0) {
      recommendations.push('Review output for inclusive language');
      recommendations.push('Consider multiple perspectives');
      recommendations.push('Use person-first language');
    }
    
    return recommendations;
  }

  private generateHallucinationRecommendations(concerns: SafetyConcern[]): string[] {
    const recommendations: string[] = [];
    
    if (concerns.length > 0) {
      recommendations.push('Verify all factual claims');
      recommendations.push('Add citations for statistics');
      recommendations.push('Avoid unsupported personalizations');
    }
    
    return recommendations;
  }

  private generateToxicityRecommendations(concerns: SafetyConcern[]): string[] {
    const recommendations: string[] = [];
    
    if (concerns.length > 0) {
      recommendations.push('Remove harmful content immediately');
      recommendations.push('Rewrite with supportive language');
      recommendations.push('Add content warnings if necessary');
    }
    
    return recommendations;
  }

  private generateMedicalRecommendations(concerns: SafetyConcern[]): string[] {
    const recommendations: string[] = [];
    
    if (concerns.length > 0) {
      recommendations.push('Consult clinical guidelines');
      recommendations.push('Add medical disclaimers');
      recommendations.push('Encourage professional consultation');
    }
    
    return recommendations;
  }

  private generateEthicalRecommendations(concerns: SafetyConcern[]): string[] {
    const recommendations: string[] = [];
    
    if (concerns.length > 0) {
      recommendations.push('Maintain professional boundaries');
      recommendations.push('Respect patient autonomy');
      recommendations.push('Protect confidentiality');
    }
    
    return recommendations;
  }

  private async storeSafetyCheckResults(output: AIOutput, checks: SafetyCheck[]): Promise<void> {
    await supabase
      .from('ai_safety_checks')
      .insert({
        agent_id: output.agentId,
        agent_type: output.agentType,
        input: output.input,
        output: output.output,
        checks: checks,
        passed: checks.every(c => c.passed),
        requires_review: checks.some(c => c.requiresHumanReview),
        created_at: new Date()
      });
  }

  private async notifyClinicalTeam(reviewRequest: any): Promise<void> {
    // Implementation would send notifications
    console.log('Notifying clinical team of review request:', reviewRequest.id);
  }

  private async logSafetyCheck(output: AIOutput, checks: SafetyCheck[], requiresReview: boolean): Promise<void> {
    await enhancedSecurityAuditService.logSecurityEvent({
      eventType: 'ai_safety_check',
      userId: output.providerId || output.patientId || 'system',
      metadata: {
        agent_id: output.agentId,
        checks_performed: checks.map(c => c.checkType),
        passed: checks.every(c => c.passed),
        requires_review: requiresReview,
        concern_count: checks.reduce((sum, c) => sum + c.concerns.length, 0)
      }
    });
  }
}

export const aiSafetyGuard = AISafetyGuard.getInstance();