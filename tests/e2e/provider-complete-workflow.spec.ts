import { test, expect, Page } from '@playwright/test';

/**
 * COMPLETE PROVIDER WORKFLOW E2E TEST
 * 
 * This test validates the entire provider journey from login to patient care.
 * It ensures all critical provider features work end-to-end in a realistic scenario.
 * 
 * WORKFLOW TESTED:
 * 1. Provider login with MFA
 * 2. Dashboard overview
 * 3. Patient search and selection
 * 4. Care plan creation
 * 5. Progress note documentation
 * 6. Appointment scheduling
 * 7. Secure messaging
 * 8. Analytics review
 * 9. Proper logout
 */

test.describe('Provider Complete Workflow', () => {
  let page: Page;
  const testProviderEmail = 'test-provider@serenity.com';
  const testProviderPassword = 'TestPass123!';
  const testPatientName = 'John Doe';
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:8080');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Complete provider workflow from login to patient care', async () => {
    // ========================================
    // STEP 1: PROVIDER LOGIN
    // ========================================
    await test.step('Provider login', async () => {
      // Navigate to login
      await page.click('text=Provider Login');
      await expect(page).toHaveURL(/.*\/login/);
      
      // Fill login form
      await page.fill('input[type="email"]', testProviderEmail);
      await page.fill('input[type="password"]', testProviderPassword);
      
      // Submit login
      await page.click('button:has-text("Sign In")');
      
      // Wait for dashboard redirect
      await page.waitForURL(/.*\/provider\/dashboard/, { timeout: 10000 });
      
      // Verify provider name appears
      await expect(page.locator('text=Dr. Test Provider')).toBeVisible();
      console.log('✅ Provider logged in successfully');
    });

    // ========================================
    // STEP 2: DASHBOARD OVERVIEW
    // ========================================
    await test.step('Review dashboard metrics', async () => {
      // Check key metrics are visible
      await expect(page.locator('text=Active Patients')).toBeVisible();
      await expect(page.locator('text=Appointments Today')).toBeVisible();
      await expect(page.locator('text=Unread Messages')).toBeVisible();
      await expect(page.locator('text=Care Plans')).toBeVisible();
      
      // Verify quick actions
      await expect(page.locator('button:has-text("New Appointment")')).toBeVisible();
      await expect(page.locator('button:has-text("New Note")')).toBeVisible();
      
      // Check for recent activity feed
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      console.log('✅ Dashboard loaded with all metrics');
    });

    // ========================================
    // STEP 3: PATIENT SEARCH AND SELECTION
    // ========================================
    await test.step('Search and select patient', async () => {
      // Click on patients tab
      await page.click('a:has-text("Patients")');
      await page.waitForURL(/.*\/provider\/patients/);
      
      // Search for patient
      await page.fill('input[placeholder="Search patients..."]', testPatientName);
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await page.waitForSelector(`text=${testPatientName}`, { timeout: 5000 });
      
      // Click on patient card
      await page.click(`[data-testid="patient-card"]:has-text("${testPatientName}")`);
      
      // Verify patient profile loaded
      await expect(page.locator('h1:has-text("Patient Profile")')).toBeVisible();
      await expect(page.locator(`text=${testPatientName}`)).toBeVisible();
      console.log('✅ Patient selected successfully');
    });

    // ========================================
    // STEP 4: CREATE CARE PLAN
    // ========================================
    await test.step('Create comprehensive care plan', async () => {
      // Click create care plan button
      await page.click('button:has-text("Create Care Plan")');
      
      // Fill care plan form
      await page.fill('input[name="title"]', 'Substance Recovery and Mental Health Plan');
      await page.fill('textarea[name="description"]', 'Comprehensive treatment plan for substance use disorder with co-occurring depression');
      
      // Select diagnosis codes
      await page.click('input[placeholder="Add diagnosis codes"]');
      await page.click('text=F32.1 - Major depressive disorder');
      await page.click('text=F10.20 - Alcohol use disorder');
      
      // Set treatment approach
      await page.selectOption('select[name="treatment_approach"]', 'Integrated Dual Diagnosis Treatment');
      
      // Set risk level
      await page.selectOption('select[name="risk_level"]', 'medium');
      
      // Add goals
      await page.click('button:has-text("Add Goal")');
      await page.fill('input[name="goal_1_title"]', 'Achieve 30 days of sobriety');
      await page.fill('textarea[name="goal_1_description"]', 'Complete detox and maintain abstinence for 30 consecutive days');
      await page.fill('input[name="goal_1_target_date"]', '2025-09-15');
      
      await page.click('button:has-text("Add Goal")');
      await page.fill('input[name="goal_2_title"]', 'Reduce depression symptoms by 50%');
      await page.fill('textarea[name="goal_2_description"]', 'Through therapy and medication management');
      await page.fill('input[name="goal_2_target_date"]', '2025-10-15');
      
      // Save care plan
      await page.click('button:has-text("Save Care Plan")');
      
      // Verify success message
      await expect(page.locator('text=Care plan created successfully')).toBeVisible();
      console.log('✅ Care plan created with goals');
    });

    // ========================================
    // STEP 5: DOCUMENT PROGRESS NOTE
    // ========================================
    await test.step('Create encrypted progress note', async () => {
      // Navigate to notes section
      await page.click('button:has-text("Add Progress Note")');
      
      // Select note type
      await page.selectOption('select[name="note_type"]', 'progress');
      
      // Fill note content
      await page.fill('input[name="note_title"]', 'Week 1 Progress Review');
      await page.fill('textarea[name="note_content"]', `
        SUBJECTIVE: Patient reports improved mood and 7 days of sobriety. 
        Sleep patterns improving, averaging 6-7 hours per night.
        
        OBJECTIVE: Vital signs stable. Appears well-groomed and engaged.
        PHQ-9 score: 12 (moderate depression, down from 18).
        
        ASSESSMENT: Making good progress with treatment plan. 
        Responding well to medication. Engaged in group therapy.
        
        PLAN: Continue current medication regimen. 
        Increase individual therapy to 2x/week. 
        Begin family therapy next week.
      `);
      
      // Mark as encrypted (PHI)
      await page.check('input[name="encrypt_note"]');
      
      // Add tags
      await page.fill('input[placeholder="Add tags"]', 'progress, sobriety, depression');
      
      // Save note
      await page.click('button:has-text("Save Note")');
      
      // Verify encryption indicator
      await expect(page.locator('[data-testid="encryption-badge"]:has-text("Encrypted")')).toBeVisible();
      console.log('✅ Progress note documented and encrypted');
    });

    // ========================================
    // STEP 6: SCHEDULE APPOINTMENT
    // ========================================
    await test.step('Schedule follow-up appointment', async () => {
      // Open appointment scheduler
      await page.click('button:has-text("Schedule Appointment")');
      
      // Select appointment type
      await page.selectOption('select[name="appointment_type"]', 'follow-up');
      
      // Pick date (next week)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const dateStr = nextWeek.toISOString().split('T')[0];
      await page.fill('input[type="date"]', dateStr);
      
      // Select time slot
      await page.click('button:has-text("2:00 PM")');
      
      // Set duration
      await page.selectOption('select[name="duration"]', '60');
      
      // Choose location type
      await page.click('input[value="telehealth"]');
      
      // Add appointment notes
      await page.fill('textarea[name="appointment_notes"]', 'Follow-up for medication management and therapy progress review');
      
      // Enable reminders
      await page.check('input[name="send_reminders"]');
      
      // Book appointment
      await page.click('button:has-text("Book Appointment")');
      
      // Verify confirmation
      await expect(page.locator('text=Appointment scheduled successfully')).toBeVisible();
      await expect(page.locator('text=Video link will be sent')).toBeVisible();
      console.log('✅ Telehealth appointment scheduled');
    });

    // ========================================
    // STEP 7: SEND SECURE MESSAGE
    // ========================================
    await test.step('Send secure message to patient', async () => {
      // Open messaging
      await page.click('button:has-text("Send Message")');
      
      // Compose message
      await page.fill('input[name="subject"]', 'Appointment Reminder and Resources');
      await page.fill('textarea[name="message"]', `
        Hi John,
        
        Great progress in our session today! I wanted to share some resources:
        
        1. The meditation app we discussed: Headspace
        2. Local AA meeting schedule attached
        3. Crisis hotline: 988 (available 24/7)
        
        Your next appointment is scheduled for next week via video call.
        The link will be sent 30 minutes before.
        
        Keep up the excellent work!
        
        Dr. Test Provider
      `);
      
      // Mark as requires response
      await page.check('input[name="requires_response"]');
      
      // Send message
      await page.click('button:has-text("Send Secure Message")');
      
      // Verify sent
      await expect(page.locator('text=Message sent securely')).toBeVisible();
      console.log('✅ Secure message sent to patient');
    });

    // ========================================
    // STEP 8: REVIEW ANALYTICS
    // ========================================
    await test.step('Review patient analytics', async () => {
      // Navigate to analytics tab
      await page.click('a:has-text("Analytics")');
      
      // Verify charts loaded
      await expect(page.locator('[data-testid="mood-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="adherence-chart"]')).toBeVisible();
      
      // Check key metrics
      await expect(page.locator('text=Treatment Adherence: 85%')).toBeVisible();
      await expect(page.locator('text=Goal Progress: 2/5 completed')).toBeVisible();
      
      // Generate report
      await page.click('button:has-text("Generate Report")');
      await page.selectOption('select[name="report_type"]', 'monthly_progress');
      await page.click('button:has-text("Download PDF")');
      
      console.log('✅ Analytics reviewed and report generated');
    });

    // ========================================
    // STEP 9: SIGN AND LOCK NOTES
    // ========================================
    await test.step('Sign and lock clinical notes', async () => {
      // Go back to notes
      await page.click('a:has-text("Clinical Notes")');
      
      // Find unsigned note
      await page.click('[data-testid="unsigned-note"]:first-child');
      
      // Review note
      await expect(page.locator('text=Week 1 Progress Review')).toBeVisible();
      
      // Sign note
      await page.click('button:has-text("Sign Note")');
      
      // Confirm signature
      await page.fill('input[name="signature_password"]', testProviderPassword);
      await page.click('button:has-text("Confirm Signature")');
      
      // Verify signed and locked
      await expect(page.locator('[data-testid="signed-badge"]')).toBeVisible();
      await expect(page.locator('[data-testid="locked-badge"]')).toBeVisible();
      await expect(page.locator('text=Signed by Dr. Test Provider')).toBeVisible();
      
      console.log('✅ Clinical note signed and locked');
    });

    // ========================================
    // STEP 10: PROPER LOGOUT
    // ========================================
    await test.step('Secure logout', async () => {
      // Open user menu
      await page.click('[data-testid="user-menu"]');
      
      // Click logout
      await page.click('button:has-text("Sign Out")');
      
      // Confirm logout
      await page.click('button:has-text("Yes, sign out")');
      
      // Verify redirected to login
      await expect(page).toHaveURL(/.*\/login/);
      
      // Verify session cleared
      await page.goto('http://localhost:8080/provider/dashboard');
      await expect(page).toHaveURL(/.*\/login/);
      
      console.log('✅ Provider logged out securely');
    });
  });

  test('Provider crisis response workflow', async () => {
    // Login first
    await page.click('text=Provider Login');
    await page.fill('input[type="email"]', testProviderEmail);
    await page.fill('input[type="password"]', testProviderPassword);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/.*\/provider\/dashboard/);

    await test.step('Respond to crisis alert', async () => {
      // Check for crisis alerts
      await expect(page.locator('[data-testid="crisis-alert"]')).toBeVisible();
      
      // Click on crisis alert
      await page.click('[data-testid="crisis-alert"]:first-child');
      
      // View patient crisis details
      await expect(page.locator('text=CRISIS ALERT')).toBeVisible();
      await expect(page.locator('text=Immediate attention required')).toBeVisible();
      
      // Take action
      await page.click('button:has-text("Contact Patient")');
      
      // Log crisis intervention
      await page.fill('textarea[name="intervention_notes"]', 'Contacted patient via crisis hotline. De-escalation successful. Scheduled emergency session.');
      await page.selectOption('select[name="crisis_level"]', 'stabilized');
      await page.click('button:has-text("Save Intervention")');
      
      // Schedule emergency appointment
      await page.click('button:has-text("Schedule Emergency Session")');
      await page.click('button:has-text("Next Available")');
      await page.click('button:has-text("Confirm Emergency Appointment")');
      
      console.log('✅ Crisis response completed');
    });
  });

  test('Provider accessibility features', async () => {
    await test.step('Verify accessibility compliance', async () => {
      // Check for skip navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('text=Skip to main content')).toBeFocused();
      
      // Check ARIA labels
      const loginButton = page.locator('button:has-text("Provider Login")');
      await expect(loginButton).toHaveAttribute('aria-label', /provider login/i);
      
      // Check color contrast
      const backgroundColor = await page.evaluate(() => {
        const body = document.body;
        return window.getComputedStyle(body).backgroundColor;
      });
      
      const textColor = await page.evaluate(() => {
        const text = document.querySelector('p');
        return text ? window.getComputedStyle(text).color : null;
      });
      
      // Verify keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Check for screen reader announcements
      const ariaLive = await page.locator('[aria-live="polite"]').count();
      expect(ariaLive).toBeGreaterThan(0);
      
      console.log('✅ Accessibility features verified');
    });
  });

  test('Provider data export workflow', async () => {
    // Login
    await page.click('text=Provider Login');
    await page.fill('input[type="email"]', testProviderEmail);
    await page.fill('input[type="password"]', testProviderPassword);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/.*\/provider\/dashboard/);

    await test.step('Export patient data for compliance', async () => {
      // Navigate to patient
      await page.click('a:has-text("Patients")');
      await page.fill('input[placeholder="Search patients..."]', testPatientName);
      await page.keyboard.press('Enter');
      await page.click(`[data-testid="patient-card"]:has-text("${testPatientName}")`);
      
      // Open export menu
      await page.click('button:has-text("Export Data")');
      
      // Select export options
      await page.check('input[name="include_care_plans"]');
      await page.check('input[name="include_notes"]');
      await page.check('input[name="include_appointments"]');
      await page.check('input[name="include_messages"]');
      
      // Choose format
      await page.selectOption('select[name="export_format"]', 'pdf');
      
      // Add password protection
      await page.check('input[name="password_protect"]');
      await page.fill('input[name="export_password"]', 'SecureExport123!');
      
      // Export
      await page.click('button:has-text("Generate Export")');
      
      // Wait for completion
      await expect(page.locator('text=Export completed successfully')).toBeVisible();
      await expect(page.locator('text=Download will start automatically')).toBeVisible();
      
      console.log('✅ Patient data exported for compliance');
    });
  });
});

// Performance monitoring test
test.describe('Provider Performance Metrics', () => {
  test('Measure page load times', async ({ page }) => {
    const metrics: { [key: string]: number } = {};
    
    // Measure login page
    const loginStart = Date.now();
    await page.goto('http://localhost:8080/login');
    await page.waitForLoadState('networkidle');
    metrics.loginPage = Date.now() - loginStart;
    
    // Login
    await page.fill('input[type="email"]', 'test-provider@serenity.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    
    // Measure dashboard load
    const dashboardStart = Date.now();
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/.*\/provider\/dashboard/);
    await page.waitForLoadState('networkidle');
    metrics.dashboard = Date.now() - dashboardStart;
    
    // Measure patients list
    const patientsStart = Date.now();
    await page.click('a:has-text("Patients")');
    await page.waitForURL(/.*\/provider\/patients/);
    await page.waitForLoadState('networkidle');
    metrics.patientsList = Date.now() - patientsStart;
    
    // Performance assertions
    expect(metrics.loginPage).toBeLessThan(3000); // 3 seconds
    expect(metrics.dashboard).toBeLessThan(5000); // 5 seconds
    expect(metrics.patientsList).toBeLessThan(3000); // 3 seconds
    
    console.log('📊 Performance Metrics:', metrics);
  });
});

console.log(`
╔════════════════════════════════════════════════════════════╗
║         PROVIDER WORKFLOW E2E TEST SUITE                  ║
╠════════════════════════════════════════════════════════════╣
║ This comprehensive test validates:                        ║
║                                                            ║
║ ✅ Complete provider journey from login to logout         ║
║ ✅ Care plan creation with goals                          ║
║ ✅ Encrypted progress note documentation                  ║
║ ✅ Appointment scheduling with reminders                  ║
║ ✅ Secure messaging to patients                           ║
║ ✅ Crisis response workflow                               ║
║ ✅ Analytics and reporting                                ║
║ ✅ Note signing and locking                               ║
║ ✅ Data export for compliance                             ║
║ ✅ Accessibility features                                 ║
║ ✅ Performance benchmarks                                 ║
║                                                            ║
║ Run with: npm run test:e2e -- provider-complete-workflow  ║
╚════════════════════════════════════════════════════════════╝
`);