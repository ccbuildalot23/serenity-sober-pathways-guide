import { test, expect } from '@playwright/test';

test.describe('Basic Recovery Features Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock console to catch any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console error: ${msg.text()}`);
      }
    });
  });

  test('HALT Assessment component structure test', async ({ page }) => {
    // Create a simple HTML page to test the component structure
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>HALT Assessment Test</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .slider-container { margin: 10px 0; }
            .slider { width: 100%; height: 40px; }
            .crisis-warning { background: #fee; border: 1px solid #f00; padding: 10px; color: #800; }
            .submit-button { background: #007cba; color: white; padding: 10px 20px; border: none; }
          </style>
        </head>
        <body>
          <h1>HALT Assessment</h1>
          <p>Check in with yourself: Are you Hungry, Angry, Lonely, or Tired?</p>
          
          <form id="halt-form">
            <div class="slider-container">
              <label for="hungry">Hungry (1-10)</label>
              <input type="range" id="hungry" class="slider" min="1" max="10" value="5" aria-label="Hungry level 1 to 10">
            </div>
            
            <div class="slider-container">
              <label for="angry">Angry (1-10)</label>
              <input type="range" id="angry" class="slider" min="1" max="10" value="5" aria-label="Angry level 1 to 10">
            </div>
            
            <div class="slider-container">
              <label for="lonely">Lonely (1-10)</label>
              <input type="range" id="lonely" class="slider" min="1" max="10" value="5" aria-label="Lonely level 1 to 10">
            </div>
            
            <div class="slider-container">
              <label for="tired">Tired (1-10)</label>
              <input type="range" id="tired" class="slider" min="1" max="10" value="5" aria-label="Tired level 1 to 10">
            </div>
            
            <div id="crisis-warning" class="crisis-warning" style="display: none;">
              ⚠️ Multiple warning signs detected. Consider reaching out to your support network.
            </div>
            
            <button type="submit" class="submit-button">Get Personalized Suggestions</button>
          </form>

          <script>
            const sliders = document.querySelectorAll('.slider');
            const warningDiv = document.getElementById('crisis-warning');
            
            function checkForCrisis() {
              const values = Array.from(sliders).map(s => parseInt(s.value));
              const severeCount = values.filter(v => v >= 8).length;
              const totalScore = values.reduce((a, b) => a + b, 0);
              
              if (severeCount >= 2 || totalScore >= 32) {
                warningDiv.style.display = 'block';
              } else {
                warningDiv.style.display = 'none';
              }
            }
            
            sliders.forEach(slider => {
              slider.addEventListener('input', checkForCrisis);
            });
          </script>
        </body>
      </html>
    `);

    // Test basic structure
    await expect(page.locator('h1')).toContainText('HALT Assessment');
    
    // Test slider accessibility
    const hungrySlider = page.locator('#hungry');
    await expect(hungrySlider).toHaveAttribute('aria-label');
    
    // Test keyboard navigation
    await hungrySlider.focus();
    await hungrySlider.press('ArrowRight');
    await hungrySlider.press('ArrowRight');
    
    // Test crisis detection
    await page.locator('#hungry').fill('9');
    await page.locator('#angry').fill('9');
    
    // Check if crisis warning appears
    const warningDiv = page.locator('#crisis-warning');
    await expect(warningDiv).toBeVisible();
    
    // Test submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    
    // Test that button can be focused
    await submitButton.focus();
    await expect(submitButton).toBeFocused();
  });

  test('Craving Timer component structure test', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Craving Timer Test</title>
          <style>
            .timer-display { font-size: 48px; font-weight: bold; text-align: center; margin: 20px; }
            .intensity-slider { width: 100%; height: 40px; }
            .start-button { background: #e67e22; color: white; padding: 15px 30px; font-size: 18px; }
            .emergency-button { background: #e74c3c; color: white; padding: 10px 20px; }
            .progress-bar { width: 100%; height: 20px; background: #ecf0f1; border-radius: 10px; }
          </style>
        </head>
        <body>
          <h1>15-Minute Craving Timer</h1>
          <p>Cravings are temporary. They typically peak and pass within 15 minutes.</p>
          
          <div id="intensity-setup">
            <label for="intensity">How intense is your craving right now? (1-10)</label>
            <input type="range" id="intensity" class="intensity-slider" min="1" max="10" value="5" aria-label="Craving intensity 1 to 10">
            <div id="intensity-value">5/10</div>
            
            <button id="start-timer" class="start-button">Start 15-Minute Timer</button>
          </div>
          
          <div id="timer-active" style="display: none;">
            <div class="timer-display" id="timer-display">15:00</div>
            <div class="progress-bar">
              <div id="progress" style="background: #e67e22; height: 100%; width: 0%; border-radius: 10px;"></div>
            </div>
            
            <p id="motivational-text">This craving is temporary. Your recovery is permanent.</p>
            
            <button id="pause-timer">Pause</button>
            <button class="emergency-button" id="emergency-contact">Emergency Contact</button>
          </div>
          
          <script>
            const intensitySlider = document.getElementById('intensity');
            const intensityValue = document.getElementById('intensity-value');
            const startButton = document.getElementById('start-timer');
            const timerSetup = document.getElementById('intensity-setup');
            const timerActive = document.getElementById('timer-active');
            
            intensitySlider.addEventListener('input', function() {
              intensityValue.textContent = this.value + '/10';
            });
            
            startButton.addEventListener('click', function() {
              timerSetup.style.display = 'none';
              timerActive.style.display = 'block';
            });
            
            document.getElementById('emergency-contact').addEventListener('click', function() {
              alert('Emergency support would be contacted');
            });
          </script>
        </body>
      </html>
    `);

    // Test basic structure
    await expect(page.locator('h1')).toContainText('15-Minute Craving Timer');
    
    // Test intensity slider
    const intensitySlider = page.locator('#intensity');
    await expect(intensitySlider).toHaveAttribute('aria-label');
    await intensitySlider.fill('8');
    
    // Test start button accessibility
    const startButton = page.locator('#start-timer');
    await startButton.focus();
    await expect(startButton).toBeFocused();
    await startButton.click();
    
    // Test timer interface appears
    await expect(page.locator('#timer-display')).toBeVisible();
    
    // Test emergency button is always accessible
    const emergencyButton = page.locator('#emergency-contact');
    await expect(emergencyButton).toBeVisible();
    await emergencyButton.focus();
    await expect(emergencyButton).toBeFocused();
  });

  test('Meeting Finder accessibility test', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Meeting Finder Test</title>
          <style>
            .meeting-card { border: 1px solid #bdc3c7; margin: 10px; padding: 15px; }
            .anxiety-badge { background: #2ecc71; color: white; padding: 2px 8px; border-radius: 12px; }
            .search-input { width: 100%; padding: 10px; margin: 10px 0; }
            .filter-button { background: #3498db; color: white; padding: 8px 16px; }
          </style>
        </head>
        <body>
          <h1>Meeting Finder</h1>
          <p>Find recovery meetings that feel right for you, including anxiety-friendly options</p>
          
          <input type="text" class="search-input" placeholder="Enter location or use current location" aria-label="Search location">
          <button class="filter-button">Filters</button>
          
          <div id="filters" style="display: none;">
            <label for="anxiety-level">Social Anxiety Comfort Level</label>
            <input type="range" id="anxiety-level" min="1" max="5" value="3" aria-label="Social anxiety comfort level 1 to 5">
            
            <label>
              <input type="checkbox" id="newcomer-friendly"> Newcomer Friendly Only
            </label>
          </div>
          
          <div class="meeting-list">
            <div class="meeting-card">
              <h3>Newcomers Welcome AA</h3>
              <p>Mon at 7:00 PM - 123 Main St</p>
              <span class="anxiety-badge">Very Comfortable</span>
              <span class="anxiety-badge">Newcomer Friendly</span>
              <button>Get Directions</button>
              <button>Save Meeting</button>
            </div>
            
            <div class="meeting-card">
              <h3>Online Support Meeting</h3>
              <p>Fri at 6:00 PM - Virtual</p>
              <span class="anxiety-badge">Very Comfortable</span>
              <button>Join Meeting</button>
              <button>Save Meeting</button>
            </div>
          </div>
          
          <script>
            document.querySelector('.filter-button').addEventListener('click', function() {
              const filters = document.getElementById('filters');
              filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
            });
          </script>
        </body>
      </html>
    `);

    // Test basic structure
    await expect(page.locator('h1')).toContainText('Meeting Finder');
    
    // Test search input accessibility
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toHaveAttribute('aria-label');
    await searchInput.fill('Springfield');
    
    // Test filter button
    const filterButton = page.locator('.filter-button');
    await filterButton.click();
    
    // Test anxiety level slider
    const anxietySlider = page.locator('#anxiety-level');
    await expect(anxietySlider).toHaveAttribute('aria-label');
    await anxietySlider.fill('1'); // Most comfortable setting
    
    // Test meeting cards accessibility
    const meetingCards = page.locator('.meeting-card');
    await expect(meetingCards.first()).toBeVisible();
    
    // Test meeting action buttons
    const actionButtons = meetingCards.first().locator('button');
    const buttonCount = await actionButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    for (let i = 0; i < buttonCount; i++) {
      const button = actionButtons.nth(i);
      if (await button.isVisible()) {
        await button.focus();
        await expect(button).toBeFocused();
      }
    }
  });

  test('Playing It Forward accessibility test', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Playing It Forward Test</title>
          <style>
            .goal-card { border: 1px solid #bdc3c7; margin: 10px; padding: 15px; cursor: pointer; }
            .goal-card.selected { border-color: #9b59b6; background: #f8f4fd; }
            .path-card { border: 2px solid; margin: 20px; padding: 20px; cursor: pointer; }
            .path-using { border-color: #e74c3c; background: #fdf2f2; }
            .path-clean { border-color: #27ae60; background: #f0fdf4; }
          </style>
        </head>
        <body>
          <h1>Playing It Forward</h1>
          <p>Select your most important recovery goals to see how your choices impact your future.</p>
          
          <div id="goal-selection">
            <h3>What matters most to you in recovery?</h3>
            <div class="goal-card" data-goal="family">
              <h4>Rebuild Trust with Family</h4>
              <p>Repair damaged relationships and create healthy bonds</p>
            </div>
            <div class="goal-card" data-goal="health">
              <h4>Improve Physical Health</h4>
              <p>Feel strong, energetic, and healthy</p>
            </div>
            <div class="goal-card" data-goal="career">
              <h4>Advance My Career</h4>
              <p>Get promoted or find meaningful work</p>
            </div>
            
            <button id="continue-goals" disabled>Continue with Goals</button>
          </div>
          
          <div id="path-selection" style="display: none;">
            <h2>Two Paths Ahead</h2>
            <div class="path-card path-using">
              <h3>If I Use...</h3>
              <p>This path moves you away from your goals</p>
            </div>
            <div class="path-card path-clean">
              <h3>If I Stay Clean...</h3>
              <p>This path leads toward your goals</p>
            </div>
          </div>
          
          <script>
            let selectedGoals = [];
            const goalCards = document.querySelectorAll('.goal-card');
            const continueButton = document.getElementById('continue-goals');
            
            goalCards.forEach(card => {
              card.addEventListener('click', function() {
                const goal = this.dataset.goal;
                if (selectedGoals.includes(goal)) {
                  selectedGoals = selectedGoals.filter(g => g !== goal);
                  this.classList.remove('selected');
                } else {
                  selectedGoals.push(goal);
                  this.classList.add('selected');
                }
                
                continueButton.disabled = selectedGoals.length === 0;
              });
              
              // Make cards keyboard accessible
              card.setAttribute('tabindex', '0');
              card.setAttribute('role', 'button');
              card.setAttribute('aria-pressed', 'false');
              
              card.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  this.click();
                }
              });
            });
            
            continueButton.addEventListener('click', function() {
              document.getElementById('goal-selection').style.display = 'none';
              document.getElementById('path-selection').style.display = 'block';
            });
          </script>
        </body>
      </html>
    `);

    // Test basic structure
    await expect(page.locator('h1')).toContainText('Playing It Forward');
    
    // Test goal selection
    const goalCards = page.locator('.goal-card');
    await goalCards.first().focus();
    await expect(goalCards.first()).toBeFocused();
    
    // Select a goal
    await goalCards.first().click();
    await expect(goalCards.first()).toHaveClass(/selected/);
    
    // Test continue button becomes enabled
    const continueButton = page.locator('#continue-goals');
    await expect(continueButton).not.toBeDisabled();
    
    // Test keyboard interaction
    await goalCards.nth(1).focus();
    await goalCards.nth(1).press('Enter');
    
    // Continue to path selection
    await continueButton.click();
    
    // Test path selection interface
    const pathCards = page.locator('.path-card');
    await expect(pathCards).toHaveCount(2);
    
    // Test that paths are clearly differentiated
    await expect(pathCards.first()).toHaveClass(/path-using/);
    await expect(pathCards.last()).toHaveClass(/path-clean/);
  });

  test('Crisis integration accessibility test', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Crisis Integration Test</title>
          <style>
            .crisis-button { 
              position: fixed; 
              bottom: 20px; 
              right: 20px; 
              background: #e74c3c; 
              color: white; 
              padding: 15px; 
              border: none; 
              border-radius: 50px;
              font-size: 16px;
              min-width: 120px;
              min-height: 60px;
            }
            .crisis-warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; }
            .support-network { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>Crisis Integration System</h1>
          
          <div class="crisis-warning">
            ⚠️ Multiple warning signs detected across your recovery tools. Additional support is being activated.
          </div>
          
          <div class="support-network">
            ✅ Your support network has been notified and is ready to help.
          </div>
          
          <button class="crisis-button" aria-label="Emergency crisis support">
            Crisis Support
          </button>
          
          <div>
            <h3>Quick Access During Crisis</h3>
            <ul>
              <li><a href="tel:988">Call 988 Crisis Line</a></li>
              <li><a href="sms:741741">Text HOME to 741741</a></li>
              <li><button>Call My Sponsor</button></li>
              <li><button>Emergency Contact</button></li>
            </ul>
          </div>
          
          <script>
            // Simulate crisis button behavior
            document.querySelector('.crisis-button').addEventListener('click', function() {
              alert('Crisis support toolkit would open');
            });
            
            // Make sure crisis button is always accessible via keyboard
            document.addEventListener('keydown', function(e) {
              if (e.altKey && e.key === 'c') {
                document.querySelector('.crisis-button').focus();
              }
            });
          </script>
        </body>
      </html>
    `);

    // Test crisis button accessibility
    const crisisButton = page.locator('.crisis-button');
    await expect(crisisButton).toBeVisible();
    await crisisButton.focus();
    await expect(crisisButton).toBeFocused();
    await expect(crisisButton).toHaveAttribute('aria-label');
    
    // Test crisis button size (should be large enough for emergency use)
    const buttonBox = await crisisButton.boundingBox();
    if (buttonBox) {
      expect(buttonBox.width).toBeGreaterThanOrEqual(120);
      expect(buttonBox.height).toBeGreaterThanOrEqual(60);
    }
    
    // Test emergency contact links
    const emergencyLinks = page.locator('a[href^="tel:"], a[href^="sms:"]');
    await expect(emergencyLinks.first()).toBeVisible();
    
    // Test keyboard shortcut (Alt+C)
    await page.keyboard.press('Alt+KeyC');
    await expect(crisisButton).toBeFocused();
    
    // Test crisis warnings are visible
    const crisisWarning = page.locator('.crisis-warning');
    await expect(crisisWarning).toBeVisible();
    
    // Test support network notification
    const supportNotification = page.locator('.support-network');
    await expect(supportNotification).toBeVisible();
  });
});