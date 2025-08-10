import { test, expect } from '@playwright/test';

test.describe('Enhanced Password Reset Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the forgot password page
    await page.goto('/forgot-password');
  });

  test('should display welcoming and supportive UI elements', async ({ page }) => {
    // Check for recovery-focused messaging
    await expect(page.locator('text=/help you regain access/i')).toBeVisible();
    
    // Check for HIPAA compliance notice
    await expect(page.locator('text=/HIPAA-compliant security/i')).toBeVisible();
    
    // Check for support contact information
    await expect(page.locator('text=/support@serenityrecovery.com/i')).toBeVisible();
  });

  test('should validate email format before submission', async ({ page }) => {
    // Try submitting without email
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.locator('text=/enter your email address/i')).toBeVisible();
    
    // Try submitting with invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.locator('text=/valid email address/i')).toBeVisible();
  });

  test('should show rate limiting message with crisis resources', async ({ page }) => {
    const testEmail = 'test@example.com';
    
    // Attempt multiple password resets
    for (let i = 0; i < 4; i++) {
      await page.fill('input[type="email"]', testEmail);
      await page.getByRole('button', { name: /send reset link/i }).click();
      await page.waitForTimeout(1000);
    }
    
    // Should show rate limit message
    await expect(page.locator('text=/too many attempts/i')).toBeVisible();
    
    // Should show crisis resources when rate limited
    await expect(page.locator('text=/988/i')).toBeVisible();
    await expect(page.locator('text=/crisis text line/i')).toBeVisible();
  });

  test('should successfully send password reset email', async ({ page }) => {
    const testEmail = 'valid@example.com';
    
    // Fill in email
    await page.fill('input[type="email"]', testEmail);
    
    // Submit form
    await page.getByRole('button', { name: /send reset link/i }).click();
    
    // Should show success message
    await expect(page.locator('text=/check your email/i')).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    
    // Should show security notice about link expiry
    await expect(page.locator('text=/expire in 15 minutes/i')).toBeVisible();
    
    // Should show encouraging message
    const encouragingMessages = [
      'Every step forward counts',
      'recovery journey continues',
      'Taking care of yourself',
      'not alone',
      'Recovery is a journey',
      'commitment to recovery'
    ];
    
    const pageContent = await page.content();
    const hasEncouragingMessage = encouragingMessages.some(msg => 
      pageContent.toLowerCase().includes(msg.toLowerCase())
    );
    expect(hasEncouragingMessage).toBeTruthy();
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check for proper ARIA labels
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('aria-label', /email address/i);
    
    const submitButton = page.getByRole('button', { name: /send reset link/i });
    await expect(submitButton).toHaveAttribute('aria-label', /send password reset/i);
    
    // Check for proper form structure
    const form = page.locator('form');
    await expect(form).toHaveAttribute('novalidate');
  });
});

test.describe('Enhanced Password Reset Form', () => {
  test('should display password strength indicator', async ({ page }) => {
    // Navigate directly to reset password with mock token
    await page.goto('/reset-password?code=mock-reset-token#access_token=mock-token&type=recovery');
    
    // Wait for form to load
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    
    // Type a weak password
    await page.fill('input[id="new-password"]', 'weak');
    
    // Should show password strength feedback
    await expect(page.locator('text=/at least 8 characters/i')).toBeVisible();
    
    // Type a stronger password
    await page.fill('input[id="new-password"]', 'StrongP@ssw0rd123!');
    
    // Progress bar should update
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    // Navigate directly to reset password with mock token
    await page.goto('/reset-password?code=mock-reset-token#access_token=mock-token&type=recovery');
    
    // Wait for form to load
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    
    // Try submitting with weak password
    await page.fill('input[id="new-password"]', 'weak');
    await page.fill('input[id="confirm-password"]', 'weak');
    await page.getByRole('button', { name: /update password/i }).click();
    
    // Should show validation error
    await expect(page.locator('text=/at least 8 characters/i')).toBeVisible();
  });

  test('should check password confirmation match', async ({ page }) => {
    // Navigate directly to reset password with mock token
    await page.goto('/reset-password?code=mock-reset-token#access_token=mock-token&type=recovery');
    
    // Wait for form to load
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    
    // Enter mismatched passwords
    await page.fill('input[id="new-password"]', 'StrongP@ssw0rd123!');
    await page.fill('input[id="confirm-password"]', 'DifferentP@ssw0rd123!');
    
    // Should show mismatch warning
    await expect(page.locator('text=/passwords do not match/i')).toBeVisible();
  });

  test('should show/hide password visibility toggle', async ({ page }) => {
    // Navigate directly to reset password with mock token
    await page.goto('/reset-password?code=mock-reset-token#access_token=mock-token&type=recovery');
    
    // Wait for form to load
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    
    const passwordInput = page.locator('input[id="new-password"]');
    const toggleButton = passwordInput.locator('~ button').first();
    
    // Initially should be password type
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click again to hide
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should handle expired or invalid tokens gracefully', async ({ page }) => {
    // Navigate without token
    await page.goto('/reset-password');
    
    // Should show invalid token message
    await expect(page.locator('text=/invalid reset link/i')).toBeVisible();
    
    // Should provide option to return to sign in
    const returnButton = page.getByRole('button', { name: /return to sign in/i });
    await expect(returnButton).toBeVisible();
    
    await returnButton.click();
    await expect(page).toHaveURL('/auth');
  });
});

test.describe('HIPAA Compliance Features', () => {
  test('should not reveal if email exists in system', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Try with any email
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();
    
    // Should show generic success message that doesn't confirm email existence
    await expect(page.locator('text=/if an account exists/i')).toBeVisible();
  });

  test('should display security badges and compliance notices', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Check for security/compliance indicators
    const securityIcons = page.locator('[data-testid="shield-icon"], svg[class*="shield"]');
    const iconCount = await securityIcons.count();
    expect(iconCount).toBeGreaterThan(0);
    
    // Check for HIPAA compliance text
    await expect(page.locator('text=/hipaa/i')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be fully functional on mobile devices', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Form should be visible and not overflow
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Email input should be accessible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('mobile@example.com');
    
    // Submit button should be clickable
    const submitButton = page.getByRole('button', { name: /send reset link/i });
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    
    // Success message should be visible on mobile
    await expect(page.locator('text=/check your email/i')).toBeVisible();
  });

  test('should display crisis resources properly on mobile', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Trigger rate limit to show crisis resources
    const testEmail = 'test@example.com';
    for (let i = 0; i < 4; i++) {
      await page.fill('input[type="email"]', testEmail);
      await page.getByRole('button', { name: /send reset link/i }).click();
      await page.waitForTimeout(1000);
    }
    
    // Crisis resources should be visible and clickable on mobile
    const crisisPhone = page.locator('a[href="tel:988"]');
    await expect(crisisPhone).toBeVisible();
    
    const crisisText = page.locator('a[href="sms:741741"]');
    await expect(crisisText).toBeVisible();
  });
});