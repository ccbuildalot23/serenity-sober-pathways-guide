import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

/**
 * Crisis State Accessibility Testing
 * Tests critical recovery components during high emotional distress scenarios
 * Focus: Ensuring accessibility when users are in vulnerable emotional states
 */

test.describe('Crisis State Accessibility Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application and inject axe
    await page.goto('/');
    await injectAxe(page);
    
    // Mock authentication to bypass login during crisis
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
  });

  test.describe('HALT Assessment Crisis Scenarios', () => {
    test('should be accessible during high emotional distress - shaking hands simulation', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Simulate user navigating to HALT Assessment during crisis
      await page.click('[data-testid="halt-assessment-button"]', { force: true });
      
      // Test 1: Large touch targets for distressed users
      const sliders = page.locator('input[type="range"]');
      await expect(sliders.first()).toBeVisible();
      
      // Check minimum touch target size (44px recommended for accessibility)
      const sliderBounds = await sliders.first().boundingBox();
      expect(sliderBounds?.height).toBeGreaterThanOrEqual(44);
      
      // Test 2: High contrast for crisis detection
      await sliders.first().fill('8'); // High intensity
      const crisisAlert = page.locator('[data-testid="crisis-alert"]');
      
      // Check color contrast for crisis indicators
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      
      // Test 3: Emergency button accessibility during panic
      const emergencyButton = page.locator('[data-testid="emergency-contact-button"]');
      await expect(emergencyButton).toBeVisible();
      
      // Verify emergency button is keyboard accessible
      await emergencyButton.focus();
      await expect(emergencyButton).toBeFocused();
      
      // Test button size for shaking hands (minimum 48px)
      const buttonBounds = await emergencyButton.boundingBox();
      expect(buttonBounds?.width).toBeGreaterThanOrEqual(48);
      expect(buttonBounds?.height).toBeGreaterThanOrEqual(48);
    });

    test('should support voice commands during crisis', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Mock voice recognition capability
      await page.addInitScript(() => {
        (window as any).webkitSpeechRecognition = class MockSpeechRecognition {
          start() { this.onresult?.({ results: [[{ transcript: 'help me now' }]] }); }
          stop() {}
          onresult = null;
          onerror = null;
        };
      });
      
      // Test voice activation for HALT Assessment
      await page.click('[data-testid="voice-activation-button"]');
      
      // Verify aria labels for screen readers during crisis
      const voiceButton = page.locator('[data-testid="voice-activation-button"]');
      await expect(voiceButton).toHaveAttribute('aria-label');
      
      // Check accessibility of voice interface
      await checkA11y(page, null, {
        rules: {
          'aria-allowed-attr': { enabled: true },
          'aria-required-attr': { enabled: true }
        }
      });
    });

    test('should maintain accessibility during one-tap crisis escalation', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Simulate high-intensity HALT scores triggering crisis mode
      await page.fill('[data-testid="hungry-slider"]', '9');
      await page.fill('[data-testid="angry-slider"]', '9');
      await page.fill('[data-testid="lonely-slider"]', '8');
      await page.fill('[data-testid="tired-slider"]', '8');
      
      await page.click('[data-testid="complete-assessment-button"]');
      
      // Test one-tap crisis escalation
      const crisisButton = page.locator('[data-testid="crisis-toolkit-button"]');
      await expect(crisisButton).toBeVisible();
      
      // Verify button is accessible via multiple methods
      await crisisButton.focus();
      await expect(crisisButton).toBeFocused();
      
      // Test keyboard activation (Enter and Space)
      await crisisButton.press('Enter');
      await expect(page.locator('[data-testid="crisis-modal"]')).toBeVisible();
      
      // Check modal accessibility during crisis
      await checkA11y(page, null, {
        rules: {
          'focus-trap': { enabled: true },
          'aria-dialog-name': { enabled: true }
        }
      });
    });
  });

  test.describe('Craving Timer High-Intensity Scenarios', () => {
    test('should be accessible during severe craving episodes', async ({ page }) => {
      await page.goto('/recovery/craving-timer');
      
      // Simulate high-intensity craving (user in distress)
      await page.fill('[data-testid="intensity-before-slider"]', '9');
      await page.click('[data-testid="start-timer-button"]');
      
      // Test 1: Large, easy-to-hit pause/resume controls
      const pauseButton = page.locator('[data-testid="pause-timer-button"]');
      const pauseBounds = await pauseButton.boundingBox();
      expect(pauseBounds?.width).toBeGreaterThanOrEqual(48);
      expect(pauseBounds?.height).toBeGreaterThanOrEqual(48);
      
      // Test 2: Emergency contact button always visible during high intensity
      const emergencyButton = page.locator('[data-testid="emergency-contact-button"]');
      await expect(emergencyButton).toBeVisible();
      
      // Test 3: Motivational text readability during stress
      const motivationalText = page.locator('[data-testid="motivational-quote"]');
      await expect(motivationalText).toBeVisible();
      
      // Check text contrast and size for stressed users
      await checkA11y(page, null, {
        rules: {
          'color-contrast-enhanced': { enabled: true }
        }
      });
    });

    test('should support distraction activities with simple gestures', async ({ page }) => {
      await page.goto('/recovery/craving-timer');
      
      // Start high-intensity timer
      await page.fill('[data-testid="intensity-before-slider"]', '8');
      await page.click('[data-testid="start-timer-button"]');
      
      // Test distraction activity buttons
      const breathingButton = page.locator('[data-testid="breathing-distraction"]');
      const musicButton = page.locator('[data-testid="music-distraction"]');
      
      // Verify large touch targets
      const breathingBounds = await breathingButton.boundingBox();
      expect(breathingBounds?.width).toBeGreaterThanOrEqual(60); // Larger for distressed users
      
      // Test keyboard navigation between distractions
      await breathingButton.focus();
      await page.keyboard.press('Tab');
      await expect(musicButton).toBeFocused();
      
      // Check accessibility of distraction grid
      await checkA11y(page, '[data-testid="distraction-grid"]', {
        rules: {
          'tabindex': { enabled: true },
          'keyboard': { enabled: true }
        }
      });
    });
  });

  test.describe('Meeting Finder Social Anxiety Scenarios', () => {
    test('should accommodate users with social anxiety', async ({ page }) => {
      await page.goto('/meetings');
      
      // Test privacy-focused interface
      const virtualToggle = page.locator('[data-testid="virtual-meetings-toggle"]');
      await expect(virtualToggle).toBeVisible();
      
      // Test anonymous browsing mode
      const anonymousMode = page.locator('[data-testid="anonymous-mode-toggle"]');
      if (await anonymousMode.isVisible()) {
        await anonymousMode.click();
      }
      
      // Verify screen reader accessibility for anxious users
      await checkA11y(page, null, {
        rules: {
          'aria-hidden-focus': { enabled: true },
          'bypass': { enabled: true }
        }
      });
      
      // Test skip links for faster navigation (anxiety reduction)
      const skipLink = page.locator('[data-testid="skip-to-meetings"]');
      if (await skipLink.isVisible()) {
        await skipLink.focus();
        await expect(skipLink).toBeFocused();
      }
    });

    test('should provide clear, non-judgmental language', async ({ page }) => {
      await page.goto('/meetings');
      
      // Check for stigmatizing language in meeting descriptions
      const meetingCards = page.locator('[data-testid="meeting-card"]');
      const count = await meetingCards.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const card = meetingCards.nth(i);
        const text = await card.textContent();
        
        // Verify no triggering words for social anxiety
        expect(text).not.toContain('failure');
        expect(text).not.toContain('addict');
        expect(text).not.toContain('broken');
      }
      
      // Check overall accessibility
      await checkA11y(page, '[data-testid="meetings-container"]');
    });
  });

  test.describe('Playing It Forward Vulnerable Decision-Making', () => {
    test('should support users making vulnerable decisions', async ({ page }) => {
      await page.goto('/recovery/playing-it-forward');
      
      // Test scenario selection during vulnerable moment
      const scenarioButton = page.locator('[data-testid="scenario-button"]').first();
      await scenarioButton.click();
      
      // Verify clear, large text for scenario descriptions
      const scenarioText = page.locator('[data-testid="scenario-description"]');
      await expect(scenarioText).toBeVisible();
      
      // Test navigation controls are clear and large
      const nextButton = page.locator('[data-testid="next-step-button"]');
      const backButton = page.locator('[data-testid="previous-step-button"]');
      
      const nextBounds = await nextButton.boundingBox();
      expect(nextBounds?.width).toBeGreaterThanOrEqual(48);
      
      // Check accessibility of consequence display
      await checkA11y(page, '[data-testid="consequences-container"]', {
        rules: {
          'color-contrast-enhanced': { enabled: true },
          'focus-order-semantics': { enabled: true }
        }
      });
    });

    test('should provide hope-focused messaging during vulnerable decisions', async ({ page }) => {
      await page.goto('/recovery/playing-it-forward');
      
      // Start a scenario
      await page.click('[data-testid="drinking-scenario-button"]');
      
      // Verify positive framing in consequence text
      const consequenceText = page.locator('[data-testid="positive-outcome-text"]');
      await expect(consequenceText).toBeVisible();
      
      // Check for supportive, non-judgmental language
      const textContent = await consequenceText.textContent();
      expect(textContent).toContain('strength');
      expect(textContent).toContain('capable');
      expect(textContent).toContain('proud');
      
      // Ensure accessibility of hope messaging
      await checkA11y(page, '[data-testid="hope-message-container"]');
    });
  });

  test.describe('Recovery System Integration Crisis Response', () => {
    test('should integrate seamlessly during multi-system crisis', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Simulate crisis detected by multiple systems
      await page.evaluate(() => {
        // Mock crisis state
        window.localStorage.setItem('crisis-state', JSON.stringify({
          haltScore: 35,
          cravingIntensity: 9,
          lastCheckIn: Date.now() - 86400000 // 24 hours ago
        }));
      });
      
      await page.reload();
      
      // Test crisis banner visibility and accessibility
      const crisisBanner = page.locator('[data-testid="crisis-banner"]');
      await expect(crisisBanner).toBeVisible();
      
      // Verify ARIA live region for crisis updates
      await expect(crisisBanner).toHaveAttribute('aria-live', 'assertive');
      
      // Test integrated action buttons
      const integratedActions = page.locator('[data-testid="integrated-crisis-actions"]');
      await expect(integratedActions).toBeVisible();
      
      // Check keyboard navigation through integrated options
      await integratedActions.locator('button').first().focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Verify accessibility of integrated response
      await checkA11y(page, '[data-testid="crisis-response-modal"]', {
        rules: {
          'aria-dialog-name': { enabled: true },
          'focus-trap': { enabled: true },
          'aria-live-region-atomic': { enabled: true }
        }
      });
    });
  });

  test.describe('Mobile Crisis Testing', () => {
    test('should work on mobile during crisis with large touch targets', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test is only for mobile devices');
      
      await page.goto('/crisis-toolkit');
      
      // Test mobile crisis button size
      const crisisButton = page.locator('[data-testid="mobile-crisis-button"]');
      const buttonBounds = await crisisButton.boundingBox();
      
      // Mobile crisis buttons should be extra large (60px minimum)
      expect(buttonBounds?.width).toBeGreaterThanOrEqual(60);
      expect(buttonBounds?.height).toBeGreaterThanOrEqual(60);
      
      // Test swipe gestures for crisis navigation
      await page.touchscreen.tap(buttonBounds!.x + buttonBounds!.width / 2, 
                                  buttonBounds!.y + buttonBounds!.height / 2);
      
      // Verify mobile accessibility
      await checkA11y(page, null, {
        rules: {
          'touch-target': { enabled: true },
          'target-size': { enabled: true }
        }
      });
    });
  });
});