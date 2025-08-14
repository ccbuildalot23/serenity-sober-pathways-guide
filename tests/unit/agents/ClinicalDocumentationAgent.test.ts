/**
 * Unit tests for ClinicalDocumentationAgent
 * Tests clinical note generation, CPT/ICD-10 suggestions, and billing optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClinicalDocumentationAgent } from '@/agents/ClinicalDocumentationAgent';
import { AgentContext } from '@/agents/base/HealthcareAgent';

describe('ClinicalDocumentationAgent', () => {
  let agent: ClinicalDocumentationAgent;
  const mockContext: AgentContext = {
    userId: 'provider-123',
    sessionId: 'session-456',
    userRole: 'provider'
  };

  const mockSessionData = {
    id: 'session-789',
    patientId: 'patient-456',
    providerId: 'provider-123',
    sessionDate: new Date(),
    sessionType: 'individual' as const,
    duration: 60,
    modality: 'in_person' as const,
    presentingConcerns: ['anxiety', 'depression', 'sleep issues'],
    treatmentGoals: ['reduce anxiety', 'improve sleep hygiene'],
    interventionsUsed: ['CBT', 'mindfulness', 'psychoeducation'],
    patientResponse: 'engaged and receptive',
    riskAssessment: {
      suicidalIdeation: 'none' as const,
      selfHarmRisk: 'low' as const,
      substanceUseRisk: 'moderate' as const,
      functionalImpairment: 'mild' as const,
      safetyPlan: true,
      emergencyContacts: true
    }
  };

  beforeEach(async () => {
    agent = new ClinicalDocumentationAgent();
    await agent.initialize(mockContext);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Clinical Note Generation', () => {
    it('should generate SOAP format notes', async () => {
      const input = "Generate a SOAP note for today's 60-minute individual therapy session";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response).toBeDefined();
      expect(response.message).toContain('SOAP NOTE');
      expect(response.message).toContain('SUBJECTIVE');
      expect(response.message).toContain('OBJECTIVE');
      expect(response.message).toContain('ASSESSMENT');
      expect(response.message).toContain('PLAN');
      expect(response.confidence).toBeGreaterThan(0.8);
    });

    it('should generate BIRP format notes', async () => {
      const input = "Create a BIRP note for the session";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('BIRP NOTE');
      expect(response.message).toContain('BEHAVIOR');
      expect(response.message).toContain('INTERVENTION');
      expect(response.message).toContain('RESPONSE');
      expect(response.message).toContain('PLAN');
    });

    it('should include risk assessment when required', async () => {
      const input = "Generate note with risk assessment for patient with moderate substance use risk";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('RISK ASSESSMENT');
      expect(response.message).toContain('substance');
      expect(response.metadata?.format).toBeDefined();
    });

    it('should adapt note length based on session duration', async () => {
      const shortSession = "Generate note for 30-minute session";
      const longSession = "Generate note for 90-minute session";
      
      const shortResponse = await agent.processInput(shortSession, mockContext);
      const longResponse = await agent.processInput(longSession, mockContext);
      
      expect(shortResponse.message.length).toBeLessThan(longResponse.message.length);
      expect(shortResponse.metadata?.billableTime).toBeLessThan(
        longResponse.metadata?.billableTime || 0
      );
    });
  });

  describe('CPT Code Suggestions', () => {
    it('should suggest appropriate CPT codes for individual therapy', async () => {
      const input = "Suggest CPT codes for 60-minute individual psychotherapy";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('90837');
      expect(response.message).toContain('60 minutes');
      expect(response.metadata?.cptCodesCount).toBeGreaterThan(0);
    });

    it('should suggest codes for group therapy', async () => {
      const input = "CPT codes for 90-minute group therapy session";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('90853');
      expect(response.message).toContain('group');
    });

    it('should add telehealth modifiers when applicable', async () => {
      const input = "CPT codes for telehealth psychotherapy session";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('95'); // Telehealth modifier
      expect(response.message).toContain('telehealth');
    });

    it('should validate time-based billing requirements', async () => {
      const input = "Can I bill 90837 for a 45-minute session?";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('90834'); // Correct code for 45 minutes
      expect(response.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('ICD-10 Code Suggestions', () => {
    it('should suggest ICD-10 codes for anxiety', async () => {
      const input = "ICD-10 codes for generalized anxiety disorder";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('F41.1');
      expect(response.message).toContain('anxiety');
      expect(response.metadata?.icd10CodesCount).toBeGreaterThan(0);
    });

    it('should suggest codes for depression', async () => {
      const input = "Diagnosis codes for major depressive disorder";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toMatch(/F3[23]\.\d/); // F32.x or F33.x
      expect(response.message).toContain('depression');
    });

    it('should suggest codes for substance use disorders', async () => {
      const input = "ICD-10 for alcohol use disorder";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('F10');
      expect(response.message).toContain('alcohol');
    });

    it('should identify primary vs secondary diagnoses', async () => {
      const input = "Primary diagnosis anxiety, secondary depression";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('Primary');
      expect(response.message).toContain('Secondary');
      expect(response.metadata?.icd10CodesCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Billing Optimization', () => {
    it('should calculate billable time accurately', async () => {
      const input = "Calculate billable time for 53-minute session";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.metadata?.billableTime).toBe(60); // Rounds to 60-minute code
      expect(response.message).toContain('90837');
    });

    it('should optimize code combinations for reimbursement', async () => {
      const input = "Best billing codes for intake assessment with psychotherapy";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('90791'); // Psychiatric diagnostic evaluation
      expect(response.confidence).toBeGreaterThan(0.8);
    });

    it('should validate Medicare billing compliance', async () => {
      const input = "Check Medicare compliance for 90837 with F41.1";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('compliant');
      expect(response.metadata?.complianceChecks).toBeDefined();
    });

    it('should estimate reimbursement rates', async () => {
      const input = "Estimated reimbursement for 90837 in California";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toMatch(/\$\d+/); // Contains dollar amount
      expect(response.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Compliance Checking', () => {
    it('should flag documentation insufficiencies', async () => {
      const input = "Check compliance for brief note: 'Patient doing well'";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('insufficient');
      expect(response.metadata?.reviewRequired).toBe(true);
    });

    it('should ensure medical necessity documentation', async () => {
      const input = "Validate medical necessity for continued treatment";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('medical necessity');
      expect(response.actions).toContainEqual(
        expect.objectContaining({ type: 'store' })
      );
    });

    it('should check for required risk assessment', async () => {
      const input = "Note for patient with suicidal ideation history";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('risk assessment');
      expect(response.message).toContain('required');
      expect(response.metadata?.reviewRequired).toBe(true);
    });

    it('should validate HIPAA compliance', async () => {
      const input = "Check HIPAA compliance for clinical note";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('HIPAA');
      expect(response.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Template Customization', () => {
    it('should respect provider preferences', async () => {
      const input = "Generate note using my preferred format";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.metadata?.format).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0.7);
    });

    it('should adapt to specialty requirements', async () => {
      const input = "Generate psychiatry-specific documentation";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('medication');
      expect(response.metadata?.format).toBeDefined();
    });
  });

  describe('Treatment Planning', () => {
    it('should generate treatment plan suggestions', async () => {
      const input = "Create treatment plan for anxiety and depression";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('treatment');
      expect(response.message).toContain('goals');
      expect(response.confidence).toBeGreaterThan(0.7);
    });

    it('should track treatment goal progress', async () => {
      const input = "Update progress on anxiety reduction goals";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('progress');
      expect(response.actions).toBeDefined();
    });
  });

  describe('Natural Language Understanding', () => {
    it('should understand various documentation requests', async () => {
      const variations = [
        "Write a progress note",
        "Document today's session",
        "Create clinical documentation",
        "Generate therapy note"
      ];
      
      for (const input of variations) {
        const response = await agent.processInput(input, mockContext);
        expect(response.message).toBeDefined();
        expect(response.confidence).toBeGreaterThan(0.6);
      }
    });

    it('should extract session details from narrative', async () => {
      const input = "60-minute session with John discussing anxiety and using CBT techniques";
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('60');
      expect(response.message).toContain('CBT');
      expect(response.message).toContain('anxiety');
    });
  });

  describe('Performance', () => {
    it('should generate notes within acceptable time', async () => {
      const startTime = Date.now();
      
      await agent.processInput("Generate clinical note", mockContext);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 2 seconds max
    });

    it('should handle batch documentation requests', async () => {
      const sessions = Array(5).fill(null).map((_, i) => ({
        input: `Generate note for session ${i + 1}`,
        context: { ...mockContext, sessionId: `session-${i}` }
      }));
      
      const responses = await Promise.all(
        sessions.map(s => agent.processInput(s.input, s.context))
      );
      
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.confidence).toBeGreaterThan(0.5);
      });
    });
  });

  describe('Agent Configuration', () => {
    it('should have correct capabilities', () => {
      const config = agent.getConfig();
      
      expect(config.name).toBe('ClinicalDocumentation');
      expect(config.capabilities).toContain('clinical_note_generation');
      expect(config.capabilities).toContain('cpt_code_suggestion');
      expect(config.capabilities).toContain('icd10_code_suggestion');
      expect(config.capabilities).toContain('billing_optimization');
      expect(config.requiresEncryption).toBe(true);
    });

    it('should use appropriate temperature for consistency', () => {
      const config = agent.getConfig();
      
      expect(config.temperature).toBeLessThan(0.5); // Low temperature for consistency
      expect(config.maxTokens).toBeGreaterThan(4000); // Sufficient for detailed notes
    });
  });

  describe('Error Handling', () => {
    it('should handle missing session data gracefully', async () => {
      const input = "Generate note"; // No session details
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toBeDefined();
      expect(response.confidence).toBeLessThan(0.5);
      expect(response.requiresEscalation).toBe(false);
    });

    it('should provide guidance for invalid requests', async () => {
      const input = "Generate note for 5-minute session"; // Too short
      
      const response = await agent.processInput(input, mockContext);
      
      expect(response.message).toContain('minimum');
      expect(response.confidence).toBeGreaterThan(0.6);
    });
  });
});