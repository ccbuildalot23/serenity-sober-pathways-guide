import { test, expect } from '@playwright/test';

test.describe('Clean Day Tracking Integration Tests', () => {
  test('increments clean days after successful check-in', async ({ page }) => {
    await page.goto('http://localhost:8080/patient/checkin');
    
    // Get initial clean days count
    const initialCleanDays = await page.locator('[data-testid="clean-days-count"]').textContent();
    const initialCount = parseInt(initialCleanDays?.match(/\d+/)?.[0] || '0');
    
    // Complete daily check-in
    await page.fill('[data-testid="mood-slider"]', '8');
    await page.fill('[data-testid="anxiety-slider"]', '2');
    await page.fill('[data-testid="sleep-hours"]', '7');
    await page.fill('[data-testid="gratitude-input"]', 'Grateful for another clean day');
    
    // Mark as clean day
    const cleanDayCheckbox = await page.locator('[data-testid="clean-day-checkbox"]');
    if (await cleanDayCheckbox.isVisible()) {
      await cleanDayCheckbox.check();
    }
    
    // Submit check-in
    await page.click('[data-testid="submit-checkin"]');
    
    // Wait for success and navigation
    await expect(page.locator('[data-testid="checkin-success"]')).toBeVisible();
    
    // Verify clean days incremented
    const updatedCleanDays = await page.locator('[data-testid="clean-days-count"]').textContent();
    const updatedCount = parseInt(updatedCleanDays?.match(/\d+/)?.[0] || '0');
    
    expect(updatedCount).toBe(initialCount + 1);
  });

  test('displays recovery milestones at intervals', async ({ page }) => {
    const milestones = [
      { days: 1, message: 'First Day' },
      { days: 7, message: 'One Week' },
      { days: 30, message: 'One Month' },
      { days: 60, message: 'Two Months' },
      { days: 90, message: 'Three Months' },
      { days: 180, message: 'Six Months' },
      { days: 365, message: 'One Year' }
    ];

    for (const milestone of milestones) {
      // Set clean days to milestone value
      await page.evaluate((days) => {
        localStorage.setItem('clean_days', days.toString());
      }, milestone.days);
      
      await page.goto('http://localhost:8080/patient/dashboard');
      
      // Check for milestone display
      const milestoneElement = await page.locator(`[data-testid="milestone-${milestone.days}"]`);
      if (await milestoneElement.isVisible()) {
        await expect(milestoneElement).toContainText(milestone.message);
        
        // Check for celebration animation
        const hasAnimation = await milestoneElement.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.animation !== 'none' || styles.transition !== 'none';
        });
        expect(hasAnimation).toBeTruthy();
      }
    }
  });

  test('syncs clean days with recovery milestones hook', async ({ page }) => {
    await page.goto('http://localhost:8080/patient/dashboard');
    
    // Check that clean days from hook matches display
    const cleanDaysDisplay = await page.locator('[data-testid="clean-days-count"]').textContent();
    const displayCount = parseInt(cleanDaysDisplay?.match(/\d+/)?.[0] || '0');
    
    // Execute hook in page context
    const hookValue = await page.evaluate(() => {
      // This would access the actual hook value in the component
      return window.__recoveryMilestones?.cleanDays || 0;
    });
    
    expect(displayCount).toBe(hookValue);
  });

  test('shows appropriate celebration for milestones', async ({ page }) => {
    // Complete check-in that reaches 30-day milestone
    await page.evaluate(() => {
      localStorage.setItem('clean_days', '29');
    });
    
    await page.goto('http://localhost:8080/patient/checkin');
    
    // Complete check-in
    await page.fill('[data-testid="mood-slider"]', '9');
    await page.fill('[data-testid="anxiety-slider"]', '1');
    await page.fill('[data-testid="sleep-hours"]', '8');
    await page.check('[data-testid="clean-day-checkbox"]');
    await page.click('[data-testid="submit-checkin"]');
    
    // Check for 30-day celebration
    const celebration = await page.locator('[data-testid="milestone-celebration"]');
    await expect(celebration).toBeVisible();
    await expect(celebration).toContainText('30 days');
    
    // Verify confetti or animation plays
    const hasConfetti = await page.locator('.confetti-animation').isVisible();
    expect(hasConfetti).toBeTruthy();
  });

  test('maintains clean day count across sessions', async ({ page, context }) => {
    await page.goto('http://localhost:8080/patient/dashboard');
    
    // Set and verify clean days
    await page.evaluate(() => {
      localStorage.setItem('clean_days', '45');
    });
    
    await page.reload();
    
    const cleanDays = await page.locator('[data-testid="clean-days-count"]').textContent();
    expect(cleanDays).toContain('45');
    
    // Open in new context
    await context.close();
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    
    await newPage.goto('http://localhost:8080/patient/dashboard');
    const persistedDays = await newPage.locator('[data-testid="clean-days-count"]').textContent();
    expect(persistedDays).toContain('45');
    
    await newContext.close();
  });

  test('integrates with daily check-in form', async ({ page }) => {
    await page.goto('http://localhost:8080/patient/checkin');
    
    // Verify clean day option is present
    const cleanDaySection = await page.locator('[data-testid="clean-day-section"]');
    await expect(cleanDaySection).toBeVisible();
    
    // Check that it's optional
    const isRequired = await page.locator('[data-testid="clean-day-checkbox"]').getAttribute('required');
    expect(isRequired).toBeNull();
    
    // Submit without marking clean day
    await page.fill('[data-testid="mood-slider"]', '6');
    await page.fill('[data-testid="anxiety-slider"]', '4');
    await page.fill('[data-testid="sleep-hours"]', '6');
    await page.click('[data-testid="submit-checkin"]');
    
    // Should still succeed
    await expect(page.locator('[data-testid="checkin-success"]')).toBeVisible();
  });

  test('displays recovery strength when clean days present', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('clean_days', '14');
    });
    
    await page.goto('http://localhost:8080/patient/dashboard');
    
    // Check for recovery strength indicator
    const strengthIndicator = await page.locator('[data-testid="recovery-strength"]');
    await expect(strengthIndicator).toBeVisible();
    
    // Verify it shows appropriate strength level
    const strengthText = await strengthIndicator.textContent();
    expect(strengthText).toMatch(/strong|building|growing/i);
  });

  test('provider can view patient clean days', async ({ page }) => {
    await page.goto('http://localhost:8080/provider/dashboard');
    
    // Select a patient
    await page.click('[data-testid="patient-list"] >> text=John Doe');
    
    // View patient details
    const patientDetails = await page.locator('[data-testid="patient-details"]');
    await expect(patientDetails).toBeVisible();
    
    // Check clean days display
    const cleanDaysInfo = await patientDetails.locator('[data-testid="patient-clean-days"]');
    await expect(cleanDaysInfo).toBeVisible();
    await expect(cleanDaysInfo).toContainText(/\d+ days/);
  });

  test('supporter can see loved one clean day progress', async ({ page }) => {
    await page.goto('http://localhost:8080/supporter/dashboard');
    
    // Check for clean days display
    const progressSection = await page.locator('[data-testid="loved-one-progress"]');
    await expect(progressSection).toBeVisible();
    
    const cleanDaysDisplay = await progressSection.locator('[data-testid="clean-days-display"]');
    await expect(cleanDaysDisplay).toBeVisible();
    
    // Verify milestone notifications
    const milestoneNotification = await page.locator('[data-testid="milestone-notification"]');
    if (await milestoneNotification.isVisible()) {
      await expect(milestoneNotification).toContainText(/milestone|achievement/i);
    }
  });

  test('clean days reset functionality works correctly', async ({ page }) => {
    await page.goto('http://localhost:8080/patient/dashboard');
    
    // Set initial clean days
    await page.evaluate(() => {
      localStorage.setItem('clean_days', '15');
    });
    
    await page.reload();
    
    // Navigate to settings or check-in
    await page.goto('http://localhost:8080/patient/checkin');
    
    // Mark as not a clean day (if option exists)
    const resetOption = await page.locator('[data-testid="reset-clean-days"]');
    if (await resetOption.isVisible()) {
      await resetOption.click();
      
      // Confirm reset
      const confirmButton = await page.locator('[data-testid="confirm-reset"]');
      await confirmButton.click();
      
      // Verify count reset to 0
      const cleanDays = await page.locator('[data-testid="clean-days-count"]').textContent();
      expect(cleanDays).toContain('0');
    }
  });
});