import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, loginAsPatient, loginAsProvider, loginAsSupporter } from '../utils/test-helpers';

test.describe('HIPAA-Compliant Crisis Communication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test.describe('Crisis Alert Security', () => {
    test('should encrypt crisis alerts containing PHI', async ({ page }) => {
      await loginAsPatient(page);
      
      // Navigate to crisis support
      await page.click('[data-testid="crisis-support"]');
      await expect(page.locator('[data-testid="crisis-form"]')).toBeVisible();
      
      // Fill crisis form with PHI
      await page.fill('[data-testid="crisis-message"]', 'I am experiencing severe depression and having thoughts of self-harm. My medication is not working.');
      await page.selectOption('[data-testid="crisis-severity"]', 'high');
      await page.fill('[data-testid="crisis-location"]', 'Home - 123 Main St, City, State');
      await page.click('[data-testid="send-crisis-alert"]');
      
      // Verify crisis alert is sent securely
      await expect(page.locator('[data-testid="crisis-sent"]')).toContainText('Crisis alert sent securely');
      await expect(page.locator('[data-testid="encryption-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="crisis-sent"]')).toContainText('End-to-end encrypted');
    });

    test('should implement secure crisis alert routing to authorized personnel only', async ({ page }) => {
      await loginAsPatient(page);
      
      // Send crisis alert
      await page.click('[data-testid="crisis-support"]');
      await page.fill('[data-testid="crisis-message"]', 'Urgent: Need immediate support');
      await page.selectOption('[data-testid="crisis-severity"]', 'critical');
      await page.click('[data-testid="send-crisis-alert"]');
      
      // Verify alert is routed to authorized personnel only
      await expect(page.locator('[data-testid="crisis-sent"]')).toContainText('Alert routed to authorized crisis team');
      await expect(page.locator('[data-testid="crisis-sent"]')).toContainText('HIPAA compliant routing');
    });

    test('should log all crisis communications for audit purposes', async ({ page }) => {
      await loginAsPatient(page);
      
      // Send crisis alert
      await page.click('[data-testid="crisis-support"]');
      await page.fill('[data-testid="crisis-message"]', 'Test crisis message for audit logging');
      await page.click('[data-testid="send-crisis-alert"]');
      
      // Verify audit logging
      await expect(page.locator('[data-testid="crisis-sent"]')).toContainText('Communication logged for audit');
      
      // Check audit log (as admin)
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      await page.click('[data-testid="crisis-audit-logs"]');
      
      await expect(page.locator('[data-testid="crisis-log-entry"]')).toContainText('Crisis communication');
      await expect(page.locator('[data-testid="crisis-log-entry"]')).toContainText(TEST_CREDENTIALS.PATIENT.email);
    });
  });

  test.describe('Secure Crisis Messaging', () => {
    test('should encrypt all crisis-related messages', async ({ page }) => {
      await loginAsPatient(page);
      
      // Navigate to crisis messaging
      await page.click('[data-testid="crisis-messaging"]');
      await page.click('[data-testid="new-crisis-message"]');
      
      // Send message with PHI
      await page.fill('[data-testid="message-recipient"]', 'crisis-team@serenity.com');
      await page.fill('[data-testid="message-subject"]', 'Treatment Update - Crisis Situation');
      await page.fill('[data-testid="message-content"]', 'I have been struggling with my recovery. My therapist recommended adjusting my medication dosage.');
      await page.click('[data-testid="send-message"]');
      
      // Verify encryption
      await expect(page.locator('[data-testid="message-sent"]')).toContainText('Message encrypted and sent securely');
      await expect(page.locator('[data-testid="encryption-badge"]')).toBeVisible();
    });

    test('should implement secure crisis team communication', async ({ page }) => {
      await loginAsProvider(page);
      
      // Access crisis team communication
      await page.click('[data-testid="crisis-team"]');
      await page.click('[data-testid="team-message"]');
      
      // Send team message with patient PHI
      await page.fill('[data-testid="team-message-content"]', 'Patient ID 12345 experiencing crisis. Current medication: Sertraline 50mg. Requires immediate intervention.');
      await page.click('[data-testid="send-team-message"]');
      
      // Verify secure team communication
      await expect(page.locator('[data-testid="team-message-sent"]')).toContainText('Team message sent securely');
      await expect(page.locator('[data-testid="team-message-sent"]')).toContainText('HIPAA compliant');
    });
  });

  test.describe('Crisis Data Protection', () => {
    test('should protect crisis data with enhanced encryption', async ({ page }) => {
      await loginAsPatient(page);
      
      // Submit crisis assessment
      await page.click('[data-testid="crisis-assessment"]');
      await page.fill('[data-testid="crisis-symptoms"]', 'Depression, anxiety, suicidal thoughts');
      await page.fill('[data-testid="crisis-triggers"]', 'Recent relapse, relationship issues');
      await page.fill('[data-testid="crisis-medication"]', 'Currently taking Sertraline and Bupropion');
      await page.click('[data-testid="submit-assessment"]');
      
      // Verify enhanced data protection
      await expect(page.locator('[data-testid="assessment-submitted"]')).toContainText('Assessment protected with enhanced encryption');
      await expect(page.locator('[data-testid="assessment-submitted"]')).toContainText('HIPAA Level 2 encryption');
    });

    test('should implement secure crisis data storage with access controls', async ({ page }) => {
      await loginAsProvider(page);
      
      // Access crisis data
      await page.click('[data-testid="crisis-data"]');
      await page.click('[data-testid="patient-crisis-history"]');
      
      // Verify access controls
      await expect(page.locator('[data-testid="access-control-notice"]')).toContainText('Authorized access only');
      await expect(page.locator('[data-testid="access-control-notice"]')).toContainText('All access logged');
      
      // Verify data is properly masked/encrypted
      await expect(page.locator('[data-testid="crisis-data-display"]')).toContainText('Encrypted data');
    });
  });

  test.describe('Crisis Response Security', () => {
    test('should implement secure crisis response protocols', async ({ page }) => {
      await loginAsProvider(page);
      
      // Respond to crisis alert
      await page.click('[data-testid="crisis-alerts"]');
      await page.click('[data-testid="respond-to-crisis"]');
      
      // Send secure response
      await page.fill('[data-testid="crisis-response"]', 'I am here to help. Are you safe right now? Can you call our crisis hotline at 988?');
      await page.click('[data-testid="send-response"]');
      
      // Verify secure response
      await expect(page.locator('[data-testid="response-sent"]')).toContainText('Response sent securely');
      await expect(page.locator('[data-testid="response-sent"]')).toContainText('End-to-end encrypted');
    });

    test('should implement secure crisis escalation procedures', async ({ page }) => {
      await loginAsProvider(page);
      
      // Escalate crisis
      await page.click('[data-testid="crisis-escalation"]');
      await page.selectOption('[data-testid="escalation-level"]', 'emergency');
      await page.fill('[data-testid="escalation-reason"]', 'Patient at immediate risk of self-harm');
      await page.click('[data-testid="initiate-escalation"]');
      
      // Verify secure escalation
      await expect(page.locator('[data-testid="escalation-initiated"]')).toContainText('Crisis escalated securely');
      await expect(page.locator('[data-testid="escalation-initiated"]')).toContainText('Emergency team notified');
      await expect(page.locator('[data-testid="escalation-initiated"]')).toContainText('All communications encrypted');
    });
  });

  test.describe('Crisis Support Network Security', () => {
    test('should securely notify support network during crisis', async ({ page }) => {
      await loginAsPatient(page);
      
      // Trigger support network notification
      await page.click('[data-testid="crisis-support"]');
      await page.fill('[data-testid="crisis-message"]', 'Need support network notification');
      await page.click('[data-testid="notify-support-network"]');
      await page.click('[data-testid="send-crisis-alert"]');
      
      // Verify secure notification
      await expect(page.locator('[data-testid="crisis-sent"]')).toContainText('Support network notified securely');
      await expect(page.locator('[data-testid="crisis-sent"]')).toContainText('Encrypted notifications sent');
    });

    test('should implement secure support network communication', async ({ page }) => {
      await loginAsSupporter(page);
      
      // Receive crisis notification
      await page.click('[data-testid="crisis-notifications"]');
      await page.click('[data-testid="crisis-alert-1"]');
      
      // Respond to crisis
      await page.fill('[data-testid="supporter-response"]', 'I am here for you. Are you safe?');
      await page.click('[data-testid="send-supporter-response"]');
      
      // Verify secure communication
      await expect(page.locator('[data-testid="response-sent"]')).toContainText('Response sent securely');
      await expect(page.locator('[data-testid="response-sent"]')).toContainText('HIPAA compliant');
    });
  });

  test.describe('Crisis Data Retention & Disposal', () => {
    test('should implement secure crisis data retention policies', async ({ page }) => {
      await loginAsPatient(page);
      
      // Set admin role to check retention policies
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      
      // Check crisis data retention
      await page.click('[data-testid="crisis-data-retention"]');
      await expect(page.locator('[data-testid="retention-policy"]')).toContainText('Crisis data retained for 7 years');
      await expect(page.locator('[data-testid="retention-policy"]')).toContainText('HIPAA compliant retention');
    });

    test('should implement secure crisis data disposal procedures', async ({ page }) => {
      await loginAsPatient(page);
      
      // Set admin role
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      
      // Initiate crisis data disposal
      await page.click('[data-testid="crisis-data-disposal"]');
      await page.fill('[data-testid="disposal-reason"]', 'Patient request for crisis data deletion');
      await page.fill('[data-testid="disposal-confirmation"]', 'I understand this will permanently delete crisis data');
      await page.click('[data-testid="initiate-crisis-disposal"]');
      
      // Verify secure disposal
      await expect(page.locator('[data-testid="disposal-status"]')).toContainText('Crisis data disposal initiated');
      await expect(page.locator('[data-testid="disposal-status"]')).toContainText('Secure disposal process');
      await expect(page.locator('[data-testid="disposal-status"]')).toContainText('30-day waiting period');
    });
  });

  test.describe('Crisis Communication Audit', () => {
    test('should maintain comprehensive audit trail for all crisis communications', async ({ page }) => {
      await loginAsPatient(page);
      
      // Perform crisis communication
      await page.click('[data-testid="crisis-support"]');
      await page.fill('[data-testid="crisis-message"]', 'Test crisis communication for audit');
      await page.click('[data-testid="send-crisis-alert"]');
      
      // Set admin role to check audit trail
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      
      // Check crisis communication audit
      await page.click('[data-testid="crisis-audit-trail"]');
      await expect(page.locator('[data-testid="audit-entry"]')).toContainText('Crisis communication');
      await expect(page.locator('[data-testid="audit-entry"]')).toContainText(TEST_CREDENTIALS.PATIENT.email);
      await expect(page.locator('[data-testid="audit-entry"]')).toContainText('Encrypted transmission');
    });

    test('should generate HIPAA compliance reports for crisis communications', async ({ page }) => {
      await loginAsPatient(page);
      
      // Set admin role
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      
      // Generate crisis communication compliance report
      await page.click('[data-testid="crisis-compliance-reports"]');
      await page.click('[data-testid="generate-crisis-report"]');
      
      // Verify comprehensive report
      await expect(page.locator('[data-testid="crisis-compliance-report"]')).toContainText('Crisis Communication HIPAA Compliance Report');
      await expect(page.locator('[data-testid="crisis-compliance-report"]')).toContainText('Encryption Status');
      await expect(page.locator('[data-testid="crisis-compliance-report"]')).toContainText('Access Controls');
      await expect(page.locator('[data-testid="crisis-compliance-report"]')).toContainText('Audit Trail');
      await expect(page.locator('[data-testid="crisis-compliance-report"]')).toContainText('Data Retention');
    });
  });
});
