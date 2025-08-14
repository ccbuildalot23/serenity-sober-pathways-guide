/**
 * Unit tests for PredictiveSalesEngine
 * Tests lead scoring, conversion optimization, and sales automation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PredictiveSalesEngine } from '@/services/PredictiveSalesEngine';

describe('PredictiveSalesEngine', () => {
  let service: PredictiveSalesEngine;
  
  const mockLeadData = {
    id: 'lead-123',
    email: 'dr.smith@clinic.com',
    name: 'Dr. Sarah Smith',
    organization: 'Smith Psychiatry Clinic',
    specialty: 'psychiatry',
    patientVolume: 250,
    state: 'CA',
    source: 'webinar',
    engagement: {
      websiteVisits: 5,
      contentDownloads: 3,
      emailOpens: 8,
      demoRequested: true
    }
  };

  beforeEach(() => {
    service = new PredictiveSalesEngine();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Lead Scoring', () => {
    it('should score high-quality leads accurately', async () => {
      const score = await service.scoreAndQualifyLead(mockLeadData);
      
      expect(score).toBeDefined();
      expect(score.score).toBeGreaterThan(70);
      expect(score.tier).toBeOneOf(['A', 'B']);
      expect(score.conversionProbability).toBeGreaterThan(0.6);
    });

    it('should identify MQL (Marketing Qualified Leads)', async () => {
      const qualification = await service.qualifyLead(mockLeadData);
      
      expect(qualification.isMQL).toBe(true);
      expect(qualification.criteria).toContain('engagement_threshold');
      expect(qualification.criteria).toContain('demographic_fit');
      expect(qualification.nextSteps).toContain('schedule_demo');
    });

    it('should identify SQL (Sales Qualified Leads)', async () => {
      const sqlData = {
        ...mockLeadData,
        engagement: {
          ...mockLeadData.engagement,
          demoCompleted: true,
          proposalRequested: true
        }
      };
      
      const qualification = await service.qualifyLead(sqlData);
      
      expect(qualification.isSQL).toBe(true);
      expect(qualification.readyForClose).toBe(true);
      expect(qualification.recommendedAction).toBe('send_proposal');
    });

    it('should predict conversion probability', async () => {
      const prediction = await service.predictConversion(mockLeadData);
      
      expect(prediction.probability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeLessThanOrEqual(1);
      expect(prediction.confidence).toBeGreaterThan(0.7);
      expect(prediction.factors).toBeInstanceOf(Array);
    });

    it('should segment leads by quality tier', async () => {
      const leads = [
        { ...mockLeadData, id: '1', patientVolume: 500 },
        { ...mockLeadData, id: '2', patientVolume: 100 },
        { ...mockLeadData, id: '3', patientVolume: 50 }
      ];
      
      const segments = await service.segmentLeads(leads);
      
      expect(segments.A).toBeInstanceOf(Array);
      expect(segments.B).toBeInstanceOf(Array);
      expect(segments.C).toBeInstanceOf(Array);
      expect(segments.A[0].patientVolume).toBeGreaterThan(segments.C[0]?.patientVolume || 0);
    });
  });

  describe('Demo Personalization', () => {
    it('should create personalized demo for provider specialty', async () => {
      const demo = await service.createPersonalizedDemo(mockLeadData.id);
      
      expect(demo).toBeDefined();
      expect(demo.focusAreas).toContain('mental_health');
      expect(demo.features).toContain('crisis_detection');
      expect(demo.roiCalculation).toBeDefined();
      expect(demo.roiCalculation.specialty).toBe('psychiatry');
    });

    it('should customize demo based on practice size', async () => {
      const smallPractice = { ...mockLeadData, patientVolume: 50 };
      const demo = await service.createPersonalizedDemo(smallPractice.id);
      
      expect(demo.recommendedTier).toBe('professional');
      expect(demo.features).toContain('basic_analytics');
      
      const largePractice = { ...mockLeadData, patientVolume: 500 };
      const largeDemo = await service.createPersonalizedDemo(largePractice.id);
      
      expect(largeDemo.recommendedTier).toBe('enterprise');
      expect(largeDemo.features).toContain('multi_provider');
    });

    it('should include relevant case studies', async () => {
      const demo = await service.createPersonalizedDemo(mockLeadData.id);
      
      expect(demo.caseStudies).toBeInstanceOf(Array);
      expect(demo.caseStudies.length).toBeGreaterThan(0);
      demo.caseStudies.forEach(study => {
        expect(study.relevance).toBeGreaterThan(0.7);
        expect(study.specialty).toBe('psychiatry');
      });
    });
  });

  describe('Lead Nurturing', () => {
    it('should create nurture campaign for cold leads', async () => {
      const coldLead = { ...mockLeadData, engagement: { websiteVisits: 1 } };
      const campaign = await service.createNurtureCampaign(coldLead);
      
      expect(campaign.type).toBe('educational');
      expect(campaign.touchpoints).toBeGreaterThan(5);
      expect(campaign.duration).toBe(30); // days
      expect(campaign.content).toContain('roi_calculator');
    });

    it('should accelerate warm leads to conversion', async () => {
      const warmLead = {
        ...mockLeadData,
        engagement: {
          ...mockLeadData.engagement,
          demoCompleted: true
        }
      };
      
      const campaign = await service.createNurtureCampaign(warmLead);
      
      expect(campaign.type).toBe('conversion');
      expect(campaign.urgency).toBe('high');
      expect(campaign.content).toContain('limited_time_offer');
      expect(campaign.followUpDays).toBeLessThan(3);
    });

    it('should re-engage stale leads', async () => {
      const staleLead = {
        ...mockLeadData,
        lastActivity: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      };
      
      const reEngagement = await service.reEngageLead(staleLead);
      
      expect(reEngagement.strategy).toBe('win_back');
      expect(reEngagement.incentive).toBeDefined();
      expect(reEngagement.content).toContain('whats_new');
    });
  });

  describe('Sales Automation', () => {
    it('should automate follow-up sequences', async () => {
      const sequence = await service.createFollowUpSequence(mockLeadData);
      
      expect(sequence.steps).toBeInstanceOf(Array);
      expect(sequence.steps.length).toBeGreaterThan(3);
      sequence.steps.forEach((step, index) => {
        expect(step.day).toBe(index === 0 ? 0 : sequence.steps[index - 1].day + step.delay);
        expect(step.channel).toBeOneOf(['email', 'phone', 'linkedin']);
      });
    });

    it('should trigger alerts for hot leads', async () => {
      const hotLead = {
        ...mockLeadData,
        engagement: {
          ...mockLeadData.engagement,
          proposalRequested: true,
          budgetDiscussed: true
        }
      };
      
      const alerts = await service.checkLeadAlerts(hotLead);
      
      expect(alerts).toBeInstanceOf(Array);
      expect(alerts).toContain('immediate_follow_up');
      expect(alerts).toContain('schedule_close_call');
    });

    it('should optimize contact timing', async () => {
      const timing = await service.optimizeContactTiming(mockLeadData);
      
      expect(timing.bestDay).toBeOneOf(['Tuesday', 'Wednesday', 'Thursday']);
      expect(timing.bestTime).toMatch(/^\d{2}:\d{2}$/);
      expect(timing.timezone).toBeDefined();
      expect(timing.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Conversion Optimization', () => {
    it('should identify conversion bottlenecks', async () => {
      const funnel = await service.analyzeFunnel();
      
      expect(funnel.stages).toBeInstanceOf(Array);
      expect(funnel.bottlenecks).toBeInstanceOf(Array);
      funnel.bottlenecks.forEach(bottleneck => {
        expect(bottleneck.stage).toBeDefined();
        expect(bottleneck.dropOffRate).toBeGreaterThan(0.2);
        expect(bottleneck.recommendations).toBeInstanceOf(Array);
      });
    });

    it('should A/B test messaging variations', async () => {
      const test = await service.runABTest({
        variations: [
          { message: 'Save $45K in lost referrals' },
          { message: 'Increase revenue by 30%' }
        ],
        audience: 'psychiatry',
        metric: 'conversion_rate'
      });
      
      expect(test.winner).toBeDefined();
      expect(test.confidence).toBeGreaterThan(0.95);
      expect(test.lift).toBeGreaterThan(0);
    });

    it('should predict deal velocity', async () => {
      const velocity = await service.predictDealVelocity(mockLeadData);
      
      expect(velocity.expectedDays).toBeGreaterThan(0);
      expect(velocity.expectedDays).toBeLessThan(90);
      expect(velocity.accelerators).toBeInstanceOf(Array);
      expect(velocity.blockers).toBeInstanceOf(Array);
    });
  });

  describe('Revenue Forecasting', () => {
    it('should forecast pipeline revenue', async () => {
      const forecast = await service.forecastRevenue();
      
      expect(forecast.current_quarter).toBeGreaterThan(0);
      expect(forecast.next_quarter).toBeGreaterThan(0);
      expect(forecast.confidence_interval).toBeDefined();
      expect(forecast.probability).toBeGreaterThan(0.7);
    });

    it('should calculate customer lifetime value', async () => {
      const clv = await service.calculateCLV(mockLeadData);
      
      expect(clv.value).toBeGreaterThan(0);
      expect(clv.months).toBe(36); // 3-year default
      expect(clv.churnRisk).toBeGreaterThanOrEqual(0);
      expect(clv.churnRisk).toBeLessThanOrEqual(1);
    });

    it('should identify upsell opportunities', async () => {
      const customer = {
        ...mockLeadData,
        currentTier: 'professional',
        monthsActive: 6,
        usage: { activeUsers: 5, apiCalls: 10000 }
      };
      
      const opportunities = await service.identifyUpsellOpportunities(customer);
      
      expect(opportunities).toBeInstanceOf(Array);
      expect(opportunities[0].tier).toBe('practice');
      expect(opportunities[0].probability).toBeGreaterThan(0.5);
      expect(opportunities[0].additionalRevenue).toBeGreaterThan(0);
    });
  });

  describe('Competitive Intelligence', () => {
    it('should analyze competitive positioning', async () => {
      const analysis = await service.analyzeCompetitivePosition(mockLeadData);
      
      expect(analysis.strengths).toBeInstanceOf(Array);
      expect(analysis.differentiators).toContain('crisis_detection_250ms');
      expect(analysis.objectionHandling).toBeDefined();
      expect(analysis.winThemes).toBeInstanceOf(Array);
    });

    it('should generate competitive battle cards', async () => {
      const battleCard = await service.generateBattleCard('competitor_x');
      
      expect(battleCard.ourAdvantages).toBeInstanceOf(Array);
      expect(battleCard.theirWeaknesses).toBeInstanceOf(Array);
      expect(battleCard.talkingPoints).toBeInstanceOf(Array);
      expect(battleCard.proofPoints).toBeInstanceOf(Array);
    });
  });

  describe('Performance Analytics', () => {
    it('should track sales team performance', async () => {
      const performance = await service.getTeamPerformance();
      
      expect(performance.conversionRate).toBeGreaterThan(0);
      expect(performance.avgDealSize).toBeGreaterThan(0);
      expect(performance.avgSalesCycle).toBeGreaterThan(0);
      expect(performance.topPerformers).toBeInstanceOf(Array);
    });

    it('should identify best practices from top performers', async () => {
      const practices = await service.analyzeBestPractices();
      
      expect(practices).toBeInstanceOf(Array);
      practices.forEach(practice => {
        expect(practice.impact).toBeGreaterThan(0);
        expect(practice.adoption).toBeGreaterThanOrEqual(0);
        expect(practice.adoption).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Integration Points', () => {
    it('should integrate with CRM systems', async () => {
      const integration = await service.syncWithCRM(mockLeadData);
      
      expect(integration.success).toBe(true);
      expect(integration.crmId).toBeDefined();
      expect(integration.lastSync).toBeInstanceOf(Date);
    });

    it('should export leads for marketing automation', async () => {
      const leads = [mockLeadData];
      const exportResult = await service.exportToMarketingAutomation(leads);
      
      expect(exportResult.success).toBe(true);
      expect(exportResult.count).toBe(1);
      expect(exportResult.format).toBe('csv');
    });
  });
});