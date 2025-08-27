import { test, expect } from '@playwright/test';
import { TestHelpers } from '../../utils/test-helpers';
import { MockTwilioService } from '../../mocks/twilio-mock';
import { MockSendGridService } from '../../mocks/sendgrid-mock';
import { MockFCMService } from '../../mocks/fcm-mock';

test.describe('Crisis Alert Escalation', () => {
  let testHelpers: TestHelpers;
  let mockTwilio: MockTwilioService;
  let mockSendGrid: MockSendGridService;
  let mockFCM: MockFCMService;
  let patientUser: any;
  let supportContacts: any[];
  let providerUser: any;
  let emergencyServices: any;

  test.beforeAll(async () => {
    testHelpers = new TestHelpers();
    mockTwilio = new MockTwilioService();
    mockSendGrid = new MockSendGridService();
    mockFCM = new MockFCMService();
    
    await testHelpers.setupTestEnvironment();
    
    // Create patient user
    patientUser = await testHelpers.createTestUser({
      email: 'crisis-patient@test.com',
      role: 'patient',
      phone: '+1234567890',
      firstName: 'Sarah',
      lastName: 'Johnson',
      emergencyContactsEnabled: true
    });

    // Create provider
    providerUser = await testHelpers.createTestUser({
      email: 'crisis-provider@test.com',
      role: 'provider',
      phone: '+1555000001',
      firstName: 'Dr. Jane',
      lastName: 'Smith',
      onCallSchedule: true
    });

    // Create support network
    supportContacts = [
      await testHelpers.createSupportContact({
        userId: patientUser.id,
        name: 'Mom - Linda',
        phone: '+1555000010',
        email: 'linda.johnson@email.com',
        relationship: 'mother',
        priority: 1,
        crisisEnabled: true,
        availableHours: '24/7'
      }),
      await testHelpers.createSupportContact({
        userId: patientUser.id,
        name: 'Brother - Mike',
        phone: '+1555000011',
        email: 'mike.johnson@email.com',
        relationship: 'sibling',
        priority: 2,
        crisisEnabled: true,
        availableHours: '8:00-22:00'
      }),
      await testHelpers.createSupportContact({
        userId: patientUser.id,
        name: 'Best Friend - Amy',
        phone: '+1555000012',
        email: 'amy.wilson@email.com',
        relationship: 'friend',
        priority: 3,
        crisisEnabled: true,
        availableHours: '9:00-18:00'
      })
    ];

    // Configure emergency services
    emergencyServices = await testHelpers.setupEmergencyServices({
      localCrisisLine: '+1988000001',
      nationalSuicidePrevention: '+1988',
      emergencyMedical: '+1911'
    });
  });

  test.afterAll(async () => {
    await testHelpers.cleanup();
  });

  test.beforeEach(async () => {
    mockTwilio.reset();
    mockSendGrid.reset();
    mockFCM.reset();
  });

  test('should trigger immediate crisis escalation for high-risk keywords', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestSerenity2024!@#');
    
    // Navigate to crisis support page
    await page.goto('/crisis-support');
    await page.waitForSelector('[data-testid="crisis-help-form"]');

    // Submit high-risk crisis message
    await page.fill('[data-testid="crisis-message"]', 
      'I am having thoughts of ending my life and have a plan');
    await page.click('[data-testid="submit-crisis-alert"]');

    // Should immediately show crisis response
    await expect(page.locator('[data-testid="crisis-response-active"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-level"]')).toContainText('CRITICAL');
    await expect(page.locator('[data-testid="emergency-contacts-notified"]')).toBeVisible();

    // Wait for escalation processing
    await page.waitForTimeout(5000);

    // Verify immediate notifications sent to all crisis contacts
    const smsNotifications = mockTwilio.getSentSMS();
    const criticalSMS = smsNotifications.filter(sms => 
      sms.body.includes('CRISIS ALERT - IMMEDIATE ACTION REQUIRED')
    );

    // Should notify patient, all support contacts, and provider
    expect(criticalSMS.length).toBeGreaterThanOrEqual(5);

    // Verify patient gets immediate crisis resources
    const patientSMS = criticalSMS.find(sms => sms.to === patientUser.phone);
    expect(patientSMS).toBeDefined();
    expect(patientSMS?.body).toContain('Crisis resources are being activated');
    expect(patientSMS?.body).toContain('Call 988 for immediate help');

    // Verify support contacts get detailed alert
    const supportSMS = criticalSMS.filter(sms => 
      supportContacts.some(contact => contact.phone === sms.to)
    );
    
    expect(supportSMS).toHaveLength(3);
    supportSMS.forEach(sms => {
      expect(sms.body).toContain('Sarah Johnson has triggered a CRISIS ALERT');
      expect(sms.body).toContain('Please reach out immediately');
      expect(sms.body).toMatch(/Location:.*approximate/i);
    });

    // Verify provider notification
    const providerSMS = criticalSMS.find(sms => sms.to === providerUser.phone);
    expect(providerSMS).toBeDefined();
    expect(providerSMS?.body).toContain('PATIENT CRISIS ALERT');
    expect(providerSMS?.body).toContain('Sarah Johnson');

    // Verify comprehensive audit logging
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'CRISIS_ALERT_TRIGGERED',
      userId: patientUser.id
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].details).toMatchObject({
      severity: 'critical',
      riskFactors: expect.arrayContaining(['suicidal_ideation', 'plan_mentioned']),
      escalationLevel: 'immediate',
      contactsNotified: expect.arrayContaining([
        'patient', 'emergency_contacts', 'provider'
      ]),
      emergencyServicesAlerted: false // Not yet
    });
  });

  test('should escalate to emergency services after no response timeout', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestSerenity2024!@#');
    
    // Trigger high-severity crisis
    await page.goto('/crisis-support');
    await page.fill('[data-testid="crisis-message"]', 
      'I have the pills ready and I am going to take them all');
    await page.click('[data-testid="submit-crisis-alert"]');

    await page.waitForTimeout(2000);

    // Simulate no response from support contacts (mock no response)
    await testHelpers.mockSupportContactResponses({
      responses: [] // No one responds initially
    });

    // Fast-forward time to trigger escalation timeout (normally 15 minutes, shortened for test)
    await testHelpers.fastForwardTime(900000); // 15 minutes
    await testHelpers.processEscalationQueue();

    await page.waitForTimeout(3000);

    // Should escalate to emergency services
    const emergencyAlerts = await testHelpers.getEmergencyServiceAlerts();
    expect(emergencyAlerts).toHaveLength(1);
    expect(emergencyAlerts[0]).toMatchObject({
      patientId: patientUser.id,
      alertType: 'suicide_risk',
      location: expect.any(Object),
      contactAttempts: expect.arrayContaining(['support_network', 'provider']),
      escalationReason: 'no_response_timeout'
    });

    // Should send final attempt notifications
    const finalSMS = mockTwilio.getSentSMS();
    const finalAlerts = finalSMS.filter(sms => 
      sms.body.includes('FINAL ALERT - EMERGENCY SERVICES CONTACTED')
    );

    expect(finalAlerts.length).toBeGreaterThan(0);

    // Verify emergency services notification includes all critical details
    expect(emergencyAlerts[0].patientDetails).toMatchObject({
      name: 'Sarah Johnson',
      phone: '+1234567890',
      lastKnownMessage: expect.stringContaining('pills ready'),
      riskLevel: 'imminent',
      medicalHistory: expect.any(Array)
    });

    // Verify escalation audit trail
    const escalationLog = await testHelpers.getAuditLogs({
      eventType: 'CRISIS_ESCALATED_EMERGENCY_SERVICES',
      userId: patientUser.id
    });

    expect(escalationLog).toHaveLength(1);
    expect(escalationLog[0].details).toMatchObject({
      originalAlertTime: expect.any(String),
      escalationTime: expect.any(String),
      attemptedContacts: expect.any(Array),
      emergencyServiceAlerted: true,
      escalationReason: 'no_response_timeout'
    });
  });

  test('should handle tiered escalation based on response availability', async ({ page }) => {
    // Set current time to evening (some contacts unavailable)
    const eveningTime = new Date();
    eveningTime.setHours(20, 0, 0, 0);
    await testHelpers.mockCurrentTime(eveningTime);

    await testHelpers.login(page, patientUser.email, 'TestSerenity2024!@#');
    
    await page.goto('/crisis-support');
    await page.fill('[data-testid="crisis-message"]', 
      'I feel completely hopeless and don\'t know what to do');
    await page.click('[data-testid="submit-crisis-alert"]');

    await page.waitForTimeout(3000);

    // Should follow tiered escalation based on availability
    const smsNotifications = mockTwilio.getSentSMS();
    
    // Mom (24/7 availability) should be contacted immediately
    const momAlert = smsNotifications.find(sms => sms.to === '+1555000010');
    expect(momAlert).toBeDefined();
    expect(momAlert?.priority).toBe('high');

    // Brother (8-22 availability) should be contacted immediately (within hours)
    const brotherAlert = smsNotifications.find(sms => sms.to === '+1555000011');
    expect(brotherAlert).toBeDefined();

    // Friend (9-18 availability) should NOT be contacted immediately (outside hours)
    const friendAlert = smsNotifications.find(sms => sms.to === '+1555000012');
    expect(friendAlert).toBeUndefined();

    // But friend should be scheduled for morning contact
    const scheduledContacts = await testHelpers.getScheduledNotifications({
      recipientPhone: '+1555000012',
      type: 'crisis_alert'
    });

    expect(scheduledContacts).toHaveLength(1);
    const scheduledTime = new Date(scheduledContacts[0].scheduledFor);
    expect(scheduledTime.getHours()).toBe(9); // Scheduled for 9 AM

    // Verify availability-based escalation logged
    const availabilityLog = await testHelpers.getAuditLogs({
      eventType: 'CRISIS_ESCALATION_AVAILABILITY_CHECK',
      userId: patientUser.id
    });

    expect(availabilityLog).toHaveLength(1);
    expect(availabilityLog[0].details.contactAvailability).toMatchObject({
      immediate: ['mother', 'sibling'],
      delayed: ['friend'],
      unavailable: []
    });

    await testHelpers.restoreCurrentTime();
  });

  test('should adjust escalation based on previous crisis response patterns', async ({ page }) => {
    // Set up patient history with previous crisis responses
    await testHelpers.createCrisisHistory(patientUser.id, [
      {
        date: '2024-01-10',
        severity: 'moderate',
        responseTime: 120, // 2 minutes
        respondedContacts: ['mother'],
        resolution: 'de-escalated'
      },
      {
        date: '2024-01-05',
        severity: 'high', 
        responseTime: 480, // 8 minutes
        respondedContacts: ['sibling', 'friend'],
        resolution: 'professional_intervention'
      }
    ]);

    await testHelpers.login(page, patientUser.email, 'TestSerenity2024!@#');
    
    await page.goto('/crisis-support');
    await page.fill('[data-testid="crisis-message"]', 
      'Having a really bad day, thoughts are racing');
    await page.click('[data-testid="submit-crisis-alert"]');

    await page.waitForTimeout(2000);

    // Should prioritize mother based on previous fastest response
    const smsNotifications = mockTwilio.getSentSMS();
    const motherNotification = smsNotifications.find(sms => sms.to === '+1555000010');
    
    expect(motherNotification).toBeDefined();
    expect(motherNotification?.priority).toBe('high');
    
    // Should include context from history
    expect(motherNotification?.body).toContain('Previous response: 2 min');

    // Should adjust timeout based on historical patterns
    const escalationSchedule = await testHelpers.getCrisisEscalationSchedule(patientUser.id);
    
    expect(escalationSchedule).toMatchObject({
      firstFollowUp: 180000, // 3 minutes (adjusted from standard 5)
      providerEscalation: 300000, // 5 minutes (adjusted from standard 10)
      emergencyEscalation: 600000, // 10 minutes (adjusted from standard 15)
      adjustmentReason: 'historical_response_patterns'
    });

    // Verify pattern analysis logged
    const patternLog = await testHelpers.getAuditLogs({
      eventType: 'CRISIS_PATTERN_ANALYSIS_APPLIED',
      userId: patientUser.id
    });

    expect(patternLog).toHaveLength(1);
    expect(patternLog[0].details).toMatchObject({
      previousCrisisCount: 2,
      averageResponseTime: 300, // 5 minutes average
      mostResponsiveContact: 'mother',
      escalationAdjustments: expect.any(Object)
    });
  });

  test('should handle multiple concurrent crisis alerts from same user', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestSerenity2024!@#');
    
    // Trigger first crisis alert
    await page.goto('/crisis-support');
    await page.fill('[data-testid="crisis-message"]', 
      'I am really struggling right now');
    await page.click('[data-testid="submit-crisis-alert"]');

    await page.waitForTimeout(1000);

    // Immediately trigger second crisis alert (panic/escalation)
    await page.fill('[data-testid="crisis-message"]', 
      'It\'s getting worse, I need help now');
    await page.click('[data-testid="submit-crisis-alert"]');

    await page.waitForTimeout(2000);

    // Should recognize escalation and intensify response
    const smsNotifications = mockTwilio.getSentSMS();
    
    // Should send escalated alerts
    const escalatedAlerts = smsNotifications.filter(sms => 
      sms.body.includes('ESCALATED CRISIS ALERT')
    );
    
    expect(escalatedAlerts.length).toBeGreaterThan(0);

    // Should include time between alerts in notifications
    const supportAlert = escalatedAlerts.find(sms => sms.to === '+1555000010');
    expect(supportAlert?.body).toMatch(/Alert escalated within \d+ seconds?/);

    // Should consolidate rather than duplicate notifications
    const totalUniqueRecipients = [...new Set(smsNotifications.map(sms => sms.to))];
    expect(totalUniqueRecipients.length).toBeLessThanOrEqual(6); // Patient + 3 contacts + provider + emergency

    // Verify escalation pattern detected
    const escalationLog = await testHelpers.getAuditLogs({
      eventType: 'CRISIS_RAPID_ESCALATION_DETECTED',
      userId: patientUser.id
    });

    expect(escalationLog).toHaveLength(1);
    expect(escalationLog[0].details).toMatchObject({
      initialAlertTime: expect.any(String),
      escalatedAlertTime: expect.any(String),
      timeBetweenAlerts: expect.any(Number),
      escalationTrigger: 'rapid_succession'
    });
  });

  test('should provide real-time crisis status updates to support network', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestSerenity2024!@#');
    
    // Trigger crisis alert
    await page.goto('/crisis-support');
    await page.fill('[data-testid="crisis-message"]', 'Need support urgently');
    await page.click('[data-testid="submit-crisis-alert"]');

    await page.waitForTimeout(2000);

    // Simulate first support contact responding
    await testHelpers.simulateSupportResponse({
      contactPhone: '+1555000010',
      responseType: 'acknowledged',
      message: 'On my way to Sarah now',
      estimatedArrival: 15 // minutes
    });

    await page.waitForTimeout(1000);

    // Other support contacts should get status update
    const statusUpdates = mockTwilio.getSentSMS().filter(sms =>
      sms.body.includes('Crisis Update') && sms.body.includes('Linda is responding')
    );

    expect(statusUpdates.length).toBeGreaterThan(0);

    // Provider should get detailed update
    const providerUpdate = statusUpdates.find(sms => sms.to === providerUser.phone);
    expect(providerUpdate).toBeDefined();
    expect(providerUpdate?.body).toContain('ETA: 15 minutes');

    // Patient should get reassurance
    const patientUpdate = mockTwilio.getSentSMS().find(sms => 
      sms.to === patientUser.phone && sms.body.includes('Your mom Linda is on the way')
    );
    expect(patientUpdate).toBeDefined();

    // Simulate crisis resolution
    await testHelpers.simulateCrisisResolution({
      patientId: patientUser.id,
      resolvedBy: 'mother',
      resolution: 'family_support_provided',
      followUpNeeded: true
    });

    await page.waitForTimeout(1000);

    // Should send all-clear notifications
    const resolutionNotifications = mockTwilio.getSentSMS().filter(sms =>
      sms.body.includes('Crisis resolved') || sms.body.includes('All clear')
    );

    expect(resolutionNotifications.length).toBeGreaterThanOrEqual(3);

    // Verify complete crisis lifecycle logged
    const lifecycleLog = await testHelpers.getAuditLogs({
      eventType: 'CRISIS_LIFECYCLE_COMPLETE',
      userId: patientUser.id
    });

    expect(lifecycleLog).toHaveLength(1);
    expect(lifecycleLog[0].details).toMatchObject({
      totalDuration: expect.any(Number),
      responseTime: expect.any(Number),
      respondingContacts: ['mother'],
      resolution: 'family_support_provided',
      followUpScheduled: true
    });
  });

  test('should handle crisis alerts during system maintenance', async ({ page }) => {
    // Simulate partial system maintenance mode
    await testHelpers.setMaintenanceMode({
      notificationService: 'degraded',
      emailService: 'down',
      smsService: 'operational',
      pushService: 'operational'
    });

    await testHelpers.login(page, patientUser.email, 'TestSerenity2024!@#');
    
    await page.goto('/crisis-support');
    await page.fill('[data-testid="crisis-message"]', 'Emergency - need immediate help');
    await page.click('[data-testid="submit-crisis-alert"]');

    // Should show maintenance notice but still process crisis
    await expect(page.locator('[data-testid="maintenance-notice"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-processing"]')).toBeVisible();
    await expect(page.locator('[data-testid="degraded-service-warning"]'))
      .toContainText('Some notification methods may be delayed');

    await page.waitForTimeout(3000);

    // SMS should still work (operational)
    const smsNotifications = mockTwilio.getSentSMS();
    expect(smsNotifications.length).toBeGreaterThan(0);

    // Email should be queued for later (service down)
    const emailNotifications = mockSendGrid.getSentEmails();
    expect(emailNotifications).toHaveLength(0);

    // But emails should be queued
    const queuedEmails = await testHelpers.getQueuedNotifications({
      type: 'crisis_alert',
      channel: 'email',
      status: 'queued_maintenance'
    });
    expect(queuedEmails.length).toBeGreaterThan(0);

    // Crisis should still escalate normally via available channels
    await testHelpers.fastForwardTime(300000); // 5 minutes
    await testHelpers.processEscalationQueue();

    // Provider should still be notified via SMS
    const providerSMS = mockTwilio.getSentSMS().find(sms => sms.to === providerUser.phone);
    expect(providerSMS).toBeDefined();
    expect(providerSMS?.body).toContain('MAINTENANCE MODE - LIMITED NOTIFICATIONS');

    // Verify maintenance mode handling logged
    const maintenanceLog = await testHelpers.getAuditLogs({
      eventType: 'CRISIS_ALERT_MAINTENANCE_MODE',
      userId: patientUser.id
    });

    expect(maintenanceLog).toHaveLength(1);
    expect(maintenanceLog[0].details).toMatchObject({
      maintenanceStatus: expect.any(Object),
      availableChannels: ['sms', 'push'],
      queuedChannels: ['email'],
      escalationAdjusted: false // Crisis still escalates normally
    });

    await testHelpers.clearMaintenanceMode();
  });

  test('should integrate with external crisis hotlines and services', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestSerenity2024!@#');
    
    await page.goto('/crisis-support');
    await page.fill('[data-testid="crisis-message"]', 
      'I am having thoughts of suicide and have access to means');
    await page.click('[data-testid="submit-crisis-alert"]');

    await page.waitForTimeout(2000);

    // Should automatically connect to crisis hotlines
    const hotlineIntegrations = await testHelpers.getCrisisHotlineIntegrations(patientUser.id);
    
    expect(hotlineIntegrations).toHaveLength(2);
    expect(hotlineIntegrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: '988 Suicide & Crisis Lifeline',
          contacted: true,
          method: 'direct_connect',
          location: expect.any(Object)
        }),
        expect.objectContaining({
          service: 'Local Crisis Response Team',
          contacted: true,
          method: 'dispatch_request',
          estimatedResponse: expect.any(Number)
        })
      ])
    );

    // Should provide immediate crisis resources in app
    await expect(page.locator('[data-testid="crisis-resources"]')).toBeVisible();
    await expect(page.locator('[data-testid="hotline-988"]')).toBeVisible();
    await expect(page.locator('[data-testid="hotline-988"]')).toContainText('Call 988 - Available 24/7');
    
    // Should provide one-click connect options
    await expect(page.locator('[data-testid="connect-988"]')).toBeVisible();
    await page.click('[data-testid="connect-988"]');

    // Should initiate call (mock call interface)
    await expect(page.locator('[data-testid="call-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Connecting to 988...');

    // Verify external service integration logged
    const integrationLog = await testHelpers.getAuditLogs({
      eventType: 'EXTERNAL_CRISIS_SERVICE_INTEGRATION',
      userId: patientUser.id
    });

    expect(integrationLog).toHaveLength(1);
    expect(integrationLog[0].details).toMatchObject({
      triggeredServices: expect.arrayContaining(['988_lifeline', 'local_crisis_team']),
      userInitiatedCall: '988_lifeline',
      automaticDispatch: expect.any(Boolean)
    });

    // Should send integration confirmation to support network
    const integrationSMS = mockTwilio.getSentSMS().filter(sms =>
      sms.body.includes('Crisis services activated') || 
      sms.body.includes('988 Lifeline contacted')
    );

    expect(integrationSMS.length).toBeGreaterThan(0);
  });
});