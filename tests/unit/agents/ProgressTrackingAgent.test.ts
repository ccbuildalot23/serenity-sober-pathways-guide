/**
 * Unit tests for ProgressTrackingAgent
 * Tests daily check-ins, risk scoring, and achievement tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressTrackingAgent } from '@/agents/ProgressTrackingAgent';
import { AgentContext } from '@/agents/base/HealthcareAgent';

describe('ProgressTrackingAgent', () => {
  let agent: ProgressTrackingAgent;
  const mockContext: AgentContext = {
    userId: 'user-123',
    sessionId: 'session-456',
    userRole: 'patient'
  };

  beforeEach(async () => {
    agent = new ProgressTrackingAgent();
    await agent.initialize(mockContext);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Daily Check-ins', () => {
    it('should process daily check-in successfully', async () => {
      const input = "My mood is 7, anxiety is 4, slept 8 hours, no cravings";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0.8);
      expect(response.metadata?.checkinComplete).toBe(true);
      expect(response.message).toContain('Thank you for checking in');
    });

    it('should detect concerning check-in patterns', async () => {
      const input = "Mood is 2, anxiety 9, only slept 3 hours, strong cravings";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.requiresEscalation).toBe(true);
      expect(response.metadata?.riskLevel).toBeOneOf(['high', 'critical']);
      expect(response.actions).toContainEqual(
        expect.objectContaining({ type: 'escalate' })
      );
    });

    it('should validate check-in data ranges', async () => {
      const input = "Mood is 15, anxiety is -5"; // Invalid values
      
      const response = await agent.processInput(input, mockContext);
      
      // Should normalize to valid ranges
      expect(response.metadata?.checkinComplete).toBe(true);
      expect(response.message).toBeDefined();
    });

    it('should track medication adherence', async () => {
      const input = "Took my medication today, feeling stable";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.actions).toContainEqual(
        expect.objectContaining({
          type: 'store',
          data: expect.objectContaining({
            type: 'daily_checkin',
            content: expect.objectContaining({
              medication: true
            })
          })
        })
      );
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate accurate risk scores', async () => {
      const input = "Check my current risk level";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.metadata?.riskScore).toBeDefined();
      expect(response.metadata?.riskScore).toBeGreaterThanOrEqual(0);
      expect(response.metadata?.riskScore).toBeLessThanOrEqual(100);
      expect(response.metadata?.riskLevel).toBeOneOf(['low', 'medium', 'high', 'critical']);
    });

    it('should identify multiple risk factors', async () => {
      const input = "Not sleeping well, high anxiety, missed therapy";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('risk');
      expect(response.metadata?.riskLevel).not.toBe('low');
    });

    it('should track risk trends over time', async () => {
      // Simulate multiple check-ins
      const checkIns = [
        "Mood 8, anxiety 3",
        "Mood 6, anxiety 5",
        "Mood 4, anxiety 7"
      ];
      
      for (const checkIn of checkIns) {
        await agent.processInput(checkIn, mockContext);
      }
      
      const response = await agent.processInput("Show my progress", mockContext);
      
      expect(response.metadata?.trajectory).toBe('declining');
      expect(response.requiresEscalation).toBe(false); // Not immediate crisis
    });

    it('should detect protective factors', async () => {
      const input = "Exercised today, good social support, therapy was helpful";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('positive');
      expect(response.metadata?.riskLevel).toBeOneOf(['low', 'medium']);
    });
  });

  describe('Progress Tracking', () => {
    it('should generate weekly progress reviews', async () => {
      const input = "Show me my weekly progress";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.metadata?.timeframe).toBe('week');
      expect(response.message).toContain('progress');
      expect(response.confidence).toBeGreaterThan(0.7);
    });

    it('should identify improving trends', async () => {
      const input = "How am I doing this month?";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.metadata?.trajectory).toBeOneOf(['improving', 'stable', 'declining', 'crisis']);
      expect(response.metadata?.confidenceLevel).toBeGreaterThan(0.5);
    });

    it('should provide actionable insights', async () => {
      const input = "What patterns do you see in my recovery?";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toBeDefined();
      expect(response.metadata?.insightCount).toBeGreaterThan(0);
      expect(response.actions).toContainEqual(
        expect.objectContaining({ type: 'store' })
      );
    });
  });

  describe('Achievement System', () => {
    it('should track and award achievements', async () => {
      const input = "Check my achievements";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('achievement');
      expect(response.metadata?.recentAchievements).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0.9);
    });

    it('should celebrate milestones', async () => {
      // Simulate consistent check-ins for streak achievement
      for (let i = 0; i < 7; i++) {
        await agent.processInput(`Day ${i + 1} check-in: mood 7`, mockContext);
      }
      
      const response = await agent.processInput("Any new achievements?", mockContext);
      
      expect(response.message).toContain('Congratulations');
      expect(response.metadata?.achievements).toBeGreaterThan(0);
    });

    it('should suggest next goals', async () => {
      const input = "What should I focus on next?";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('focus');
      expect(response.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Natural Language Processing', () => {
    it('should understand various check-in formats', async () => {
      const variations = [
        "Feeling good today, mood is high",
        "Today was tough, lots of anxiety",
        "Slept well last night, about 8 hours",
        "Had some cravings but managed them"
      ];
      
      for (const input of variations) {
        const response = await agent.processInput(input, mockContext);
        expect(response.metadata?.checkinComplete).toBeDefined();
        expect(response.confidence).toBeGreaterThan(0.6);
      }
    });

    it('should handle ambiguous inputs gracefully', async () => {
      const input = "Things are okay I guess";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toBeDefined();
      expect(response.confidence).toBeLessThan(0.8);
      expect(response.requiresEscalation).toBe(false);
    });
  });

  describe('Integration with Crisis Detection', () => {
    it('should escalate crisis indicators', async () => {
      const input = "Can't go on, everything is falling apart";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.requiresEscalation).toBe(true);
      expect(response.metadata?.riskLevel).toBe('critical');
      expect(response.actions).toContainEqual(
        expect.objectContaining({
          type: 'escalate',
          priority: 'critical'
        })
      );
    });

    it('should trigger follow-up for concerning patterns', async () => {
      const input = "Mood has been consistently low this week";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.actions).toContainEqual(
        expect.objectContaining({
          type: 'notify',
          data: expect.objectContaining({
            schedule: expect.stringContaining('+')
          })
        })
      );
    });
  });

  describe('Data Persistence', () => {
    it('should store check-in data correctly', async () => {
      const input = "Mood 7, anxiety 3, slept 8 hours";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.actions).toContainEqual(
        expect.objectContaining({
          type: 'store',
          data: expect.objectContaining({
            type: 'daily_checkin',
            userId: mockContext.userId
          })
        })
      );
    });

    it('should maintain historical context', async () => {
      // First check-in
      await agent.processInput("Mood 5", mockContext);
      
      // Second check-in should have context
      const response = await agent.processInput("Feeling better today", mockContext);
      
      expect(response.message).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await agent.processInput("Quick check-in: mood 7", mockContext);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 1 second max
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill("Check-in: mood 6").map((input, i) => 
        agent.processInput(input, { ...mockContext, userId: `user-${i}` })
      );
      
      const responses = await Promise.all(requests);
      
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Agent Configuration', () => {
    it('should have correct capabilities', () => {
      const config = agent.getConfig();
      
      expect(config.name).toBe('ProgressTracking');
      expect(config.capabilities).toContain('daily_checkin_analysis');
      expect(config.capabilities).toContain('risk_assessment');
      expect(config.capabilities).toContain('achievement_tracking');
      expect(config.requiresEncryption).toBe(true);
    });

    it('should maintain audit trail', async () => {
      const input = "Mood check: 7";
      
      await agent.processInput(input, mockContext);
      
      // Verify audit logging would occur
      expect(agent.getConfig().auditLevel).toBe('detailed');
    });
  });
});