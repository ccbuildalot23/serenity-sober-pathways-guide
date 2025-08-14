/**
 * Unit tests for ROIValidationService
 * Tests provider economics validation and CMS data cross-referencing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ROIValidationService } from '@/services/ROIValidationService';

describe('ROIValidationService', () => {
  let service: ROIValidationService;
  
  const mockProviderData = {
    providerId: 'provider-123',
    npi: '1234567890',
    specialty: 'psychiatry',
    patientVolume: 200,
    averageReimbursement: 125,
    referralLossRate: 0.15,
    state: 'CA'
  };

  beforeEach(() => {
    service = new ROIValidationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Economics Validation', () => {
    it('should validate provider referral loss calculations', async () => {
      const economics = {
        annualReferrals: 100,
        averageReferralValue: 1350,
        referralLossRate: 0.15,
        estimatedLoss: 20250
      };

      const result = await service.validateProviderCalculations(economics);
      
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.adjustedLoss).toBeCloseTo(20250, 0);
    });

    it('should detect inflated referral loss estimates', async () => {
      const economics = {
        annualReferrals: 100,
        averageReferralValue: 5000, // Inflated value
        referralLossRate: 0.5, // Unrealistic loss rate
        estimatedLoss: 250000
      };

      const result = await service.validateProviderCalculations(economics);
      
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Referral value exceeds typical range');
      expect(result.adjustedLoss).toBeLessThan(economics.estimatedLoss);
    });

    it('should validate $45K-$135K referral loss range', async () => {
      const validCases = [45000, 90000, 135000];
      
      for (const lossAmount of validCases) {
        const result = await service.validateReferralLossRange(lossAmount);
        expect(result.inRange).toBe(true);
        expect(result.percentile).toBeGreaterThanOrEqual(25);
        expect(result.percentile).toBeLessThanOrEqual(75);
      }
    });

    it('should flag outlier referral losses', async () => {
      const outlierCases = [5000, 500000];
      
      for (const lossAmount of outlierCases) {
        const result = await service.validateReferralLossRange(lossAmount);
        expect(result.inRange).toBe(false);
        expect(result.recommendation).toBeDefined();
      }
    });
  });

  describe('CMS Data Cross-Reference', () => {
    it('should retrieve CMS reimbursement rates', async () => {
      const cptCode = '90837'; // 60-minute psychotherapy
      const result = await service.getCMSReimbursementRate(cptCode, 'CA');
      
      expect(result).toBeDefined();
      expect(result.nationalRate).toBeGreaterThan(100);
      expect(result.localRate).toBeGreaterThan(100);
      expect(result.geographicAdjustment).toBeDefined();
    });

    it('should validate billing code combinations', async () => {
      const billingData = {
        primaryCode: '90837',
        modifiers: ['95'], // Telehealth
        diagnosis: 'F41.1' // Generalized anxiety
      };

      const result = await service.validateBillingCombination(billingData);
      
      expect(result.isValid).toBe(true);
      expect(result.estimatedReimbursement).toBeGreaterThan(0);
      expect(result.complianceNotes).toBeInstanceOf(Array);
    });

    it('should cross-reference provider specialty rates', async () => {
      const result = await service.getSpecialtyBenchmarks('psychiatry', 'CA');
      
      expect(result).toBeDefined();
      expect(result.medianReimbursement).toBeGreaterThan(100);
      expect(result.percentile25).toBeLessThan(result.median);
      expect(result.percentile75).toBeGreaterThan(result.median);
    });

    it('should validate Medicare reimbursement eligibility', async () => {
      const claim = {
        cptCode: '90837',
        diagnosis: 'F33.9',
        providerId: mockProviderData.npi,
        patientAge: 68
      };

      const result = await service.validateMedicareEligibility(claim);
      
      expect(result.eligible).toBe(true);
      expect(result.reimbursementRate).toBeGreaterThan(0);
      expect(result.priorAuthRequired).toBe(false);
    });
  });

  describe('ROI Calculations', () => {
    it('should calculate platform ROI for providers', async () => {
      const providerMetrics = {
        currentRevenue: 500000,
        platformCost: 599 * 12, // Practice tier annual
        estimatedNewPatients: 20,
        averagePatientValue: 3000
      };

      const roi = await service.calculatePlatformROI(providerMetrics);
      
      expect(roi).toBeDefined();
      expect(roi.netBenefit).toBeGreaterThan(0);
      expect(roi.roiPercentage).toBeGreaterThan(100);
      expect(roi.paybackPeriod).toBeLessThan(12); // months
    });

    it('should project revenue impact over time', async () => {
      const projection = await service.projectRevenueImpact(mockProviderData, 12);
      
      expect(projection).toBeDefined();
      expect(projection.months).toHaveLength(12);
      projection.months.forEach((month, index) => {
        expect(month.revenue).toBeGreaterThan(0);
        if (index > 0) {
          expect(month.cumulativeROI).toBeGreaterThan(projection.months[index - 1].cumulativeROI);
        }
      });
    });

    it('should compare platform tiers ROI', async () => {
      const comparison = await service.compareTierROI(mockProviderData);
      
      expect(comparison).toBeDefined();
      expect(comparison.professional.cost).toBe(299 * 12);
      expect(comparison.practice.cost).toBe(599 * 12);
      expect(comparison.enterprise.cost).toBe(1999 * 12);
      expect(comparison.recommendedTier).toBeDefined();
    });
  });

  describe('Real Provider Economics Tracking', () => {
    it('should track actual provider performance metrics', async () => {
      const metrics = await service.trackRealProviderEconomics();
      
      expect(metrics).toBeInstanceOf(Array);
      metrics.forEach(metric => {
        expect(metric).toHaveProperty('providerId');
        expect(metric).toHaveProperty('actualRevenue');
        expect(metric).toHaveProperty('projectedRevenue');
        expect(metric).toHaveProperty('variance');
      });
    });

    it('should identify underperforming providers', async () => {
      const underperformers = await service.identifyUnderperformingProviders();
      
      expect(underperformers).toBeInstanceOf(Array);
      underperformers.forEach(provider => {
        expect(provider.performanceRatio).toBeLessThan(0.8);
        expect(provider.recommendations).toBeInstanceOf(Array);
        expect(provider.recommendations.length).toBeGreaterThan(0);
      });
    });

    it('should generate provider success metrics', async () => {
      const successMetrics = await service.generateProviderSuccessMetrics(mockProviderData.providerId);
      
      expect(successMetrics).toBeDefined();
      expect(successMetrics.patientRetention).toBeGreaterThanOrEqual(0);
      expect(successMetrics.patientRetention).toBeLessThanOrEqual(1);
      expect(successMetrics.revenueGrowth).toBeDefined();
      expect(successMetrics.referralConversion).toBeDefined();
    });
  });

  describe('Market Analysis', () => {
    it('should analyze regional reimbursement variations', async () => {
      const analysis = await service.analyzeRegionalVariations(['CA', 'NY', 'TX']);
      
      expect(analysis).toBeDefined();
      expect(analysis.states).toHaveLength(3);
      analysis.states.forEach(state => {
        expect(state.averageReimbursement).toBeGreaterThan(0);
        expect(state.costOfLiving).toBeDefined();
        expect(state.adjustedROI).toBeDefined();
      });
    });

    it('should validate market penetration assumptions', async () => {
      const assumptions = {
        totalAddressableMarket: 50000,
        targetPenetration: 0.02,
        averageContractValue: 7188
      };

      const validation = await service.validateMarketAssumptions(assumptions);
      
      expect(validation.realistic).toBe(true);
      expect(validation.adjustedPenetration).toBeCloseTo(0.02, 2);
      expect(validation.confidenceInterval).toBeDefined();
    });
  });

  describe('Compliance and Accuracy', () => {
    it('should ensure calculations comply with CMS guidelines', async () => {
      const calculation = {
        method: 'fee_for_service',
        codes: ['90837', '90834'],
        period: 'monthly'
      };

      const compliance = await service.validateCMSCompliance(calculation);
      
      expect(compliance.compliant).toBe(true);
      expect(compliance.guidelines).toBeInstanceOf(Array);
      expect(compliance.warnings).toBeInstanceOf(Array);
    });

    it('should maintain audit trail for validations', async () => {
      await service.validateProviderCalculations(mockProviderData);
      const auditTrail = await service.getAuditTrail(mockProviderData.providerId);
      
      expect(auditTrail).toBeInstanceOf(Array);
      expect(auditTrail.length).toBeGreaterThan(0);
      auditTrail.forEach(entry => {
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('action');
        expect(entry).toHaveProperty('result');
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should validate calculations within performance SLA', async () => {
      const startTime = Date.now();
      
      await service.validateProviderCalculations(mockProviderData);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // 500ms SLA
    });

    it('should handle batch validations efficiently', async () => {
      const providers = Array(100).fill(mockProviderData);
      const startTime = Date.now();
      
      const results = await service.batchValidateProviders(providers);
      
      const duration = Date.now() - startTime;
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 providers
    });
  });
});