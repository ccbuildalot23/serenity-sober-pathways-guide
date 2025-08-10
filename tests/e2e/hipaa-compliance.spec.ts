import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('HIPAA Compliance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should enforce strong authentication and session management', async ({ page }) => {
    // Test password complexity requirements
    await page.click('[data-testid="register-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    
    // Test weak password rejection
    await page.fill('[data-testid="password-input"]', 'weak');
    await page.click('[data-testid="submit-register"]');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 12 characters');
    
    // Test password requirements
    await page.fill('[data-testid="password-input"]', 'StrongPass123!@#');
    await page.click('[data-testid="submit-register"]');
    
    // Verify MFA setup is required
    await expect(page.locator('[data-testid="mfa-setup-required"]')).toBeVisible();
    
    // Test session timeout
    await page.goto('/patient/dashboard');
    await page.waitForTimeout(30000); // Wait for session timeout
    await expect(page).toHaveURL('/auth?timeout=true');
  });

  test('should enforce role-based access control (RBAC)', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/patient/dashboard');
    
    // Verify patient cannot access provider routes
    await page.goto('/provider/dashboard');
    await expect(page).toHaveURL('/access-denied');
    await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('Insufficient permissions');
    
    // Verify patient cannot access other patient data
    await page.goto('/patient/profile/other-patient-id');
    await expect(page).toHaveURL('/access-denied');
  });

  test('should encrypt data in transit and at rest', async ({ page }) => {
    // Test HTTPS enforcement
    await page.goto('http://localhost:3000/auth');
    await expect(page).toHaveURL('https://localhost:3000/auth');
    
    // Test API calls use HTTPS
    const response = await page.request.get('/api/health');
    expect(response.url()).toContain('https://');
    
    // Verify security headers
    const headers = response.headers();
    expect(headers['strict-transport-security']).toBeTruthy();
    expect(headers['content-security-policy']).toBeTruthy();
    expect(headers['x-frame-options']).toBe('DENY');
  });

  test('should implement audit logging for all PHI access', async ({ page }) => {
    // Login as provider
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PROVIDER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PROVIDER.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/provider/dashboard');
    
    // Access patient data
    await page.click('[data-testid="patient-list-tab"]');
    await page.click('[data-testid="view-patient-details"]');
    
    // Verify audit log entry was created
    const auditResponse = await page.request.get('/api/audit-logs');
    const auditLogs = await auditResponse.json();
    expect(auditLogs.some(log => 
      log.action === 'PHI_ACCESS' && 
      log.userId === TEST_CREDENTIALS.PROVIDER.id &&
      log.resourceType === 'PATIENT_PROFILE'
    )).toBeTruthy();
  });

  test('should enforce data retention and disposal policies', async ({ page }) => {
    // Login as admin
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.ADMIN.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.ADMIN.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/admin/dashboard');
    
    // Test data retention settings
    await page.click('[data-testid="data-retention-settings"]');
    await expect(page.locator('[data-testid="retention-policy"]')).toContainText('7 years');
    
    // Test data disposal workflow
    await page.click('[data-testid="data-disposal-tab"]');
    await page.fill('[data-testid="disposal-reason"]', 'Patient request for data deletion');
    await page.click('[data-testid="initiate-disposal"]');
    
    // Verify disposal confirmation and waiting period
    await expect(page.locator('[data-testid="disposal-confirmation"]')).toContainText('30-day waiting period');
  });

  test('should implement secure messaging and communication', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/patient/dashboard');
    
    // Test secure messaging
    await page.click('[data-testid="secure-messaging"]');
    await page.click('[data-testid="compose-message"]');
    
    // Verify message encryption indicators
    await expect(page.locator('[data-testid="message-encrypted"]')).toBeVisible();
    await expect(page.locator('[data-testid="end-to-end-encryption"]')).toBeVisible();
    
    // Test message retention
    await page.fill('[data-testid="message-content"]', 'Test secure message');
    await page.click('[data-testid="send-message"]');
    
    // Verify message is encrypted and stored securely
    await expect(page.locator('[data-testid="message-sent-secure"]')).toBeVisible();
  });

  test('should enforce minimum necessary access principle', async ({ page }) => {
    // Login as provider
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PROVIDER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PROVIDER.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/provider/dashboard');
    
    // Test limited data access based on role
    await page.click('[data-testid="patient-list-tab"]');
    await page.click('[data-testid="view-patient-details"]');
    
    // Verify only necessary data is displayed
    await expect(page.locator('[data-testid="patient-medical-history"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="patient-financial-info"]')).not.toBeVisible();
    
    // Verify appropriate data is visible
    await expect(page.locator('[data-testid="patient-checkin-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-mood-trends"]')).toBeVisible();
  });

  test('should implement breach detection and notification', async ({ page }) => {
    // Test unauthorized access attempt
    await page.goto('/api/patients/unauthorized-access');
    await expect(page).toHaveURL('/access-denied');
    
    // Verify breach detection system triggered
    const breachResponse = await page.request.get('/api/security/breach-detection');
    const breaches = await breachResponse.json();
    expect(breaches.some(breach => 
      breach.type === 'UNAUTHORIZED_ACCESS' && 
      breach.severity === 'HIGH'
    )).toBeTruthy();
    
    // Test breach notification workflow
    await page.goto('/admin/security/breaches');
    await expect(page.locator('[data-testid="breach-notification-required"]')).toBeVisible();
  });

  test('should enforce data backup and recovery procedures', async ({ page }) => {
    // Login as admin
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.ADMIN.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.ADMIN.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/admin/dashboard');
    
    // Test backup status
    await page.click('[data-testid="backup-management"]');
    await expect(page.locator('[data-testid="backup-status"]')).toContainText('Last backup: Today');
    await expect(page.locator('[data-testid="backup-encrypted"]')).toBeVisible();
    
    // Test recovery procedures
    await page.click('[data-testid="recovery-procedures"]');
    await expect(page.locator('[data-testid="recovery-plan"]')).toContainText('RTO: 4 hours');
    await expect(page.locator('[data-testid="recovery-plan"]')).toContainText('RPO: 1 hour');
  });

  test('should implement secure API endpoints with proper authentication', async ({ page }) => {
    // Test unauthenticated API access
    const unauthorizedResponse = await page.request.get('/api/patients');
    expect(unauthorizedResponse.status()).toBe(401);
    
    // Test authenticated API access
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: TEST_CREDENTIALS.PROVIDER.email,
        password: TEST_CREDENTIALS.PROVIDER.password
      }
    });
    const { token } = await loginResponse.json();
    
    const authorizedResponse = await page.request.get('/api/patients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    expect(authorizedResponse.status()).toBe(200);
    
    // Test token expiration
    await page.waitForTimeout(3600000); // Wait for token expiration
    const expiredResponse = await page.request.get('/api/patients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    expect(expiredResponse.status()).toBe(401);
  });

  test('should enforce secure file upload and storage', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/patient/dashboard');
    
    // Test secure file upload
    await page.click('[data-testid="upload-document"]');
    
    // Test file type validation
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: 'test.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('fake executable content')
    });
    await expect(page.locator('[data-testid="file-type-error"]')).toContainText('Executable files not allowed');
    
    // Test secure file upload with valid file
    await fileInput.setInputFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content')
    });
    await page.click('[data-testid="upload-secure"]');
    
    // Verify file is encrypted and stored securely
    await expect(page.locator('[data-testid="file-uploaded-secure"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-encrypted"]')).toBeVisible();
  });
});
