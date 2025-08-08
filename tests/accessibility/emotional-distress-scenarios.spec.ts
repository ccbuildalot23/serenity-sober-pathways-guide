import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

/**
 * Emotional Distress Scenarios Testing
 * Tests specific recovery components during real-world emotional distress situations:
 * - Panic attacks during HALT Assessment
 * - Severe cravings during timer sessions  
 * - Social anxiety in meeting finder
 * - Decision paralysis in Playing It Forward
 * - Multi-system crisis escalation
 * Focus: Components must work flawlessly when users are most vulnerable
 */

test.describe('Emotional Distress Scenarios Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
    
    // Mock authenticated user in various emotional states
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
  });

  test.describe('HALT Assessment During Panic Attack', () => {
    test('should remain usable during high anxiety and panic', async ({ page }) => {
      // Mock panic attack state
      await page.evaluate(() => {
        localStorage.setItem('user-state', JSON.stringify({
          anxiety: 9,
          heartRate: 'elevated',
          breathing: 'rapid',
          cognitiveLoad: 'impaired',
          motorControl: 'reduced'
        }));
      });
      
      await page.goto('/recovery/halt-assessment');
      
      // Test component loads despite high stress
      const haltForm = page.locator('[data-testid="halt-assessment-form"]');
      await expect(haltForm).toBeVisible({ timeout: 10000 });
      
      // Test large, easy-to-hit sliders for trembling hands
      const sliders = page.locator('input[type="range"]');
      const sliderCount = await sliders.count();
      
      for (let i = 0; i < sliderCount; i++) {
        const slider = sliders.nth(i);
        const bounds = await slider.boundingBox();
        
        // Sliders should be large enough for impaired motor control
        expect(bounds?.height).toBeGreaterThanOrEqual(44);
        
        // Test extreme values (panic attack might cause all high scores)
        await slider.fill('9');
        
        // Verify immediate visual feedback
        const sliderLabel = page.locator(`[data-testid="slider-label-${i}"]`);
        if (await sliderLabel.isVisible()) {
          const labelText = await sliderLabel.textContent();
          expect(labelText).toContain('9');
        }
      }
      
      // Test crisis detection during panic
      await page.click('[data-testid="complete-assessment-button"]');
      
      // Should immediately show crisis support
      const crisisAlert = page.locator('[data-testid="crisis-alert"], [data-testid="panic-support"]');
      await expect(crisisAlert).toBeVisible({ timeout: 5000 });
      
      // Crisis message should be calming and clear
      const crisisText = await crisisAlert.textContent();
      expect(crisisText?.toLowerCase()).toMatch(/(breathe|calm|safe|help)/);
      expect(crisisText?.length).toBeLessThan(200); // Keep message brief for panic state
      
      // Test immediate access to breathing exercises
      const breathingButton = page.locator('[data-testid="breathing-exercise-button"]');
      if (await breathingButton.isVisible()) {
        await breathingButton.click();
        
        const breathingGuide = page.locator('[data-testid="breathing-guide"]');
        await expect(breathingGuide).toBeVisible({ timeout: 3000 });
      }
    });

    test('should provide calming visual design during panic episodes', async ({ page }) => {
      await page.goto('/recovery/halt-assessment');
      
      // Mock high anxiety state triggering calming mode
      await page.evaluate(() => {
        document.body.setAttribute('data-anxiety-mode', 'high');
      });
      
      // Check for calming color scheme
      const assessmentContainer = page.locator('[data-testid="halt-container"]');
      const containerStyles = await assessmentContainer.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor,
          transition: computed.transition
        };
      });
      
      // Should avoid harsh transitions that might trigger panic
      expect(containerStyles.transition).toMatch(/(none|0s|ease)/);
      
      // Test reduced motion for panic sensitivity
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      
      await checkA11y(page, null, {
        rules: {
          'motion': { enabled: true },
          'color-contrast': { enabled: true }
        }
      });
      
      // Test panic-specific help text
      const helpText = page.locator('[data-testid="panic-help-text"]');
      if (await helpText.isVisible()) {
        const text = await helpText.textContent();
        expect(text?.toLowerCase()).toMatch(/(you are safe|this will pass|breathe slowly)/);
      }
    });
  });

  test.describe('Craving Timer During Severe Episodes', () => {
    test('should function during intense craving episodes with impaired judgment', async ({ page }) => {
      await page.goto('/recovery/craving-timer');
      
      // Simulate severe craving state
      await page.evaluate(() => {
        localStorage.setItem('craving-state', JSON.stringify({
          intensity: 10,
          duration: '2hours',
          triggers: ['stress', 'loneliness'],
          rationality: 'impaired',
          impulsivity: 'high'
        }));
      });
      
      // Test high-intensity craving input
      const intensitySlider = page.locator('[data-testid="intensity-before-slider"]');
      await intensitySlider.fill('10');
      
      // Should show extra support for max intensity
      const maxIntensityAlert = page.locator('[data-testid="max-intensity-alert"]');
      if (await maxIntensityAlert.isVisible()) {
        const alertText = await maxIntensityAlert.textContent();
        expect(alertText?.toLowerCase()).toMatch(/(immediate help|crisis|support)/);
      }
      
      // Test timer start with severe craving
      await page.click('[data-testid="start-timer-button"]');
      
      // Should show immediate distractions and support
      const emergencySupport = page.locator('[data-testid="emergency-craving-support"]');
      const distractionGrid = page.locator('[data-testid="distraction-grid"]');
      
      const hasImmediateSupport = await emergencySupport.isVisible() || await distractionGrid.isVisible();
      expect(hasImmediateSupport).toBe(true);
      
      // Test one-tap access to sponsor/support
      const sponsorButton = page.locator('[data-testid="call-sponsor-button"]');
      if (await sponsorButton.isVisible()) {
        const bounds = await sponsorButton.boundingBox();
        
        // Should be extra large for impaired motor control
        expect(bounds?.width).toBeGreaterThanOrEqual(80);
        expect(bounds?.height).toBeGreaterThanOrEqual(60);
        
        // Test immediate activation
        await sponsorButton.click();
        
        // Should trigger call or contact form
        const callInterface = page.locator('[data-testid="call-interface"], [data-testid="sponsor-contact"]');
        await expect(callInterface).toBeVisible({ timeout: 3000 });
      }
      
      // Test craving intensity tracking during episode
      const currentIntensity = page.locator('[data-testid="current-intensity-display"]');
      if (await currentIntensity.isVisible()) {
        await expect(currentIntensity).toContainText('10');
      }
    });

    test('should prevent relapse-enabling actions during severe cravings', async ({ page }) => {
      await page.goto('/recovery/craving-timer');
      
      // Start high-intensity session
      await page.fill('[data-testid="intensity-before-slider"]', '9');
      await page.click('[data-testid="start-timer-button"]');
      
      // Test that dangerous options are not presented
      const dangerousActions = [
        '[data-testid="stop-timer-early"]',
        '[data-testid="skip-distraction"]',
        '[data-testid="minimize-support"]'
      ];
      
      for (const selector of dangerousActions) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          // If dangerous actions exist, they should require confirmation
          await element.click();
          
          const confirmDialog = page.locator('[data-testid="confirm-dangerous-action"]');
          await expect(confirmDialog).toBeVisible();
          
          const confirmText = await confirmDialog.textContent();
          expect(confirmText?.toLowerCase()).toMatch(/(are you sure|consider|support)/);
        }
      }
      
      // Test positive reinforcement messaging
      const encouragement = page.locator('[data-testid="craving-encouragement"]');
      if (await encouragement.isVisible()) {
        const encouragementText = await encouragement.textContent();
        expect(encouragementText?.toLowerCase()).toMatch(/(you can do this|stronger|proud)/);
        expect(encouragementText?.toLowerCase()).not.toMatch(/(failure|weak|relapse)/);
      }
    });
  });

  test.describe('Meeting Finder During Social Anxiety', () => {
    test('should accommodate severe social anxiety and agoraphobia', async ({ page }) => {
      await page.goto('/meetings');
      
      // Mock social anxiety state
      await page.evaluate(() => {
        localStorage.setItem('anxiety-state', JSON.stringify({
          social: 9,
          agoraphobia: true,
          publicSpaces: 'triggering',
          phoneAnxiety: true,
          preference: 'virtual'
        }));
      });
      
      // Should prioritize virtual meetings for socially anxious users
      const virtualFilter = page.locator('[data-testid="virtual-meetings-filter"]');
      if (await virtualFilter.isVisible()) {
        // Should be pre-selected for anxious users
        const isChecked = await virtualFilter.isChecked();
        expect(isChecked).toBe(true);
      }
      
      // Test anonymous browsing mode
      const anonymousToggle = page.locator('[data-testid="anonymous-mode-toggle"]');
      if (await anonymousToggle.isVisible()) {
        await anonymousToggle.click();
        
        // Should hide identifying information
        const userProfile = page.locator('[data-testid="user-profile-section"]');
        if (await userProfile.isVisible()) {
          const opacity = await userProfile.evaluate(el => 
            window.getComputedStyle(el).opacity
          );
          expect(parseFloat(opacity)).toBeLessThan(1);
        }
      }
      
      // Test meeting cards for anxiety-friendly language
      const meetingCards = page.locator('[data-testid="meeting-card"]');
      const cardCount = await meetingCards.count();
      
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = meetingCards.nth(i);
        const cardText = await card.textContent();
        
        // Should avoid intimidating language
        expect(cardText?.toLowerCase()).not.toMatch(/(must speak|required to share|mandatory)/);
        
        // Should highlight welcoming aspects
        if (cardText?.toLowerCase().includes('virtual')) {
          expect(cardText?.toLowerCase()).toMatch(/(welcome|comfortable|safe)/);
        }
      }
      
      // Test private messaging option for support
      const privateSupport = page.locator('[data-testid="private-support-button"]');
      if (await privateSupport.isVisible()) {
        await privateSupport.click();
        
        const supportChat = page.locator('[data-testid="private-support-chat"]');
        await expect(supportChat).toBeVisible();
        
        // Should emphasize anonymity
        const anonymityNotice = page.locator('[data-testid="anonymity-notice"]');
        if (await anonymityNotice.isVisible()) {
          const notice = await anonymityNotice.textContent();
          expect(notice?.toLowerCase()).toMatch(/(anonymous|private|confidential)/);
        }
      }
    });

    test('should provide gentle introduction to meeting participation', async ({ page }) => {
      await page.goto('/meetings');
      
      // Test preparation tools for socially anxious users
      const preparationGuide = page.locator('[data-testid="meeting-preparation-guide"]');
      if (await preparationGuide.isVisible()) {
        await preparationGuide.click();
        
        const prepSteps = page.locator('[data-testid="prep-step"]');
        const stepCount = await prepSteps.count();
        
        // Should have manageable number of steps
        expect(stepCount).toBeLessThanOrEqual(5);
        
        // Each step should be supportive
        for (let i = 0; i < stepCount; i++) {
          const step = prepSteps.nth(i);
          const stepText = await step.textContent();
          expect(stepText?.toLowerCase()).toMatch(/(you can|optional|your choice|comfortable)/);
        }
      }
      
      // Test observer mode explanation
      const observerMode = page.locator('[data-testid="observer-mode-info"]');
      if (await observerMode.isVisible()) {
        const observerText = await observerMode.textContent();
        expect(observerText?.toLowerCase()).toMatch(/(listen only|no pressure|when ready)/);
      }
    });
  });

  test.describe('Playing It Forward During Decision Crisis', () => {
    test('should guide users through decision paralysis', async ({ page }) => {
      await page.goto('/recovery/playing-it-forward');
      
      // Mock decision crisis state
      await page.evaluate(() => {
        localStorage.setItem('decision-state', JSON.stringify({
          paralysis: true,
          overwhelm: 9,
          clarity: 2,
          riskLevel: 'high',
          timeframe: 'immediate'
        }));
      });
      
      // Should simplify decision process for overwhelmed users
      const simplifiedMode = page.locator('[data-testid="simplified-decision-mode"]');
      if (await simplifiedMode.isVisible()) {
        await simplifiedMode.click();
      }
      
      // Test scenario selection for crisis decisions
      const urgentScenario = page.locator('[data-testid="urgent-scenario-button"]');
      if (await urgentScenario.isVisible()) {
        await urgentScenario.click();
        
        const scenarioText = page.locator('[data-testid="scenario-description"]');
        const description = await scenarioText.textContent();
        
        // Should be clear and direct for impaired decision-making
        const sentences = description?.split(/[.!?]+/) || [];
        sentences.forEach(sentence => {
          const words = sentence.trim().split(' ');
          expect(words.length).toBeLessThanOrEqual(12); // Simple sentences
        });
      }
      
      // Test binary choice format for overwhelmed users
      const choiceButtons = page.locator('[data-testid="choice-button"]');
      const choiceCount = await choiceButtons.count();
      
      // Should limit choices to prevent decision paralysis
      expect(choiceCount).toBeLessThanOrEqual(2);
      
      if (choiceCount > 0) {
        for (let i = 0; i < choiceCount; i++) {
          const button = choiceButtons.nth(i);
          const buttonText = await button.textContent();
          
          // Choices should be clear and action-oriented
          expect(buttonText?.split(' ').length).toBeLessThanOrEqual(4);
          expect(buttonText?.toLowerCase()).toMatch(/(yes|no|help|wait|call|stop)/);
        }
      }
    });

    test('should provide immediate consequences without judgment', async ({ page }) => {
      await page.goto('/recovery/playing-it-forward');
      
      // Select a risky scenario
      const riskyScenario = page.locator('[data-testid="drinking-scenario-button"]');
      await riskyScenario.click();
      
      // Choose risky option
      const riskyChoice = page.locator('[data-testid="risky-choice-button"]');
      if (await riskyChoice.isVisible()) {
        await riskyChoice.click();
      }
      
      // Test consequence display
      const consequences = page.locator('[data-testid="consequence-display"]');
      await expect(consequences).toBeVisible();
      
      const consequenceText = await consequences.textContent();
      
      // Should be factual, not judgmental
      expect(consequenceText?.toLowerCase()).not.toMatch(/(stupid|wrong|bad person|failure)/);
      expect(consequenceText?.toLowerCase()).toMatch(/(might feel|could happen|often leads to)/);
      
      // Should always include hope/recovery path
      const recoveryPath = page.locator('[data-testid="recovery-path"]');
      if (await recoveryPath.isVisible()) {
        const recoveryText = await recoveryPath.textContent();
        expect(recoveryText?.toLowerCase()).toMatch(/(instead|you could|another choice)/);
      }
      
      // Test immediate support offer after showing consequences
      const supportOffer = page.locator('[data-testid="immediate-support-offer"]');
      if (await supportOffer.isVisible()) {
        const supportText = await supportOffer.textContent();
        expect(supportText?.toLowerCase()).toMatch(/(talk to someone|get help|support)/);
        
        // Support should be one-click accessible
        const getSupportButton = page.locator('[data-testid="get-support-now-button"]');
        await expect(getSupportButton).toBeVisible();
        
        const bounds = await getSupportButton.boundingBox();
        expect(bounds?.width).toBeGreaterThanOrEqual(80);
        expect(bounds?.height).toBeGreaterThanOrEqual(50);
      }
    });
  });

  test.describe('Recovery System Integration During Multi-Crisis', () => {
    test('should coordinate response across multiple crisis indicators', async ({ page }) => {
      // Mock multiple crisis indicators
      await page.evaluate(() => {
        localStorage.setItem('multi-crisis-state', JSON.stringify({
          haltScore: 36, // High HALT score
          cravingIntensity: 9, // Severe craving
          socialAnxiety: 8, // High social anxiety
          lastCheckIn: Date.now() - (48 * 60 * 60 * 1000), // 48 hours ago
          sleepHours: 3, // Sleep deprivation
          systemsActive: ['halt', 'craving', 'anxiety', 'isolation']
        }));
      });
      
      await page.goto('/dashboard');
      
      // Should show integrated crisis banner
      const multiCrisisBanner = page.locator('[data-testid="multi-crisis-banner"]');
      await expect(multiCrisisBanner).toBeVisible();
      
      const bannerText = await multiCrisisBanner.textContent();
      expect(bannerText?.toLowerCase()).toMatch(/(multiple|several|urgent|immediate)/);
      
      // Test prioritized action list
      const prioritizedActions = page.locator('[data-testid="priority-action-list"]');
      if (await prioritizedActions.isVisible()) {
        const actions = prioritizedActions.locator('button, a');
        const actionCount = await actions.count();
        
        // Should prioritize most urgent actions
        expect(actionCount).toBeLessThanOrEqual(3);
        
        const firstAction = actions.first();
        const firstActionText = await firstAction.textContent();
        expect(firstActionText?.toLowerCase()).toMatch(/(emergency|crisis|help|call)/);
      }
      
      // Test automated support activation
      const autoSupport = page.locator('[data-testid="automated-support-activation"]');
      if (await autoSupport.isVisible()) {
        const supportText = await autoSupport.textContent();
        expect(supportText?.toLowerCase()).toMatch(/(activated|reaching out|connecting)/);
      }
      
      // Should integrate all recovery tools in crisis mode
      const integratedTools = page.locator('[data-testid="integrated-crisis-tools"]');
      if (await integratedTools.isVisible()) {
        const tools = integratedTools.locator('[data-testid*="tool-"]');
        const toolCount = await tools.count();
        
        // Should show HALT, craving timer, and support tools
        expect(toolCount).toBeGreaterThanOrEqual(3);
        
        // Each tool should be crisis-optimized
        for (let i = 0; i < toolCount; i++) {
          const tool = tools.nth(i);
          const bounds = await tool.boundingBox();
          
          // Crisis tools should be extra large
          expect(bounds?.width).toBeGreaterThanOrEqual(80);
          expect(bounds?.height).toBeGreaterThanOrEqual(60);
        }
      }
    });

    test('should maintain hope and dignity during system-wide crisis', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Mock system-wide crisis detection
      await page.evaluate(() => {
        localStorage.setItem('system-crisis', JSON.stringify({
          level: 'severe',
          duration: '6hours',
          escalating: true,
          supportNotified: true
        }));
      });
      
      await page.reload();
      
      // Test that messaging maintains dignity
      const crisisMessages = page.locator('[data-testid*="crisis-message"]');
      const messageCount = await crisisMessages.count();
      
      for (let i = 0; i < messageCount; i++) {
        const message = crisisMessages.nth(i);
        const messageText = await message.textContent();
        
        // Should be hopeful and empowering
        expect(messageText?.toLowerCase()).toMatch(/(you can|strength|capable|temporary|support)/);
        expect(messageText?.toLowerCase()).not.toMatch(/(broken|failure|hopeless|can't)/);
      }
      
      // Test hope-focused recovery reminders
      const hopeReminders = page.locator('[data-testid="hope-reminder"]');
      if (await hopeReminders.isVisible()) {
        const reminderText = await hopeReminders.textContent();
        expect(reminderText?.toLowerCase()).toMatch(/(progress|journey|recovery|tomorrow)/);
      }
      
      // Test celebration of small wins even in crisis
      const smallWins = page.locator('[data-testid="small-wins-recognition"]');
      if (await smallWins.isVisible()) {
        const winsText = await smallWins.textContent();
        expect(winsText?.toLowerCase()).toMatch(/(reached out|asking for help|still trying)/);
      }
      
      // Ensure crisis state doesn't remove all positive elements
      const positiveElements = page.locator('[data-testid*="positive"], [data-testid*="hope"], [data-testid*="strength"]');
      const positiveCount = await positiveElements.count();
      expect(positiveCount).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility During Emotional Distress', () => {
    test('should maintain accessibility standards during all emotional states', async ({ page }) => {
      const emotionalStates = [
        { name: 'panic', route: '/recovery/halt-assessment' },
        { name: 'severe-craving', route: '/recovery/craving-timer' },
        { name: 'social-anxiety', route: '/meetings' },
        { name: 'decision-crisis', route: '/recovery/playing-it-forward' }
      ];
      
      for (const state of emotionalStates) {
        await page.goto(state.route);
        
        // Mock emotional distress state
        await page.evaluate((stateName) => {
          document.body.setAttribute('data-emotional-state', stateName);
        }, state.name);
        
        // Run accessibility audit for distressed state
        await checkA11y(page, null, {
          rules: {
            'color-contrast-enhanced': { enabled: true },
            'focus-order-semantics': { enabled: true },
            'keyboard': { enabled: true },
            'aria-live-region-atomic': { enabled: true }
          }
        });
        
        // Test that critical functions remain keyboard accessible
        const criticalButtons = page.locator('[data-testid*="emergency"], [data-testid*="crisis"], [data-testid*="help"]');
        const buttonCount = await criticalButtons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = criticalButtons.nth(i);
          await button.focus();
          await expect(button).toBeFocused();
          
          // Should have clear focus indicators during distress
          const focusStyles = await button.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              outline: computed.outline,
              boxShadow: computed.boxShadow,
              border: computed.border
            };
          });
          
          const hasClearFocus = 
            focusStyles.outline !== 'none' ||
            focusStyles.boxShadow !== 'none' ||
            focusStyles.border.includes('2px');
          
          expect(hasClearFocus).toBe(true);
        }
      }
    });
  });
});