import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

/**
 * Cognitive Load Testing for Reduced Capacity Scenarios
 * Tests components when users have impaired cognitive function due to:
 * - Withdrawal symptoms
 * - Sleep deprivation
 * - Medication effects
 * - High stress/anxiety
 * - Depression/mental fog
 * Focus: Simple navigation paths and reduced cognitive burden
 */

test.describe('Cognitive Load Testing - Reduced Capacity Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
    
    // Mock authenticated user with cognitive impairment indicators
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
      
      // Mock user preferences for cognitive accessibility
      localStorage.setItem('cognitive-preferences', JSON.stringify({
        simplifiedInterface: true,
        reducedAnimations: true,
        largerText: true,
        highContrast: true,
        reducedChoices: true
      }));
    });
  });

  test.describe('Simplified Navigation During Cognitive Impairment', () => {
    test('should provide linear navigation paths with minimal choices', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test simplified dashboard view for cognitively impaired users
      const quickActions = page.locator('[data-testid="quick-actions-simplified"]');
      
      // Should show maximum 3 primary actions to reduce choice paralysis
      const actionButtons = quickActions.locator('button');
      const buttonCount = await actionButtons.count();
      expect(buttonCount).toBeLessThanOrEqual(3);
      
      // Verify clear, simple labels
      for (let i = 0; i < buttonCount; i++) {
        const button = actionButtons.nth(i);
        const text = await button.textContent();
        
        // Labels should be short and action-oriented
        expect(text?.length).toBeLessThan(20);
        expect(text?.split(' ').length).toBeLessThanOrEqual(3);
      }
      
      // Test accessibility with cognitive considerations
      await checkA11y(page, '[data-testid="quick-actions-simplified"]', {
        rules: {
          'color-contrast-enhanced': { enabled: true },
          'target-size': { enabled: true },
          'keyboard': { enabled: true }
        }
      });
    });

    test('should reduce cognitive load with breadcrumb navigation', async ({ page }) => {
      await page.goto('/recovery/craving-timer');
      
      // Test simplified breadcrumb for orientation
      const breadcrumb = page.locator('[data-testid="simplified-breadcrumb"]');
      await expect(breadcrumb).toBeVisible();
      
      // Breadcrumb should show only current location and home
      const breadcrumbItems = breadcrumb.locator('a, span');
      const itemCount = await breadcrumbItems.count();
      expect(itemCount).toBeLessThanOrEqual(3); // Home > Section > Current
      
      // Test skip links for cognitive efficiency
      const skipLink = page.locator('[data-testid="skip-to-main"]');
      await skipLink.focus();
      await page.keyboard.press('Enter');
      
      const mainContent = page.locator('[data-testid="main-content"]');
      await expect(mainContent).toBeFocused();
    });

    test('should provide one-step completion flows', async ({ page }) => {
      await page.goto('/check-in');
      
      // Test simplified check-in flow
      const simplifiedCheckIn = page.locator('[data-testid="one-step-checkin"]');
      
      if (await simplifiedCheckIn.isVisible()) {
        // Single question format for cognitive accessibility
        const questions = page.locator('[data-testid="checkin-question"]');
        const questionCount = await questions.count();
        
        // Should present one question at a time
        const visibleQuestions = await page.locator('[data-testid="checkin-question"]:visible').count();
        expect(visibleQuestions).toBe(1);
        
        // Test simple binary choices (Good/Not Good, Yes/No)
        const choiceButtons = page.locator('[data-testid="simple-choice-button"]');
        const choiceCount = await choiceButtons.count();
        expect(choiceCount).toBeLessThanOrEqual(3); // Maximum 3 choices
        
        // Verify large, clear buttons
        for (let i = 0; i < choiceCount; i++) {
          const button = choiceButtons.nth(i);
          const bounds = await button.boundingBox();
          expect(bounds?.width).toBeGreaterThanOrEqual(80);
          expect(bounds?.height).toBeGreaterThanOrEqual(60);
        }
      }
    });
  });

  test.describe('Memory-Assisted Interfaces', () => {
    test('should provide visual cues and prompts for memory issues', async ({ page }) => {
      await page.goto('/recovery/halt-assessment');
      
      // Test visual memory aids
      const visualCues = page.locator('[data-testid="visual-memory-cues"]');
      const sliderLabels = page.locator('[data-testid="slider-with-emojis"]');
      
      // Each slider should have emoji visual cues
      const sliderCount = await page.locator('input[type="range"]').count();
      const emojiCount = await page.locator('[data-testid="emoji-indicator"]').count();
      expect(emojiCount).toBeGreaterThanOrEqual(sliderCount);
      
      // Test progress indicators for multi-step processes
      const progressIndicator = page.locator('[data-testid="visual-progress"]');
      if (await progressIndicator.isVisible()) {
        await expect(progressIndicator).toHaveAttribute('aria-label');
        
        // Progress should be clearly visible
        const progressText = await progressIndicator.textContent();
        expect(progressText).toMatch(/\d+ of \d+/);
      }
      
      // Check accessibility of memory aids
      await checkA11y(page, null, {
        rules: {
          'aria-progressbar-name': { enabled: true },
          'image-alt': { enabled: true }
        }
      });
    });

    test('should maintain context across page refreshes', async ({ page }) => {
      await page.goto('/recovery/craving-timer');
      
      // Start a session and simulate memory lapse (page refresh)
      await page.fill('[data-testid="intensity-before-slider"]', '7');
      await page.click('[data-testid="start-timer-button"]');
      
      // Wait for session to start
      await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();
      
      // Simulate user refreshing page due to confusion
      await page.reload();
      
      // Should restore session state with clear recovery prompt
      const sessionRecovery = page.locator('[data-testid="session-recovery-prompt"]');
      if (await sessionRecovery.isVisible()) {
        await expect(sessionRecovery).toContainText('continue');
        
        // Recovery button should be prominent and clear
        const continueButton = sessionRecovery.locator('[data-testid="continue-session-button"]');
        const bounds = await continueButton.boundingBox();
        expect(bounds?.width).toBeGreaterThanOrEqual(100);
      }
    });
  });

  test.describe('Attention and Focus Accommodations', () => {
    test('should minimize distractions during tasks', async ({ page }) => {
      await page.goto('/recovery/playing-it-forward');
      
      // Test distraction-free mode
      const focusMode = page.locator('[data-testid="focus-mode-container"]');
      
      // Should hide non-essential UI elements
      const sidebar = page.locator('[data-testid="sidebar"]');
      const notifications = page.locator('[data-testid="notification-bell"]');
      
      if (await focusMode.isVisible()) {
        // Sidebar should be hidden or minimal
        if (await sidebar.isVisible()) {
          const sidebarOpacity = await sidebar.evaluate(el => 
            window.getComputedStyle(el).opacity
          );
          expect(parseFloat(sidebarOpacity)).toBeLessThan(1);
        }
        
        // Notifications should be suppressed during focus tasks
        if (await notifications.isVisible()) {
          const isDisabled = await notifications.getAttribute('aria-disabled');
          expect(isDisabled).toBe('true');
        }
      }
      
      // Test single-focus content area
      const mainContent = page.locator('[data-testid="main-content"]');
      await checkA11y(page, '[data-testid="main-content"]', {
        rules: {
          'focus-order-semantics': { enabled: true },
          'bypass': { enabled: true }
        }
      });
    });

    test('should use clear visual hierarchy for attention guidance', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Test primary action prominence
      const primaryButton = page.locator('[data-testid="primary-crisis-action"]');
      const secondaryButtons = page.locator('[data-testid="secondary-crisis-action"]');
      
      // Primary action should be visually distinct
      const primaryBounds = await primaryButton.boundingBox();
      const primaryStyles = await primaryButton.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          backgroundColor: computed.backgroundColor
        };
      });
      
      // Should have larger font and bold weight
      expect(parseInt(primaryStyles.fontSize)).toBeGreaterThan(16);
      expect(parseInt(primaryStyles.fontWeight)).toBeGreaterThanOrEqual(600);
      
      // Test secondary actions are visually de-emphasized
      if (await secondaryButtons.first().isVisible()) {
        const secondaryStyles = await secondaryButtons.first().evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight
          };
        });
        
        expect(parseInt(secondaryStyles.fontSize)).toBeLessThan(parseInt(primaryStyles.fontSize));
      }
    });
  });

  test.describe('Simplified Language and Concepts', () => {
    test('should use plain language for complex concepts', async ({ page }) => {
      await page.goto('/recovery/halt-assessment');
      
      // Test simplified explanations
      const explanations = page.locator('[data-testid="concept-explanation"]');
      
      if (await explanations.count() > 0) {
        for (let i = 0; i < await explanations.count(); i++) {
          const explanation = explanations.nth(i);
          const text = await explanation.textContent();
          
          // Text should use simple sentences
          const sentences = text?.split(/[.!?]+/) || [];
          sentences.forEach(sentence => {
            const words = sentence.trim().split(' ');
            expect(words.length).toBeLessThanOrEqual(15); // Max 15 words per sentence
          });
          
          // Avoid jargon and clinical terms
          expect(text?.toLowerCase()).not.toContain('psychometric');
          expect(text?.toLowerCase()).not.toContain('assessment instrument');
          expect(text?.toLowerCase()).not.toContain('diagnostic');
        }
      }
      
      // Test tooltip explanations for technical terms
      const technicalTerms = page.locator('[data-testid="technical-term"]');
      if (await technicalTerms.count() > 0) {
        const firstTerm = technicalTerms.first();
        await firstTerm.hover();
        
        const tooltip = page.locator('[data-testid="simple-explanation"]');
        if (await tooltip.isVisible()) {
          const tooltipText = await tooltip.textContent();
          expect(tooltipText?.length).toBeLessThan(100); // Keep explanations brief
        }
      }
    });

    test('should provide consistent terminology across components', async ({ page }) => {
      const pages = ['/dashboard', '/check-in', '/crisis-toolkit', '/recovery/craving-timer'];
      const terminology = new Map();
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        
        // Collect button labels and key terms
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i);
          const label = await button.textContent();
          
          if (label && label.includes('Crisis')) {
            const existing = terminology.get('crisis') || [];
            existing.push(label.trim());
            terminology.set('crisis', existing);
          }
          
          if (label && label.includes('Help')) {
            const existing = terminology.get('help') || [];
            existing.push(label.trim());
            terminology.set('help', existing);
          }
        }
      }
      
      // Verify consistent terminology usage
      for (const [concept, labels] of terminology) {
        const uniqueLabels = [...new Set(labels)];
        if (uniqueLabels.length > 1) {
          // Should use consistent terms (allow for some variation like "Get Help" vs "Help")
          const baseTerms = uniqueLabels.map(label => 
            label.toLowerCase().replace(/get |find |access /, '')
          );
          const uniqueBaseTerms = [...new Set(baseTerms)];
          expect(uniqueBaseTerms.length).toBeLessThanOrEqual(2); // Allow minimal variation
        }
      }
    });
  });

  test.describe('Error Prevention and Recovery', () => {
    test('should prevent errors with clear validation', async ({ page }) => {
      await page.goto('/check-in');
      
      // Test progressive validation (not all at once)
      const form = page.locator('[data-testid="checkin-form"]');
      const submitButton = page.locator('[data-testid="submit-checkin"]');
      
      // Try to submit empty form
      await submitButton.click();
      
      // Should show clear, non-technical error messages
      const errorMessages = page.locator('[data-testid="validation-error"]');
      if (await errorMessages.count() > 0) {
        const firstError = await errorMessages.first().textContent();
        
        // Error should be plain language
        expect(firstError?.toLowerCase()).not.toContain('required');
        expect(firstError?.toLowerCase()).not.toContain('invalid');
        expect(firstError?.toLowerCase()).not.toContain('validation');
        
        // Should use positive language
        expect(firstError?.toLowerCase()).toMatch(/(please|help|choose|tell)/);
      }
      
      // Test inline help for form fields
      const helpTexts = page.locator('[data-testid="field-help"]');
      if (await helpTexts.count() > 0) {
        const helpText = await helpTexts.first().textContent();
        expect(helpText?.length).toBeLessThan(50); // Keep help brief
      }
    });

    test('should provide clear recovery paths for errors', async ({ page }) => {
      await page.goto('/recovery/craving-timer');
      
      // Simulate network error during session
      await page.route('**/*', route => route.abort());
      
      await page.fill('[data-testid="intensity-before-slider"]', '8');
      await page.click('[data-testid="start-timer-button"]');
      
      // Should show clear offline/error state
      const errorState = page.locator('[data-testid="error-recovery"]');
      if (await errorState.isVisible()) {
        // Error recovery should have simple action
        const retryButton = errorState.locator('[data-testid="retry-action"]');
        await expect(retryButton).toBeVisible();
        
        const retryText = await retryButton.textContent();
        expect(retryText?.toLowerCase()).toMatch(/(try again|retry|continue)/);
        
        // Should preserve user data
        const preservedData = errorState.locator('[data-testid="preserved-session"]');
        if (await preservedData.isVisible()) {
          await expect(preservedData).toContainText('saved');
        }
      }
      
      // Restore network for cleanup
      await page.unroute('**/*');
    });
  });

  test.describe('Reduced Animation and Motion', () => {
    test('should respect reduced motion preferences', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await page.goto('/dashboard');
      
      // Test that animations are disabled or minimal
      const animatedElements = page.locator('[data-testid*="animated"]');
      
      if (await animatedElements.count() > 0) {
        for (let i = 0; i < await animatedElements.count(); i++) {
          const element = animatedElements.nth(i);
          const animations = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              animationDuration: computed.animationDuration,
              transitionDuration: computed.transitionDuration
            };
          });
          
          // Animations should be instant or very short
          expect(animations.animationDuration).toMatch(/(0s|0\.1s|0\.2s)/);
          expect(animations.transitionDuration).toMatch(/(0s|0\.1s|0\.2s)/);
        }
      }
      
      // Test accessibility with reduced motion
      await checkA11y(page, null, {
        rules: {
          'motion': { enabled: true }
        }
      });
    });
  });
});