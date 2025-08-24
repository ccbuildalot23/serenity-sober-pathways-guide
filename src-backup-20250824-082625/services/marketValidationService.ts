import { supabase } from '@/integrations/supabase/client';
import logger from './loggerService';

/**
 * Market Validation Service for B2B SaaS Commercialization
 * 
 * This service validates key business model assumptions before full implementation:
 * - Therapist pricing sensitivity and willingness to pay
 * - Referral loss calculations ($45K-$135K annually)
 * - CPT code reimbursement validation
 * - Crisis intervention workflow requirements
 * - Implementation fee acceptance thresholds
 */

export interface TherapistProfile {
  id: string;
  name: string;
  email: string;
  practiceType: 'solo' | 'group' | 'hospital' | 'community';
  yearsExperience: number;
  substanceAbuseClients: number;
  currentEHR: string;
  revenueRange: '$50K-$100K' | '$100K-$250K' | '$250K-$500K' | '$500K+';
  location: string;
  timezone: string;
  interviewCompleted: boolean;
  validationData?: ValidationResults;
}

export interface ValidationResults {
  referralLossConfirmed: boolean;
  estimatedAnnualLoss: number;
  willingToPayTier: 'Professional' | 'Practice' | 'Enterprise' | 'None';
  maxImplementationFee: number;
  cptCodeFamiliarity: 1 | 2 | 3 | 4 | 5; // 1=Not familiar, 5=Expert
  crisisWorkflowPriority: 1 | 2 | 3 | 4 | 5; // 1=Low, 5=Critical
  currentBillingChallenges: string[];
  featureImportance: {
    aiTherapy: number;
    peerSupport: number;
    telehealth: number;
    billing: number;
    crisis: number;
    mobile: number;
    analytics: number;
  };
  implementationTimeline: '1-3 months' | '3-6 months' | '6-12 months' | 'Not interested';
  validatedAt: Date;
}

export interface MarketValidationResults {
  totalInterviews: number;
  validationRate: number; // % who confirmed business model
  averageReferralLoss: number;
  pricingAcceptance: {
    professional: number; // % willing to pay $299
    practice: number; // % willing to pay $599  
    enterprise: number; // % willing to pay $1,999
  };
  maxImplementationFee: {
    average: number;
    median: number;
    range: [number, number];
  };
  cptReimbursementValidation: {
    confirmed: boolean;
    averageRate: number;
    ratesByCode: Record<string, number>;
  };
  crisisWorkflowValidation: {
    averagePriority: number;
    requiredFeatures: string[];
    responseTimeRequirements: number; // milliseconds
  };
  riskFactors: string[];
  goNoGoRecommendation: 'GO' | 'PIVOT' | 'STOP';
  confidenceScore: number; // 0-100%
}

class MarketValidationService {
  private readonly REQUIRED_INTERVIEWS = 10;
  private readonly VALIDATION_THRESHOLD = 0.7; // 70% must validate assumptions
  private readonly MIN_CONFIDENCE_SCORE = 75;

  /**
   * Create therapist validation interview
   */
  async createTherapistProfile(profile: Omit<TherapistProfile, 'id' | 'interviewCompleted'>): Promise<TherapistProfile> {
    const therapistProfile: TherapistProfile = {
      id: `therapist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...profile,
      interviewCompleted: false
    };

    // Save to database
    const { data, error } = await supabase
      .from('market_validation_therapists')
      .insert({
        id: therapistProfile.id,
        ...therapistProfile
      })
      .select()
      .single();

    if (error) throw error;
    return data as TherapistProfile;
  }

  /**
   * Conduct validation interview with therapist
   */
  async conductValidationInterview(
    therapistId: string,
    responses: Omit<ValidationResults, 'validatedAt'>
  ): Promise<ValidationResults> {
    const validationResults: ValidationResults = {
      ...responses,
      validatedAt: new Date()
    };

    // Update therapist profile with validation results
    const { error } = await supabase
      .from('market_validation_therapists')
      .update({
        interview_completed: true,
        validation_data: validationResults,
        updated_at: new Date().toISOString()
      })
      .eq('id', therapistId);

    if (error) throw error;

    // Log validation event
    await supabase.from('validation_events').insert({
      therapist_id: therapistId,
      event_type: 'interview_completed',
      data: validationResults,
      timestamp: new Date().toISOString()
    });

    return validationResults;
  }

  /**
   * Validate referral loss calculations
   */
  async validateReferralLoss(): Promise<{ confirmed: boolean; averageLoss: number; confidence: number }> {
    const { data: therapists } = await supabase
      .from('market_validation_therapists')
      .select('validation_data')
      .eq('interview_completed', true);

    if (!therapists || therapists.length === 0) {
      return { confirmed: false, averageLoss: 0, confidence: 0 };
    }

    const validatedLosses = therapists
      .filter(t => t.validation_data?.referralLossConfirmed)
      .map(t => t.validation_data.estimatedAnnualLoss);

    if (validatedLosses.length === 0) {
      return { confirmed: false, averageLoss: 0, confidence: 0 };
    }

    const averageLoss = validatedLosses.reduce((sum, loss) => sum + loss, 0) / validatedLosses.length;
    const confidence = (validatedLosses.length / therapists.length) * 100;
    const confirmed = averageLoss >= 45000 && averageLoss <= 135000 && confidence >= this.VALIDATION_THRESHOLD * 100;

    return { confirmed, averageLoss, confidence };
  }

  /**
   * Validate CPT code reimbursement rates
   */
  async validateCPTReimbursement(): Promise<{ confirmed: boolean; rates: Record<string, number> }> {
    // In production, this would integrate with CMS API and insurance databases
    const standardRates = {
      '99490': 42.60, // CCM first 20 minutes
      '99439': 31.92, // CCM each additional 20 minutes
      '99484': 39.52, // Behavioral health care, 20 minutes
      '99492': 136.80, // CoCM initial, first 70 minutes
      '99493': 106.20, // CoCM subsequent, first 60 minutes
      '99494': 52.80, // CoCM each additional 30 minutes
    };

    // Cross-reference with therapist validation data
    const { data: therapists } = await supabase
      .from('market_validation_therapists')
      .select('validation_data')
      .eq('interview_completed', true);

    const familiarityScores = therapists
      ?.map(t => t.validation_data?.cptCodeFamiliarity || 0)
      .filter(score => score > 0) || [];

    const averageFamiliarity = familiarityScores.length > 0 
      ? familiarityScores.reduce((sum, score) => sum + score, 0) / familiarityScores.length
      : 0;

    // CPT codes confirmed if average familiarity >= 3 and we have data
    const confirmed = averageFamiliarity >= 3 && familiarityScores.length >= 5;

    return { confirmed, rates: standardRates };
  }

  /**
   * Test pricing tier acceptance
   */
  async validatePricingTiers(): Promise<{ professional: number; practice: number; enterprise: number }> {
    const { data: therapists } = await supabase
      .from('market_validation_therapists')
      .select('validation_data')
      .eq('interview_completed', true);

    if (!therapists || therapists.length === 0) {
      return { professional: 0, practice: 0, enterprise: 0 };
    }

    const totalCount = therapists.length;
    const professionalCount = therapists.filter(t => 
      t.validation_data?.willingToPayTier === 'Professional' || 
      t.validation_data?.willingToPayTier === 'Practice' ||
      t.validation_data?.willingToPayTier === 'Enterprise'
    ).length;
    
    const practiceCount = therapists.filter(t => 
      t.validation_data?.willingToPayTier === 'Practice' ||
      t.validation_data?.willingToPayTier === 'Enterprise'
    ).length;
    
    const enterpriseCount = therapists.filter(t => 
      t.validation_data?.willingToPayTier === 'Enterprise'
    ).length;

    return {
      professional: (professionalCount / totalCount) * 100,
      practice: (practiceCount / totalCount) * 100,
      enterprise: (enterpriseCount / totalCount) * 100
    };
  }

  /**
   * Validate crisis intervention requirements
   */
  async validateCrisisWorkflow(): Promise<{
    averagePriority: number;
    requiredFeatures: string[];
    responseTime: number;
  }> {
    const { data: therapists } = await supabase
      .from('market_validation_therapists')
      .select('validation_data')
      .eq('interview_completed', true);

    if (!therapists || therapists.length === 0) {
      return { averagePriority: 0, requiredFeatures: [], responseTime: 0 };
    }

    const priorities = therapists
      .map(t => t.validation_data?.crisisWorkflowPriority || 0)
      .filter(p => p > 0);

    const averagePriority = priorities.length > 0 
      ? priorities.reduce((sum, p) => sum + p, 0) / priorities.length
      : 0;

    // Required features based on high-priority responses
    const requiredFeatures = [
      'Real-time crisis detection',
      'Automatic escalation protocols',
      'Emergency contact alerts',
      '24/7 crisis response',
      'Provider notification system',
      'Crisis documentation'
    ];

    // Response time requirement: 250ms for critical priority (5), scaling up
    const responseTime = averagePriority >= 4 ? 250 : averagePriority >= 3 ? 500 : 1000;

    return { averagePriority, requiredFeatures, responseTime };
  }

  /**
   * Generate comprehensive market validation report
   */
  async generateValidationReport(): Promise<MarketValidationResults> {
    const { data: therapists } = await supabase
      .from('market_validation_therapists')
      .select('*')
      .eq('interview_completed', true);

    const totalInterviews = therapists?.length || 0;
    
    if (totalInterviews < this.REQUIRED_INTERVIEWS) {
      throw new Error(`Insufficient interviews completed: ${totalInterviews}/${this.REQUIRED_INTERVIEWS}`);
    }

    // Validate each assumption
    const referralValidation = await this.validateReferralLoss();
    const pricingAcceptance = await this.validatePricingTiers();
    const cptValidation = await this.validateCPTReimbursement();
    const crisisValidation = await this.validateCrisisWorkflow();

    // Calculate implementation fee statistics
    const implementationFees = therapists
      ?.map(t => t.validation_data?.maxImplementationFee || 0)
      .filter(fee => fee > 0)
      .sort((a, b) => a - b) || [];

    const maxImplementationFee = {
      average: implementationFees.length > 0 ? implementationFees.reduce((sum, fee) => sum + fee, 0) / implementationFees.length : 0,
      median: implementationFees.length > 0 ? implementationFees[Math.floor(implementationFees.length / 2)] : 0,
      range: implementationFees.length > 0 ? [implementationFees[0], implementationFees[implementationFees.length - 1]] as [number, number] : [0, 0]
    };

    // Identify risk factors
    const riskFactors: string[] = [];
    if (!referralValidation.confirmed) riskFactors.push('Referral loss calculations not validated');
    if (pricingAcceptance.professional < 50) riskFactors.push('Low pricing acceptance at Professional tier');
    if (!cptValidation.confirmed) riskFactors.push('CPT code reimbursement uncertain');
    if (crisisValidation.averagePriority < 3) riskFactors.push('Crisis workflow not prioritized by providers');
    if (maxImplementationFee.average < 5000) riskFactors.push('Implementation fee expectations too low');

    // Calculate overall confidence score
    const validationRate = referralValidation.confidence / 100;
    const pricingScore = (pricingAcceptance.professional + pricingAcceptance.practice + pricingAcceptance.enterprise) / 300;
    const cptScore = cptValidation.confirmed ? 1 : 0;
    const crisisScore = crisisValidation.averagePriority / 5;
    const confidenceScore = (validationRate + pricingScore + cptScore + crisisScore) / 4 * 100;

    // Make go/no-go recommendation
    let goNoGoRecommendation: 'GO' | 'PIVOT' | 'STOP' = 'STOP';
    if (confidenceScore >= this.MIN_CONFIDENCE_SCORE && riskFactors.length <= 1) {
      goNoGoRecommendation = 'GO';
    } else if (confidenceScore >= 60 && riskFactors.length <= 3) {
      goNoGoRecommendation = 'PIVOT';
    }

    const results: MarketValidationResults = {
      totalInterviews,
      validationRate,
      averageReferralLoss: referralValidation.averageLoss,
      pricingAcceptance,
      maxImplementationFee,
      cptReimbursementValidation: {
        confirmed: cptValidation.confirmed,
        averageRate: Object.values(cptValidation.rates).reduce((sum, rate) => sum + rate, 0) / Object.values(cptValidation.rates).length,
        ratesByCode: cptValidation.rates
      },
      crisisWorkflowValidation: {
        averagePriority: crisisValidation.averagePriority,
        requiredFeatures: crisisValidation.requiredFeatures,
        responseTimeRequirements: crisisValidation.responseTime
      },
      riskFactors,
      goNoGoRecommendation,
      confidenceScore
    };

    // Save validation report
    await supabase.from('market_validation_reports').insert({
      id: `report_${Date.now()}`,
      results,
      generated_at: new Date().toISOString()
    });

    return results;
  }

  /**
   * Generate therapist interview questions
   */
  getInterviewQuestions(): { category: string; questions: string[] }[] {
    return [
      {
        category: 'Practice Overview',
        questions: [
          'How many years have you been practicing?',
          'What type of practice do you operate (solo, group, hospital, community)?',
          'How many substance abuse clients do you currently serve?',
          'What is your approximate annual revenue range?',
          'What EHR system do you currently use?'
        ]
      },
      {
        category: 'Referral Loss Validation',
        questions: [
          'Do you currently refer substance abuse clients to specialized treatment?',
          'Approximately how many referrals do you make per year?',
          'What is the average revenue per client that you lose through referrals?',
          'Have you calculated the annual revenue impact of these referrals?',
          'Would you estimate your annual loss to be in the $45K-$135K range?'
        ]
      },
      {
        category: 'Pricing Sensitivity',
        questions: [
          'What do you currently spend on healthcare technology per month?',
          'Would you pay $299/month for a platform that retained these clients?',
          'Would you pay $599/month for advanced features like AI therapy?',
          'Would you pay $1,999/month for enterprise-level comprehensive care?',
          'What would be your maximum acceptable implementation fee?'
        ]
      },
      {
        category: 'CPT Code & Billing',
        questions: [
          'How familiar are you with CPT codes 99490, 99439, 99484, 99492-99494?',
          'Do you currently bill for care coordination or collaborative care?',
          'What are your biggest billing challenges with mental health services?',
          'How important is automated billing and claims submission?'
        ]
      },
      {
        category: 'Crisis Intervention',
        questions: [
          'How do you currently handle mental health crises outside office hours?',
          'How important is real-time crisis detection (1-5 scale)?',
          'What response time would you expect for crisis alerts?',
          'What crisis intervention features are most critical?'
        ]
      },
      {
        category: 'Feature Prioritization',
        questions: [
          'Rate importance (1-5): AI therapy companion',
          'Rate importance (1-5): Peer support community',
          'Rate importance (1-5): Telehealth video calls',
          'Rate importance (1-5): Automated billing',
          'Rate importance (1-5): Crisis detection',
          'Rate importance (1-5): Mobile app',
          'Rate importance (1-5): Analytics dashboard'
        ]
      },
      {
        category: 'Implementation',
        questions: [
          'What would be your ideal implementation timeline?',
          'What would prevent you from adopting a new platform?',
          'How important is integration with your current EHR?',
          'What training and support would you need?'
        ]
      }
    ];
  }

  /**
   * Schedule validation interviews
   */
  async scheduleValidationInterviews(therapistEmails: string[]): Promise<void> {
    const interviews = therapistEmails.map(email => ({
      id: `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      therapist_email: email,
      scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      status: 'scheduled',
      created_at: new Date().toISOString()
    }));

    await supabase.from('validation_interviews').insert(interviews);

    // In production, this would send calendar invites and email confirmations
    logger.debug(`Scheduled ${interviews.length} validation interviews`, { component: 'marketValidationService' });
  }
}

export const marketValidationService = new MarketValidationService();