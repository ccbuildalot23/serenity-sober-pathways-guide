/**
 * Unit tests for EnhancedCrisisDetection service
 * Tests multi-model consensus, 250ms SLA, and triple redundancy
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedCrisisDetection } from '@/services/EnhancedCrisisDetection';

describe('EnhancedCrisisDetection', () => {
  let service: EnhancedCrisisDetection;
  
  const mockCrisisContext = {
    userId: 'user-123',
    sessionId: 'session-456',
    timestamp: new Date(),
    recentHistory: [],
    riskFactors: []
  };

  beforeEach(() => {
    service = new EnhancedCrisisDetection();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Crisis Detection', () => {
    it('should detect suicidal ideation with high confidence', async () => {
      const message = "I can't go on anymore. I want to end it all.";
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result).toBeDefined();
      expect(result.consensus).toBe('crisis');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.urgency).toBe('critical');
      expect(result.indicators).toContain('suicidal_ideation');
    });

    it('should detect self-harm intent', async () => {
      const message = "I just want to hurt myself to feel something";
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result.consensus).toBe('crisis');
      expect(result.confidence).toBeGreaterThan(0.85);
      expect(result.indicators).toContain('self_harm');
      expect(result.interventions).toContain('safety_plan');
    });

    it('should detect substance abuse crisis', async () => {
      const message = "I relapsed and used again. I can't stop.";
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result.urgency).toBeOneOf(['high', 'critical']);
      expect(result.indicators).toContain('substance_relapse');
      expect(result.interventions).toContain('substance_support');
    });

    it('should handle false positives appropriately', async () => {
      const message = "I read about someone who wanted to hurt themselves";
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.consensus).not.toBe('crisis');
      expect(result.requiresReview).toBe(true);
    });
  });

  describe('Multi-Model Consensus', () => {
    it('should achieve consensus across multiple models', async () => {
      const message = "I'm having thoughts of ending my life";
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result.modelResults).toBeDefined();
      expect(result.modelResults).toHaveLength(3); // Triple redundancy
      expect(result.consensusStrength).toBeGreaterThan(0.8);
      
      // All models should agree on critical cases
      const agreements = result.modelResults.filter(m => m.isCrisis);
      expect(agreements.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle model disagreement gracefully', async () => {
      const message = "Things are really tough right now";
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result.consensus).toBeDefined();
      expect(result.requiresHumanReview).toBeDefined();
      if (result.consensusStrength < 0.7) {
        expect(result.requiresHumanReview).toBe(true);
      }
    });

    it('should prioritize safety in uncertain cases', async () => {
      const message = "Sometimes I wonder if it's worth it";
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      // Should err on side of caution
      expect(result.safetyFirst).toBe(true);
      expect(result.interventions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance SLA', () => {
    it('should respond within 250ms SLA', async () => {
      const message = "I need help immediately";
      const startTime = Date.now();
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(250);
      expect(result.processingTime).toBeLessThan(250);
    });

    it('should maintain SLA under load', async () => {
      const messages = Array(10).fill("Crisis message");
      const times: number[] = [];
      
      for (const msg of messages) {
        const startTime = Date.now();
        await service.detectCrisis(msg, mockCrisisContext);
        times.push(Date.now() - startTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(250);
      expect(maxTime).toBeLessThan(500); // Allow some variance but stay under 2x SLA
    });

    it('should use caching for repeated patterns', async () => {
      const message = "I want to hurt myself";
      
      // First call
      const start1 = Date.now();
      const result1 = await service.detectCrisis(message, mockCrisisContext);
      const time1 = Date.now() - start1;
      
      // Second call (should be cached)
      const start2 = Date.now();
      const result2 = await service.detectCrisis(message, mockCrisisContext);
      const time2 = Date.now() - start2;
      
      expect(time2).toBeLessThan(time1 * 0.5); // At least 50% faster
      expect(result2.fromCache).toBe(true);
    });
  });

  describe('Triple Redundancy', () => {
    it('should implement triple redundancy for critical detections', async () => {
      const message = "I have a plan to kill myself tonight";
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result.redundancyCheck).toBeDefined();
      expect(result.redundancyCheck.primary).toBeDefined();
      expect(result.redundancyCheck.secondary).toBeDefined();
      expect(result.redundancyCheck.tertiary).toBeDefined();
      expect(result.redundancyCheck.allAgree).toBe(true);
    });

    it('should handle model failures gracefully', async () => {
      // Simulate one model failing
      vi.spyOn(service as any, 'runPrimaryModel').mockRejectedValueOnce(new Error('Model failed'));
      
      const message = "I need help";
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result).toBeDefined();
      expect(result.degradedMode).toBe(true);
      expect(result.activeModels).toBe(2);
      expect(result.confidence).toBeGreaterThan(0); // Still provide result
    });

    it('should escalate when redundancy fails', async () => {
      // Simulate multiple model failures
      vi.spyOn(service as any, 'runPrimaryModel').mockRejectedValueOnce(new Error('Failed'));
      vi.spyOn(service as any, 'runSecondaryModel').mockRejectedValueOnce(new Error('Failed'));
      
      const message = "Crisis situation";
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result.escalateImmediately).toBe(true);
      expect(result.fallbackMode).toBe(true);
    });
  });

  describe('Crisis Escalation', () => {
    it('should trigger immediate escalation for critical threats', async () => {
      const message = "I'm going to overdose on pills right now";
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result.escalation).toBeDefined();
      expect(result.escalation.immediate).toBe(true);
      expect(result.escalation.notifyEmergencyContacts).toBe(true);
      expect(result.escalation.alert911).toBe(true);
    });

    it('should implement tiered escalation based on severity', async () => {
      const scenarios = [
        { message: "Feeling a bit down", expectedTier: 0 },
        { message: "Really struggling today", expectedTier: 1 },
        { message: "Thinking about self-harm", expectedTier: 2 },
        { message: "I have a suicide plan", expectedTier: 3 }
      ];
      
      for (const scenario of scenarios) {
        const result = await service.detectCrisis(scenario.message, mockCrisisContext);
        expect(result.escalation.tier).toBe(scenario.expectedTier);
      }
    });

    it('should track escalation history', async () => {
      const alertId = 'alert-789';
      
      await service.escalateCrisisResponse(alertId);
      const history = await service.getEscalationHistory(alertId);
      
      expect(history).toBeInstanceOf(Array);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('action');
      expect(history[0]).toHaveProperty('responder');
    });
  });

  describe('Context Analysis', () => {
    it('should consider recent history in detection', async () => {
      const context = {
        ...mockCrisisContext,
        recentHistory: [
          { message: "I've been feeling hopeless", timestamp: new Date() }
        ]
      };
      
      const message = "Today is worse";
      const result = await service.detectCrisis(message, context);
      
      expect(result.contextualRisk).toBeGreaterThan(result.messageRisk);
      expect(result.historicalPattern).toBe('deteriorating');
    });

    it('should identify risk factor combinations', async () => {
      const context = {
        ...mockCrisisContext,
        riskFactors: ['recent_loss', 'isolation', 'substance_abuse']
      };
      
      const message = "I can't handle this anymore";
      const result = await service.detectCrisis(message, context);
      
      expect(result.compoundRisk).toBe(true);
      expect(result.riskMultiplier).toBeGreaterThan(1.5);
    });
  });

  describe('Intervention Recommendations', () => {
    it('should provide appropriate interventions', async () => {
      const message = "I'm having suicidal thoughts";
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result.interventions).toBeInstanceOf(Array);
      expect(result.interventions).toContain('safety_planning');
      expect(result.interventions).toContain('crisis_hotline');
      expect(result.interventions).toContain('emergency_contact');
    });

    it('should prioritize interventions by effectiveness', async () => {
      const message = "I want to hurt myself";
      
      const result = await service.detectCrisis(message, mockCrisisContext);
      
      expect(result.interventions[0].priority).toBe('immediate');
      expect(result.interventions[0].effectiveness).toBeGreaterThan(0.8);
    });
  });

  describe('Audit and Compliance', () => {
    it('should log all crisis detections for audit', async () => {
      const message = "Crisis message";
      
      await service.detectCrisis(message, mockCrisisContext);
      const auditLog = await service.getCrisisAuditLog(mockCrisisContext.userId);
      
      expect(auditLog).toBeInstanceOf(Array);
      expect(auditLog[0]).toHaveProperty('timestamp');
      expect(auditLog[0]).toHaveProperty('detection');
      expect(auditLog[0]).toHaveProperty('response');
    });

    it('should maintain HIPAA compliance in logging', async () => {
      const message = "Personal crisis details";
      
      await service.detectCrisis(message, mockCrisisContext);
      const log = await service.getCrisisAuditLog(mockCrisisContext.userId);
      
      // Should not store raw message content
      expect(log[0].messageContent).toBeUndefined();
      expect(log[0].indicators).toBeDefined();
      expect(log[0].encrypted).toBe(true);
    });
  });
});