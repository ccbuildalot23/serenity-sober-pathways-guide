/**
 * Financial Model Service Integration Tests
 * 
 * Integration tests that verify the FinancialModelService works correctly
 * with real database connections, external services, and end-to-end workflows.
 */

// Jest provides describe, it, expect, beforeEach, afterEach globally
import { financialModelService } from '@/services/FinancialModelService';
import { roiValidationService } from '@/services/ROIValidationService';
import { supabase } from '@/integrations/supabase/client';

describe('FinancialModelService Integration Tests', () => {
  let testProviderId: string;
  let cleanupIds: string[] = [];

  beforeEach(async () => {
    // Create test provider data
    const { data: provider, error } = await supabase
      .from('providers')
      .insert({
        name: 'Test Financial Provider',
        email: 'test-financial@example.com',
        segment: 'growth',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    testProviderId = provider.id;
    cleanupIds.push(testProviderId);
  });

  afterEach(async () => {
    // Clean up test data
    for (const id of cleanupIds) {
      await supabase.from('providers').delete().eq('id', id);
    }
    cleanupIds = [];
  });

  describe('Real Data Integration', () => {
    it('should calculate LTV with real provider data', async () => {
      const ltvMetrics = await financialModelService.calculateLTV(testProviderId);

      expect(ltvMetrics).toHaveLength(1);
      expect(ltvMetrics[0].customerId).toBe(testProviderId);
      expect(ltvMetrics[0].segment).toBe('growth');
      expect(ltvMetrics[0].lifetimeValue).toBeGreaterThan(0);
      expect(ltvMetrics[0].averageRevenue).toBeGreaterThan(0);
      expect(ltvMetrics[0].monthlyChurnRate).toBeGreaterThan(0);
      expect(ltvMetrics[0].grossMarginPercentage).toBeGreaterThan(0);
      expect(ltvMetrics[0].cohortData).toMatchObject({
        cohortMonth: expect.any(String),
        initialCustomers: expect.any(Number),
        remainingCustomers: expect.any(Number),
        cumulativeRevenue: expect.any(Number),
        monthsActive: expect.any(Number)
      });
    });

    it('should calculate segment metrics for real data', async () => {
      // Create additional test providers for different segments
      const providers = await Promise.all([
        supabase.from('providers').insert({
          name: 'Startup Provider',
          email: 'startup@example.com',
          segment: 'startup',
          is_active: true
        }).select().single(),
        supabase.from('providers').insert({
          name: 'Enterprise Provider',
          email: 'enterprise@example.com',
          segment: 'enterprise',
          is_active: true
        }).select().single()
      ]);

      providers.forEach(({ data }) => {
        if (data) cleanupIds.push(data.id);
      });

      const saasMetrics = await financialModelService.calculateSaaSMetrics();

      expect(saasMetrics.segmentBreakdown.startup.customers).toBeGreaterThanOrEqual(1);
      expect(saasMetrics.segmentBreakdown.growth.customers).toBeGreaterThanOrEqual(1);
      expect(saasMetrics.segmentBreakdown.enterprise.customers).toBeGreaterThanOrEqual(1);

      // Verify each segment has proper metrics
      Object.values(saasMetrics.segmentBreakdown).forEach(segment => {
        expect(segment.mrr).toBeGreaterThanOrEqual(0);
        expect(segment.ltv).toBeGreaterThan(0);
        expect(segment.cac).toBeGreaterThan(0);
        expect(segment.ltvCacRatio).toBeGreaterThan(0);
      });
    });
  });

  describe('ROI Validation Integration', () => {
    it('should integrate with ROI validation service for pricing validation', async () => {
      const validationResults = await financialModelService.validatePricingTiers();

      // Verify all segments were validated
      expect(validationResults).toHaveProperty('startup');
      expect(validationResults).toHaveProperty('growth');
      expect(validationResults).toHaveProperty('enterprise');

      // Verify validation includes real ROI service results
      Object.values(validationResults).forEach(result => {
        expect(result.validation.validationScore).toBeGreaterThan(0);
        expect(result.validation.validationScore).toBeLessThanOrEqual(1);
        expect(result.tier.monthlyPrice).toBeGreaterThan(0);
        expect(result.tier.margin).toBeGreaterThan(0);
        expect(result.tier.margin).toBeLessThanOrEqual(1);
      });
    });

    it('should validate pricing against real market data', async () => {
      const validationResults = await financialModelService.validatePricingTiers();

      // Verify pricing tiers are within market expectations
      expect(validationResults.startup.tier.monthlyPrice).toBe(299);
      expect(validationResults.growth.tier.monthlyPrice).toBe(599);
      expect(validationResults.enterprise.tier.monthlyPrice).toBe(1999);

      // Verify competitive positioning makes sense
      expect(validationResults.startup.competitivePosition).toBe('Value Leader');
      expect(validationResults.enterprise.competitivePosition).toBe('Premium Positioned');

      // Verify market fit assessments
      expect(['Strong Market Fit', 'Good Market Fit', 'Developing Market Fit']).toContain(
        validationResults.growth.marketFit
      );
    });
  });

  describe('End-to-End Investor Report', () => {
    it('should generate complete investor report with real data', async () => {
      const investorReport = await financialModelService.generateInvestorReport();

      // Verify executive summary has realistic numbers
      expect(investorReport.executiveSummary.totalCustomers).toBeGreaterThanOrEqual(1);
      expect(investorReport.executiveSummary.totalRevenue).toBeGreaterThan(0);
      expect(investorReport.executiveSummary.averageLTV).toBeGreaterThan(0);
      expect(investorReport.executiveSummary.averageCAC).toBeGreaterThan(0);
      expect(investorReport.executiveSummary.ltvCacRatio).toBeGreaterThan(1);

      // Verify unit economics are properly calculated
      expect(investorReport.unitEconomics.ltvBySegment.startup).toBeGreaterThan(0);
      expect(investorReport.unitEconomics.ltvBySegment.growth).toBeGreaterThan(0);
      expect(investorReport.unitEconomics.ltvBySegment.enterprise).toBeGreaterThan(0);

      // Verify SaaS metrics are healthy
      expect(investorReport.saasMetrics.mrr).toBeGreaterThan(0);
      expect(investorReport.saasMetrics.arr).toBe(investorReport.saasMetrics.mrr * 12);
      expect(investorReport.saasMetrics.grossChurnRate).toBeLessThan(0.2); // Less than 20%
      expect(investorReport.saasMetrics.netRevenueRetention).toBeGreaterThan(0.8); // Greater than 80%

      // Verify financial projections are realistic
      expect(investorReport.financialProjections).toHaveLength(36);
      expect(investorReport.financialProjections[0].totalCustomers).toBeGreaterThanOrEqual(1);
      expect(investorReport.financialProjections[35].totalCustomers).toBeGreaterThan(
        investorReport.financialProjections[0].totalCustomers
      );

      // Verify competitive analysis has market data
      expect(investorReport.competitiveAnalysis.marketSize).toBeGreaterThan(1000000); // > $1M market
      expect(investorReport.competitiveAnalysis.competitors.length).toBeGreaterThan(0);
      expect(investorReport.competitiveAnalysis.positioningAdvantage.length).toBeGreaterThan(0);

      // Verify risk factors are identified
      expect(investorReport.riskFactors.length).toBeGreaterThan(0);
      investorReport.riskFactors.forEach(risk => {
        expect(['market', 'competitive', 'regulatory', 'operational', 'financial']).toContain(risk.category);
        expect(['low', 'medium', 'high']).toContain(risk.impact);
        expect(risk.probability).toBeGreaterThan(0);
        expect(risk.probability).toBeLessThanOrEqual(1);
      });
    });

    it('should generate realistic financial projections', async () => {
      const investorReport = await financialModelService.generateInvestorReport();
      const projections = investorReport.financialProjections;

      // Verify growth trajectory is realistic
      for (let i = 1; i < projections.length; i++) {
        const currentMonth = projections[i];
        const previousMonth = projections[i - 1];

        // Customer growth should be positive but declining rate
        expect(currentMonth.totalCustomers).toBeGreaterThanOrEqual(previousMonth.totalCustomers);
        
        // Revenue should generally increase with customers
        if (currentMonth.totalCustomers > previousMonth.totalCustomers) {
          expect(currentMonth.mrr).toBeGreaterThan(previousMonth.mrr * 0.95); // Allow small fluctuations
        }

        // Burn rate should eventually decrease as efficiency improves
        expect(currentMonth.burnRate).toBeGreaterThan(0);
      }

      // Verify break-even is achieved within projection period
      const breakEvenMonth = projections.find(p => p.netProfit > 0);
      expect(breakEvenMonth).toBeDefined();
      expect(breakEvenMonth!.month).toBeLessThan(36); // Should break even within 3 years
    });
  });

  describe('Financial Scenario Modeling', () => {
    it('should model realistic financial scenarios', async () => {
      const scenarios = await financialModelService.modelFinancialScenarios();

      expect(scenarios).toHaveLength(3);

      scenarios.forEach(scenario => {
        // Verify projections are logical
        expect(scenario.projections.length).toBeGreaterThan(0);
        expect(scenario.projections[0].totalCustomers).toBeGreaterThan(0);
        
        // Verify assumptions are within reasonable ranges
        expect(scenario.assumptions.customerGrowthRate).toBeGreaterThan(0);
        expect(scenario.assumptions.customerGrowthRate).toBeLessThan(1); // Less than 100% monthly
        expect(scenario.assumptions.churnRate).toBeGreaterThan(0);
        expect(scenario.assumptions.churnRate).toBeLessThan(0.5); // Less than 50% monthly
        
        // Verify sensitivity analysis
        expect(scenario.sensitivityAnalysis.scenarios).toHaveLength(4);
        scenario.sensitivityAnalysis.scenarios.forEach(sensitivityScenario => {
          expect(sensitivityScenario.changePercent).toBeGreaterThan(-1);
          expect(sensitivityScenario.changePercent).toBeLessThan(1);
        });
      });

      // Verify scenarios show different outcomes
      const conservativeRevenue = scenarios[0].projections[11].totalRevenue; // Month 12
      const aggressiveRevenue = scenarios[1].projections[11].totalRevenue;
      const downturnRevenue = scenarios[2].projections[11].totalRevenue;

      expect(aggressiveRevenue).toBeGreaterThan(conservativeRevenue);
      expect(conservativeRevenue).toBeGreaterThan(downturnRevenue);
    });
  });

  describe('COGS and Break-Even Analysis', () => {
    it('should calculate realistic COGS breakdown', async () => {
      const cogsBreakdown = await financialModelService.calculateCOGS();

      // Verify all cost categories are present and reasonable
      expect(cogsBreakdown.infrastructureCosts.awsServices).toBeGreaterThan(0);
      expect(cogsBreakdown.infrastructureCosts.supabaseSubscription).toBeGreaterThan(0);
      expect(cogsBreakdown.supportCosts.customerSuccess).toBeGreaterThan(0);
      expect(cogsBreakdown.complianceCosts.hipaaAudits).toBeGreaterThan(0);

      // Verify total COGS calculation
      const expectedTotal = 
        Object.values(cogsBreakdown.infrastructureCosts).reduce((sum, cost) => sum + cost, 0) +
        Object.values(cogsBreakdown.supportCosts).reduce((sum, cost) => sum + cost, 0) +
        Object.values(cogsBreakdown.complianceCosts).reduce((sum, cost) => sum + cost, 0) +
        cogsBreakdown.productDevelopment +
        cogsBreakdown.thirdPartyServices +
        cogsBreakdown.dataProcessing;

      expect(cogsBreakdown.totalCOGS).toBeCloseTo(expectedTotal, 2);

      // Verify margin percentage is healthy
      expect(cogsBreakdown.marginPercentage).toBeGreaterThan(0.6); // > 60% margin
      expect(cogsBreakdown.marginPercentage).toBeLessThan(1); // < 100%
    });

    it('should calculate achievable break-even points', async () => {
      const breakEvenAnalysis = await financialModelService.calculateBreakEvenAnalysis();

      Object.entries(breakEvenAnalysis).forEach(([segment, analysis]) => {
        // Verify break-even units are realistic
        expect(analysis.breakEvenUnits).toBeGreaterThan(0);
        expect(analysis.breakEvenUnits).toBeLessThan(10000); // Reasonable scale

        // Verify months to break-even is achievable
        expect(analysis.monthsToBreakEven).toBeGreaterThan(0);
        expect(analysis.monthsToBreakEven).toBeLessThan(48); // Within 4 years

        // Verify revenue calculations
        expect(analysis.breakEvenRevenue).toBe(
          analysis.breakEvenUnits * analysis.revenuePerUnit
        );

        // Verify contribution margin is positive
        const contributionMargin = analysis.revenuePerUnit - analysis.variableCostPerUnit;
        expect(contributionMargin).toBeGreaterThan(0);
      });

      // Verify enterprise tier has best break-even metrics
      expect(breakEvenAnalysis.enterprise.monthsToBreakEven)
        .toBeLessThanOrEqual(breakEvenAnalysis.growth.monthsToBreakEven);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle real database queries efficiently', async () => {
      const startTime = Date.now();
      
      // Run multiple operations in parallel
      await Promise.all([
        financialModelService.calculateLTV(),
        financialModelService.calculateCAC(),
        financialModelService.calculateSaaSMetrics(),
        financialModelService.calculateCOGS()
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(10000); // 10 seconds
    });

    it('should cache results appropriately', async () => {
      // First calculation
      const startTime1 = Date.now();
      const firstResult = await financialModelService.calculateSaaSMetrics();
      const endTime1 = Date.now();

      // Second calculation (should be similar but may have slight variations)
      const startTime2 = Date.now();
      const secondResult = await financialModelService.calculateSaaSMetrics();
      const endTime2 = Date.now();

      // Results should be consistent
      expect(secondResult.mrr).toBeCloseTo(firstResult.mrr, 0);
      expect(secondResult.segmentBreakdown.startup.customers)
        .toBe(firstResult.segmentBreakdown.startup.customers);

      // Second calculation might be faster due to caching or similar performance
      expect(endTime2 - startTime2).toBeLessThanOrEqual((endTime1 - startTime1) * 2);
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain data consistency across calculations', async () => {
      const [ltvMetrics, saasMetrics, investorReport] = await Promise.all([
        financialModelService.calculateLTV(),
        financialModelService.calculateSaaSMetrics(),
        financialModelService.generateInvestorReport()
      ]);

      // Customer counts should be consistent
      const ltvCustomerCount = ltvMetrics.length;
      const saasCustomerCount = Object.values(saasMetrics.segmentBreakdown)
        .reduce((sum, segment) => sum + segment.customers, 0);
      const reportCustomerCount = investorReport.executiveSummary.totalCustomers;

      expect(saasCustomerCount).toBeCloseTo(reportCustomerCount, 0);
      
      // Revenue calculations should be consistent
      expect(investorReport.saasMetrics.mrr).toBe(saasMetrics.mrr);
      expect(investorReport.saasMetrics.arr).toBe(saasMetrics.arr);
    });

    it('should validate business logic constraints', async () => {
      const investorReport = await financialModelService.generateInvestorReport();

      // LTV should be greater than CAC
      expect(investorReport.executiveSummary.ltvCacRatio).toBeGreaterThan(1);

      // Revenue retention should be logical
      expect(investorReport.saasMetrics.grossRevenueRetention).toBeLessThanOrEqual(1);
      expect(investorReport.saasMetrics.netRevenueRetention).toBeGreaterThan(0);

      // Growth rates should be reasonable
      expect(investorReport.saasMetrics.monthlyGrowthRate).toBeGreaterThan(-0.5); // Not shrinking more than 50%
      expect(investorReport.saasMetrics.monthlyGrowthRate).toBeLessThan(2); // Not growing more than 200%
    });
  });
});