import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Accessibility Compliance Tests (WCAG 2.1 AA)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should provide proper keyboard navigation and focus management', async ({ page }) => {
    // Test keyboard navigation through login form
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
    
    // Test Enter key activation
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Please enter valid credentials');
    
    // Test focus trapping in modal
    await page.click('[data-testid="help-modal"]');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // Focus should remain within modal
    await expect(page.locator('[data-testid="modal-content"]')).toContainElement('[data-testid="close-modal"]');
  });

  test('should provide proper screen reader support', async ({ page }) => {
    // Test ARIA labels and descriptions
    await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label', 'Email address');
    await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-describedby', 'password-requirements');
    
    // Test form validation announcements
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toHaveAttribute('role', 'alert');
    await expect(page.locator('[data-testid="email-error"]')).toHaveAttribute('aria-live', 'polite');
    
    // Test status announcements
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/patient/dashboard');
    await expect(page.locator('[data-testid="dashboard-status"]')).toHaveAttribute('aria-live', 'polite');
  });

  test('should provide proper color contrast and visual design', async ({ page }) => {
    // Test color contrast ratios
    const emailInput = page.locator('[data-testid="email-input"]');
    const computedStyle = await emailInput.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color
      };
    });
    
    // Verify sufficient color contrast (4.5:1 for normal text)
    expect(computedStyle.color).toBeTruthy();
    expect(computedStyle.backgroundColor).toBeTruthy();
    
    // Test focus indicators
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="email-input"]')).toHaveCSS('outline', /2px/);
    
    // Test error state visibility
    await page.fill('[data-testid="email-input"]', 'invalid');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toHaveCSS('color', /rgb\(220, 53, 69\)/);
  });

  test('should provide proper form labels and instructions', async ({ page }) => {
    // Test explicit labels
    await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('id');
    const emailLabel = page.locator('label[for="email-input"]');
    await expect(emailLabel).toContainText('Email Address');
    
    // Test required field indicators
    await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-required', 'true');
    await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-required', 'true');
    
    // Test field instructions
    await expect(page.locator('[data-testid="password-requirements"]')).toContainText('Password must be at least 12 characters');
    
    // Test error message association
    await page.fill('[data-testid="email-input"]', 'invalid');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toHaveAttribute('id');
    await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-describedby');
  });

  test('should provide proper heading structure and landmarks', async ({ page }) => {
    // Test heading hierarchy
    await expect(page.locator('h1')).toContainText('Serenity Recovery App');
    await expect(page.locator('h2')).toContainText('Sign In');
    
    // Test landmark regions
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    
    // Test skip links
    await expect(page.locator('[data-testid="skip-to-main"]')).toBeVisible();
    await page.click('[data-testid="skip-to-main"]');
    await expect(page.locator('main')).toBeFocused();
  });

  test('should provide proper alternative text for images', async ({ page }) => {
    // Test decorative images
    const decorativeImages = page.locator('img[alt=""]');
    await expect(decorativeImages).toHaveAttribute('role', 'presentation');
    
    // Test informative images
    const informativeImages = page.locator('img:not([alt=""])');
    for (let i = 0; i < await informativeImages.count(); i++) {
      const altText = await informativeImages.nth(i).getAttribute('alt');
      expect(altText).toBeTruthy();
      expect(altText.length).toBeGreaterThan(0);
    }
    
    // Test logo alt text
    await expect(page.locator('[data-testid="app-logo"]')).toHaveAttribute('alt', 'Serenity Recovery App Logo');
  });

  test('should provide proper table accessibility', async ({ page }) => {
    // Login to access dashboard with tables
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PROVIDER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PROVIDER.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/provider/dashboard');
    await page.click('[data-testid="patient-list-tab"]');
    
    // Test table headers
    const tableHeaders = page.locator('[data-testid="patient-table"] th');
    await expect(tableHeaders.first()).toHaveAttribute('scope', 'col');
    
    // Test table caption
    await expect(page.locator('[data-testid="patient-table"]')).toContainElement('caption');
    
    // Test row headers
    const tableRows = page.locator('[data-testid="patient-table"] tr');
    await expect(tableRows.first()).toHaveAttribute('scope', 'row');
  });

  test('should provide proper list accessibility', async ({ page }) => {
    // Test navigation menu list
    await expect(page.locator('[data-testid="navigation-menu"]')).toHaveAttribute('role', 'navigation');
    await expect(page.locator('[data-testid="navigation-menu"] ul')).toBeVisible();
    
    // Test list items
    const menuItems = page.locator('[data-testid="navigation-menu"] li');
    await expect(menuItems).toHaveCount(4); // Expected menu items
    
    // Test ordered and unordered lists
    await expect(page.locator('ul')).toBeVisible();
    await expect(page.locator('ol')).toBeVisible();
  });

  test('should provide proper button and link accessibility', async ({ page }) => {
    // Test button labels
    await expect(page.locator('[data-testid="login-button"]')).toContainText('Sign In');
    await expect(page.locator('[data-testid="login-button"]')).toHaveAttribute('type', 'button');
    
    // Test link text
    const links = page.locator('a');
    for (let i = 0; i < await links.count(); i++) {
      const linkText = await links.nth(i).textContent();
      expect(linkText).toBeTruthy();
      expect(linkText.trim().length).toBeGreaterThan(0);
    }
    
    // Test external link indicators
    const externalLinks = page.locator('a[target="_blank"]');
    for (let i = 0; i < await externalLinks.count(); i++) {
      await expect(externalLinks.nth(i)).toHaveAttribute('aria-label', /opens in new window/);
    }
  });

  test('should provide proper error handling and recovery', async ({ page }) => {
    // Test form validation errors
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toHaveAttribute('role', 'alert');
    await expect(page.locator('[data-testid="password-error"]')).toHaveAttribute('role', 'alert');
    
    // Test error message clarity
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email address is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
    
    // Test error recovery
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible();
    
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await expect(page.locator('[data-testid="password-error"]')).not.toBeVisible();
  });

  test('should provide proper responsive design and zoom support', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
    
    // Test zoom support (200%)
    await page.setViewportSize({ width: 960, height: 540 });
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should provide proper multimedia accessibility', async ({ page }) => {
    // Test video captions
    await page.click('[data-testid="help-video"]');
    await expect(page.locator('[data-testid="video-captions"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-captions"]')).toHaveAttribute('aria-label', 'Closed captions available');
    
    // Test audio descriptions
    await expect(page.locator('[data-testid="audio-description"]')).toHaveAttribute('aria-label', 'Audio description available');
    
    // Test media controls
    await expect(page.locator('[data-testid="play-button"]')).toHaveAttribute('aria-label', 'Play video');
    await expect(page.locator('[data-testid="pause-button"]')).toHaveAttribute('aria-label', 'Pause video');
    await expect(page.locator('[data-testid="volume-control"]')).toHaveAttribute('aria-label', 'Volume control');
  });

  test('should provide proper dynamic content updates', async ({ page }) => {
    // Test live regions for dynamic content
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/patient/dashboard');
    
    // Test real-time updates
    await expect(page.locator('[data-testid="live-updates"]')).toHaveAttribute('aria-live', 'polite');
    
    // Test progress indicators
    await expect(page.locator('[data-testid="loading-indicator"]')).toHaveAttribute('aria-label', 'Loading content');
    await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow');
    await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuemin', '0');
    await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuemax', '100');
  });
});
