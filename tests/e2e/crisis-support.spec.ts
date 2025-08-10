import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Crisis Support System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should trigger crisis alert from patient dashboard', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify crisis support button is available
    await expect(page.locator('[data-testid="crisis-support-button"]')).toBeVisible();

    // Trigger crisis alert
    await page.click('[data-testid="crisis-support-button"]');
    
    // Verify crisis modal appears
    await expect(page.locator('[data-testid="crisis-modal"]')).toBeVisible();
    
    // Verify emergency options are available
    await expect(page.locator('[data-testid="emergency-contact-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-hotline-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="location-sharing-toggle"]')).toBeVisible();

    // Test emergency contact activation
    await page.click('[data-testid="emergency-contact-button"]');
    await expect(page.locator('[data-testid="emergency-contacts-list"]')).toBeVisible();

    // Test crisis hotline access
    await page.click('[data-testid="crisis-hotline-button"]');
    await expect(page.locator('[data-testid="crisis-hotline-info"]')).toBeVisible();
  });

  test('should handle crisis alert with location sharing', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Trigger crisis alert
    await page.click('[data-testid="crisis-support-button"]');
    
    // Enable location sharing
    await page.click('[data-testid="location-sharing-toggle"]');
    await expect(page.locator('[data-testid="location-sharing-active"]')).toBeVisible();

    // Fill crisis message
    await page.fill('[data-testid="crisis-message-input"]', 'I need immediate support right now');
    
    // Submit crisis alert
    await page.click('[data-testid="submit-crisis-alert"]');
    
    // Verify alert sent confirmation
    await expect(page.locator('[data-testid="crisis-alert-sent"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-alert-sent"]')).toContainText('Crisis alert sent to your support network');
  });

  test('should receive crisis alert as supporter', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Check for crisis alerts panel
    await expect(page.locator('[data-testid="crisis-alerts-panel"]')).toBeVisible();

    // Simulate receiving a crisis alert (this would normally come from real-time system)
    await page.evaluate(() => {
      // Simulate crisis alert notification
      const event = new CustomEvent('crisis-alert', {
        detail: {
          patientId: 'test-patient',
          message: 'I need immediate support right now',
          location: { lat: 40.7128, lng: -74.0060 },
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(event);
    });

    // Verify crisis alert appears in panel
    await expect(page.locator('[data-testid="active-crisis-alert"]')).toBeVisible();
    
    // Click on crisis alert to view details
    await page.click('[data-testid="active-crisis-alert"]');
    await expect(page.locator('[data-testid="crisis-alert-modal"]')).toBeVisible();

    // Verify crisis details
    await expect(page.locator('[data-testid="crisis-patient-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-location"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-timestamp"]')).toBeVisible();

    // Test crisis response options
    await expect(page.locator('[data-testid="call-patient-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-message-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="escalate-button"]')).toBeVisible();
  });

  test('should handle crisis escalation workflow', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Simulate crisis alert
    await page.evaluate(() => {
      const event = new CustomEvent('crisis-alert', {
        detail: {
          patientId: 'test-patient',
          message: 'Emergency situation - need immediate help',
          severity: 'high',
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(event);
    });

    // Click on crisis alert
    await page.click('[data-testid="active-crisis-alert"]');
    
    // Test escalation workflow
    await page.click('[data-testid="escalate-button"]');
    await expect(page.locator('[data-testid="escalation-modal"]')).toBeVisible();

    // Select escalation reason
    await page.selectOption('[data-testid="escalation-reason"]', 'immediate-danger');
    
    // Add escalation notes
    await page.fill('[data-testid="escalation-notes"]', 'Patient reports immediate danger to self');
    
    // Submit escalation
    await page.click('[data-testid="submit-escalation"]');
    
    // Verify escalation confirmation
    await expect(page.locator('[data-testid="escalation-confirmed"]')).toBeVisible();
    await expect(page.locator('[data-testid="escalation-confirmed"]')).toContainText('Crisis escalated to emergency services');
  });

  test('should handle crisis de-escalation', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Simulate crisis alert
    await page.evaluate(() => {
      const event = new CustomEvent('crisis-alert', {
        detail: {
          patientId: 'test-patient',
          message: 'Feeling better now, thanks for checking',
          severity: 'low',
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(event);
    });

    // Click on crisis alert
    await page.click('[data-testid="active-crisis-alert"]');
    
    // Test de-escalation
    await page.click('[data-testid="de-escalate-button"]');
    await expect(page.locator('[data-testid="de-escalation-modal"]')).toBeVisible();

    // Confirm de-escalation
    await page.fill('[data-testid="de-escalation-notes"]', 'Patient reports feeling safe and supported');
    await page.click('[data-testid="confirm-de-escalation"]');
    
    // Verify de-escalation confirmation
    await expect(page.locator('[data-testid="de-escalation-confirmed"]')).toBeVisible();
  });

  test('should handle crisis alert timeout and auto-escalation', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Simulate crisis alert with high severity
    await page.evaluate(() => {
      const event = new CustomEvent('crisis-alert', {
        detail: {
          patientId: 'test-patient',
          message: 'Critical emergency - no response',
          severity: 'critical',
          timestamp: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
        }
      });
      window.dispatchEvent(event);
    });

    // Verify auto-escalation warning
    await expect(page.locator('[data-testid="auto-escalation-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="auto-escalation-warning"]')).toContainText('Auto-escalation in 2 minutes');

    // Wait for auto-escalation (simulated)
    await page.waitForTimeout(2000);
    
    // Verify auto-escalation occurred
    await expect(page.locator('[data-testid="auto-escalation-triggered"]')).toBeVisible();
  });

  test('should handle crisis alert in offline mode', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Simulate offline mode
    await page.route('**/*', route => route.abort());

    // Try to trigger crisis alert
    await page.click('[data-testid="crisis-support-button"]');
    
    // Verify offline crisis options
    await expect(page.locator('[data-testid="offline-crisis-options"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-hotline-offline"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-resources-offline"]')).toBeVisible();

    // Test offline crisis resources
    await page.click('[data-testid="crisis-resources-offline"]');
    await expect(page.locator('[data-testid="offline-crisis-guide"]')).toBeVisible();
  });
});
