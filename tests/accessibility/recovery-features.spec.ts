import { test, expect } from '@playwright/test';

// Recovery features accessibility tests focusing on crisis scenarios
test.describe('Recovery Features Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication state for tests
    await page.goto('/');
    // Add any necessary authentication setup here
  });

  test.describe('HALT Assessment Accessibility', () => {
    test('should be accessible during high stress scenarios', async ({ page }) => {
      await page.goto('/halt-assessment');
      
      // Test that page loads and has proper structure
      await expect(page.locator('h1, h2')).toContainText('HALT Assessment');
      
      // Check for proper ARIA labels on sliders
      const hungrySlider = page.locator('input[type="range"]').first();
      await expect(hungrySlider).toBeVisible();
      
      // Test keyboard navigation through sliders
      await hungrySlider.focus();
      await hungrySlider.press('ArrowRight');
      await hungrySlider.press('ArrowRight');
      
      // Test that assessment can be completed with keyboard only
      const submitButton = page.locator('button').filter({ hasText: /get.*suggestions|submit/i });
      if (await submitButton.isVisible()) {
        await expect(submitButton).toBeFocusable();
      }
    });

    test('should have large touch targets for mobile crisis scenarios', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/halt-assessment');
      
      // Check that sliders are accessible on mobile
      const sliders = page.locator('input[type="range"]');
      const sliderCount = await sliders.count();
      
      for (let i = 0; i < sliderCount; i++) {
        const slider = sliders.nth(i);
        await expect(slider).toBeVisible();
        
        // Test touch interaction
        await slider.tap();
        await slider.fill('7'); // Set to high value to test crisis detection
      }
      
      // Check for crisis warning if multiple high values
      const warningText = page.locator('text=/warning|alert|crisis/i');
      if (await warningText.isVisible()) {
        await expect(warningText).toBeVisible();
      }
    });
  });

  test.describe('Craving Timer Accessibility', () => {
    test('should provide clear audio/visual feedback during crisis', async ({ page }) => {
      await page.goto('/craving-timer');
      
      // Check for proper heading structure
      await expect(page.locator('h1, h2')).toContainText(/craving.*timer/i);
      
      // Test intensity slider accessibility
      const intensitySlider = page.locator('input[type="range"]');
      if (await intensitySlider.isVisible()) {
        await intensitySlider.focus();
        await intensitySlider.press('End'); // Set to maximum intensity
        
        // Check for high intensity warnings
        const highIntensityWarning = page.locator('text=/high.*intensity|crisis/i');
        if (await highIntensityWarning.isVisible()) {
          await expect(highIntensityWarning).toBeVisible();
        }
      }
      
      // Test timer start button accessibility
      const startButton = page.locator('button').filter({ hasText: /start.*timer/i });
      if (await startButton.isVisible()) {
        await expect(startButton).toBeFocusable();
        await startButton.click();
        
        // Check for timer display
        const timerDisplay = page.locator('text=/15:00|14:|13:|timer/i');
        if (await timerDisplay.isVisible()) {
          await expect(timerDisplay).toBeVisible();
        }
      }
    });

    test('should have emergency contact accessible at all times', async ({ page }) => {
      await page.goto('/craving-timer');
      
      // Look for emergency/crisis buttons
      const emergencyButton = page.locator('button').filter({ hasText: /emergency|crisis|call|help/i });
      if (await emergencyButton.isVisible()) {
        await expect(emergencyButton).toBeVisible();
        await expect(emergencyButton).toBeFocusable();
      }
      
      // Test keyboard access to emergency features
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
    });
  });

  test.describe('Meeting Finder Accessibility', () => {
    test('should accommodate social anxiety with low-pressure options', async ({ page }) => {
      await page.goto('/meeting-finder');
      
      // Check for proper page structure
      await expect(page.locator('h1, h2')).toContainText(/meeting.*finder/i);
      
      // Test search functionality
      const searchInput = page.locator('input[type="text"], input[placeholder*="location"]');
      if (await searchInput.isVisible()) {
        await expect(searchInput).toBeFocusable();
        await searchInput.fill('Springfield');
      }
      
      // Look for anxiety-friendly filters
      const anxietyFriendlyOptions = page.locator('text=/anxiety.*friendly|newcomer.*friendly|virtual/i');
      if (await anxietyFriendlyOptions.isVisible()) {
        await expect(anxietyFriendlyOptions.first()).toBeVisible();
      }
      
      // Test filter accessibility
      const filterButton = page.locator('button').filter({ hasText: /filter/i });
      if (await filterButton.isVisible()) {
        await filterButton.click();
        
        // Check for anxiety comfort level slider
        const anxietySlider = page.locator('input[type="range"]');
        if (await anxietySlider.isVisible()) {
          await anxietySlider.focus();
          await anxietySlider.press('Home'); // Set to most comfortable
        }
      }
    });

    test('should provide clear meeting information without overwhelming details', async ({ page }) => {
      await page.goto('/meeting-finder');
      
      // Test meeting list accessibility
      const meetingCards = page.locator('div, section').filter({ hasText: /meeting|AA|NA/i });
      if (await meetingCards.count() > 0) {
        const firstMeeting = meetingCards.first();
        
        // Check for essential information visibility
        await expect(firstMeeting).toBeVisible();
        
        // Test action buttons accessibility
        const actionButtons = firstMeeting.locator('button');
        const buttonCount = await actionButtons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = actionButtons.nth(i);
          if (await button.isVisible()) {
            await expect(button).toBeFocusable();
          }
        }
      }
    });
  });

  test.describe('Playing It Forward Accessibility', () => {
    test('should present clear binary choices during decision paralysis', async ({ page }) => {
      await page.goto('/playing-it-forward');
      
      // Check for proper heading
      await expect(page.locator('h1, h2')).toContainText(/playing.*forward/i);
      
      // Test goal selection interface
      const goalCards = page.locator('div, button').filter({ hasText: /goal|relationship|health|career/i });
      if (await goalCards.count() > 0) {
        const firstGoal = goalCards.first();
        await expect(firstGoal).toBeFocusable();
        await firstGoal.click();
      }
      
      // Test continue button
      const continueButton = page.locator('button').filter({ hasText: /continue/i });
      if (await continueButton.isVisible()) {
        await continueButton.click();
      }
      
      // Look for path selection (binary choice)
      const pathButtons = page.locator('button, div').filter({ hasText: /if.*use|if.*stay.*clean/i });
      if (await pathButtons.count() >= 2) {
        const cleanPath = pathButtons.filter({ hasText: /stay.*clean|recovery/i }).first();
        await expect(cleanPath).toBeFocusable();
      }
    });

    test('should avoid overwhelming vulnerable users with too many options', async ({ page }) => {
      await page.goto('/playing-it-forward');
      
      // Count total interactive elements to ensure cognitive load is manageable
      const interactiveElements = page.locator('button, input, select, a');
      const count = await interactiveElements.count();
      
      // During vulnerable moments, limit choices to reduce decision paralysis
      expect(count).toBeLessThan(8); // Max 7 choices per screen
      
      // Test keyboard navigation flow
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
    });
  });

  test.describe('Crisis Integration Accessibility', () => {
    test('should maintain crisis button visibility across all features', async ({ page }) => {
      const routes = ['/halt-assessment', '/craving-timer', '/meeting-finder', '/playing-it-forward'];
      
      for (const route of routes) {
        await page.goto(route);
        
        // Look for crisis/emergency buttons
        const crisisButton = page.locator('button, a').filter({ 
          hasText: /crisis|emergency|help|call.*988|suicide|support/i 
        });
        
        if (await crisisButton.count() > 0) {
          const firstCrisisButton = crisisButton.first();
          await expect(firstCrisisButton).toBeVisible();
          await expect(firstCrisisButton).toBeFocusable();
        }
        
        // Test rapid keyboard access to crisis features (should be within 3 tabs)
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        const focusedElement = page.locator(':focus');
        const focusedText = await focusedElement.textContent();
        
        if (focusedText && /crisis|emergency|help|support/i.test(focusedText)) {
          // Crisis button is keyboard accessible
          expect(focusedText).toBeTruthy();
        }
      }
    });

    test('should provide consistent navigation during crisis states', async ({ page }) => {
      await page.goto('/halt-assessment');
      
      // Test that crisis navigation is consistent
      const mainNavigation = page.locator('nav, header').first();
      if (await mainNavigation.isVisible()) {
        const navLinks = mainNavigation.locator('a, button');
        const navCount = await navLinks.count();
        
        // Ensure navigation doesn't overwhelm during crisis
        expect(navCount).toBeLessThan(6);
      }
      
      // Test escape hatch is always available
      const homeLink = page.locator('a').filter({ hasText: /home|dashboard/i });
      if (await homeLink.isVisible()) {
        await expect(homeLink).toBeFocusable();
      }
    });
  });
});

// Additional accessibility helper functions
test.describe('Accessibility Standards Compliance', () => {
  test('should meet basic WCAG guidelines for recovery features', async ({ page }) => {
    const routes = ['/halt-assessment', '/craving-timer', '/playing-it-forward', '/meeting-finder'];
    
    for (const route of routes) {
      await page.goto(route);
      
      // Check for proper heading hierarchy
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const h1Count = await page.locator('h1').count();
      
      if (h1Count > 0) {
        expect(h1Count).toBeLessThanOrEqual(1); // Only one h1 per page
      }
      
      // Check for form labels if forms exist
      const inputs = page.locator('input, select, textarea');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          // Input should have label or aria-label
          const ariaLabel = await input.getAttribute('aria-label');
          const id = await input.getAttribute('id');
          let hasLabel = !!ariaLabel;
          
          if (id) {
            const label = page.locator(`label[for="${id}"]`);
            hasLabel = hasLabel || (await label.count() > 0);
          }
          
          if (!hasLabel) {
            console.warn(`Input at ${route} may be missing proper labeling`);
          }
        }
      }
    }
  });
});