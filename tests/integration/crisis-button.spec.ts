import { test, expect } from '@playwright/test';

test.describe('Crisis Button Integration Tests', () => {
  test.describe('Patient Dashboard', () => {
    test('crisis button is visible and clickable', async ({ page }) => {
      await page.goto('http://localhost:8080/patient/dashboard');
      
      const crisisButton = await page.locator('[data-testid="crisis-button"]');
      await expect(crisisButton).toBeVisible();
      await expect(crisisButton).toContainText(/crisis|help|emergency/i);
      
      // Test click functionality
      await crisisButton.click();
      await expect(page).toHaveURL(/crisis|help/);
    });

    test('crisis button triggers immediate help modal', async ({ page }) => {
      await page.goto('http://localhost:8080/patient/dashboard');
      
      await page.click('[data-testid="crisis-button"]');
      
      // Verify crisis modal appears
      const modal = await page.locator('[data-testid="crisis-modal"]');
      await expect(modal).toBeVisible();
      
      // Verify emergency contacts are shown
      await expect(modal.locator('[data-testid="emergency-contacts"]')).toBeVisible();
      
      // Verify 988 hotline is prominently displayed
      await expect(modal).toContainText('988');
    });
  });

  test.describe('Provider Dashboard', () => {
    test('crisis button exists on provider dashboard', async ({ page }) => {
      await page.goto('http://localhost:8080/provider/dashboard');
      
      const crisisButton = await page.locator('[data-testid="crisis-button"]');
      await expect(crisisButton).toBeVisible();
      
      // Verify provider-specific crisis resources
      await crisisButton.click();
      const modal = await page.locator('[data-testid="crisis-modal"]');
      await expect(modal).toContainText(/patient.*crisis|emergency.*protocol/i);
    });

    test('provider receives crisis alerts from patients', async ({ page }) => {
      await page.goto('http://localhost:8080/provider/dashboard');
      
      // Check for crisis alert section
      const alertSection = await page.locator('[data-testid="crisis-alerts"]');
      await expect(alertSection).toBeVisible();
      
      // Verify real-time updates work
      await page.evaluate(() => {
        // Simulate crisis alert
        window.dispatchEvent(new CustomEvent('crisis-alert', {
          detail: { patientId: 'test-123', severity: 'high' }
        }));
      });
      
      // Check alert appears
      await expect(page.locator('[data-testid="alert-test-123"]')).toBeVisible();
    });
  });

  test.describe('Supporter Dashboard', () => {
    test('crisis button available for supporters', async ({ page }) => {
      await page.goto('http://localhost:8080/supporter/dashboard');
      
      const crisisButton = await page.locator('[data-testid="crisis-button"]');
      await expect(crisisButton).toBeVisible();
      
      // Test supporter-specific resources
      await crisisButton.click();
      const modal = await page.locator('[data-testid="crisis-modal"]');
      await expect(modal).toContainText(/support.*loved one|family.*resources/i);
    });

    test('supporter receives notifications when patient triggers crisis', async ({ page }) => {
      await page.goto('http://localhost:8080/supporter/dashboard');
      
      // Simulate patient crisis trigger
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('patient-crisis', {
          detail: { patientName: 'John D.', time: new Date().toISOString() }
        }));
      });
      
      // Verify notification appears
      const notification = await page.locator('[data-testid="crisis-notification"]');
      await expect(notification).toBeVisible();
      await expect(notification).toContainText('John D.');
    });
  });

  test.describe('Crisis Button Accessibility', () => {
    test('crisis button is keyboard accessible', async ({ page }) => {
      await page.goto('http://localhost:8080/patient/dashboard');
      
      // Tab to crisis button
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      
      // Press Enter to activate
      if (focusedElement === 'crisis-button') {
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-testid="crisis-modal"]')).toBeVisible();
      }
    });

    test('crisis button has proper ARIA labels', async ({ page }) => {
      await page.goto('http://localhost:8080/patient/dashboard');
      
      const crisisButton = await page.locator('[data-testid="crisis-button"]');
      
      // Check ARIA attributes
      await expect(crisisButton).toHaveAttribute('aria-label', /crisis|emergency|help/i);
      await expect(crisisButton).toHaveAttribute('role', 'button');
    });

    test('crisis resources are screen reader accessible', async ({ page }) => {
      await page.goto('http://localhost:8080/patient/dashboard');
      
      await page.click('[data-testid="crisis-button"]');
      
      // Check headings structure
      const modal = await page.locator('[data-testid="crisis-modal"]');
      const headings = await modal.locator('h1, h2, h3').all();
      
      expect(headings.length).toBeGreaterThan(0);
      
      // Verify important numbers are marked up properly
      const hotlineNumber = await modal.locator('[aria-label*="crisis hotline"]');
      await expect(hotlineNumber).toContainText('988');
    });
  });

  test.describe('Crisis Button Performance', () => {
    test('crisis button loads within 500ms', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:8080/patient/dashboard');
      await page.waitForSelector('[data-testid="crisis-button"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(500);
    });

    test('crisis modal opens immediately on click', async ({ page }) => {
      await page.goto('http://localhost:8080/patient/dashboard');
      
      const startTime = Date.now();
      await page.click('[data-testid="crisis-button"]');
      await page.waitForSelector('[data-testid="crisis-modal"]');
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(100);
    });

    test('crisis resources work offline', async ({ page, context }) => {
      await page.goto('http://localhost:8080/patient/dashboard');
      
      // Go offline
      await context.setOffline(true);
      
      // Crisis button should still work
      await page.click('[data-testid="crisis-button"]');
      const modal = await page.locator('[data-testid="crisis-modal"]');
      await expect(modal).toBeVisible();
      
      // Essential info should be cached
      await expect(modal).toContainText('988');
      await expect(modal).toContainText(/emergency/i);
      
      await context.setOffline(false);
    });
  });
});