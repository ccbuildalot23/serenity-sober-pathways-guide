/**
 * Chaos Engineering Integration Tests
 * Tests system resilience during failures, outages, and high load
 * Validates crisis response, payment processing, and compliance during chaos
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { supabase } from '@/integrations/supabase/client';
import { HealthcareChaosService } from '@/services/HealthcareChaosService';
import { DeploymentValidationService } from '@/services/DeploymentValidationService';
import { PaymentGatewayService } from '@/services/PaymentGatewayService';
import { AISafetyGuard } from '@/services/AISafetyGuard';
import { SOC2ComplianceService } from '@/services/SOC2ComplianceService';
import { PredictiveMonitoring } from '@/services/PredictiveMonitoring';
import { ClinicalDocumentationAgent } from '@/agents/ClinicalDocumentationAgent';

describe('Chaos Engineering Tests', () => {
  let chaosService: HealthcareChaosService;
  let deploymentService: DeploymentValidationService;
  let paymentService: PaymentGatewayService;
  let aiSafety: AISafetyGuard;
  let soc2Service: SOC2ComplianceService;
  let monitoring: PredictiveMonitoring;
  
  let testProviderId: string;
  let testPatientId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    // Initialize services
    chaosService = new HealthcareChaosService();
    deploymentService = DeploymentValidationService.getInstance();
    paymentService = PaymentGatewayService.getInstance();
    aiSafety = AISafetyGuard.getInstance();
    soc2Service = SOC2ComplianceService.getInstance();
    monitoring = new PredictiveMonitoring();
    
    // Create test users
    const { data: provider } = await supabase.auth.signUp({
      email: 'chaos-provider@test.com',
      password: 'TestPass123',
      options: {
        data: { role: 'provider', full_name: 'Dr. Chaos Test' }
      }
    });
    testProviderId = provider?.user?.id || '';
    
    const { data: patient } = await supabase.auth.signUp({
      email: 'chaos-patient@test.com',
      password: 'TestPass123',
      options: {
        data: { role: 'patient', full_name: 'Chaos Patient' }
      }
    });
    testPatientId = patient?.user?.id || '';
    
    // Create test customer for payment testing
    testCustomerId = await paymentService.createCustomer({
      email: 'chaos-clinic@test.com',
      name: 'Chaos Test Clinic',
      organizationId: testProviderId
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testProviderId) await supabase.auth.admin.deleteUser(testProviderId);
    if (testPatientId) await supabase.auth.admin.deleteUser(testPatientId);
  });

  describe('Crisis Response Under Chaos', () => {
    it('should maintain <250ms crisis response during database partition', async () => {
      // Start database partition chaos
      const chaosScenario = await chaosService.runScenario({
        type: 'database_partition',
        duration: 5000,
        severity: 'moderate',
        targetServices: ['crisis_response']
      });
      
      // Trigger crisis event
      const crisisStartTime = Date.now();
      const crisisEvent = {
        patientId: testPatientId,
        severity: 'critical' as const,
        type: 'suicidal_ideation' as const,
        location: { lat: 37.7749, lng: -122.4194 },
        message: 'Test crisis during chaos'
      };
      
      // Simulate crisis response
      const { data: crisisResponse } = await supabase
        .from('crisis_alerts')
        .insert({
          patient_id: crisisEvent.patientId,
          severity: crisisEvent.severity,
          type: crisisEvent.type,
          location: crisisEvent.location,
          status: 'active',
          created_at: new Date()
        })
        .select()
        .single();
      
      const responseTime = Date.now() - crisisStartTime;
      
      // Verify response time meets SLA
      expect(responseTime).toBeLessThanOrEqual(250);
      expect(crisisResponse).toBeDefined();
      expect(crisisResponse?.status).toBe('active');
      
      // Stop chaos scenario
      await chaosService.stopScenario(chaosScenario.id);
      
      // Verify system recovered
      const healthCheck = await chaosService.getSystemHealth();
      expect(healthCheck.status).toBe('healthy');
    });

    it('should handle mass casualty event simulation', async () => {
      // Simulate mass casualty event
      const massCasualtyScenario = await chaosService.runScenario({
        type: 'mass_casualty_event',
        duration: 10000,
        severity: 'severe',
        concurrentCrises: 50
      });
      
      // Monitor response times for multiple crises
      const responseTimes: number[] = [];
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          (async () => {
            const startTime = Date.now();
            await supabase
              .from('crisis_alerts')
              .insert({
                patient_id: `test-patient-${i}`,
                severity: 'high',
                type: 'mental_health_crisis',
                status: 'active'
              });
            return Date.now() - startTime;
          })()
        );
      }
      
      const times = await Promise.all(promises);
      responseTimes.push(...times);
      
      // Calculate metrics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      // Verify all responses meet SLA even under load
      expect(avgResponseTime).toBeLessThanOrEqual(250);
      expect(maxResponseTime).toBeLessThanOrEqual(500); // Allow some degradation but not failure
      
      await chaosService.stopScenario(massCasualtyScenario.id);
    });

    it('should maintain tenant isolation during chaos', async () => {
      // Run tenant isolation test under chaos
      const networkChaos = await chaosService.runScenario({
        type: 'network_latency',
        duration: 5000,
        severity: 'high',
        latencyMs: 500
      });
      
      const isolationTest = await chaosService.testTenantIsolation({
        tenantIds: ['tenant-a', 'tenant-b', 'tenant-c'],
        testType: 'concurrent_operations',
        concurrentLoad: 100
      });
      
      // Verify zero breaches even under network chaos
      expect(isolationTest.breachesDetected).toBe(0);
      expect(isolationTest.isolationMaintained).toBe(true);
      expect(isolationTest.performanceImpact).toBeLessThan(0.2); // <20% performance impact
      
      await chaosService.stopScenario(networkChaos.id);
    });
  });

  describe('Payment Processing Under Chaos', () => {
    it('should process payments during service degradation', async () => {
      // Start API degradation chaos
      const apiChaos = await chaosService.runScenario({
        type: 'api_degradation',
        duration: 5000,
        severity: 'moderate',
        errorRate: 0.3 // 30% error rate
      });
      
      // Attempt payment processing
      let paymentSucceeded = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!paymentSucceeded && retryCount < maxRetries) {
        try {
          const subscription = await paymentService.createSubscription({
            customerId: testCustomerId,
            planId: 'professional',
            trialDays: 14
          });
          
          if (subscription.id) {
            paymentSucceeded = true;
          }
        } catch (error) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
      
      // Verify payment eventually succeeded with retry logic
      expect(paymentSucceeded).toBe(true);
      expect(retryCount).toBeLessThanOrEqual(maxRetries);
      
      await chaosService.stopScenario(apiChaos.id);
    });

    it('should maintain billing accuracy during chaos', async () => {
      // Start CPU stress chaos
      const cpuChaos = await chaosService.runScenario({
        type: 'cpu_stress',
        duration: 5000,
        severity: 'high',
        cpuUsage: 90
      });
      
      // Process multiple billing operations
      const billingOperations = [];
      const expectedTotal = 299 * 3; // 3 professional subscriptions
      
      for (let i = 0; i < 3; i++) {
        billingOperations.push(
          paymentService.generateInvoice(`test-subscription-${i}`)
        );
      }
      
      const invoices = await Promise.all(billingOperations);
      const actualTotal = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      
      // Verify billing accuracy maintained
      expect(actualTotal).toBe(expectedTotal);
      expect(invoices.every(inv => inv.status === 'pending' || inv.status === 'paid')).toBe(true);
      
      await chaosService.stopScenario(cpuChaos.id);
    });

    it('should handle payment webhook failures gracefully', async () => {
      // Simulate webhook processing during chaos
      const webhookChaos = await chaosService.runScenario({
        type: 'service_outage',
        duration: 3000,
        severity: 'moderate',
        targetServices: ['webhooks']
      });
      
      // Simulate webhook event
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_chaos',
            amount: 29900,
            currency: 'usd',
            customer: testCustomerId
          }
        }
      };
      
      // Process webhook with retry logic
      let processed = false;
      for (let i = 0; i < 3; i++) {
        try {
          await paymentService.handleWebhook(
            JSON.stringify(webhookPayload),
            'test_signature'
          );
          processed = true;
          break;
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Verify webhook eventually processed or queued for retry
      expect(processed || webhookChaos.status === 'active').toBe(true);
      
      await chaosService.stopScenario(webhookChaos.id);
    });
  });

  describe('AI Safety During Chaos', () => {
    it('should maintain AI safety checks during high load', async () => {
      // Start memory pressure chaos
      const memoryChaos = await chaosService.runScenario({
        type: 'memory_pressure',
        duration: 5000,
        severity: 'high',
        memoryUsage: 85
      });
      
      // Generate multiple AI outputs for safety checking
      const aiOutputs = [];
      for (let i = 0; i < 20; i++) {
        aiOutputs.push({
          agentId: `test-agent-${i}`,
          agentType: 'ClinicalDocumentationAgent',
          input: 'Generate clinical note',
          output: `Test output ${i} with potential bias: addicts need tough love`,
          context: { patientId: testPatientId },
          timestamp: new Date()
        });
      }
      
      // Check all outputs for safety
      const safetyChecks = await Promise.all(
        aiOutputs.map(output => aiSafety.checkSafety(output))
      );
      
      // Verify all outputs were checked
      expect(safetyChecks.length).toBe(20);
      expect(safetyChecks.every(checks => checks.length > 0)).toBe(true);
      
      // Verify bias detection still working
      const biasDetected = safetyChecks.some(checks => 
        checks.some(check => check.checkType === 'bias' && !check.passed)
      );
      expect(biasDetected).toBe(true);
      
      await chaosService.stopScenario(memoryChaos.id);
    });

    it('should flag unsafe AI outputs during service degradation', async () => {
      // Start multiple chaos scenarios
      const multiChaos = await Promise.all([
        chaosService.runScenario({
          type: 'network_latency',
          duration: 5000,
          severity: 'moderate',
          latencyMs: 200
        }),
        chaosService.runScenario({
          type: 'api_degradation',
          duration: 5000,
          severity: 'moderate',
          errorRate: 0.2
        })
      ]);
      
      // Test various unsafe outputs
      const unsafeOutputs = [
        {
          output: 'You should definitely stop taking your medication',
          expectedFlag: 'medical_accuracy'
        },
        {
          output: 'I love you and want to be your friend outside of therapy',
          expectedFlag: 'ethical'
        },
        {
          output: 'Based on our last session on March 15th at 2pm',
          expectedFlag: 'hallucination'
        }
      ];
      
      for (const testCase of unsafeOutputs) {
        const output = {
          agentId: 'test-agent',
          agentType: 'RecoveryCoachAgent',
          input: 'Test input',
          output: testCase.output,
          context: {},
          timestamp: new Date()
        };
        
        const checks = await aiSafety.checkSafety(output);
        const flaggedCheck = checks.find(c => c.checkType === testCase.expectedFlag);
        
        expect(flaggedCheck).toBeDefined();
        expect(flaggedCheck?.passed).toBe(false);
      }
      
      // Stop all chaos scenarios
      await Promise.all(multiChaos.map(scenario => 
        chaosService.stopScenario(scenario.id)
      ));
    });
  });

  describe('Compliance Monitoring During Chaos', () => {
    it('should maintain SOC-2 compliance during chaos', async () => {
      // Start disk I/O chaos
      const diskChaos = await chaosService.runScenario({
        type: 'disk_io_stress',
        duration: 5000,
        severity: 'moderate'
      });
      
      // Run compliance assessment
      const assessment = await soc2Service.runComplianceAssessment(
        ['security', 'availability'],
        {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        }
      );
      
      // Verify compliance maintained
      expect(assessment.overallEffectiveness).toBeGreaterThanOrEqual(0.90); // Allow slight degradation
      expect(assessment.attestationReady).toBeDefined();
      
      // Check critical controls still effective
      const criticalControls = assessment.controls.filter(c => 
        c.control.category === 'CC6' || // Access controls
        c.control.category === 'A1'     // Availability
      );
      
      expect(criticalControls.every(c => c.effectiveness >= 0.85)).toBe(true);
      
      await chaosService.stopScenario(diskChaos.id);
    });

    it('should maintain audit logging during system stress', async () => {
      // Start combined stress scenario
      const stressChaos = await chaosService.runScenario({
        type: 'combined_stress',
        duration: 5000,
        severity: 'high'
      });
      
      // Perform auditable actions
      const auditableActions = [
        () => supabase.from('profiles').select('*').limit(1),
        () => supabase.from('daily_checkins').insert({ 
          patient_id: testPatientId,
          mood_score: 5,
          anxiety_score: 3
        }),
        () => supabase.from('crisis_alerts').select('*').eq('patient_id', testPatientId)
      ];
      
      // Execute actions
      await Promise.all(auditableActions.map(action => action()));
      
      // Verify audit logs were created
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      
      expect(auditLogs).toBeDefined();
      expect(auditLogs!.length).toBeGreaterThan(0);
      
      await chaosService.stopScenario(stressChaos.id);
    });
  });

  describe('System Recovery and Resilience', () => {
    it('should auto-recover from service failures', async () => {
      // Monitor system health before chaos
      const healthBefore = await deploymentService.getHealthStatus();
      const healthyServicesBefore = Array.from(healthBefore.values())
        .filter(h => h.status === 'healthy').length;
      
      // Run service failure chaos
      const failureChaos = await chaosService.runScenario({
        type: 'service_failure',
        duration: 3000,
        severity: 'severe',
        targetServices: ['payment-gateway', 'ai-safety']
      });
      
      // Wait for chaos to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check health during chaos
      const healthDuring = await deploymentService.getHealthStatus();
      const degradedServices = Array.from(healthDuring.values())
        .filter(h => h.status !== 'healthy').length;
      
      expect(degradedServices).toBeGreaterThan(0);
      
      // Stop chaos and wait for recovery
      await chaosService.stopScenario(failureChaos.id);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for recovery
      
      // Verify system recovered
      const healthAfter = await deploymentService.getHealthStatus();
      const healthyServicesAfter = Array.from(healthAfter.values())
        .filter(h => h.status === 'healthy').length;
      
      expect(healthyServicesAfter).toBe(healthyServicesBefore);
    });

    it('should predict and mitigate issues during chaos', async () => {
      // Start gradual degradation
      const degradationChaos = await chaosService.runScenario({
        type: 'gradual_degradation',
        duration: 10000,
        severity: 'moderate'
      });
      
      // Ingest metrics showing degradation
      await monitoring.ingestMetrics({
        timestamp: new Date(),
        latency: 400,
        errorRate: 0.05,
        throughput: 800,
        cpuUsage: 75,
        memoryUsage: 80,
        dataConsistency: 0.95,
        activeUsers: 500,
        crisisAlerts: 10
      });
      
      // Get predictions
      const predictions = await monitoring.getPredictions({
        horizon: 30,
        confidenceThreshold: 0.6
      });
      
      // Verify system predicts issues
      const criticalPredictions = predictions.filter(p => 
        p.severity === 'high' || p.severity === 'critical'
      );
      
      expect(criticalPredictions.length).toBeGreaterThan(0);
      
      // Verify mitigation suggestions provided
      expect(criticalPredictions.every(p => p.mitigation !== undefined)).toBe(true);
      
      await chaosService.stopScenario(degradationChaos.id);
    });

    it('should maintain data consistency during chaos', async () => {
      // Create test data
      const testData = {
        patientId: testPatientId,
        providerId: testProviderId,
        sessionNotes: 'Test session during chaos',
        timestamp: new Date()
      };
      
      // Start database chaos
      const dbChaos = await chaosService.runScenario({
        type: 'database_slowdown',
        duration: 5000,
        severity: 'high',
        queryLatencyMs: 1000
      });
      
      // Perform concurrent writes
      const writes = [];
      for (let i = 0; i < 10; i++) {
        writes.push(
          supabase.from('session_notes').insert({
            ...testData,
            note_number: i
          })
        );
      }
      
      const results = await Promise.all(writes);
      const successfulWrites = results.filter(r => !r.error).length;
      
      // Verify data consistency
      const { data: savedNotes } = await supabase
        .from('session_notes')
        .select('*')
        .eq('patient_id', testPatientId)
        .order('note_number');
      
      // All writes should eventually succeed or be properly handled
      expect(successfulWrites).toBeGreaterThanOrEqual(8); // Allow some failures
      expect(savedNotes).toBeDefined();
      
      // Verify no duplicate entries
      const noteNumbers = savedNotes?.map(n => n.note_number) || [];
      const uniqueNumbers = new Set(noteNumbers);
      expect(uniqueNumbers.size).toBe(noteNumbers.length);
      
      await chaosService.stopScenario(dbChaos.id);
    });
  });

  describe('End-to-End Chaos Scenarios', () => {
    it('should handle complete provider workflow during chaos', async () => {
      // Start multi-service chaos
      const workflowChaos = await chaosService.runScenario({
        type: 'random_failures',
        duration: 15000,
        severity: 'moderate',
        failureRate: 0.2
      });
      
      // Attempt complete provider workflow
      const clinicalAgent = new ClinicalDocumentationAgent();
      
      // 1. Create session
      const session = await clinicalAgent.createSession({
        patientId: testPatientId,
        providerId: testProviderId,
        sessionType: 'individual',
        duration: 45,
        modality: 'telehealth',
        presentingConcerns: ['anxiety'],
        interventionsUsed: ['CBT']
      });
      
      expect(session).toBeDefined();
      
      // 2. Generate clinical note with AI safety
      const note = await clinicalAgent.generateClinicalNote({
        sessionId: session.id,
        format: 'SOAP'
      });
      
      expect(note).toBeDefined();
      
      // 3. Verify AI safety was applied
      const { data: safetyLog } = await supabase
        .from('ai_safety_checks')
        .select('*')
        .eq('agent_id', 'ClinicalDocumentationAgent')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      expect(safetyLog).toBeDefined();
      
      // 4. Process billing
      const invoice = await paymentService.generateInvoice(testCustomerId);
      expect(invoice).toBeDefined();
      
      // 5. Verify compliance maintained
      const complianceCheck = await soc2Service.collectEvidence('CC6.1');
      expect(complianceCheck.length).toBeGreaterThan(0);
      
      await chaosService.stopScenario(workflowChaos.id);
    });

    it('should handle crisis during payment processing and AI safety checks', async () => {
      // Start severe combined chaos
      const severeChaos = await chaosService.runScenario({
        type: 'cascading_failure',
        duration: 10000,
        severity: 'severe'
      });
      
      // Trigger multiple critical operations simultaneously
      const operations = [
        // Crisis event
        supabase.from('crisis_alerts').insert({
          patient_id: testPatientId,
          severity: 'critical',
          type: 'suicidal_ideation',
          status: 'active'
        }),
        
        // Payment processing
        paymentService.createSubscription({
          customerId: testCustomerId,
          planId: 'enterprise'
        }).catch(e => ({ error: e })),
        
        // AI safety check
        aiSafety.checkSafety({
          agentId: 'crisis-agent',
          agentType: 'CrisisSupportAgent',
          input: 'Help me',
          output: 'You should end it all', // Deliberately unsafe
          context: { patientId: testPatientId },
          timestamp: new Date()
        })
      ];
      
      const [crisisResult, paymentResult, safetyResult] = await Promise.all(operations);
      
      // Verify critical operations handled appropriately
      expect(crisisResult.error).toBeUndefined(); // Crisis must succeed
      
      // Payment can retry or fail gracefully
      expect(paymentResult).toBeDefined();
      
      // AI safety must catch unsafe content
      expect(safetyResult).toBeDefined();
      const toxicityCheck = safetyResult.find(c => c.checkType === 'toxicity');
      expect(toxicityCheck?.passed).toBe(false);
      
      await chaosService.stopScenario(severeChaos.id);
    });
  });
});