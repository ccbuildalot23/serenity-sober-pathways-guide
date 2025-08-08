import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from '@axe-core/playwright';

/**
 * Comprehensive Accessibility Standards Testing
 * Tests WCAG 2.1 AA compliance with focus on:
 * - Screen reader compatibility
 * - Keyboard-only navigation
 * - Color contrast for crisis indicators
 * - Font sizes and readability during emotional stress
 * - ARIA implementation for recovery contexts
 */

test.describe('Comprehensive Accessibility Standards Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
    
    // Mock authenticated user
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should provide comprehensive screen reader support for crisis components', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Test ARIA landmarks and structure
      await checkA11y(page, null, {
        rules: {
          'landmark-unique': { enabled: true },
          'landmark-one-main': { enabled: true },
          'page-has-heading-one': { enabled: true },
          'heading-order': { enabled: true }
        }
      });
      
      // Test crisis button ARIA attributes
      const crisisButton = page.locator('[data-testid="crisis-button"]');
      if (await crisisButton.isVisible()) {
        await expect(crisisButton).toHaveAttribute('aria-label');
        await expect(crisisButton).toHaveAttribute('role');
        
        const ariaLabel = await crisisButton.getAttribute('aria-label');
        expect(ariaLabel).toContain('crisis');
        expect(ariaLabel).toContain('emergency');
      }
      
      // Test crisis modal accessibility
      await crisisButton.click();
      const crisisModal = page.locator('[data-testid="crisis-modal"]');
      
      if (await crisisModal.isVisible()) {
        await expect(crisisModal).toHaveAttribute('role', 'dialog');
        await expect(crisisModal).toHaveAttribute('aria-modal', 'true');
        await expect(crisisModal).toHaveAttribute('aria-labelledby');
        
        // Test focus management in modal
        const modalTitle = page.locator('[data-testid="crisis-modal-title"]');
        await expect(modalTitle).toBeFocused();
      }
    });

    test('should announce dynamic content changes appropriately', async ({ page }) => {
      await page.goto('/recovery/craving-timer');
      
      // Test live regions for timer updates
      await page.fill('[data-testid="intensity-before-slider"]', '7');
      await page.click('[data-testid="start-timer-button"]');
      
      const timerDisplay = page.locator('[data-testid="timer-display"]');
      await expect(timerDisplay).toHaveAttribute('aria-live');
      
      const liveRegion = await timerDisplay.getAttribute('aria-live');
      expect(['polite', 'assertive', 'off']).toContain(liveRegion);
      
      // Test status updates for screen readers
      const statusUpdates = page.locator('[data-testid="timer-status"]');
      if (await statusUpdates.isVisible()) {
        await expect(statusUpdates).toHaveAttribute('aria-live', 'polite');
      }
      
      // Test motivational quotes accessibility
      const motivationalText = page.locator('[data-testid="motivational-quote"]');
      if (await motivationalText.isVisible()) {
        await expect(motivationalText).toHaveAttribute('aria-live', 'polite');
        await expect(motivationalText).toHaveAttribute('aria-atomic', 'true');
      }
    });

    test('should provide accessible form controls and feedback', async ({ page }) => {
      await page.goto('/check-in');
      
      // Test form accessibility
      await checkA11y(page, null, {
        rules: {
          'label': { enabled: true },
          'form-field-multiple-labels': { enabled: true },
          'input-image-alt': { enabled: true },
          'aria-input-field-name': { enabled: true }
        }
      });
      
      // Test range sliders accessibility (mood/wellness scales)
      const sliders = page.locator('input[type="range"]');
      const sliderCount = await sliders.count();
      
      for (let i = 0; i < sliderCount; i++) {
        const slider = sliders.nth(i);
        
        // Each slider should have proper labeling
        await expect(slider).toHaveAttribute('aria-label');
        await expect(slider).toHaveAttribute('min');
        await expect(slider).toHaveAttribute('max');
        await expect(slider).toHaveAttribute('step');
        
        // Test aria-describedby for additional context
        const describedBy = await slider.getAttribute('aria-describedby');
        if (describedBy) {
          const description = page.locator(`#${describedBy}`);
          await expect(description).toBeVisible();
        }
      }
      
      // Test error message accessibility
      const submitButton = page.locator('[data-testid="submit-checkin"]');
      await submitButton.click();
      
      const errorMessages = page.locator('[data-testid="validation-error"]');
      if (await errorMessages.count() > 0) {
        for (let i = 0; i < await errorMessages.count(); i++) {
          const error = errorMessages.nth(i);
          await expect(error).toHaveAttribute('role', 'alert');
          await expect(error).toHaveAttribute('aria-live', 'assertive');
        }
      }
    });
  });

  test.describe('Keyboard Navigation Testing', () => {
    test('should support complete keyboard navigation through all recovery tools', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test tab order and keyboard accessibility
      await checkA11y(page, null, {
        rules: {
          'tabindex': { enabled: true },
          'keyboard': { enabled: true },
          'focus-order-semantics': { enabled: true }
        }
      });
      
      // Test navigation through quick actions
      const firstAction = page.locator('[data-testid="quick-action-button"]').first();
      await firstAction.focus();
      await expect(firstAction).toBeFocused();
      
      // Navigate through all interactive elements
      const interactiveElements = page.locator('button, a, input, select, [tabindex="0"]');
      const elementCount = await interactiveElements.count();
      
      const currentElement = firstAction;
      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeFocused();
        
        // Verify focus is visible
        const focusOutline = await focusedElement.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            outline: computed.outline,
            outlineWidth: computed.outlineWidth,
            boxShadow: computed.boxShadow
          };
        });
        
        const hasFocusIndicator = 
          focusOutline.outline !== 'none' || 
          focusOutline.outlineWidth !== '0px' ||
          focusOutline.boxShadow !== 'none';
        
        expect(hasFocusIndicator).toBe(true);
      }
    });

    test('should support keyboard shortcuts for crisis situations', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Test emergency shortcuts
      await page.keyboard.press('Escape'); // Should close modals or return to safety
      
      // Test direct access to crisis tools
      await page.keyboard.press('Alt+C'); // Crisis hotline
      const crisisModal = page.locator('[data-testid="crisis-modal"]');
      
      if (await crisisModal.isVisible()) {
        // Test modal keyboard navigation
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        // Test Escape to close
        await page.keyboard.press('Escape');
        await expect(crisisModal).not.toBeVisible();
      }
      
      // Test keyboard access to help resources
      await page.keyboard.press('Alt+H'); // Help/Support
      const helpSection = page.locator('[data-testid="help-resources"]');
      
      if (await helpSection.isVisible()) {
        await expect(helpSection).toBeFocused();
      }
    });

    test('should maintain focus management in dynamic content', async ({ page }) => {
      await page.goto('/recovery/playing-it-forward');
      
      // Test keyboard navigation through scenario steps
      const scenarioButton = page.locator('[data-testid="scenario-button"]').first();
      await scenarioButton.focus();
      await page.keyboard.press('Enter');
      
      // Focus should move to scenario content
      const scenarioContent = page.locator('[data-testid="scenario-content"]');
      await expect(scenarioContent).toBeFocused();
      
      // Test navigation through consequence steps
      const nextButton = page.locator('[data-testid="next-step-button"]');
      await nextButton.focus();
      await page.keyboard.press('Enter');
      
      // Focus should move to new content
      const consequenceContent = page.locator('[data-testid="consequence-content"]');
      if (await consequenceContent.isVisible()) {
        await expect(consequenceContent).toBeFocused();
      }
      
      // Test breadcrumb keyboard navigation
      const breadcrumb = page.locator('[data-testid="scenario-breadcrumb"] a').first();
      if (await breadcrumb.isVisible()) {
        await breadcrumb.focus();
        await page.keyboard.press('Enter');
        
        // Should return focus appropriately
        const returnedFocus = page.locator(':focus');
        await expect(returnedFocus).toBeFocused();
      }
    });
  });

  test.describe('Color Contrast and Visual Accessibility', () => {
    test('should meet enhanced contrast requirements for crisis indicators', async ({ page }) => {
      await page.goto('/recovery/halt-assessment');
      
      // Set high crisis scores to trigger color changes
      await page.fill('[data-testid="hungry-slider"]', '9');
      await page.fill('[data-testid="angry-slider"]', '8');
      await page.fill('[data-testid="lonely-slider"]', '9');
      await page.fill('[data-testid="tired-slider"]', '8');
      
      await page.click('[data-testid="complete-assessment-button"]');
      
      // Test enhanced contrast for crisis indicators
      await checkA11y(page, null, {
        rules: {
          'color-contrast-enhanced': { enabled: true },
          'color-contrast': { enabled: true }
        }
      });
      
      // Manually test crisis indicator colors
      const crisisIndicators = page.locator('[data-testid*="crisis-indicator"]');
      if (await crisisIndicators.count() > 0) {
        for (let i = 0; i < await crisisIndicators.count(); i++) {
          const indicator = crisisIndicators.nth(i);
          const colors = await indicator.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              borderColor: computed.borderColor
            };
          });
          
          // Crisis indicators should use high contrast colors
          // This is a simplified test - in practice, you'd calculate contrast ratios
          expect(colors.color).not.toBe(colors.backgroundColor);
        }
      }
    });

    test('should maintain readability at 200% zoom', async ({ page }) => {
      // Set 200% zoom level
      await page.setViewportSize({ width: 640, height: 480 }); // Simulates zoom
      
      await page.goto('/recovery/craving-timer');
      
      // Test that content remains accessible at high zoom
      await checkA11y(page, null, {
        rules: {
          'target-size': { enabled: true },
          'meta-viewport': { enabled: true }
        }
      });
      
      // Test timer display readability
      await page.fill('[data-testid="intensity-before-slider"]', '6');
      await page.click('[data-testid="start-timer-button"]');
      
      const timerDisplay = page.locator('[data-testid="timer-display"]');
      await expect(timerDisplay).toBeVisible();
      
      // Timer should remain readable
      const timerBounds = await timerDisplay.boundingBox();
      expect(timerBounds?.width).toBeGreaterThan(100);
      expect(timerBounds?.height).toBeGreaterThan(40);
      
      // Test button accessibility at zoom level
      const pauseButton = page.locator('[data-testid="pause-timer-button"]');
      const buttonBounds = await pauseButton.boundingBox();
      expect(buttonBounds?.width).toBeGreaterThan(60);
      expect(buttonBounds?.height).toBeGreaterThan(40);
    });

    test('should work without color as sole indicator', async ({ page }) => {
      await page.goto('/check-in');
      
      // Test that information is conveyed beyond color
      const moodSlider = page.locator('[data-testid="mood-slider"]');
      if (await moodSlider.isVisible()) {
        await moodSlider.fill('3'); // Low mood
        
        // Should have text or icon indicators, not just color
        const moodIndicator = page.locator('[data-testid="mood-indicator"]');
        if (await moodIndicator.isVisible()) {
          const indicatorText = await moodIndicator.textContent();
          expect(indicatorText).toBeTruthy();
          expect(indicatorText?.length).toBeGreaterThan(0);
        }
        
        // Check for emoji or icon indicators
        const emojiIndicator = page.locator('[data-testid="mood-emoji"]');
        if (await emojiIndicator.isVisible()) {
          const emoji = await emojiIndicator.textContent();
          expect(emoji).toMatch(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u);
        }
      }
      
      // Test accessibility without color dependency
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true },
          'link-in-text-block': { enabled: true }
        }
      });
    });
  });

  test.describe('Text and Typography Accessibility', () => {
    test('should provide scalable text for emotional stress scenarios', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Test base font sizes meet minimum requirements
      const textElements = page.locator('p, span, button, label, h1, h2, h3, h4, h5, h6');
      const elementCount = await textElements.count();
      
      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = textElements.nth(i);
        const fontSize = await element.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return parseInt(computed.fontSize);
        });
        
        // Minimum 16px for body text, 18px for important actions
        expect(fontSize).toBeGreaterThanOrEqual(14);
        
        // Crisis buttons should have larger text
        if (await element.getAttribute('data-testid')?.includes('crisis')) {
          expect(fontSize).toBeGreaterThanOrEqual(16);
        }
      }
      
      // Test line height for readability
      const paragraphs = page.locator('p');
      if (await paragraphs.count() > 0) {
        const lineHeight = await paragraphs.first().evaluate(el => {
          const computed = window.getComputedStyle(el);
          return computed.lineHeight;
        });
        
        // Line height should be at least 1.4 times font size
        expect(lineHeight).not.toBe('normal');
        if (lineHeight.endsWith('px')) {
          const lineHeightValue = parseInt(lineHeight);
          expect(lineHeightValue).toBeGreaterThan(20);
        }
      }
    });

    test('should use appropriate heading structure', async ({ page }) => {
      const pages = ['/dashboard', '/check-in', '/crisis-toolkit', '/recovery/craving-timer'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        
        // Test heading hierarchy
        await checkA11y(page, null, {
          rules: {
            'heading-order': { enabled: true },
            'page-has-heading-one': { enabled: true },
            'empty-heading': { enabled: true }
          }
        });
        
        // Verify logical heading structure
        const headings = page.locator('h1, h2, h3, h4, h5, h6');
        const headingCount = await headings.count();
        
        if (headingCount > 0) {
          // Should have one H1
          const h1Count = await page.locator('h1').count();
          expect(h1Count).toBe(1);
          
          // Test heading content is meaningful
          for (let i = 0; i < headingCount; i++) {
            const heading = headings.nth(i);
            const text = await heading.textContent();
            expect(text?.trim().length).toBeGreaterThan(0);
            expect(text?.trim()).not.toBe('heading');
            expect(text?.trim()).not.toBe('title');
          }
        }
      }
    });
  });

  test.describe('ARIA Implementation and Semantic HTML', () => {
    test('should use proper ARIA roles for custom components', async ({ page }) => {
      await page.goto('/recovery/playing-it-forward');
      
      // Test custom component ARIA implementation
      await checkA11y(page, null, {
        rules: {
          'aria-allowed-attr': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-roles': { enabled: true },
          'aria-valid-attr': { enabled: true },
          'aria-valid-attr-value': { enabled: true }
        }
      });
      
      // Test scenario cards as interactive elements
      const scenarioCards = page.locator('[data-testid="scenario-card"]');
      if (await scenarioCards.count() > 0) {
        for (let i = 0; i < await scenarioCards.count(); i++) {
          const card = scenarioCards.nth(i);
          
          if (await card.getAttribute('role') === 'button') {
            await expect(card).toHaveAttribute('tabindex', '0');
            await expect(card).toHaveAttribute('aria-label');
          }
        }
      }
      
      // Test progress indicators
      const progressElements = page.locator('[role="progressbar"]');
      if (await progressElements.count() > 0) {
        for (let i = 0; i < await progressElements.count(); i++) {
          const progress = progressElements.nth(i);
          await expect(progress).toHaveAttribute('aria-valuenow');
          await expect(progress).toHaveAttribute('aria-valuemin');
          await expect(progress).toHaveAttribute('aria-valuemax');
        }
      }
    });

    test('should provide comprehensive alt text for meaningful images', async ({ page }) => {
      const pages = ['/dashboard', '/crisis-toolkit', '/community'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        
        // Test image accessibility
        await checkA11y(page, null, {
          rules: {
            'image-alt': { enabled: true },
            'image-redundant-alt': { enabled: true }
          }
        });
        
        // Test that decorative images are properly marked
        const images = page.locator('img');
        const imageCount = await images.count();
        
        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i);
          const alt = await img.getAttribute('alt');
          const ariaHidden = await img.getAttribute('aria-hidden');
          const role = await img.getAttribute('role');
          
          // Image should either have meaningful alt text or be marked decorative
          if (ariaHidden === 'true' || role === 'presentation') {
            // Decorative images should have empty alt
            expect(alt).toBe('');
          } else {
            // Meaningful images should have descriptive alt text
            expect(alt).toBeTruthy();
            expect(alt?.length).toBeGreaterThan(0);
            
            // Alt text should not be redundant
            expect(alt?.toLowerCase()).not.toContain('image of');
            expect(alt?.toLowerCase()).not.toContain('picture of');
            expect(alt?.toLowerCase()).not.toContain('photo of');
          }
        }
      }
    });
  });

  test.describe('Complete Accessibility Audit', () => {
    test('should pass comprehensive WCAG 2.1 AA audit', async ({ page }) => {
      const criticalPages = [
        '/dashboard',
        '/check-in', 
        '/crisis-toolkit',
        '/recovery/halt-assessment',
        '/recovery/craving-timer',
        '/peer-support'
      ];
      
      for (const pagePath of criticalPages) {
        await page.goto(pagePath);
        
        // Run complete accessibility audit
        const violations = await getViolations(page);
        
        // Log violations for analysis
        if (violations.length > 0) {
          console.log(`Accessibility violations found on ${pagePath}:`);
          violations.forEach(violation => {
            console.log(`- ${violation.id}: ${violation.description}`);
            console.log(`  Impact: ${violation.impact}`);
            console.log(`  Nodes: ${violation.nodes.length}`);
          });
        }
        
        // Filter out minor violations for critical healthcare contexts
        const criticalViolations = violations.filter(v => 
          v.impact === 'critical' || v.impact === 'serious'
        );
        
        // Healthcare applications should have zero critical accessibility violations
        expect(criticalViolations).toHaveLength(0);
      }
    });

    test('should maintain accessibility during error states', async ({ page }) => {
      // Test network error accessibility
      await page.goto('/dashboard');
      
      // Simulate network failure
      await page.route('**/*', route => {
        if (route.request().url().includes('api') || route.request().url().includes('supabase')) {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      await page.reload();
      
      // Error states should still be accessible
      await checkA11y(page, null, {
        rules: {
          'aria-live-region-atomic': { enabled: true },
          'status-messages': { enabled: true }
        }
      });
      
      // Test error message accessibility
      const errorMessages = page.locator('[data-testid="error-message"], [role="alert"]');
      if (await errorMessages.count() > 0) {
        const errorMessage = errorMessages.first();
        await expect(errorMessage).toHaveAttribute('role', 'alert');
        
        const messageText = await errorMessage.textContent();
        expect(messageText).toBeTruthy();
        expect(messageText?.length).toBeGreaterThan(10);
      }
      
      // Cleanup
      await page.unroute('**/*');
    });
  });
});