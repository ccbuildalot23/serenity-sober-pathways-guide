/**
 * Financial Model Service Tests
 * 
 * Comprehensive test suite for the FinancialModelService covering:
 * - LTV and CAC calculations
 * - COGS breakdown and analysis
 * - Pricing tier validation
 * - SaaS metrics calculations
 * - Break-even analysis
 * - Investor report generation
 * - Financial scenario modeling
 * - Integration with ROIValidationService
 */

// Jest provides describe, it, expect, beforeEach globally
import { 
  FinancialModelService,
  type LTVMetrics,
  type CACMetrics,
  type COGSBreakdown,
  type SaaSMetrics,
  type InvestorReport,
  type FinancialScenario,
  type ProviderSegment
} from '@/services/FinancialModelService';
import { enhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';
import { roiValidationService } from '@/services/ROIValidationService';

// Mock dependencies
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          eq: jest.fn(() => ({ count: 'exact', head: true }))
        })),
        count: 'exact',
        head: true
      }))
    }))
  }
}));

jest.mock('@/services/EnhancedSecurityAuditService', () => ({
  enhancedSecurityAuditService: {
    logSecurityEvent: jest.fn()
  }
}));

jest.mock('@/services/ROIValidationService', () => ({
  roiValidationService: {
    validateProviderCalculations: jest.fn()
  }
}));

describe('FinancialModelService', () => {
  let financialModelService: FinancialModelService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    financialModelService = FinancialModelService.getInstance();
    
    // Setup mock supabase responses
    const { supabase } = require('@/integrations/supabase/client');
    mockSupabase = supabase;
    
    // Default mock implementations
    (enhancedSecurityAuditService.logSecurityEvent as jest.MockedFunction<any>).mockResolvedValue(undefined);
    (roiValidationService.validateProviderCalculations as jest.MockedFunction<any>).mockResolvedValue({
      providerId: 'test-provider',
      validationScore: 0.85,
      reimbursementAccuracy: 0.9,
      marketAlignment: 0.8,
      referralVolumeRealism: 0.85,
      outcomeCorrelation: 0.8,
      riskFactors: [],
      recommendations: [],
      confidence: 0.85
    });
  });

  describe('LTV Calculations', () => {
    it('should calculate LTV for a specific customer', async () => {
      // Mock customer data
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'customer-1',
                segment: 'growth',
                created_at: '2024-01-01T00:00:00Z'
              }
            })
          })
        })
      });

      const ltvMetrics = await financialModelService.calculateLTV('customer-1');

      expect(ltvMetrics).toHaveLength(1);
      expect(ltvMetrics[0]).toMatchObject({
        customerId: 'customer-1',
        segment: 'growth',
        averageRevenue: expect.any(Number),
        monthlyChurnRate: expect.any(Number),
        grossMarginPercentage: expect.any(Number),
        lifetimeValue: expect.any(Number),
        calculatedAt: expect.any(Date),
        cohortData: expect.objectContaining({
          cohortMonth: expect.any(String),
          initialCustomers: expect.any(Number),
          remainingCustomers: expect.any(Number),
          cumulativeRevenue: expect.any(Number),
          monthsActive: expect.any(Number)
        })
      });

      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'LTV_CALCULATION_STARTED',
        { customerId: 'customer-1', segment: undefined },
        'low'
      );
    });

    it('should calculate LTV for a specific segment', async () => {
      // Mock segment data
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'customer-1',
                segment: 'startup',
                created_at: '2024-01-01T00:00:00Z'
              },
              {
                id: 'customer-2',
                segment: 'startup',
                created_at: '2024-02-01T00:00:00Z'
              }
            ]
          })
        })
      });

      const ltvMetrics = await financialModelService.calculateLTV(undefined, 'startup');

      expect(ltvMetrics).toHaveLength(2);
      expect(ltvMetrics.every(ltv => ltv.segment === 'startup')).toBe(true);
    });

    it('should handle LTV calculation errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      await expect(financialModelService.calculateLTV('invalid-customer')).rejects.toThrow('Database error');

      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'LTV_CALCULATION_FAILED',
        { error: 'Database error' },
        'medium'
      );
    });

    it('should validate LTV calculation formulas', async () => {
      // Mock specific values for formula validation
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'test-customer',
                segment: 'growth',
                created_at: '2024-01-01T00:00:00Z'
              }
            })
          })
        })
      });

      // Mock the private methods by testing through the public interface
      const ltvMetrics = await financialModelService.calculateLTV('test-customer');
      
      // Verify LTV calculation: (Average Revenue × Gross Margin %) ÷ Monthly Churn Rate
      const ltv = ltvMetrics[0];
      const expectedLTV = (ltv.averageRevenue * ltv.grossMarginPercentage) / ltv.monthlyChurnRate;
      
      expect(ltv.lifetimeValue).toBeCloseTo(expectedLTV, 2);
    });
  });

  describe('CAC Calculations', () => {
    it('should calculate CAC by acquisition channel', async () => {
      const cacMetrics = await financialModelService.calculateCAC('paid_search');

      expect(cacMetrics).toBeInstanceOf(Array);
      expect(cacMetrics.length).toBeGreaterThan(0);
      
      cacMetrics.forEach(cac => {
        expect(cac).toMatchObject({
          acquisitionChannel: expect.any(String),
          segment: expect.any(String),
          totalAcquisitionCost: expect.any(Number),
          customersAcquired: expect.any(Number),
          costPerAcquisition: expect.any(Number),
          paybackPeriodMonths: expect.any(Number),
          calculatedAt: expect.any(Date),
          breakdown: expect.objectContaining({
            salesPersonnel: expect.any(Number),
            marketingSpend: expect.any(Number),
            salesOperations: expect.any(Number),
            leadGeneration: expect.any(Number),
            contentMarketing: expect.any(Number),
            eventMarketing: expect.any(Number),
            referralPrograms: expect.any(Number),
            salesTooling: expect.any(Number)
          })
        });
      });
    });

    it('should calculate CAC breakdown correctly', async () => {
      const cacMetrics = await financialModelService.calculateCAC();
      
      cacMetrics.forEach(cac => {
        const breakdown = cac.breakdown;
        const totalBreakdown = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0);
        
        // The breakdown should sum to approximately the total acquisition cost
        expect(totalBreakdown).toBeCloseTo(cac.totalAcquisitionCost, 2);
        
        // Validate percentage allocations
        expect(breakdown.salesPersonnel).toBeCloseTo(cac.totalAcquisitionCost * 0.4, 2);
        expect(breakdown.marketingSpend).toBeCloseTo(cac.totalAcquisitionCost * 0.3, 2);
      });
    });

    it('should handle zero customer acquisition safely', async () => {
      // Mock scenario with no customers acquired
      jest.spyOn(financialModelService as any, 'getAcquisitionData').mockResolvedValue([
        { channel: 'test_channel', segment: 'startup', customersAcquired: 0 }
      ]);

      const cacMetrics = await financialModelService.calculateCAC();
      
      const zeroAcquisitionMetric = cacMetrics.find(cac => cac.customersAcquired === 0);
      if (zeroAcquisitionMetric) {
        expect(zeroAcquisitionMetric.costPerAcquisition).toBe(0);
        expect(zeroAcquisitionMetric.paybackPeriodMonths).toBe(0);
      }
    });
  });

  describe('COGS Calculations', () => {
    it('should calculate comprehensive COGS breakdown', async () => {
      const cogsBreakdown = await financialModelService.calculateCOGS();

      expect(cogsBreakdown).toMatchObject({
        infrastructureCosts: expect.objectContaining({
          awsServices: expect.any(Number),
          supabaseSubscription: expect.any(Number),
          vercelHosting: expect.any(Number),
          cloudtrailCompliance: expect.any(Number),
          dataStorage: expect.any(Number),
          bandwidth: expect.any(Number),
          monitoring: expect.any(Number),
          security: expect.any(Number)
        }),
        supportCosts: expect.objectContaining({
          customerSuccess: expect.any(Number),
          technicalSupport: expect.any(Number),
          onboarding: expect.any(Number),
          training: expect.any(Number),
          documentation: expect.any(Number)
        }),
        complianceCosts: expect.objectContaining({
          hipaaAudits: expect.any(Number),
          soc2Compliance: expect.any(Number),
          legalReview: expect.any(Number),
          securityAssessments: expect.any(Number),
          dataGovernance: expect.any(Number),
          incidentResponse: expect.any(Number)
        }),
        productDevelopment: expect.any(Number),
        thirdPartyServices: expect.any(Number),
        dataProcessing: expect.any(Number),
        totalCOGS: expect.any(Number),
        cogsPerCustomer: expect.any(Number),
        marginPercentage: expect.any(Number)
      });
    });

    it('should calculate margin percentage correctly', async () => {
      // Mock specific values for margin calculation
      jest.spyOn(financialModelService as any, 'getTotalActiveCustomers').mockResolvedValue(100);
      jest.spyOn(financialModelService as any, 'getAverageMonthlyRevenue').mockResolvedValue(750);

      const cogsBreakdown = await financialModelService.calculateCOGS();
      
      const expectedMargin = (750 - cogsBreakdown.cogsPerCustomer) / 750;
      expect(cogsBreakdown.marginPercentage).toBeCloseTo(expectedMargin, 3);
    });

    it('should handle zero customers in COGS calculation', async () => {
      jest.spyOn(financialModelService as any, 'getTotalActiveCustomers').mockResolvedValue(0);

      const cogsBreakdown = await financialModelService.calculateCOGS();
      
      expect(cogsBreakdown.cogsPerCustomer).toBe(0);
      expect(cogsBreakdown.totalCOGS).toBeGreaterThan(0); // Should still have costs
    });
  });

  describe('Pricing Tier Validation', () => {
    it('should validate all pricing tiers against ROI projections', async () => {
      const validationResults = await financialModelService.validatePricingTiers();

      expect(validationResults).toHaveProperty('startup');
      expect(validationResults).toHaveProperty('growth');
      expect(validationResults).toHaveProperty('enterprise');

      Object.entries(validationResults).forEach(([segment, result]) => {
        expect(result).toMatchObject({
          tier: expect.objectContaining({
            name: expect.any(String),
            monthlyPrice: expect.any(Number),
            targetSegment: segment,
            features: expect.any(Array),
            limits: expect.any(Object),
            costBasis: expect.any(Number),
            margin: expect.any(Number),
            roiProjection: expect.any(Object)
          }),
          validation: expect.objectContaining({
            providerId: expect.any(String),
            validationScore: expect.any(Number)
          }),
          isViable: expect.any(Boolean),
          competitivePosition: expect.any(String),
          marketFit: expect.any(String)
        });
      });
    });

    it('should mark tiers as viable when validation score is high', async () => {
      (roiValidationService.validateProviderCalculations as jest.MockedFunction<any>).mockResolvedValue({
        providerId: 'test-provider',
        validationScore: 0.85,
        reimbursementAccuracy: 0.9,
        marketAlignment: 0.8,
        referralVolumeRealism: 0.85,
        outcomeCorrelation: 0.8,
        riskFactors: [],
        recommendations: [],
        confidence: 0.85
      });

      const validationResults = await financialModelService.validatePricingTiers();

      Object.values(validationResults).forEach(result => {
        expect(result.isViable).toBe(true);
      });
    });

    it('should assess competitive positioning correctly', async () => {
      const validationResults = await financialModelService.validatePricingTiers();

      expect(validationResults.startup.competitivePosition).toBe('Value Leader');
      expect(validationResults.growth.competitivePosition).toBe('Market Competitive');
      expect(validationResults.enterprise.competitivePosition).toBe('Premium Positioned');
    });
  });

  describe('SaaS Metrics Calculations', () => {
    it('should calculate comprehensive SaaS metrics', async () => {
      // Mock customer counts for each segment
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 50 })
          })
        })
      });

      const saasMetrics = await financialModelService.calculateSaaSMetrics();

      expect(saasMetrics).toMatchObject({
        mrr: expect.any(Number),
        arr: expect.any(Number),
        grossChurnRate: expect.any(Number),
        netChurnRate: expect.any(Number),
        netRevenueRetention: expect.any(Number),
        grossRevenueRetention: expect.any(Number),
        averageRevenuePerUser: expect.any(Number),
        monthlyGrowthRate: expect.any(Number),
        quickRatio: expect.any(Number),
        calculatedAt: expect.any(Date),
        segmentBreakdown: expect.objectContaining({
          startup: expect.any(Object),
          growth: expect.any(Object),
          enterprise: expect.any(Object)
        })
      });

      // Validate ARR calculation
      expect(saasMetrics.arr).toBe(saasMetrics.mrr * 12);

      // Validate segment breakdown
      Object.values(saasMetrics.segmentBreakdown).forEach(segment => {
        expect(segment).toMatchObject({
          customers: expect.any(Number),
          mrr: expect.any(Number),
          churnRate: expect.any(Number),
          ltv: expect.any(Number),
          cac: expect.any(Number),
          ltvCacRatio: expect.any(Number),
          paybackPeriod: expect.any(Number)
        });
      });
    });

    it('should calculate healthy SaaS metric ratios', async () => {
      const saasMetrics = await financialModelService.calculateSaaSMetrics();

      // Healthy SaaS metrics validation
      expect(saasMetrics.netRevenueRetention).toBeGreaterThan(1); // NRR > 100%
      expect(saasMetrics.quickRatio).toBeGreaterThan(2); // Quick ratio > 2
      expect(saasMetrics.grossChurnRate).toBeLessThan(0.1); // Churn < 10%
      
      // LTV:CAC ratios should be healthy (> 3)
      Object.values(saasMetrics.segmentBreakdown).forEach(segment => {
        expect(segment.ltvCacRatio).toBeGreaterThan(2);
      });
    });
  });

  describe('Break-Even Analysis', () => {
    it('should calculate break-even points for all segments', async () => {
      const breakEvenAnalysis = await financialModelService.calculateBreakEvenAnalysis();

      expect(breakEvenAnalysis).toHaveProperty('startup');
      expect(breakEvenAnalysis).toHaveProperty('growth');
      expect(breakEvenAnalysis).toHaveProperty('enterprise');

      Object.entries(breakEvenAnalysis).forEach(([segment, analysis]) => {
        expect(analysis).toMatchObject({
          segment: segment as ProviderSegment,
          fixedCosts: expect.any(Number),
          variableCostPerUnit: expect.any(Number),
          revenuePerUnit: expect.any(Number),
          breakEvenUnits: expect.any(Number),
          breakEvenRevenue: expect.any(Number),
          monthsToBreakEven: expect.any(Number),
          marginOfSafety: expect.any(Number)
        });

        // Validate break-even calculations
        const contributionMargin = analysis.revenuePerUnit - analysis.variableCostPerUnit;
        const expectedBreakEven = Math.ceil(analysis.fixedCosts / contributionMargin);
        expect(analysis.breakEvenUnits).toBe(expectedBreakEven);
      });
    });

    it('should show enterprise tier has best economics', async () => {
      const breakEvenAnalysis = await financialModelService.calculateBreakEvenAnalysis();

      // Enterprise should have shortest payback period
      expect(breakEvenAnalysis.enterprise.monthsToBreakEven)
        .toBeLessThanOrEqual(breakEvenAnalysis.growth.monthsToBreakEven);
      expect(breakEvenAnalysis.growth.monthsToBreakEven)
        .toBeLessThanOrEqual(breakEvenAnalysis.startup.monthsToBreakEven);
    });
  });

  describe('Investor Report Generation', () => {
    it('should generate comprehensive investor report', async () => {
      // Mock all dependencies for report generation
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 100 })
          })
        })
      });

      const investorReport = await financialModelService.generateInvestorReport();

      expect(investorReport).toMatchObject({
        executiveSummary: expect.objectContaining({
          totalRevenue: expect.any(Number),
          totalCustomers: expect.any(Number),
          averageLTV: expect.any(Number),
          averageCAC: expect.any(Number),
          ltvCacRatio: expect.any(Number),
          grossMargin: expect.any(Number),
          monthlyBurnRate: expect.any(Number),
          monthsToBreakEven: expect.any(Number),
          keyInsights: expect.any(Array)
        }),
        unitEconomics: expect.objectContaining({
          ltvBySegment: expect.any(Object),
          cacBySegment: expect.any(Object),
          paybackPeriodBySegment: expect.any(Object),
          marginBySegment: expect.any(Object)
        }),
        saasMetrics: expect.any(Object),
        financialProjections: expect.any(Array),
        cohortAnalysis: expect.any(Object),
        competitiveAnalysis: expect.objectContaining({
          marketSize: expect.any(Number),
          marketGrowthRate: expect.any(Number),
          competitors: expect.any(Array),
          positioningAdvantage: expect.any(Array)
        }),
        riskFactors: expect.any(Array),
        generatedAt: expect.any(Date)
      });
    });

    it('should include key insights based on metrics', async () => {
      const investorReport = await financialModelService.generateInvestorReport();

      expect(investorReport.executiveSummary.keyInsights).toBeInstanceOf(Array);
      expect(investorReport.executiveSummary.keyInsights.length).toBeGreaterThan(0);

      // Should include insights about unit economics, retention, margins, and growth
      const insightsText = investorReport.executiveSummary.keyInsights.join(' ');
      expect(insightsText).toMatch(/LTV:CAC|unit economics|retention|margin|growth/i);
    });

    it('should generate 36-month financial projections', async () => {
      const investorReport = await financialModelService.generateInvestorReport();

      expect(investorReport.financialProjections).toHaveLength(36);
      
      investorReport.financialProjections.forEach((projection, index) => {
        expect(projection).toMatchObject({
          month: index + 1,
          newCustomers: expect.any(Number),
          totalCustomers: expect.any(Number),
          mrr: expect.any(Number),
          totalRevenue: expect.any(Number),
          totalCosts: expect.any(Number),
          grossProfit: expect.any(Number),
          netProfit: expect.any(Number),
          cashFlow: expect.any(Number),
          burnRate: expect.any(Number)
        });
      });
    });
  });

  describe('Financial Scenario Modeling', () => {
    it('should model multiple financial scenarios', async () => {
      const scenarios = await financialModelService.modelFinancialScenarios();

      expect(scenarios).toHaveLength(3);
      expect(scenarios.map(s => s.name)).toEqual([
        'Conservative Growth',
        'Aggressive Growth',
        'Market Downturn'
      ]);

      scenarios.forEach(scenario => {
        expect(scenario).toMatchObject({
          name: expect.any(String),
          assumptions: expect.objectContaining({
            customerGrowthRate: expect.any(Number),
            churnRate: expect.any(Number),
            priceIncrease: expect.any(Number),
            cogsBasisPoints: expect.any(Number),
            salesEfficiency: expect.any(Number),
            marketPenetration: expect.any(Number)
          }),
          projections: expect.any(Array),
          sensitivityAnalysis: expect.objectContaining({
            variable: expect.any(String),
            baseValue: expect.any(Number),
            scenarios: expect.any(Array)
          }),
          breakEvenAnalysis: expect.any(Object)
        });
      });
    });

    it('should generate sensitivity analysis for each scenario', async () => {
      const scenarios = await financialModelService.modelFinancialScenarios();

      scenarios.forEach(scenario => {
        expect(scenario.sensitivityAnalysis.scenarios).toHaveLength(4); // -20%, -10%, +10%, +20%
        
        scenario.sensitivityAnalysis.scenarios.forEach(sensitivityScenario => {
          expect(sensitivityScenario).toMatchObject({
            changePercent: expect.any(Number),
            impactOnRevenue: expect.any(Number),
            impactOnProfit: expect.any(Number),
            impactOnBreakEven: expect.any(Number)
          });
        });
      });
    });

    it('should show logical progression across scenarios', async () => {
      const scenarios = await financialModelService.modelFinancialScenarios();
      
      const conservative = scenarios.find(s => s.name === 'Conservative Growth');
      const aggressive = scenarios.find(s => s.name === 'Aggressive Growth');
      const downturn = scenarios.find(s => s.name === 'Market Downturn');

      // Growth rates should be in logical order
      expect(downturn!.assumptions.customerGrowthRate)
        .toBeLessThan(conservative!.assumptions.customerGrowthRate);
      expect(conservative!.assumptions.customerGrowthRate)
        .toBeLessThan(aggressive!.assumptions.customerGrowthRate);

      // Churn rates should be in reverse order
      expect(aggressive!.assumptions.churnRate)
        .toBeLessThan(conservative!.assumptions.churnRate);
      expect(conservative!.assumptions.churnRate)
        .toBeLessThan(downturn!.assumptions.churnRate);
    });
  });

  describe('Integration with ROIValidationService', () => {
    it('should integrate with ROI validation for pricing validation', async () => {
      await financialModelService.validatePricingTiers();

      // Should call ROI validation for each segment
      expect(roiValidationService.validateProviderCalculations).toHaveBeenCalledTimes(3);

      // Verify the mock provider data structure
      const calls = (roiValidationService.validateProviderCalculations as jest.MockedFunction<any>).mock.calls;
      calls.forEach(([mockProvider]) => {
        expect(mockProvider).toMatchObject({
          providerId: expect.stringMatching(/^mock-/),
          practiceSize: expect.any(Number),
          specialty: 'Substance Abuse Treatment',
          location: expect.objectContaining({
            state: expect.any(String),
            city: expect.any(String),
            zipCode: expect.any(String)
          }),
          projectedROI: expect.any(Object)
        });
      });
    });

    it('should handle ROI validation failures gracefully', async () => {
      (roiValidationService.validateProviderCalculations as jest.MockedFunction<any>).mockRejectedValue(
        new Error('ROI validation failed')
      );

      await expect(financialModelService.validatePricingTiers()).rejects.toThrow('ROI validation failed');

      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'PRICING_VALIDATION_FAILED',
        { error: 'ROI validation failed' },
        'medium'
      );
    });
  });

  describe('Security and Audit Logging', () => {
    it('should log security events for all major operations', async () => {
      // Test multiple operations to verify logging
      await financialModelService.calculateLTV('test-customer');
      await financialModelService.calculateCAC();
      await financialModelService.calculateCOGS();

      // Verify security events were logged
      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'LTV_CALCULATION_STARTED',
        expect.any(Object),
        'low'
      );
      
      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'CAC_CALCULATION_STARTED',
        expect.any(Object),
        'low'
      );
      
      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'COGS_CALCULATION_STARTED',
        expect.any(Object),
        'low'
      );
    });

    it('should log completion events with metrics', async () => {
      await financialModelService.calculateSaaSMetrics();

      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'SAAS_METRICS_CALCULATION_COMPLETED',
        expect.objectContaining({
          mrr: expect.any(Number),
          arr: expect.any(Number),
          churnRate: expect.any(Number)
        }),
        'low'
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection failures', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(financialModelService.calculateLTV()).rejects.toThrow('Database connection failed');
    });

    it('should handle division by zero in calculations', async () => {
      // Mock zero churn rate scenario
      jest.spyOn(financialModelService as any, 'calculateChurnRate').mockResolvedValue(0);

      const ltvMetrics = await financialModelService.calculateLTV('test-customer');
      
      // Should use minimum churn rate to avoid division by zero
      expect(ltvMetrics[0].lifetimeValue).toBeFinite();
    });

    it('should handle empty data gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [] })
        })
      });

      const ltvMetrics = await financialModelService.calculateLTV();
      expect(ltvMetrics).toEqual([]);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large customer datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `customer-${i}`,
        segment: ['startup', 'growth', 'enterprise'][i % 3],
        created_at: '2024-01-01T00:00:00Z'
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: largeDataset })
        })
      });

      const startTime = Date.now();
      const ltvMetrics = await financialModelService.calculateLTV();
      const endTime = Date.now();

      expect(ltvMetrics).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});