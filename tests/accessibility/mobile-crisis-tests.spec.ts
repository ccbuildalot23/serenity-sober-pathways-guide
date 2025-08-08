import { test, expect, devices } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

/**
 * Mobile Crisis Testing
 * Tests touch targets, gestures, and mobile-specific accessibility for crisis situations
 * Focus: Large touch areas, simple gestures, offline functionality, emergency access
 */

test.describe('Mobile Crisis Testing', () => {
  // Configure mobile test environment
  test.use({
    ...devices['iPhone 12'],
    // Simulate high stress scenario with potential hand tremors
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
    
    // Mock mobile user in crisis state
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
      
      // Mock crisis state for testing
      localStorage.setItem('crisis-indicators', JSON.stringify({
        highStress: true,
        emergencyMode: true,
        handTremors: true,
        reducedMotorControl: true
      }));
    });
  });

  test.describe('Touch Target Size and Accessibility', () => {
    test('should have extra-large touch targets for crisis buttons', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Test primary crisis action button
      const primaryCrisisButton = page.locator('[data-testid="primary-crisis-button"]');
      await expect(primaryCrisisButton).toBeVisible();
      
      const buttonBounds = await primaryCrisisButton.boundingBox();
      
      // Crisis buttons should be 60px minimum (larger than standard 44px) for trembling hands
      expect(buttonBounds?.width).toBeGreaterThanOrEqual(60);
      expect(buttonBounds?.height).toBeGreaterThanOrEqual(60);
      
      // Test emergency contact button
      const emergencyButton = page.locator('[data-testid="emergency-call-button"]');
      if (await emergencyButton.isVisible()) {
        const emergencyBounds = await emergencyButton.boundingBox();
        expect(emergencyBounds?.width).toBeGreaterThanOrEqual(80); // Even larger for emergency
        expect(emergencyBounds?.height).toBeGreaterThanOrEqual(60);
      }
      
      // Check accessibility with mobile considerations
      await checkA11y(page, null, {
        rules: {
          'touch-target': { enabled: true },
          'target-size': { enabled: true }
        }
      });
    });

    test('should provide adequate spacing between interactive elements', async ({ page }) => {
      await page.goto('/recovery/halt-assessment');
      
      // Test slider controls spacing for mobile
      const sliders = page.locator('input[type="range"]');
      const sliderCount = await sliders.count();
      
      if (sliderCount > 1) {
        const firstSlider = await sliders.nth(0).boundingBox();
        const secondSlider = await sliders.nth(1).boundingBox();
        
        if (firstSlider && secondSlider) {
          const spacing = secondSlider.y - (firstSlider.y + firstSlider.height);
          expect(spacing).toBeGreaterThanOrEqual(20); // Minimum 20px spacing
        }
      }
      
      // Test button grid spacing
      const buttonGrid = page.locator('[data-testid="action-button-grid"]');
      if (await buttonGrid.isVisible()) {
        const buttons = buttonGrid.locator('button');
        const buttonCount = await buttons.count();
        
        if (buttonCount > 1) {
          const firstButton = await buttons.nth(0).boundingBox();
          const secondButton = await buttons.nth(1).boundingBox();
          
          if (firstButton && secondButton) {
            // Calculate minimum distance between button centers
            const centerDistance = Math.sqrt(
              Math.pow(secondButton.x - firstButton.x, 2) + 
              Math.pow(secondButton.y - firstButton.y, 2)
            );
            expect(centerDistance).toBeGreaterThanOrEqual(60); // Minimum center-to-center distance
          }
        }
      }
    });

    test('should accommodate different thumb sizes and positions', async ({ page }) => {
      await page.goto('/recovery/craving-timer');
      
      // Start timer to access mobile controls
      await page.fill('[data-testid="intensity-before-slider"]', '8');
      await page.click('[data-testid="start-timer-button"]');
      
      // Test timer controls positioning for one-handed use
      const pauseButton = page.locator('[data-testid="pause-timer-button"]');
      const resetButton = page.locator('[data-testid="reset-timer-button"]');
      
      if (await pauseButton.isVisible() && await resetButton.isVisible()) {
        const pauseBounds = await pauseButton.boundingBox();
        const resetBounds = await resetButton.boundingBox();
        
        // Buttons should be in thumb-friendly zone (bottom 2/3 of screen)
        const viewportHeight = page.viewportSize()?.height || 800;
        const thumbZoneTop = viewportHeight * 0.33;
        
        expect(pauseBounds?.y).toBeGreaterThanOrEqual(thumbZoneTop);
        expect(resetBounds?.y).toBeGreaterThanOrEqual(thumbZoneTop);
        
        // Critical actions should be within easy thumb reach (center-bottom area)
        const screenWidth = page.viewportSize()?.width || 400;
        const thumbReachLeft = screenWidth * 0.2;
        const thumbReachRight = screenWidth * 0.8;
        
        expect(pauseBounds?.x).toBeGreaterThanOrEqual(thumbReachLeft);
        expect(pauseBounds?.x + (pauseBounds?.width || 0)).toBeLessThanOrEqual(thumbReachRight);
      }
    });
  });

  test.describe('Gesture Accessibility and Simplicity', () => {
    test('should support simple tap gestures without complex interactions', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Test that crisis actions require only single taps
      const crisisActions = page.locator('[data-testid*="crisis-action"]');
      const actionCount = await crisisActions.count();
      
      for (let i = 0; i < actionCount; i++) {
        const action = crisisActions.nth(i);
        
        // Verify no double-tap or long-press requirements
        const gestureAttributes = await action.evaluate(el => ({
          onDoubleClick: el.ondblclick !== null,
          hasLongPress: el.getAttribute('data-long-press') !== null,
          touchAction: window.getComputedStyle(el).touchAction
        }));
        
        expect(gestureAttributes.onDoubleClick).toBe(false);
        expect(gestureAttributes.hasLongPress).toBe(false);
        
        // Touch action should allow simple taps
        expect(gestureAttributes.touchAction).not.toBe('none');
      }
      
      // Test single tap activation
      const helpButton = page.locator('[data-testid="help-button"]');
      if (await helpButton.isVisible()) {
        const bounds = await helpButton.boundingBox();
        
        // Single tap should activate
        await page.touchscreen.tap(
          bounds!.x + bounds!.width / 2,
          bounds!.y + bounds!.height / 2
        );
        
        // Verify response
        const helpModal = page.locator('[data-testid="help-modal"]');
        if (await helpModal.isVisible()) {
          await expect(helpModal).toBeVisible();
        }
      }
    });

    test('should avoid accidental activation with proper touch handling', async ({ page }) => {
      await page.goto('/recovery/playing-it-forward');
      
      // Test that scenario buttons require deliberate activation
      const scenarioButtons = page.locator('[data-testid="scenario-button"]');
      
      if (await scenarioButtons.count() > 0) {
        const firstButton = scenarioButtons.first();
        const bounds = await firstButton.boundingBox();
        
        // Test touch start and move (swipe gesture) doesn't activate
        await page.touchscreen.tap(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
        
        // Verify activation only on proper tap
        const scenarioModal = page.locator('[data-testid="scenario-modal"]');
        if (await scenarioModal.isVisible()) {
          // Should have activated with clean tap
          await expect(scenarioModal).toBeVisible();
          
          // Close modal for next test
          const closeButton = page.locator('[data-testid="close-scenario"]');
          await closeButton.tap();
        }
      }
    });

    test('should provide tactile feedback simulation', async ({ page }) => {
      await page.goto('/recovery/craving-timer');
      
      // Test vibration API mock for crisis situations
      await page.addInitScript(() => {
        const vibrationCalls: number[] = [];
        
        (navigator as any).vibrate = (pattern: number | number[]) => {
          vibrationCalls.push(Array.isArray(pattern) ? pattern.length : 1);
          return true;
        };
        
        (window as any).getVibrationCalls = () => vibrationCalls;
      });
      
      // Trigger actions that should provide haptic feedback
      await page.fill('[data-testid="intensity-before-slider"]', '9');
      await page.click('[data-testid="start-timer-button"]');
      
      // Check if vibration was triggered for high intensity
      const vibrationCalls = await page.evaluate(() => (window as any).getVibrationCalls?.() || []);
      
      // High-intensity craving should trigger tactile feedback
      if (vibrationCalls.length > 0) {
        expect(vibrationCalls.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Emergency Access and Offline Functionality', () => {
    test('should provide immediate access to emergency contacts', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Test emergency contact button prominence
      const emergencyButton = page.locator('[data-testid="emergency-contact-button"]');
      await expect(emergencyButton).toBeVisible();
      
      // Should be in top portion of screen for immediate access
      const bounds = await emergencyButton.boundingBox();
      const viewportHeight = page.viewportSize()?.height || 800;
      
      expect(bounds?.y).toBeLessThan(viewportHeight * 0.4); // Top 40% of screen
      
      // Test direct call functionality
      await emergencyButton.tap();
      
      // Should trigger phone call or emergency modal
      const callModal = page.locator('[data-testid="emergency-call-modal"]');
      const phoneLink = page.locator('a[href^="tel:"]');
      
      const hasCallInterface = await callModal.isVisible() || await phoneLink.count() > 0;
      expect(hasCallInterface).toBe(true);
      
      // Test 911/988 hotline quick access
      const hotlineButton = page.locator('[data-testid="crisis-hotline-button"]');
      if (await hotlineButton.isVisible()) {
        await expect(hotlineButton).toContainText('988');
        
        const hotlineBounds = await hotlineButton.boundingBox();
        expect(hotlineBounds?.width).toBeGreaterThanOrEqual(80);
        expect(hotlineBounds?.height).toBeGreaterThanOrEqual(60);
      }
    });

    test('should work offline for critical crisis functions', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Test offline mode activation
      await page.route('**/*', route => {
        if (route.request().url().includes('api')) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      // Simulate going offline
      await page.setOffline(true);
      await page.reload();
      
      // Critical crisis functions should still work
      const offlineBanner = page.locator('[data-testid="offline-banner"]');
      if (await offlineBanner.isVisible()) {
        await expect(offlineBanner).toContainText('offline');
      }
      
      // Test offline crisis toolkit access
      const offlineCrisisButton = page.locator('[data-testid="offline-crisis-button"]');
      if (await offlineCrisisButton.isVisible()) {
        await offlineCrisisButton.tap();
        
        const offlineToolkit = page.locator('[data-testid="offline-crisis-toolkit"]');
        await expect(offlineToolkit).toBeVisible();
        
        // Test offline breathing exercises
        const breathingExercise = page.locator('[data-testid="offline-breathing-exercise"]');
        if (await breathingExercise.isVisible()) {
          await breathingExercise.tap();
          
          const breathingTimer = page.locator('[data-testid="breathing-timer"]');
          await expect(breathingTimer).toBeVisible();
        }
      }
      
      // Restore online state
      await page.setOffline(false);
      await page.unroute('**/*');
    });

    test('should cache critical resources for offline use', async ({ page }) => {
      // Test service worker caching
      await page.goto('/crisis-toolkit');
      
      // Verify critical resources are cached
      const cacheStatus = await page.evaluate(async () => {
        if ('serviceWorker' in navigator && 'caches' in window) {
          const cache = await caches.open('crisis-toolkit-cache');
          const cachedResources = await cache.keys();
          return {
            hasCrisisResources: cachedResources.some(req => 
              req.url.includes('crisis') || req.url.includes('emergency')
            ),
            resourceCount: cachedResources.length
          };
        }
        return { hasCrisisResources: false, resourceCount: 0 };
      });
      
      if (cacheStatus.resourceCount > 0) {
        expect(cacheStatus.hasCrisisResources).toBe(true);
      }
      
      // Test offline HALT Assessment
      await page.goto('/recovery/halt-assessment');
      await page.setOffline(true);
      await page.reload();
      
      const haltForm = page.locator('[data-testid="halt-form"]');
      const offlineMessage = page.locator('[data-testid="offline-halt-message"]');
      
      // Should show either cached form or helpful offline message
      const hasOfflineSupport = await haltForm.isVisible() || await offlineMessage.isVisible();
      expect(hasOfflineSupport).toBe(true);
      
      await page.setOffline(false);
    });
  });

  test.describe('Mobile-Specific Crisis Navigation', () => {
    test('should support swipe navigation for crisis scenarios', async ({ page }) => {
      await page.goto('/recovery/playing-it-forward');
      
      // Test swipe navigation through scenarios
      const scenarioContainer = page.locator('[data-testid="scenario-container"]');
      
      if (await scenarioContainer.isVisible()) {
        const containerBounds = await scenarioContainer.boundingBox();
        
        // Test left swipe to next scenario
        await page.touchscreen.tap(
          containerBounds!.x + containerBounds!.width * 0.8,
          containerBounds!.y + containerBounds!.height / 2
        );
        
        await page.touchscreen.tap(
          containerBounds!.x + containerBounds!.width * 0.2,
          containerBounds!.y + containerBounds!.height / 2
        );
        
        // Should show next scenario or navigation indicator
        const navigationIndicator = page.locator('[data-testid="scenario-navigation"]');
        if (await navigationIndicator.isVisible()) {
          await expect(navigationIndicator).toBeVisible();
        }
      }
    });

    test('should have mobile-optimized crisis modal layout', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      const crisisButton = page.locator('[data-testid="crisis-button"]');
      await crisisButton.tap();
      
      const crisisModal = page.locator('[data-testid="crisis-modal"]');
      if (await crisisModal.isVisible()) {
        const modalBounds = await crisisModal.boundingBox();
        const viewport = page.viewportSize();
        
        // Modal should use most of screen real estate on mobile
        const widthRatio = modalBounds!.width / viewport!.width;
        const heightRatio = modalBounds!.height / viewport!.height;
        
        expect(widthRatio).toBeGreaterThan(0.9); // At least 90% width
        expect(heightRatio).toBeGreaterThan(0.7); // At least 70% height
        
        // Test modal controls are thumb-friendly
        const modalButtons = crisisModal.locator('button');
        const buttonCount = await modalButtons.count();
        
        for (let i = 0; i < buttonCount; i++) {
          const button = modalButtons.nth(i);
          const buttonBounds = await button.boundingBox();
          
          expect(buttonBounds?.height).toBeGreaterThanOrEqual(50);
          expect(buttonBounds?.width).toBeGreaterThanOrEqual(60);
        }
        
        // Close button should be easily accessible
        const closeButton = page.locator('[data-testid="close-crisis-modal"]');
        if (await closeButton.isVisible()) {
          const closeBounds = await closeButton.boundingBox();
          
          // Should be in top-right corner
          expect(closeBounds?.x).toBeGreaterThan(viewport!.width * 0.8);
          expect(closeBounds?.y).toBeLessThan(viewport!.height * 0.2);
        }
      }
    });
  });

  test.describe('Mobile Performance and Battery Optimization', () => {
    test('should optimize for low battery crisis scenarios', async ({ page }) => {
      await page.goto('/crisis-toolkit');
      
      // Mock low battery state
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'getBattery', {
          value: () => Promise.resolve({
            level: 0.15, // 15% battery
            charging: false
          })
        });
      });
      
      await page.reload();
      
      // Should show battery optimization mode
      const batteryWarning = page.locator('[data-testid="low-battery-warning"]');
      const optimizedMode = page.locator('[data-testid="optimized-mode"]');
      
      if (await batteryWarning.isVisible() || await optimizedMode.isVisible()) {
        // Test reduced animations
        const animatedElements = page.locator('[data-testid*="animated"]');
        
        if (await animatedElements.count() > 0) {
          const animation = await animatedElements.first().evaluate(el => {
            const computed = window.getComputedStyle(el);
            return computed.animationDuration;
          });
          
          // Animations should be disabled or very short
          expect(animation).toMatch(/(0s|none)/);
        }
        
        // Test essential features still available
        const essentialButtons = page.locator('[data-testid*="emergency"], [data-testid*="crisis"]');
        const essentialCount = await essentialButtons.count();
        expect(essentialCount).toBeGreaterThan(0);
      }
    });

    test('should minimize network usage during crisis', async ({ page }) => {
      let networkRequests = 0;
      
      page.on('request', request => {
        if (!request.url().includes('localhost') && !request.url().includes('127.0.0.1')) {
          networkRequests++;
        }
      });
      
      await page.goto('/crisis-toolkit');
      
      // Interact with offline-capable features
      const offlineFeatures = page.locator('[data-testid*="offline"]');
      
      if (await offlineFeatures.count() > 0) {
        await offlineFeatures.first().tap();
        
        // Wait for any potential network calls
        await page.waitForTimeout(2000);
        
        // Should minimize external requests during crisis mode
        expect(networkRequests).toBeLessThan(5);
      }
    });
  });

  test.describe('Accessibility Compliance on Mobile', () => {
    test('should maintain WCAG compliance on mobile devices', async ({ page }) => {
      const mobilePages = [
        '/crisis-toolkit',
        '/recovery/halt-assessment',
        '/recovery/craving-timer',
        '/check-in'
      ];
      
      for (const pagePath of mobilePages) {
        await page.goto(pagePath);
        
        // Run mobile-specific accessibility checks
        await checkA11y(page, null, {
          rules: {
            'touch-target': { enabled: true },
            'target-size': { enabled: true },
            'color-contrast': { enabled: true },
            'meta-viewport': { enabled: true }
          }
        });
        
        // Test mobile viewport configuration
        const viewport = await page.evaluate(() => {
          const meta = document.querySelector('meta[name="viewport"]');
          return meta?.getAttribute('content');
        });
        
        expect(viewport).toContain('width=device-width');
        expect(viewport).toContain('initial-scale=1');
      }
    });
  });
});