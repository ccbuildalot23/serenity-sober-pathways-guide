/**
 * Predictive Sales Engine
 * AI-powered lead scoring, demo personalization, and conversion optimization
 * Integrates with market research data for healthcare provider sales
 */

import { supabase } from '@/integrations/supabase/client';
import { enhancedSecurityAuditService } from './EnhancedSecurityAuditService';
import { roiValidationService } from './ROIValidationService';

interface LeadData {
  id: string;
  companyName: string;
  contactName: string;
  title: string;
  email: string;
  phone?: string;
  website?: string;
  location: {
    city: string;
    state: string;
    zipCode: string;
  };
  practiceInfo: {
    specialty: string;
    practiceSize: number;
    currentEMR?: string;
    currentSolutions: string[];
    monthlyPatients: number;
    substanceAbuseVolume: number;
  };
  painPoints: string[];
  budgetSignals: BudgetSignal[];
  urgencyIndicators: UrgencyIndicator[];
  behaviorData: BehaviorData;
}

interface BudgetSignal {
  type: 'direct_inquiry' | 'pricing_page_visit' | 'competitor_comparison' | 'rfp_request';
  value?: number;
  confidence: number;
  detectedAt: Date;
}

interface UrgencyIndicator {
  type: 'compliance_deadline' | 'system_failure' | 'rapid_growth' | 'staff_complaint';
  description: string;
  timeframe?: number; // days
  confidence: number;
  detectedAt: Date;
}

interface BehaviorData {
  websiteVisits: number;
  pagesViewed: string[];
  timeOnSite: number;
  downloadedResources: string[];
  demoRequested: boolean;
  emailEngagement: {
    opened: number;
    clicked: number;
    replied: number;
  };
  socialEngagement: {
    linkedInConnections: number;
    contentShares: number;
  };
}

interface EnrichedLead extends LeadData {
  enrichmentData: {
    companyRevenue?: number;
    employeeCount?: number;
    technologyStack: string[];
    competitorAnalysis: CompetitorUsage[];
    marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
    growthStage: 'startup' | 'growth' | 'mature' | 'enterprise';
  };
}

interface CompetitorUsage {
  competitor: string;
  product: string;
  likelihood: number;
  contractEndDate?: Date;
  satisfaction?: number;
}

interface LeadScore {
  leadId: string;
  overall: number; // 0-100
  components: {
    fit: number;
    intent: number;
    budget: number;
    urgency: number;
    authority: number;
  };
  tier: 'cold' | 'warm' | 'hot' | 'red_hot';
  confidence: number;
  reasoning: string[];
  nextBestAction: string;
  estimatedTimeToClose: number; // days
}

interface PersonalizedDemo {
  leadId: string;
  demoType: 'standard' | 'executive' | 'technical' | 'roi_focused';
  customElements: DemoElement[];
  duration: number; // minutes
  focusAreas: string[];
  roiCalculation: CustomROI;
  followUpSequence: FollowUpAction[];
}

interface DemoElement {
  type: 'use_case' | 'integration' | 'roi_calculation' | 'testimonial';
  content: string;
  duration: number;
  priority: number;
}

interface CustomROI {
  currentStateCosts: number;
  projectedSavings: number;
  revenueUplift: number;
  paybackPeriod: number;
  fiveYearNPV: number;
  assumptions: Record<string, any>;
}

interface FollowUpAction {
  type: 'email' | 'call' | 'resource' | 'meeting';
  timing: number; // hours after demo
  content: string;
  priority: 'low' | 'medium' | 'high';
}

interface ConversionFlow {
  leadId: string;
  stage: 'awareness' | 'interest' | 'consideration' | 'decision' | 'closed';
  optimizedPath: FlowStep[];
  personalization: PersonalizationConfig;
  riskMitigation: RiskMitigationStrategy[];
}

interface FlowStep {
  step: string;
  action: string;
  timing: number;
  successMetrics: string[];
  fallbackOptions: string[];
}

interface PersonalizationConfig {
  messaging: Record<string, string>;
  contentRecommendations: string[];
  channelPreferences: string[];
  timingOptimization: TimingConfig;
}

interface TimingConfig {
  bestContactDays: number[];
  bestContactHours: number[];
  followUpCadence: number[];
}

interface RiskMitigationStrategy {
  risk: string;
  mitigation: string;
  trigger: string;
  priority: number;
}

export class PredictiveSalesEngine {
  private static instance: PredictiveSalesEngine;
  private behaviorTracking: Map<string, BehaviorData> = new Map();
  private scoreCache: Map<string, LeadScore> = new Map();

  static getInstance(): PredictiveSalesEngine {
    if (!this.instance) {
      this.instance = new PredictiveSalesEngine();
    }
    return this.instance;
  }

  /**
   * Score and qualify lead with advanced algorithms
   */
  async scoreAndQualifyLead(lead: LeadData): Promise<LeadScore> {
    try {
      await enhancedSecurityAuditService.logSecurityEvent(
        'LEAD_SCORING_STARTED',
        { leadId: lead.id, company: lead.companyName },
        'low'
      );

      // Enrich lead data with external sources
      const enrichedLead = await this.enrichLeadData(lead);
      
      // Analyze practice fit
      const practiceAnalysis = await this.analyzePractice(enrichedLead);
      
      // Market analysis
      const marketAnalysis = await this.analyzeMarket(enrichedLead.location);
      
      // Competitor analysis
      const competitorAnalysis = await this.analyzeCompetitors(enrichedLead);

      // Calculate advanced scoring components
      const components = {
        fit: this.calculateFitScore(practiceAnalysis, enrichedLead),
        intent: this.calculateIntentScore(enrichedLead.behaviorData, enrichedLead.urgencyIndicators),
        budget: this.calculateBudgetScore(enrichedLead.budgetSignals, practiceAnalysis),
        urgency: this.calculateUrgencyScore(enrichedLead.urgencyIndicators),
        authority: this.calculateAuthorityScore(enrichedLead)
      };

      // Calculate overall score with weighted components
      const weights = { fit: 0.25, intent: 0.25, budget: 0.2, urgency: 0.15, authority: 0.15 };
      const overall = Object.entries(components).reduce(
        (sum, [key, value]) => sum + (value * weights[key as keyof typeof weights]),
        0
      );

      // Determine tier
      let tier: 'cold' | 'warm' | 'hot' | 'red_hot';
      if (overall >= 80) tier = 'red_hot';
      else if (overall >= 65) tier = 'hot';
      else if (overall >= 45) tier = 'warm';
      else tier = 'cold';

      // Generate reasoning and recommendations
      const reasoning = this.generateScoreReasoning(components, enrichedLead);
      const nextBestAction = this.recommendNextAction(overall, components, enrichedLead);
      const estimatedTimeToClose = this.predictTimeToClose(overall, practiceAnalysis);

      const score: LeadScore = {
        leadId: lead.id,
        overall: Math.round(overall),
        components,
        tier,
        confidence: this.calculateConfidence(components, enrichedLead),
        reasoning,
        nextBestAction,
        estimatedTimeToClose
      };

      // Cache score
      this.scoreCache.set(lead.id, score);

      // Store in database
      await this.storeLeadScore(score);

      await enhancedSecurityAuditService.logSecurityEvent(
        'LEAD_SCORED',
        { 
          leadId: lead.id,
          score: score.overall,
          tier: score.tier,
          timeToClose: score.estimatedTimeToClose
        },
        'low'
      );

      return score;
    } catch (error) {
      await enhancedSecurityAuditService.logSecurityEvent(
        'LEAD_SCORING_FAILED',
        { leadId: lead.id, error: error.message },
        'medium'
      );
      throw error;
    }
  }

  /**
   * Create personalized demo experience
   */
  async createPersonalizedDemo(leadId: string): Promise<PersonalizedDemo> {
    try {
      const lead = await this.getLeadById(leadId);
      const score = this.scoreCache.get(leadId) || await this.getStoredLeadScore(leadId);
      
      if (!lead || !score) {
        throw new Error('Lead or score not found');
      }

      // Determine demo type based on lead characteristics
      const demoType = this.selectDemoType(lead, score);
      
      // Create custom ROI calculation
      const roiCalculation = await this.generateCustomROI(lead, score);
      
      // Build custom demo elements
      const customElements = await this.buildDemoElements(lead, score, demoType);
      
      // Define focus areas
      const focusAreas = this.identifyFocusAreas(lead, score);
      
      // Create follow-up sequence
      const followUpSequence = this.createFollowUpSequence(lead, score);

      const demo: PersonalizedDemo = {
        leadId,
        demoType,
        customElements,
        duration: this.calculateDemoDuration(customElements),
        focusAreas,
        roiCalculation,
        followUpSequence
      };

      await this.storePersonalizedDemo(demo);

      await enhancedSecurityAuditService.logSecurityEvent(
        'PERSONALIZED_DEMO_CREATED',
        { 
          leadId,
          demoType: demo.demoType,
          focusAreas: demo.focusAreas,
          duration: demo.duration
        },
        'low'
      );

      return demo;
    } catch (error) {
      await enhancedSecurityAuditService.logSecurityEvent(
        'DEMO_PERSONALIZATION_FAILED',
        { leadId, error: error.message },
        'medium'
      );
      throw error;
    }
  }

  /**
   * Optimize conversion flow for lead
   */
  async optimizeConversionFlow(leadId: string): Promise<ConversionFlow> {
    try {
      const lead = await this.getLeadById(leadId);
      const score = this.scoreCache.get(leadId);
      const behaviorPattern = await this.analyzeBehavior(leadId);
      const successfulPatterns = await this.getSuccessfulConversions(lead.practiceInfo.specialty);

      if (!lead || !score) {
        throw new Error('Lead data not available');
      }

      // Determine current stage
      const stage = this.identifyCurrentStage(lead, score);
      
      // Build optimized path
      const optimizedPath = this.buildOptimizedPath(stage, score, behaviorPattern, successfulPatterns);
      
      // Create personalization config
      const personalization = this.createPersonalizationConfig(lead, score, behaviorPattern);
      
      // Identify risks and mitigation strategies
      const riskMitigation = await this.identifyRisksAndMitigation(lead, score);

      const flow: ConversionFlow = {
        leadId,
        stage,
        optimizedPath,
        personalization,
        riskMitigation
      };

      await this.storeConversionFlow(flow);

      await enhancedSecurityAuditService.logSecurityEvent(
        'CONVERSION_FLOW_OPTIMIZED',
        { 
          leadId,
          stage: flow.stage,
          pathSteps: flow.optimizedPath.length,
          risks: flow.riskMitigation.length
        },
        'low'
      );

      return flow;
    } catch (error) {
      await enhancedSecurityAuditService.logSecurityEvent(
        'CONVERSION_OPTIMIZATION_FAILED',
        { leadId, error: error.message },
        'medium'
      );
      throw error;
    }
  }

  /**
   * Enrich lead data with external sources
   */
  private async enrichLeadData(lead: LeadData): Promise<EnrichedLead> {
    // Simulate data enrichment (would integrate with real services)
    const enrichmentData = {
      companyRevenue: this.estimateRevenue(lead.practiceInfo.practiceSize),
      employeeCount: lead.practiceInfo.practiceSize,
      technologyStack: this.predictTechnologyStack(lead.practiceInfo),
      competitorAnalysis: await this.analyzeCompetitorUsage(lead),
      marketPosition: this.assessMarketPosition(lead),
      growthStage: this.identifyGrowthStage(lead)
    };

    return { ...lead, enrichmentData };
  }

  /**
   * Analyze practice characteristics
   */
  private async analyzePractice(lead: EnrichedLead): Promise<any> {
    return {
      size: lead.practiceInfo.practiceSize,
      substanceAbuseVolume: lead.practiceInfo.substanceAbuseVolume,
      currentSolutions: lead.practiceInfo.currentSolutions,
      painPoints: lead.painPoints,
      technologyReadiness: this.assessTechnologyReadiness(lead),
      changeReadiness: this.assessChangeReadiness(lead),
      revenueOptimization: await this.assessRevenueOptimization(lead)
    };
  }

  /**
   * Analyze market conditions
   */
  private async analyzeMarket(location: { city: string; state: string; zipCode: string }): Promise<any> {
    return {
      competitiveness: 0.7,
      averageRevenue: 285000,
      technologyAdoption: 0.68,
      reimbursementRates: await this.getLocalReimbursementRates(location.state),
      marketTrends: ['increasing_substance_abuse_treatment', 'hipaa_compliance_focus']
    };
  }

  /**
   * Analyze competitor landscape
   */
  private async analyzeCompetitors(lead: EnrichedLead): Promise<any> {
    return {
      currentTools: lead.practiceInfo.currentSolutions,
      competitorSatisfaction: 0.65, // Based on market research
      switchingCosts: this.estimateSwitchingCosts(lead),
      differentiators: this.identifyDifferentiators(lead)
    };
  }

  /**
   * Calculate fit score based on practice analysis
   */
  private calculateFitScore(analysis: any, lead: EnrichedLead): number {
    let score = 0;

    // Practice size fit (sweet spot: 5-50 providers)
    if (lead.practiceInfo.practiceSize >= 5 && lead.practiceInfo.practiceSize <= 50) {
      score += 30;
    } else if (lead.practiceInfo.practiceSize > 50) {
      score += 20; // Enterprise deals take longer
    } else {
      score += 10; // Small practices have budget constraints
    }

    // Substance abuse volume fit
    if (lead.practiceInfo.substanceAbuseVolume > 0) {
      score += 25; // Perfect fit
    }

    // Technology readiness
    score += analysis.technologyReadiness * 20;

    // Change readiness
    score += analysis.changeReadiness * 15;

    // Market position alignment
    if (lead.enrichmentData.marketPosition === 'leader' || lead.enrichmentData.marketPosition === 'challenger') {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate intent score based on behavior and urgency
   */
  private calculateIntentScore(behavior: BehaviorData, urgency: UrgencyIndicator[]): number {
    let score = 0;

    // Website engagement
    score += Math.min(25, behavior.websiteVisits * 2);
    score += Math.min(15, behavior.timeOnSite / 60); // Convert to minutes
    
    // Resource downloads indicate research phase
    score += behavior.downloadedResources.length * 5;

    // Demo request is strong intent
    if (behavior.demoRequested) score += 20;

    // Email engagement
    const emailScore = (behavior.emailEngagement.opened * 0.5) +
                      (behavior.emailEngagement.clicked * 2) +
                      (behavior.emailEngagement.replied * 5);
    score += Math.min(15, emailScore);

    // Urgency indicators
    const urgencyScore = urgency.reduce((sum, indicator) => {
      let points = 0;
      switch (indicator.type) {
        case 'compliance_deadline': points = 15; break;
        case 'system_failure': points = 20; break;
        case 'rapid_growth': points = 10; break;
        case 'staff_complaint': points = 8; break;
      }
      return sum + (points * indicator.confidence);
    }, 0);
    score += Math.min(20, urgencyScore);

    return Math.min(100, score);
  }

  /**
   * Calculate budget score based on signals and practice size
   */
  private calculateBudgetScore(signals: BudgetSignal[], analysis: any): number {
    let score = 0;

    // Budget signals
    signals.forEach(signal => {
      switch (signal.type) {
        case 'direct_inquiry': score += 25 * signal.confidence; break;
        case 'pricing_page_visit': score += 15 * signal.confidence; break;
        case 'competitor_comparison': score += 20 * signal.confidence; break;
        case 'rfp_request': score += 30 * signal.confidence; break;
      }
    });

    // Practice size indicates budget capacity
    if (analysis.size > 20) score += 20;
    else if (analysis.size > 10) score += 15;
    else if (analysis.size > 5) score += 10;

    // Revenue optimization potential indicates ROI justification
    score += analysis.revenueOptimization * 20;

    return Math.min(100, score);
  }

  /**
   * Calculate urgency score
   */
  private calculateUrgencyScore(indicators: UrgencyIndicator[]): number {
    return indicators.reduce((score, indicator) => {
      let points = 0;
      const timeMultiplier = indicator.timeframe ? Math.max(0.1, 1 - (indicator.timeframe / 365)) : 1;
      
      switch (indicator.type) {
        case 'compliance_deadline': points = 30; break;
        case 'system_failure': points = 40; break;
        case 'rapid_growth': points = 20; break;
        case 'staff_complaint': points = 15; break;
      }
      
      return score + (points * indicator.confidence * timeMultiplier);
    }, 0);
  }

  /**
   * Calculate authority score based on contact position
   */
  private calculateAuthorityScore(lead: EnrichedLead): number {
    const title = lead.title.toLowerCase();
    
    if (title.includes('ceo') || title.includes('president') || title.includes('owner')) return 100;
    if (title.includes('cto') || title.includes('cio') || title.includes('director')) return 85;
    if (title.includes('manager') || title.includes('supervisor')) return 70;
    if (title.includes('administrator')) return 60;
    
    return 40; // Default for other titles
  }

  // Helper methods for scoring components
  private estimateRevenue(practiceSize: number): number {
    return practiceSize * 200000; // Rough estimate: $200K per provider
  }

  private predictTechnologyStack(practice: any): string[] {
    const common = ['Windows', 'Electronic Health Records'];
    if (practice.practiceSize > 20) common.push('Practice Management System');
    if (practice.currentEMR) common.push(practice.currentEMR);
    return common;
  }

  private async analyzeCompetitorUsage(lead: LeadData): Promise<CompetitorUsage[]> {
    return lead.practiceInfo.currentSolutions.map(solution => ({
      competitor: 'Unknown',
      product: solution,
      likelihood: 0.8,
      satisfaction: 0.6
    }));
  }

  private assessMarketPosition(lead: LeadData): 'leader' | 'challenger' | 'follower' | 'niche' {
    if (lead.practiceInfo.practiceSize > 50) return 'leader';
    if (lead.practiceInfo.practiceSize > 20) return 'challenger';
    if (lead.practiceInfo.practiceSize > 5) return 'follower';
    return 'niche';
  }

  private identifyGrowthStage(lead: LeadData): 'startup' | 'growth' | 'mature' | 'enterprise' {
    if (lead.practiceInfo.practiceSize > 100) return 'enterprise';
    if (lead.practiceInfo.practiceSize > 20) return 'mature';
    if (lead.practiceInfo.practiceSize > 5) return 'growth';
    return 'startup';
  }

  private assessTechnologyReadiness(lead: EnrichedLead): number {
    let readiness = 0.5; // Base readiness
    
    if (lead.practiceInfo.currentEMR) readiness += 0.3;
    if (lead.enrichmentData.technologyStack.length > 3) readiness += 0.2;
    
    return Math.min(1, readiness);
  }

  private assessChangeReadiness(lead: EnrichedLead): number {
    let readiness = 0.5; // Base readiness
    
    // Pain points indicate readiness to change
    if (lead.painPoints.length > 2) readiness += 0.3;
    
    // Urgency indicators
    if (lead.urgencyIndicators.length > 0) readiness += 0.2;
    
    return Math.min(1, readiness);
  }

  private async assessRevenueOptimization(lead: EnrichedLead): Promise<number> {
    // Use ROI validation service to assess potential
    try {
      const mockEconomics = {
        providerId: 'temp',
        practiceSize: lead.practiceInfo.practiceSize,
        specialty: lead.practiceInfo.specialty,
        location: lead.location,
        currentMonthlyRevenue: lead.practiceInfo.practiceSize * 15000,
        currentCaseload: lead.practiceInfo.monthlyPatients,
        averageSessionFee: 150,
        referralVolume: {
          substanceAbuse: lead.practiceInfo.substanceAbuseVolume,
          mentalHealth: lead.practiceInfo.monthlyPatients,
          combinedCare: 0
        },
        currentSolutions: lead.practiceInfo.currentSolutions,
        painPoints: lead.painPoints,
        projectedROI: {
          monthlyRevenueLift: 5000,
          efficiencyGains: 0.25,
          retentionImprovement: 0.15,
          newPatientCapacity: 50,
          costSavings: 3000,
          paybackPeriodMonths: 6,
          fiveYearNPV: 250000,
          assumptions: {}
        }
      };

      const validation = await roiValidationService.validateProviderCalculations(mockEconomics);
      return validation.validationScore;
    } catch {
      return 0.7; // Default optimization potential
    }
  }

  private async getLocalReimbursementRates(state: string): Promise<any> {
    // Would integrate with CMS data
    return {
      ccm: 42.01,
      bhi: 157.00,
      psychiatric: 426.00
    };
  }

  private estimateSwitchingCosts(lead: EnrichedLead): number {
    let costs = 5000; // Base switching cost
    costs += lead.practiceInfo.practiceSize * 500; // Per-provider training
    costs += lead.practiceInfo.currentSolutions.length * 2000; // Integration complexity
    return costs;
  }

  private identifyDifferentiators(lead: EnrichedLead): string[] {
    const differentiators = [
      'HIPAA-compliant crisis intervention',
      'Integrated substance abuse + mental health',
      'Real-time provider collaboration'
    ];

    if (lead.practiceInfo.substanceAbuseVolume > 0) {
      differentiators.push('Specialized SUD workflows');
    }

    return differentiators;
  }

  // Demo personalization methods
  private selectDemoType(lead: LeadData, score: LeadScore): 'standard' | 'executive' | 'technical' | 'roi_focused' {
    const title = lead.title.toLowerCase();
    
    if (title.includes('ceo') || title.includes('president')) return 'executive';
    if (title.includes('cto') || title.includes('cio')) return 'technical';
    if (score.components.budget > 70) return 'roi_focused';
    
    return 'standard';
  }

  private async generateCustomROI(lead: LeadData, score: LeadScore): Promise<CustomROI> {
    const currentCosts = lead.practiceInfo.practiceSize * 2000; // Monthly operational costs
    const projectedSavings = currentCosts * 0.15; // 15% efficiency gain
    const revenueUplift = lead.practiceInfo.substanceAbuseVolume * 150; // Additional revenue per patient
    
    return {
      currentStateCosts: currentCosts,
      projectedSavings,
      revenueUplift,
      paybackPeriod: 6, // months
      fiveYearNPV: (projectedSavings + revenueUplift) * 60 - 50000, // 5 years minus platform cost
      assumptions: {
        efficiencyGain: 0.15,
        additionalPatients: lead.practiceInfo.substanceAbuseVolume,
        sessionFee: 150
      }
    };
  }

  // Additional helper methods would be implemented here...
  private async buildDemoElements(lead: LeadData, score: LeadScore, demoType: string): Promise<DemoElement[]> {
    const elements: DemoElement[] = [];
    
    // Base elements for all demos
    elements.push({
      type: 'use_case',
      content: 'Crisis intervention workflow',
      duration: 5,
      priority: 1
    });

    if (lead.practiceInfo.substanceAbuseVolume > 0) {
      elements.push({
        type: 'use_case',
        content: 'Substance abuse treatment integration',
        duration: 7,
        priority: 2
      });
    }

    if (demoType === 'roi_focused' || demoType === 'executive') {
      elements.push({
        type: 'roi_calculation',
        content: 'Custom ROI analysis',
        duration: 10,
        priority: 1
      });
    }

    return elements;
  }

  // Stub methods for additional functionality
  private identifyFocusAreas(lead: LeadData, score: LeadScore): string[] {
    return ['Crisis Management', 'ROI Optimization', 'HIPAA Compliance'];
  }

  private createFollowUpSequence(lead: LeadData, score: LeadScore): FollowUpAction[] {
    return [{
      type: 'email',
      timing: 2,
      content: 'Demo recap with custom ROI',
      priority: 'high'
    }];
  }

  private calculateDemoDuration(elements: DemoElement[]): number {
    return elements.reduce((total, element) => total + element.duration, 0);
  }

  private generateScoreReasoning(components: any, lead: EnrichedLead): string[] {
    const reasons = [];
    
    if (components.fit > 70) reasons.push('Excellent practice fit for our solution');
    if (components.intent > 60) reasons.push('Strong buying intent signals detected');
    if (components.budget > 50) reasons.push('Budget capacity confirmed');
    if (components.urgency > 40) reasons.push('Urgency indicators present');
    
    return reasons;
  }

  private recommendNextAction(overall: number, components: any, lead: EnrichedLead): string {
    if (overall > 80) return 'Schedule executive demo within 48 hours';
    if (overall > 65) return 'Send personalized ROI analysis and schedule demo';
    if (overall > 45) return 'Nurture with educational content and case studies';
    return 'Add to long-term nurture campaign';
  }

  private predictTimeToClose(score: number, analysis: any): number {
    let days = 90; // Base timeline
    
    if (score > 80) days = 30;
    else if (score > 65) days = 45;
    else if (score > 45) days = 60;
    
    // Adjust for practice size
    if (analysis.size > 20) days += 30; // Enterprise deals take longer
    
    return days;
  }

  private calculateConfidence(components: any, lead: EnrichedLead): number {
    const dataQuality = (lead.practiceInfo ? 0.3 : 0) + 
                       (lead.behaviorData ? 0.3 : 0) + 
                       (lead.enrichmentData ? 0.4 : 0);
    
    const componentVariance = Math.abs(Math.max(...Object.values(components)) - Math.min(...Object.values(components))) / 100;
    
    return Math.min(0.95, dataQuality + (0.3 - componentVariance));
  }

  // Database operations
  private async storeLeadScore(score: LeadScore): Promise<void> {
    await supabase.from('lead_scores').upsert({
      lead_id: score.leadId,
      overall_score: score.overall,
      fit_score: score.components.fit,
      intent_score: score.components.intent,
      budget_score: score.components.budget,
      urgency_score: score.components.urgency,
      authority_score: score.components.authority,
      tier: score.tier,
      confidence: score.confidence,
      reasoning: score.reasoning,
      next_action: score.nextBestAction,
      time_to_close: score.estimatedTimeToClose,
      updated_at: new Date()
    });
  }

  private async getLeadById(leadId: string): Promise<LeadData | null> {
    const { data } = await supabase.from('leads').select('*').eq('id', leadId).single();
    return data;
  }

  private async getStoredLeadScore(leadId: string): Promise<LeadScore | null> {
    const { data } = await supabase.from('lead_scores').select('*').eq('lead_id', leadId).single();
    return data;
  }

  private async storePersonalizedDemo(demo: PersonalizedDemo): Promise<void> {
    await supabase.from('personalized_demos').upsert({
      lead_id: demo.leadId,
      demo_type: demo.demoType,
      custom_elements: demo.customElements,
      duration: demo.duration,
      focus_areas: demo.focusAreas,
      roi_calculation: demo.roiCalculation,
      follow_up_sequence: demo.followUpSequence,
      created_at: new Date()
    });
  }

  private async storeConversionFlow(flow: ConversionFlow): Promise<void> {
    await supabase.from('conversion_flows').upsert({
      lead_id: flow.leadId,
      stage: flow.stage,
      optimized_path: flow.optimizedPath,
      personalization: flow.personalization,
      risk_mitigation: flow.riskMitigation,
      created_at: new Date()
    });
  }

  // Stub methods for conversion flow optimization
  private async analyzeBehavior(leadId: string): Promise<any> {
    return this.behaviorTracking.get(leadId) || {};
  }

  private async getSuccessfulConversions(specialty: string): Promise<any[]> {
    const { data } = await supabase.from('successful_conversions').select('*').eq('specialty', specialty);
    return data || [];
  }

  private identifyCurrentStage(lead: LeadData, score: LeadScore): 'awareness' | 'interest' | 'consideration' | 'decision' | 'closed' {
    if (score.overall > 80) return 'decision';
    if (score.overall > 60) return 'consideration';
    if (score.overall > 30) return 'interest';
    return 'awareness';
  }

  private buildOptimizedPath(stage: string, score: LeadScore, behavior: any, patterns: any[]): FlowStep[] {
    return [{
      step: 'initial_contact',
      action: 'Send personalized introduction',
      timing: 0,
      successMetrics: ['email_opened', 'reply_received'],
      fallbackOptions: ['linkedin_message', 'phone_call']
    }];
  }

  private createPersonalizationConfig(lead: LeadData, score: LeadScore, behavior: any): PersonalizationConfig {
    return {
      messaging: {
        primary: 'ROI-focused messaging',
        secondary: 'Compliance benefits'
      },
      contentRecommendations: ['ROI Calculator', 'Case Studies', 'Demo Video'],
      channelPreferences: ['email', 'phone'],
      timingOptimization: {
        bestContactDays: [2, 3, 4], // Tue-Thu
        bestContactHours: [10, 14, 16], // 10am, 2pm, 4pm
        followUpCadence: [2, 7, 14] // 2 days, 1 week, 2 weeks
      }
    };
  }

  private async identifyRisksAndMitigation(lead: LeadData, score: LeadScore): Promise<RiskMitigationStrategy[]> {
    const risks: RiskMitigationStrategy[] = [];

    if (score.components.budget < 50) {
      risks.push({
        risk: 'Budget constraints',
        mitigation: 'Emphasize ROI and offer phased implementation',
        trigger: 'Price objection',
        priority: 1
      });
    }

    if (lead.practiceInfo.currentSolutions.length > 2) {
      risks.push({
        risk: 'Integration complexity concerns',
        mitigation: 'Highlight integration capabilities and support',
        trigger: 'Technical questions',
        priority: 2
      });
    }

    return risks;
  }
}

export const predictiveSalesEngine = PredictiveSalesEngine.getInstance();