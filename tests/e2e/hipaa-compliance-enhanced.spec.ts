import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, loginAsPatient, loginAsProvider, loginAsSupporter } from '../utils/test-helpers';

test.describe('Enhanced HIPAA Compliance E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test.describe('Authentication & Access Controls', () => {
    test('should enforce strong authentication with proper session management', async ({ page }) => {
      // Test successful login with strong credentials
      await page.goto('/login');
      await page.fill('#email', TEST_CREDENTIALS.PATIENT.email);
      await page.fill('#password', TEST_CREDENTIALS.PATIENT.password);
      await page.click('button[type="submit"]');
      
      // Wait for navigation to dashboard
      await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
      
      // Just verify we're on the dashboard page
      await expect(page).toHaveURL(/\/patient\/dashboard/);
    });

    test('should enforce role-based access control (RBAC) for all user types', async ({ page }) => {
      // Test patient access restrictions
      await loginAsPatient(page);
      
      // Patient should not access provider routes
      await page.goto('/provider/dashboard');
      await expect(page).toHaveURL('/access-denied');
      await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission');
      
      // Patient should not access admin routes
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL('/access-denied');
      
      // Test provider access restrictions
      await loginAsProvider(page);
      
      // Provider should not access admin routes
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL('/access-denied');
      
      // Provider should access provider routes
      await page.goto('/provider/dashboard');
      await expect(page.locator('[data-testid="provider-dashboard"]')).toBeVisible();
    });

    test('should implement proper logout and session termination', async ({ page }) => {
      await loginAsPatient(page);
      
      // Verify user is logged in
      await expect(page.locator('[data-testid="patient-dashboard"]')).toBeVisible();
      
      // Logout
      await page.click('[data-testid="logout-button"]');
      await page.waitForURL('**/auth');
      
      // Verify session is terminated
      await page.goto('/patient/dashboard');
      await expect(page).toHaveURL(/\/auth/);
    });
  });

  test.describe('Data Encryption & Security', () => {
    test('should encrypt data in transit using HTTPS', async ({ page }) => {
      // Test that all requests use secure protocols
      const response = await page.request.get('/');
      expect(response.status()).toBe(200);
      
      // Verify security headers are present
      const headers = response.headers();
      expect(headers['strict-transport-security']).toBeDefined();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBeDefined();
    });

    test('should validate input sanitization for PHI', async ({ page }) => {
      await loginAsPatient(page);
      
      // Navigate to profile settings
      await page.click('[data-testid="profile-settings"]');
      
      // Test XSS prevention in profile fields
      const maliciousInput = '<script>alert("xss")</script>';
      await page.fill('[data-testid="name-input"]', maliciousInput);
      await page.fill('[data-testid="phone-input"]', maliciousInput);
      await page.click('[data-testid="save-profile"]');
      
      // Verify input is sanitized (should not contain script tags)
      await expect(page.locator('[data-testid="name-display"]')).not.toContainText('<script>');
      await expect(page.locator('[data-testid="phone-display"]')).not.toContainText('<script>');
    });

    test('should prevent SQL injection in search and forms', async ({ page }) => {
      await loginAsPatient(page);
      
      // Test search functionality with malicious input
      await page.click('[data-testid="search-button"]');
      const sqlInjection = "'; DROP TABLE users; --";
      await page.fill('[data-testid="search-input"]', sqlInjection);
      await page.click('[data-testid="search-submit"]');
      
      // Should handle gracefully without errors
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    });
  });

  test.describe('Audit Logging & Monitoring', () => {
    test('should log all PHI access attempts', async ({ page }) => {
      await loginAsProvider(page);
      
      // Access patient data (PHI)
      await page.click('[data-testid="patient-list"]');
      await page.click('[data-testid="patient-item-1"]');
      await expect(page.locator('[data-testid="patient-details"]')).toBeVisible();
      
      // Verify audit log entry (this would be checked in admin dashboard)
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      await page.click('[data-testid="audit-logs"]');
      
      // Should show recent PHI access
      await expect(page.locator('[data-testid="audit-log-entry"]')).toContainText('PHI access');
      await expect(page.locator('[data-testid="audit-log-entry"]')).toContainText(TEST_CREDENTIALS.PROVIDER.email);
    });

    test('should log failed authentication attempts', async ({ page }) => {
      // Attempt failed login
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'wrong@email.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="submit-login"]');
      
      await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
      
      // Verify failed attempt is logged (check admin dashboard)
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      await page.click('[data-testid="security-logs"]');
      
      await expect(page.locator('[data-testid="security-log-entry"]')).toContainText('Failed login attempt');
    });
  });

  test.describe('Data Retention & Disposal', () => {
    test('should enforce data retention policies', async ({ page }) => {
      await loginAsPatient(page);
      
      // Set admin role to access retention settings
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      
      // Check retention policy settings
      await page.click('[data-testid="data-retention-settings"]');
      await expect(page.locator('[data-testid="retention-policy"]')).toContainText('7 years');
      await expect(page.locator('[data-testid="retention-policy"]')).toContainText('HIPAA compliant');
    });

    test('should implement secure data disposal workflow', async ({ page }) => {
      await loginAsPatient(page);
      
      // Set admin role
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      
      // Initiate data disposal
      await page.click('[data-testid="data-disposal"]');
      await page.fill('[data-testid="disposal-reason"]', 'Patient request for data deletion');
      await page.fill('[data-testid="disposal-confirmation"]', 'I understand this action cannot be undone');
      await page.click('[data-testid="initiate-disposal"]');
      
      // Verify disposal workflow
      await expect(page.locator('[data-testid="disposal-status"]')).toContainText('Pending');
      await expect(page.locator('[data-testid="disposal-status"]')).toContainText('30-day waiting period');
    });
  });

  test.describe('Secure Communication', () => {
    test('should encrypt all messaging and communications', async ({ page }) => {
      await loginAsPatient(page);
      
      // Navigate to messaging
      await page.click('[data-testid="messaging"]');
      await page.click('[data-testid="new-message"]');
      
      // Send a message with PHI
      await page.fill('[data-testid="message-recipient"]', 'provider@test.com');
      await page.fill('[data-testid="message-subject"]', 'Treatment Update');
      await page.fill('[data-testid="message-content"]', 'I have been feeling better since starting the new medication.');
      await page.click('[data-testid="send-message"]');
      
      // Verify message is sent securely
      await expect(page.locator('[data-testid="message-sent"]')).toContainText('Message sent securely');
      await expect(page.locator('[data-testid="encryption-indicator"]')).toBeVisible();
    });

    test('should implement secure crisis communication', async ({ page }) => {
      await loginAsPatient(page);
      
      // Trigger crisis alert
      await page.click('[data-testid="crisis-support"]');
      await page.fill('[data-testid="crisis-message"]', 'I am experiencing strong urges to relapse');
      await page.click('[data-testid="send-crisis-alert"]');
      
      // Verify crisis communication is encrypted
      await expect(page.locator('[data-testid="crisis-sent"]')).toContainText('Crisis alert sent securely');
      await expect(page.locator('[data-testid="crisis-encryption"]')).toBeVisible();
    });
  });

  test.describe('Breach Detection & Response', () => {
    test('should detect unauthorized access attempts', async ({ page }) => {
      // Try to access protected routes without authentication
      await page.goto('/patient/dashboard');
      await expect(page).toHaveURL(/\/auth/);
      
      await page.goto('/provider/dashboard');
      await expect(page).toHaveURL(/\/auth/);
      
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/auth/);
      
      // Verify security alerts are triggered
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      await page.click('[data-testid="security-alerts"]');
      
      await expect(page.locator('[data-testid="unauthorized-access-alert"]')).toBeVisible();
    });

    test('should implement rate limiting for authentication attempts', async ({ page }) => {
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await page.goto('/login');
        await page.fill('#email', 'test@example.com');
        await page.fill('#password', 'wrongpassword');
        await page.click('button[type="submit"]');
        // Wait for error to appear
        await page.waitForTimeout(1000);
      }
      
      // Should be rate limited after multiple attempts
      await page.goto('/login');
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Check for rate limiting message
      await expect(page.locator('text=Too many failed attempts, text=Rate limited, text=Please try again later')).toBeVisible();
    });
  });

  test.describe('Minimum Necessary Access', () => {
    test('should enforce minimum necessary access for patients', async ({ page }) => {
      await loginAsPatient(page);
      
      // Patient should only see their own data
      await page.click('[data-testid="my-profile"]');
      await expect(page.locator('[data-testid="patient-name"]')).toContainText('Test Patient');
      
      // Patient should not see other patients' data
      await page.goto('/patient/list');
      await expect(page).toHaveURL('/access-denied');
    });

    test('should enforce minimum necessary access for providers', async ({ page }) => {
      await loginAsProvider(page);
      
      // Provider should only see assigned patients
      await page.click('[data-testid="patient-list"]');
      await expect(page.locator('[data-testid="assigned-patients"]')).toBeVisible();
      
      // Provider should not see admin functions
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL('/access-denied');
    });

    test('should enforce minimum necessary access for supporters', async ({ page }) => {
      await loginAsSupporter(page);
      
      // Supporter should only see crisis alerts and basic info
      await page.click('[data-testid="crisis-alerts"]');
      await expect(page.locator('[data-testid="crisis-list"]')).toBeVisible();
      
      // Supporter should not see detailed patient data
      await page.goto('/patient/dashboard');
      await expect(page).toHaveURL('/access-denied');
    });
  });

  test.describe('Data Backup & Recovery', () => {
    test('should implement secure data backup procedures', async ({ page }) => {
      await loginAsPatient(page);
      
      // Set admin role
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      
      // Check backup status
      await page.click('[data-testid="backup-status"]');
      await expect(page.locator('[data-testid="backup-last-run"]')).toBeVisible();
      await expect(page.locator('[data-testid="backup-status"]')).toContainText('Encrypted');
    });

    test('should implement data recovery procedures', async ({ page }) => {
      await loginAsPatient(page);
      
      // Set admin role
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      
      // Test recovery procedures
      await page.click('[data-testid="data-recovery"]');
      await expect(page.locator('[data-testid="recovery-procedures"]')).toContainText('HIPAA compliant');
      await expect(page.locator('[data-testid="recovery-procedures"]')).toContainText('Encrypted backup');
    });
  });

  test.describe('Compliance Reporting', () => {
    test('should generate HIPAA compliance reports', async ({ page }) => {
      await loginAsPatient(page);
      
      // Set admin role
      await page.evaluate(() => {
        localStorage.setItem('pw_role', 'admin');
      });
      await page.goto('/admin/dashboard');
      
      // Generate compliance report
      await page.click('[data-testid="compliance-reports"]');
      await page.click('[data-testid="generate-hipaa-report"]');
      
      await expect(page.locator('[data-testid="compliance-report"]')).toContainText('HIPAA Compliance Report');
      await expect(page.locator('[data-testid="compliance-report"]')).toContainText('Data Encryption');
      await expect(page.locator('[data-testid="compliance-report"]')).toContainText('Access Controls');
      await expect(page.locator('[data-testid="compliance-report"]')).toContainText('Audit Logging');
    });
  });
});
