/**
 * Provider Onboarding Service
 * Manages provider registration, pricing tier selection, and practice setup
 * Integrates with billing systems and validates credentials
 */

import { supabase } from '@/integrations/supabase/client';
import { enhancedSecurityAuditService } from './EnhancedSecurityAuditService';
import { ROIValidationService } from './ROIValidationService';

interface PricingTier {
  id: string;
  name: 'Professional' | 'Practice' | 'Enterprise';
  monthlyPrice: number;
  features: string[];
  limits: TierLimits;
  supportLevel: 'standard' | 'priority' | 'dedicated';
  slaResponseTime: number; // hours
  customIntegrations: boolean;
  aiAssistance: AIAssistanceLevel;
  complianceSupport: ComplianceLevel;
}

interface TierLimits {
  maxPatients: number;
  maxProviders: number;
  maxMonthlyCheckIns: number;
  maxCrisisAlerts: number;
  storageGB: number;
  videoHoursPerMonth: number;
  apiCallsPerMonth: number;
}

interface AIAssistanceLevel {
  clinicalDocumentation: boolean;
  treatmentRecommendations: boolean;
  riskPrediction: boolean;
  customModels: boolean;
  realtimeInsights: boolean;
}

interface ComplianceLevel {
  hipaaCompliant: boolean;
  soc2Certified: boolean;
  stateSpecificCompliance: boolean;
  customBAA: boolean;
  auditReports: boolean;
  dedicatedComplianceOfficer: boolean;
}

interface ProviderProfile {
  id: string;
  practiceName: string;
  npiNumber: string;
  licenseNumber: string;
  licenseState: string;
  specialties: string[];
  yearsInPractice: number;
  currentPatientCount: number;
  expectedGrowthRate: number;
  preferredIntegrations: string[];
  complianceRequirements: string[];
}

interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  completed: boolean;
  validationStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  data: Record<string, unknown>;
}

interface OnboardingSession {
  id: string;
  providerId: string;
  startedAt: Date;
  completedAt?: Date;
  currentStep: number;
  steps: OnboardingStep[];
  selectedTier: PricingTier | null;
  profile: ProviderProfile | null;
  billingInfo: BillingInformation | null;
  integrationConfig: IntegrationConfig | null;
  status: 'started' | 'in_progress' | 'pending_verification' | 'completed' | 'abandoned';
  verificationResults: VerificationResults | null;
}

interface BillingInformation {
  billingAddress: Address;
  paymentMethod: PaymentMethod;
  taxId: string;
  billingContact: ContactInfo;
  invoicePreferences: InvoicePreferences;
  autoRenewal: boolean;
}

interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface PaymentMethod {
  type: 'credit_card' | 'ach' | 'invoice';
  lastFour?: string;
  expiryDate?: string;
  bankName?: string;
  accountType?: 'checking' | 'savings';
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface InvoicePreferences {
  frequency: 'monthly' | 'quarterly' | 'annually';
  format: 'pdf' | 'csv' | 'both';
  includeDetailedUsage: boolean;
  sendToEmails: string[];
}

interface IntegrationConfig {
  ehr: EHRIntegration | null;
  billing: BillingSystemIntegration | null;
  pharmacy: PharmacyIntegration | null;
  labs: LabIntegration | null;
  telehealth: TelehealthIntegration | null;
}

interface EHRIntegration {
  system: 'epic' | 'cerner' | 'athena' | 'allscripts' | 'other';
  apiEndpoint?: string;
  credentials?: Record<string, string>;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  dataTypes: string[];
}

interface BillingSystemIntegration {
  system: string;
  accountId: string;
  apiKey?: string;
  autoSubmitClaims: boolean;
  reconciliationSchedule: string;
}

interface PharmacyIntegration {
  preferredPharmacies: string[];
  ePrescribeEnabled: boolean;
  surescriptsId?: string;
}

interface LabIntegration {
  preferredLabs: string[];
  autoOrderEnabled: boolean;
  resultDeliveryMethod: 'fax' | 'api' | 'portal';
}

interface TelehealthIntegration {
  platform: 'integrated' | 'zoom' | 'doxy' | 'custom';
  apiCredentials?: Record<string, string>;
  autoScheduling: boolean;
}

interface VerificationResults {
  npiVerified: boolean;
  licenseVerified: boolean;
  malpracticeInsuranceVerified: boolean;
  deaNumberVerified?: boolean;
  backgroundCheckPassed: boolean;
  complianceCheckPassed: boolean;
  verificationDate: Date;
  verificationDetails: Record<string, unknown>;
}

interface OnboardingMetrics {
  averageCompletionTime: number;
  stepCompletionRates: Record<string, number>;
  abandonmentRate: number;
  tierDistribution: Record<string, number>;
  commonIntegrations: string[];
  verificationPassRate: number;
  timeToFirstPatient: number;
}

export class ProviderOnboardingService {
  private pricingTiers: Map<string, PricingTier> = new Map();
  private activeSessions: Map<string, OnboardingSession> = new Map();
  private roiService: ROIValidationService;
  
  constructor() {
    this.roiService = new ROIValidationService();
    this.initializePricingTiers();
  }

  /**
   * Initialize pricing tiers with features and limits
   */
  private initializePricingTiers(): void {
    // Professional Tier - $299/month
    this.pricingTiers.set('professional', {
      id: 'tier_professional',
      name: 'Professional',
      monthlyPrice: 299,
      features: [
        'Up to 50 patients',
        'Single provider account',
        'Basic AI assistance',
        'Standard support',
        'HIPAA compliant',
        'Mobile app access',
        'Daily check-ins',
        'Crisis detection',
        'Basic reporting'
      ],
      limits: {
        maxPatients: 50,
        maxProviders: 1,
        maxMonthlyCheckIns: 1500,
        maxCrisisAlerts: 50,
        storageGB: 10,
        videoHoursPerMonth: 20,
        apiCallsPerMonth: 10000
      },
      supportLevel: 'standard',
      slaResponseTime: 24,
      customIntegrations: false,
      aiAssistance: {
        clinicalDocumentation: true,
        treatmentRecommendations: false,
        riskPrediction: true,
        customModels: false,
        realtimeInsights: false
      },
      complianceSupport: {
        hipaaCompliant: true,
        soc2Certified: true,
        stateSpecificCompliance: false,
        customBAA: false,
        auditReports: false,
        dedicatedComplianceOfficer: false
      }
    });

    // Practice Tier - $599/month
    this.pricingTiers.set('practice', {
      id: 'tier_practice',
      name: 'Practice',
      monthlyPrice: 599,
      features: [
        'Up to 200 patients',
        'Up to 5 providers',
        'Advanced AI assistance',
        'Priority support',
        'HIPAA compliant',
        'SOC 2 certified',
        'EHR integration',
        'Advanced analytics',
        'Custom workflows',
        'Group therapy support'
      ],
      limits: {
        maxPatients: 200,
        maxProviders: 5,
        maxMonthlyCheckIns: 6000,
        maxCrisisAlerts: 200,
        storageGB: 50,
        videoHoursPerMonth: 100,
        apiCallsPerMonth: 50000
      },
      supportLevel: 'priority',
      slaResponseTime: 4,
      customIntegrations: true,
      aiAssistance: {
        clinicalDocumentation: true,
        treatmentRecommendations: true,
        riskPrediction: true,
        customModels: false,
        realtimeInsights: true
      },
      complianceSupport: {
        hipaaCompliant: true,
        soc2Certified: true,
        stateSpecificCompliance: true,
        customBAA: true,
        auditReports: true,
        dedicatedComplianceOfficer: false
      }
    });

    // Enterprise Tier - $1,999/month
    this.pricingTiers.set('enterprise', {
      id: 'tier_enterprise',
      name: 'Enterprise',
      monthlyPrice: 1999,
      features: [
        'Unlimited patients',
        'Unlimited providers',
        'Full AI suite',
        'Dedicated support',
        'Custom integrations',
        'White-label options',
        'API access',
        'Custom training',
        'Dedicated success manager',
        'Custom compliance support',
        'Advanced security features',
        'Multi-location support'
      ],
      limits: {
        maxPatients: 999999,
        maxProviders: 999999,
        maxMonthlyCheckIns: 999999,
        maxCrisisAlerts: 999999,
        storageGB: 500,
        videoHoursPerMonth: 1000,
        apiCallsPerMonth: 999999
      },
      supportLevel: 'dedicated',
      slaResponseTime: 1,
      customIntegrations: true,
      aiAssistance: {
        clinicalDocumentation: true,
        treatmentRecommendations: true,
        riskPrediction: true,
        customModels: true,
        realtimeInsights: true
      },
      complianceSupport: {
        hipaaCompliant: true,
        soc2Certified: true,
        stateSpecificCompliance: true,
        customBAA: true,
        auditReports: true,
        dedicatedComplianceOfficer: true
      }
    });
  }

  /**
   * Start a new onboarding session
   */
  async startOnboarding(providerId: string): Promise<OnboardingSession> {
    const sessionId = `onboard_${Date.now()}`;
    
    const session: OnboardingSession = {
      id: sessionId,
      providerId,
      startedAt: new Date(),
      currentStep: 0,
      steps: this.createOnboardingSteps(),
      selectedTier: null,
      profile: null,
      billingInfo: null,
      integrationConfig: null,
      status: 'started',
      verificationResults: null
    };

    this.activeSessions.set(sessionId, session);

    await enhancedSecurityAuditService.logSecurityEvent(
      'PROVIDER_ONBOARDING_STARTED',
      { sessionId, providerId },
      'low'
    );

    return session;
  }

  /**
   * Create onboarding steps
   */
  private createOnboardingSteps(): OnboardingStep[] {
    return [
      {
        id: 'welcome',
        name: 'Welcome',
        description: 'Introduction to Serenity platform',
        required: true,
        completed: false,
        validationStatus: 'pending',
        data: {}
      },
      {
        id: 'practice_profile',
        name: 'Practice Profile',
        description: 'Enter practice information and credentials',
        required: true,
        completed: false,
        validationStatus: 'pending',
        data: {}
      },
      {
        id: 'tier_selection',
        name: 'Select Plan',
        description: 'Choose the right plan for your practice',
        required: true,
        completed: false,
        validationStatus: 'pending',
        data: {}
      },
      {
        id: 'credential_verification',
        name: 'Verify Credentials',
        description: 'Verify NPI, license, and insurance',
        required: true,
        completed: false,
        validationStatus: 'pending',
        data: {}
      },
      {
        id: 'billing_setup',
        name: 'Billing Information',
        description: 'Set up payment method and billing details',
        required: true,
        completed: false,
        validationStatus: 'pending',
        data: {}
      },
      {
        id: 'integration_config',
        name: 'Integrations',
        description: 'Configure EHR and other integrations',
        required: false,
        completed: false,
        validationStatus: 'pending',
        data: {}
      },
      {
        id: 'compliance_review',
        name: 'Compliance Review',
        description: 'Review and accept compliance requirements',
        required: true,
        completed: false,
        validationStatus: 'pending',
        data: {}
      },
      {
        id: 'practice_setup',
        name: 'Practice Setup',
        description: 'Configure practice settings and preferences',
        required: true,
        completed: false,
        validationStatus: 'pending',
        data: {}
      },
      {
        id: 'training',
        name: 'Platform Training',
        description: 'Complete platform training modules',
        required: false,
        completed: false,
        validationStatus: 'pending',
        data: {}
      },
      {
        id: 'go_live',
        name: 'Go Live',
        description: 'Final review and activation',
        required: true,
        completed: false,
        validationStatus: 'pending',
        data: {}
      }
    ];
  }

  /**
   * Update practice profile
   */
  async updatePracticeProfile(
    sessionId: string,
    profile: ProviderProfile
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.profile = profile;
    
    // Mark step as completed
    const step = session.steps.find(s => s.id === 'practice_profile');
    if (step) {
      step.completed = true;
      step.validationStatus = 'completed';
      step.data = profile;
    }

    // Auto-recommend tier based on profile
    const recommendedTier = this.recommendTier(profile);
    if (recommendedTier && !session.selectedTier) {
      session.selectedTier = recommendedTier;
    }

    await this.saveSession(session);
  }

  /**
   * Select pricing tier
   */
  async selectPricingTier(
    sessionId: string,
    tierName: 'Professional' | 'Practice' | 'Enterprise'
  ): Promise<PricingTier> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const tierKey = tierName.toLowerCase();
    const tier = this.pricingTiers.get(tierKey);
    if (!tier) throw new Error('Invalid tier');

    session.selectedTier = tier;
    
    // Mark step as completed
    const step = session.steps.find(s => s.id === 'tier_selection');
    if (step) {
      step.completed = true;
      step.validationStatus = 'completed';
      step.data = { selectedTier: tierName };
    }

    // Calculate and show ROI projection
    if (session.profile) {
      const roiProjection = await this.calculateROIProjection(session.profile, tier);
      console.log('ROI Projection:', roiProjection);
    }

    await this.saveSession(session);
    return tier;
  }

  /**
   * Verify provider credentials
   */
  async verifyCredentials(
    sessionId: string,
    credentials: {
      npiNumber: string;
      licenseNumber: string;
      licenseState: string;
      malpracticeInsurance?: string;
      deaNumber?: string;
    }
  ): Promise<VerificationResults> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const step = session.steps.find(s => s.id === 'credential_verification');
    if (step) {
      step.validationStatus = 'in_progress';
    }

    // Simulate credential verification (would integrate with real services)
    const results: VerificationResults = {
      npiVerified: await this.verifyNPI(credentials.npiNumber),
      licenseVerified: await this.verifyLicense(credentials.licenseNumber, credentials.licenseState),
      malpracticeInsuranceVerified: !!credentials.malpracticeInsurance,
      deaNumberVerified: credentials.deaNumber ? await this.verifyDEA(credentials.deaNumber) : undefined,
      backgroundCheckPassed: true, // Would integrate with background check service
      complianceCheckPassed: true,
      verificationDate: new Date(),
      verificationDetails: {
        npiData: { /* NPI registry data */ },
        licenseData: { /* State board data */ }
      }
    };

    session.verificationResults = results;
    
    if (step) {
      step.completed = true;
      step.validationStatus = 'completed';
      step.data = results;
    }

    await enhancedSecurityAuditService.logSecurityEvent(
      'PROVIDER_CREDENTIALS_VERIFIED',
      { sessionId, providerId: session.providerId, results },
      'medium'
    );

    await this.saveSession(session);
    return results;
  }

  /**
   * Set up billing information
   */
  async setupBilling(
    sessionId: string,
    billingInfo: BillingInformation
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.billingInfo = billingInfo;
    
    const step = session.steps.find(s => s.id === 'billing_setup');
    if (step) {
      step.completed = true;
      step.validationStatus = 'completed';
      step.data = { 
        paymentMethod: billingInfo.paymentMethod.type,
        autoRenewal: billingInfo.autoRenewal 
      };
    }

    // Create subscription in payment system
    if (session.selectedTier) {
      await this.createSubscription(session.providerId, session.selectedTier, billingInfo);
    }

    await this.saveSession(session);
  }

  /**
   * Configure integrations
   */
  async configureIntegrations(
    sessionId: string,
    config: IntegrationConfig
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.integrationConfig = config;
    
    const step = session.steps.find(s => s.id === 'integration_config');
    if (step) {
      step.completed = true;
      step.validationStatus = 'completed';
      step.data = {
        ehr: config.ehr?.system,
        billing: config.billing?.system,
        telehealth: config.telehealth?.platform
      };
    }

    // Test integrations
    if (config.ehr) {
      await this.testEHRConnection(config.ehr);
    }

    await this.saveSession(session);
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(sessionId: string): Promise<{
    success: boolean;
    providerId: string;
    activationDetails: any;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Verify all required steps are completed
    const incompleteSteps = session.steps.filter(s => s.required && !s.completed);
    if (incompleteSteps.length > 0) {
      throw new Error(`Incomplete required steps: ${incompleteSteps.map(s => s.name).join(', ')}`);
    }

    // Create provider account
    const accountDetails = await this.createProviderAccount(session);
    
    // Send welcome email
    await this.sendWelcomeEmail(session);
    
    // Schedule follow-up
    await this.scheduleFollowUp(session.providerId);

    session.completedAt = new Date();
    session.status = 'completed';
    
    await enhancedSecurityAuditService.logSecurityEvent(
      'PROVIDER_ONBOARDING_COMPLETED',
      { 
        sessionId,
        providerId: session.providerId,
        tier: session.selectedTier?.name,
        duration: Date.now() - session.startedAt.getTime()
      },
      'low'
    );

    await this.saveSession(session);
    this.activeSessions.delete(sessionId);

    return {
      success: true,
      providerId: session.providerId,
      activationDetails: accountDetails
    };
  }

  /**
   * Recommend tier based on practice profile
   */
  private recommendTier(profile: ProviderProfile): PricingTier | null {
    if (profile.currentPatientCount > 200 || profile.expectedGrowthRate > 50) {
      return this.pricingTiers.get('enterprise') || null;
    } else if (profile.currentPatientCount > 50 || profile.preferredIntegrations.length > 2) {
      return this.pricingTiers.get('practice') || null;
    } else {
      return this.pricingTiers.get('professional') || null;
    }
  }

  /**
   * Calculate ROI projection
   */
  private async calculateROIProjection(
    profile: ProviderProfile,
    tier: PricingTier
  ): Promise<any> {
    const monthlyInvestment = tier.monthlyPrice;
    
    // Use ROI validation service for calculations
    const providerEconomics = {
      patientVolume: profile.currentPatientCount,
      averageReimbursementRate: 150, // Average per session
      referralLossRate: 0.15, // 15% referral loss without platform
      timePerPatient: 50, // minutes
      documentationTime: 20 // minutes saved with AI
    };

    const validation = await this.roiService.validateProviderCalculations(providerEconomics as any);
    
    return {
      monthlyInvestment,
      projectedMonthlySavings: validation.estimatedSavings,
      projectedMonthlyRevenue: validation.additionalRevenue,
      breakEvenPatients: Math.ceil(monthlyInvestment / 150),
      roiMultiple: (validation.estimatedSavings + validation.additionalRevenue) / monthlyInvestment,
      paybackPeriod: monthlyInvestment / (validation.estimatedSavings + validation.additionalRevenue)
    };
  }

  /**
   * Verify NPI number
   */
  private async verifyNPI(npiNumber: string): Promise<boolean> {
    // Would integrate with NPPES NPI Registry API
    // For now, validate format (10 digits)
    return /^\d{10}$/.test(npiNumber);
  }

  /**
   * Verify medical license
   */
  private async verifyLicense(licenseNumber: string, state: string): Promise<boolean> {
    // Would integrate with state medical board APIs
    // For now, basic validation
    return licenseNumber.length > 0 && state.length === 2;
  }

  /**
   * Verify DEA number
   */
  private async verifyDEA(deaNumber: string): Promise<boolean> {
    // Would integrate with DEA verification service
    // DEA format: 2 letters, 7 digits
    return /^[A-Z]{2}\d{7}$/.test(deaNumber);
  }

  /**
   * Create subscription in payment system
   */
  private async createSubscription(
    providerId: string,
    tier: PricingTier,
    billing: BillingInformation
  ): Promise<void> {
    // Would integrate with Stripe/payment processor
    console.log(`Creating ${tier.name} subscription for provider ${providerId}`);
    
    await supabase.from('provider_subscriptions').insert({
      provider_id: providerId,
      tier_id: tier.id,
      tier_name: tier.name,
      monthly_price: tier.monthlyPrice,
      status: 'active',
      billing_info: billing,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Test EHR connection
   */
  private async testEHRConnection(ehr: EHRIntegration): Promise<boolean> {
    // Would test actual EHR API connection
    console.log(`Testing ${ehr.system} EHR connection`);
    return true;
  }

  /**
   * Create provider account
   */
  private async createProviderAccount(session: OnboardingSession): Promise<any> {
    const { data: account } = await supabase.from('provider_accounts').insert({
      provider_id: session.providerId,
      practice_name: session.profile?.practiceName,
      tier: session.selectedTier?.name,
      npi_number: session.profile?.npiNumber,
      license_number: session.profile?.licenseNumber,
      license_state: session.profile?.licenseState,
      verification_status: 'verified',
      onboarding_completed: true,
      created_at: new Date().toISOString()
    }).select().single();

    return account;
  }

  /**
   * Send welcome email
   */
  private async sendWelcomeEmail(session: OnboardingSession): Promise<void> {
    // Would integrate with email service
    console.log(`Sending welcome email to provider ${session.providerId}`);
  }

  /**
   * Schedule follow-up
   */
  private async scheduleFollowUp(providerId: string): Promise<void> {
    // Schedule 7-day and 30-day follow-ups
    await supabase.from('provider_follow_ups').insert([
      {
        provider_id: providerId,
        type: 'onboarding_7day',
        scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled'
      },
      {
        provider_id: providerId,
        type: 'onboarding_30day',
        scheduled_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled'
      }
    ]);
  }

  /**
   * Save session to database
   */
  private async saveSession(session: OnboardingSession): Promise<void> {
    await supabase.from('onboarding_sessions').upsert({
      id: session.id,
      provider_id: session.providerId,
      started_at: session.startedAt,
      completed_at: session.completedAt,
      current_step: session.currentStep,
      steps: session.steps,
      selected_tier: session.selectedTier,
      profile: session.profile,
      billing_info: session.billingInfo,
      integration_config: session.integrationConfig,
      status: session.status,
      verification_results: session.verificationResults
    });
  }

  /**
   * Get onboarding metrics
   */
  async getOnboardingMetrics(): Promise<OnboardingMetrics> {
    const { data: sessions } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('status', 'completed');

    if (!sessions || sessions.length === 0) {
      return {
        averageCompletionTime: 0,
        stepCompletionRates: {},
        abandonmentRate: 0,
        tierDistribution: {},
        commonIntegrations: [],
        verificationPassRate: 0,
        timeToFirstPatient: 0
      };
    }

    // Calculate metrics
    const completionTimes = sessions.map(s => 
      new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()
    );
    
    const avgCompletionTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
    
    const tierCounts: Record<string, number> = {};
    sessions.forEach(s => {
      const tier = s.selected_tier?.name || 'unknown';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    return {
      averageCompletionTime: avgCompletionTime / (1000 * 60), // Convert to minutes
      stepCompletionRates: this.calculateStepCompletionRates(sessions),
      abandonmentRate: await this.calculateAbandonmentRate(),
      tierDistribution: tierCounts,
      commonIntegrations: this.findCommonIntegrations(sessions),
      verificationPassRate: this.calculateVerificationPassRate(sessions),
      timeToFirstPatient: 7 * 24 * 60 // 7 days in minutes (estimated)
    };
  }

  private calculateStepCompletionRates(sessions: any[]): Record<string, number> {
    const rates: Record<string, number> = {};
    const steps = this.createOnboardingSteps();
    
    steps.forEach(step => {
      const completed = sessions.filter(s => 
        s.steps?.find((st: any) => st.id === step.id && st.completed)
      ).length;
      rates[step.id] = (completed / sessions.length) * 100;
    });
    
    return rates;
  }

  private async calculateAbandonmentRate(): Promise<number> {
    const { count: total } = await supabase
      .from('onboarding_sessions')
      .select('*', { count: 'exact', head: true });
    
    const { count: abandoned } = await supabase
      .from('onboarding_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'abandoned');
    
    return total ? (abandoned || 0) / total * 100 : 0;
  }

  private findCommonIntegrations(sessions: any[]): string[] {
    const integrations: Record<string, number> = {};
    
    sessions.forEach(s => {
      if (s.integration_config?.ehr) {
        integrations[s.integration_config.ehr.system] = 
          (integrations[s.integration_config.ehr.system] || 0) + 1;
      }
    });
    
    return Object.entries(integrations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  private calculateVerificationPassRate(sessions: any[]): number {
    const verified = sessions.filter(s => 
      s.verification_results?.npiVerified && 
      s.verification_results?.licenseVerified
    ).length;
    
    return sessions.length ? (verified / sessions.length) * 100 : 0;
  }

  /**
   * Get pricing tiers
   */
  public getPricingTiers(): PricingTier[] {
    return Array.from(this.pricingTiers.values());
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): OnboardingSession | undefined {
    return this.activeSessions.get(sessionId);
  }
}