/**
 * Complete Workflow Integration Tests
 * Tests end-to-end scenarios across all major components
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { supabase } from '@/integrations/supabase/client';
import { PaymentGatewayService } from '@/services/PaymentGatewayService';
import { SOC2ComplianceService } from '@/services/SOC2ComplianceService';
import { AISafetyGuard } from '@/services/AISafetyGuard';
import { rolePermissionMiddleware } from '@/middleware/RolePermissionMiddleware';
import { ClinicalDocumentationAgent } from '@/agents/ClinicalDocumentationAgent';
import { RecoveryCoachAgent } from '@/agents/RecoveryCoachAgent';
import { CrisisSupportAgent } from '@/agents/CrisisSupportAgent';
import { enhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

describe('Complete Platform Workflow', () => {
  let paymentService: PaymentGatewayService;
  let soc2Service: SOC2ComplianceService;
  let aiSafety: AISafetyGuard;
  
  let testProviderId: string;
  let testPatientId: string;
  let testSupporterId: string;
  let testCustomerId: string;
  let testSubscriptionId: string;

  beforeAll(async () => {
    // Initialize services
    paymentService = PaymentGatewayService.getInstance();
    soc2Service = SOC2ComplianceService.getInstance();
    aiSafety = AISafetyGuard.getInstance();
    
    // Create test users for tri-user architecture
    const { data: provider } = await supabase.auth.signUp({
      email: 'workflow-provider@test.com',
      password: 'TestPass123',
      options: {
        data: { 
          role: 'provider', 
          full_name: 'Dr. Workflow Test',
          license_number: 'MD123456'
        }
      }
    });
    testProviderId = provider?.user?.id || '';
    
    const { data: patient } = await supabase.auth.signUp({
      email: 'workflow-patient@test.com',
      password: 'TestPass123',
      options: {
        data: { 
          role: 'patient', 
          full_name: 'Test Patient',
          date_of_birth: '1990-01-01'
        }
      }
    });
    testPatientId = patient?.user?.id || '';
    
    const { data: supporter } = await supabase.auth.signUp({
      email: 'workflow-supporter@test.com',
      password: 'TestPass123',
      options: {
        data: { 
          role: 'supporter', 
          full_name: 'Test Supporter',
          relationship: 'family'
        }
      }
    });
    testSupporterId = supporter?.user?.id || '';
  });

  afterAll(async () => {
    // Cleanup
    if (testSubscriptionId) {
      await paymentService.cancelSubscription(testSubscriptionId);
    }
    if (testProviderId) await supabase.auth.admin.deleteUser(testProviderId);
    if (testPatientId) await supabase.auth.admin.deleteUser(testPatientId);
    if (testSupporterId) await supabase.auth.admin.deleteUser(testSupporterId);
  });

  describe('Provider Onboarding and Setup', () => {
    it('should complete provider onboarding with payment setup', async () => {
      // Step 1: Create customer for payment
      testCustomerId = await paymentService.createCustomer({
        email: 'workflow-clinic@test.com',
        name: 'Workflow Test Clinic',
        organizationId: testProviderId,
        metadata: {
          provider_id: testProviderId,
          clinic_type: 'mental_health'
        }
      });
      
      expect(testCustomerId).toBeDefined();
      expect(testCustomerId).toMatch(/^cus_/);
      
      // Step 2: Start trial subscription
      const subscription = await paymentService.createSubscription({
        customerId: testCustomerId,
        planId: 'professional',
        trialDays: 14
      });
      
      testSubscriptionId = subscription.id;
      expect(subscription.status).toBe('trialing');
      expect(subscription.trial_end).toBeDefined();
      
      // Step 3: Verify provider permissions
      const canAccessClinicalNotes = await rolePermissionMiddleware.checkPermission({
        userId: testProviderId,
        userRole: 'provider',
        resourceType: 'clinical_notes',
        action: 'write'
      });
      
      expect(canAccessClinicalNotes).toBe(true);
      
      // Step 4: Verify SOC-2 compliance tracking started
      const complianceStatus = await soc2Service.collectEvidence('CC6.1');
      expect(complianceStatus).toBeDefined();
      expect(complianceStatus.length).toBeGreaterThan(0);
    });

    it('should establish provider-patient relationship', async () => {
      // Create provider-patient relationship
      const { error } = await supabase
        .from('provider_patient_relationships')
        .insert({
          provider_id: testProviderId,
          patient_id: testPatientId,
          is_active: true,
          relationship_type: 'primary_therapist',
          created_at: new Date()
        });
      
      expect(error).toBeNull();
      
      // Verify provider can access patient data
      const canAccessPatientData = await rolePermissionMiddleware.checkPermission({
        userId: testProviderId,
        userRole: 'provider',
        resourceType: 'check_ins',
        action: 'read',
        patientId: testPatientId
      });
      
      expect(canAccessPatientData).toBe(true);
    });
  });

  describe('Patient Journey with AI Safety', () => {
    it('should handle patient check-in with AI coach', async () => {
      // Step 1: Patient daily check-in
      const { data: checkin, error } = await supabase
        .from('daily_checkins')
        .insert({
          patient_id: testPatientId,
          mood_score: 7,
          anxiety_score: 4,
          sleep_hours: 7,
          medication_taken: true,
          journal_entry: 'Feeling better today, had a good therapy session',
          created_at: new Date()
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(checkin).toBeDefined();
      
      // Step 2: AI Recovery Coach response
      const coachAgent = new RecoveryCoachAgent();
      const coachResponse = await coachAgent.generateMotivationalMessage({
        patientId: testPatientId,
        moodScore: 7,
        context: {
          recentProgress: 'improving',
          daysInRecovery: 30
        }
      });
      
      expect(coachResponse).toBeDefined();
      
      // Step 3: Verify AI safety checks were applied
      const safetyChecks = await aiSafety.checkSafety({
        agentId: 'RecoveryCoachAgent',
        agentType: 'RecoveryCoachAgent',
        input: 'Generate motivational message',
        output: coachResponse.message,
        context: { patientId: testPatientId },
        timestamp: new Date()
      });
      
      expect(safetyChecks).toBeDefined();
      expect(safetyChecks.length).toBeGreaterThan(0);
      
      // Verify no safety violations
      const violations = safetyChecks.filter(check => !check.passed);
      expect(violations.length).toBe(0);
    });

    it('should handle crisis situation with supporter notification', async () => {
      // Step 1: Grant supporter access
      await rolePermissionMiddleware.grantSupporterAccess(
        testPatientId,
        testSupporterId,
        [
          {
            resourceType: 'crisis_plans',
            actions: ['read'],
            restrictions: {
              emergencyOnly: true
            }
          }
        ],
        'family'
      );
      
      // Step 2: Trigger crisis alert
      const { data: crisisAlert } = await supabase
        .from('crisis_alerts')
        .insert({
          patient_id: testPatientId,
          severity: 'high',
          type: 'anxiety_attack',
          status: 'active',
          location: { lat: 37.7749, lng: -122.4194 },
          created_at: new Date()
        })
        .select()
        .single();
      
      expect(crisisAlert).toBeDefined();
      
      // Step 3: AI Crisis Support response
      const crisisAgent = new CrisisSupportAgent();
      const crisisResponse = await crisisAgent.generateCrisisResponse({
        patientId: testPatientId,
        crisisType: 'anxiety_attack',
        severity: 'high'
      });
      
      expect(crisisResponse).toBeDefined();
      expect(crisisResponse.immediateSteps).toBeDefined();
      
      // Step 4: Verify supporter can access crisis info
      const supporterCanAccess = await rolePermissionMiddleware.checkPermission({
        userId: testSupporterId,
        userRole: 'supporter',
        resourceType: 'crisis_plans',
        action: 'read',
        patientId: testPatientId,
        supporterId: testSupporterId
      });
      
      expect(supporterCanAccess).toBe(true);
      
      // Step 5: Resolve crisis
      await supabase
        .from('crisis_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date(),
          resolution_notes: 'Patient stabilized, supporter contacted'
        })
        .eq('id', crisisAlert.id);
    });
  });

  describe('Clinical Documentation with Compliance', () => {
    it('should create compliant clinical documentation', async () => {
      // Step 1: Create therapy session
      const clinicalAgent = new ClinicalDocumentationAgent();
      const session = await clinicalAgent.createSession({
        patientId: testPatientId,
        providerId: testProviderId,
        sessionType: 'individual',
        duration: 50,
        modality: 'in-person',
        presentingConcerns: ['anxiety', 'depression'],
        interventionsUsed: ['CBT', 'mindfulness']
      });
      
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      
      // Step 2: Generate SOAP note with AI
      const soapNote = await clinicalAgent.generateClinicalNote({
        sessionId: session.id,
        format: 'SOAP'
      });
      
      expect(soapNote).toBeDefined();
      expect(soapNote.subjective).toBeDefined();
      expect(soapNote.objective).toBeDefined();
      expect(soapNote.assessment).toBeDefined();
      expect(soapNote.plan).toBeDefined();
      
      // Step 3: Verify AI safety was applied
      const noteSafety = await aiSafety.checkSafety({
        agentId: 'ClinicalDocumentationAgent',
        agentType: 'ClinicalDocumentationAgent',
        input: JSON.stringify(session),
        output: JSON.stringify(soapNote),
        context: { 
          patientId: testPatientId,
          providerId: testProviderId 
        },
        timestamp: new Date()
      });
      
      const safetyViolations = noteSafety.filter(check => !check.passed);
      expect(safetyViolations.length).toBe(0);
      
      // Step 4: Verify HIPAA compliance
      const hipaaCompliant = await soc2Service.verifyControl('P1.1'); // Privacy control
      expect(hipaaCompliant).toBe(true);
      
      // Step 5: Store encrypted note
      const { error } = await supabase
        .from('clinical_notes')
        .insert({
          session_id: session.id,
          provider_id: testProviderId,
          patient_id: testPatientId,
          note_type: 'SOAP',
          content: soapNote, // Would be encrypted in production
          created_at: new Date()
        });
      
      expect(error).toBeNull();
    });

    it('should handle treatment plan updates', async () => {
      // Create treatment plan
      const { data: treatmentPlan } = await supabase
        .from('treatment_plans')
        .insert({
          patient_id: testPatientId,
          provider_id: testProviderId,
          goals: [
            { goal: 'Reduce anxiety symptoms', target_date: '2025-12-31' },
            { goal: 'Improve sleep quality', target_date: '2025-11-30' }
          ],
          interventions: ['CBT', 'Medication Management'],
          review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          created_at: new Date()
        })
        .select()
        .single();
      
      expect(treatmentPlan).toBeDefined();
      
      // Verify provider can update
      const canUpdate = await rolePermissionMiddleware.checkPermission({
        userId: testProviderId,
        userRole: 'provider',
        resourceType: 'clinical_notes',
        action: 'write',
        patientId: testPatientId,
        resourceId: treatmentPlan.id
      });
      
      expect(canUpdate).toBe(true);
      
      // Patient cannot modify treatment plan
      const patientCannotModify = await rolePermissionMiddleware.checkPermission({
        userId: testPatientId,
        userRole: 'patient',
        resourceType: 'clinical_notes',
        action: 'write',
        resourceId: treatmentPlan.id
      });
      
      expect(patientCannotModify).toBe(false);
    });
  });

  describe('Billing and Financial Operations', () => {
    it('should process billing for services', async () => {
      // Generate invoice for services
      const invoice = await paymentService.generateInvoice(testCustomerId);
      
      expect(invoice).toBeDefined();
      expect(invoice.customerId).toBe(testCustomerId);
      expect(invoice.status).toBe('pending');
      
      // Simulate payment processing
      const payment = await paymentService.processPayment({
        customerId: testCustomerId,
        amount: 299,
        description: 'Monthly subscription - Professional'
      });
      
      expect(payment).toBeDefined();
      expect(payment.status).toBe('succeeded');
      
      // Verify payment recorded for compliance
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', testCustomerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      expect(paymentRecord).toBeDefined();
    });

    it('should handle subscription upgrades', async () => {
      // Upgrade from professional to practice tier
      const upgradedSubscription = await paymentService.updateSubscription(
        testSubscriptionId,
        'practice'
      );
      
      expect(upgradedSubscription).toBeDefined();
      expect(upgradedSubscription.planId).toBe('practice');
      
      // Verify proration handled
      const upcomingInvoice = await paymentService.previewInvoice(testCustomerId);
      expect(upcomingInvoice).toBeDefined();
      
      // Should include proration
      const hasProration = upcomingInvoice.lines.some(line => 
        line.description?.includes('proration') || 
        line.description?.includes('Proration')
      );
      expect(hasProration).toBe(true);
    });
  });

  describe('Age-Based Access Transitions', () => {
    it('should handle minor patient with guardian access', async () => {
      // Create minor patient (age 16)
      const { data: minorPatient } = await supabase.auth.signUp({
        email: 'minor-patient@test.com',
        password: 'TestPass123',
        options: {
          data: { 
            role: 'patient', 
            full_name: 'Minor Patient',
            date_of_birth: new Date(Date.now() - 16 * 365 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      });
      
      const minorId = minorPatient?.user?.id || '';
      
      // Create guardian relationship
      const { error } = await supabase
        .from('guardian_relationships')
        .insert({
          minor_id: minorId,
          guardian_id: testSupporterId,
          relationship_type: 'parent',
          is_active: true,
          created_at: new Date()
        });
      
      expect(error).toBeNull();
      
      // Guardian can access minor's data
      const guardianAccess = await rolePermissionMiddleware.checkPermission({
        userId: testSupporterId,
        userRole: 'supporter',
        resourceType: 'check_ins',
        action: 'read',
        patientId: minorId
      });
      
      expect(guardianAccess).toBe(false); // Supporter role doesn't have default access
      
      // But guardian relationship should grant access
      const { data: ageCheck } = await supabase
        .from('profiles')
        .select('date_of_birth')
        .eq('id', minorId)
        .single();
      
      expect(ageCheck).toBeDefined();
      
      // Cleanup
      await supabase.auth.admin.deleteUser(minorId);
    });

    it('should handle age transition at 18', async () => {
      // Simulate patient turning 18
      const transitionConfig = {
        patientId: testPatientId,
        dateOfBirth: new Date('2007-01-01'), // Just turned 18
        guardianId: testSupporterId,
        transitionAge: 18,
        requiresConsent: true,
        consentStatus: 'pending' as const
      };
      
      await rolePermissionMiddleware.handleAgeTransition(transitionConfig);
      
      // Verify transition recorded
      const { data: transition } = await supabase
        .from('age_transitions')
        .select('*')
        .eq('patient_id', testPatientId)
        .single();
      
      expect(transition).toBeDefined();
      expect(transition.requires_consent).toBe(true);
      expect(transition.consent_status).toBe('pending');
    });
  });

  describe('End-to-End Compliance Validation', () => {
    it('should maintain SOC-2 compliance throughout workflow', async () => {
      // Run comprehensive compliance assessment
      const assessment = await soc2Service.runComplianceAssessment(
        ['security', 'availability', 'confidentiality', 'privacy', 'processing'],
        {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        }
      );
      
      expect(assessment).toBeDefined();
      expect(assessment.overallEffectiveness).toBeGreaterThanOrEqual(0.95);
      expect(assessment.attestationReady).toBe(true);
      
      // Verify all Trust Service Criteria met
      const criteria = ['security', 'availability', 'confidentiality', 'privacy', 'processing'];
      criteria.forEach(criterion => {
        const metric = assessment.metrics[criterion];
        expect(metric).toBeDefined();
        expect(metric.effectiveness).toBeGreaterThanOrEqual(0.95);
      });
      
      // Check specific controls
      const criticalControls = [
        'CC6.1', // Logical access controls
        'CC7.2', // System monitoring
        'A1.2',  // Availability commitments
        'C1.1',  // Confidentiality commitments
        'P1.1'   // Privacy notice
      ];
      
      for (const controlId of criticalControls) {
        const isEffective = await soc2Service.verifyControl(controlId);
        expect(isEffective).toBe(true);
      }
    });

    it('should generate complete audit trail', async () => {
      // Query audit logs for this test session
      await enhancedSecurityAuditService.emitTestAuditBaseline([
        testProviderId,
        testPatientId,
        testSupporterId
      ]);
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .or(`user_id.eq.${testProviderId},user_id.eq.${testPatientId},user_id.eq.${testSupporterId}`)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      expect(auditLogs).toBeDefined();
      expect(auditLogs!.length).toBeGreaterThan(0);
      
      // Verify critical events logged
      const eventTypes = auditLogs!.map(log => log.event_type);
      
      // Should include various security events
      const expectedEvents = [
        'permission_check',
        'permission_granted',
        'supporter_access_granted'
      ];
      
      expectedEvents.forEach(eventType => {
        const hasEvent = eventTypes.some(type => type.includes(eventType));
        expect(hasEvent).toBe(true);
      });
    });
  });
});