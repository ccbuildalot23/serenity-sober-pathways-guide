import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Provider Pilot Features Workflow
 * Tests the complete provider journey through care plans, notes, and appointments
 */

test.describe('Provider Pilot Features E2E Tests', () => {
  let page: Page;
  const providerEmail = `provider-e2e-${Date.now()}@test.com`;
  const providerPassword = 'TestProvider123!';
  const patientEmail = `patient-e2e-${Date.now()}@test.com`;
  let carePlanId: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Register provider account
    await page.goto('/auth');
    await page.click('text=Sign up');
    await page.fill('input[name="email"]', providerEmail);
    await page.fill('input[name="password"]', providerPassword);
    await page.fill('input[name="confirmPassword"]', providerPassword);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Care Plan Management', () => {
    test('Provider can create a new care plan', async () => {
      // Navigate to care plans section
      await page.goto('/provider/care-plans');
      
      // Click create new care plan button
      await page.click('button:has-text("New Care Plan")');
      
      // Fill in care plan details
      await page.fill('input[name="title"]', 'E2E Test Recovery Plan');
      await page.fill('textarea[name="description"]', 'Comprehensive recovery program for substance use disorder');
      await page.selectOption('select[name="status"]', 'active');
      await page.fill('input[name="patientEmail"]', patientEmail);
      await page.fill('input[name="startDate"]', '2025-02-01');
      await page.fill('input[name="endDate"]', '2025-05-01');
      await page.fill('input[name="reviewDate"]', '2025-03-01');
      
      // Add diagnosis codes
      await page.fill('input[name="diagnosisCodes"]', 'F10.20, F32.1');
      
      // Select risk level
      await page.selectOption('select[name="riskLevel"]', 'medium');
      
      // Submit form
      await page.click('button:has-text("Create Care Plan")');
      
      // Verify success message
      await expect(page.locator('.toast-success')).toContainText('Care plan created successfully');
      
      // Verify care plan appears in list
      await expect(page.locator('text=E2E Test Recovery Plan')).toBeVisible();
      
      // Capture care plan ID for later tests
      const carePlanElement = await page.locator('[data-care-plan-id]').first();
      carePlanId = await carePlanElement.getAttribute('data-care-plan-id') || '';
    });

    test('Provider can add goals to care plan', async () => {
      // Open care plan details
      await page.click(`[data-care-plan-id="${carePlanId}"]`);
      
      // Click add goal button
      await page.click('button:has-text("Add Goal")');
      
      // Fill in goal details
      await page.fill('input[name="goalTitle"]', 'Complete 30-day sobriety');
      await page.fill('textarea[name="goalDescription"]', 'Maintain complete abstinence for 30 consecutive days');
      await page.fill('input[name="targetDate"]', '2025-03-01');
      await page.selectOption('select[name="priority"]', '1');
      await page.fill('textarea[name="successCriteria"]', 'No substance use for 30 days');
      
      // Submit goal
      await page.click('button:has-text("Add Goal")');
      
      // Verify goal appears
      await expect(page.locator('text=Complete 30-day sobriety')).toBeVisible();
      
      // Add second goal
      await page.click('button:has-text("Add Goal")');
      await page.fill('input[name="goalTitle"]', 'Attend weekly therapy');
      await page.fill('textarea[name="goalDescription"]', 'Participate in all scheduled therapy sessions');
      await page.fill('input[name="targetDate"]', '2025-05-01');
      await page.selectOption('select[name="priority"]', '2');
      await page.click('button:has-text("Add Goal")');
      
      // Verify both goals are visible
      await expect(page.locator('text=Attend weekly therapy')).toBeVisible();
    });

    test('Provider can update goal progress', async () => {
      // Click on first goal
      await page.click('text=Complete 30-day sobriety');
      
      // Update progress
      await page.fill('input[name="progress"]', '25');
      await page.fill('textarea[name="progressNote"]', 'Week 1 completed successfully');
      await page.click('button:has-text("Update Progress")');
      
      // Verify progress bar updated
      await expect(page.locator('[role="progressbar"][aria-valuenow="25"]')).toBeVisible();
      
      // Update to 100%
      await page.fill('input[name="progress"]', '100');
      await page.fill('textarea[name="progressNote"]', 'Goal achieved! 30 days completed');
      await page.click('button:has-text("Update Progress")');
      
      // Verify goal marked as completed
      await expect(page.locator('.goal-status-completed')).toBeVisible();
    });

    test('Provider can add progress notes', async () => {
      // Navigate to progress notes section
      await page.click('tab:has-text("Progress Notes")');
      
      // Add progress note
      await page.click('button:has-text("Add Note")');
      await page.selectOption('select[name="noteType"]', 'progress');
      await page.fill('textarea[name="noteText"]', 'Patient showing excellent commitment to recovery. Attended all sessions this week.');
      await page.fill('input[name="moodScore"]', '7');
      await page.selectOption('select[name="engagementLevel"]', 'high');
      await page.click('button:has-text("Save Note")');
      
      // Verify note appears
      await expect(page.locator('text=Patient showing excellent commitment')).toBeVisible();
      
      // Add milestone note
      await page.click('button:has-text("Add Note")');
      await page.selectOption('select[name="noteType"]', 'milestone');
      await page.fill('textarea[name="noteText"]', 'First week milestone achieved - no relapses');
      await page.click('button:has-text("Save Note")');
      
      // Verify multiple notes visible
      await expect(page.locator('.progress-note')).toHaveCount(2);
    });
  });

  test.describe('Provider Notes with Encryption', () => {
    test('Provider can create encrypted session notes', async () => {
      // Navigate to provider notes
      await page.goto('/provider/notes');
      
      // Create new note
      await page.click('button:has-text("New Session Note")');
      
      // Fill session details
      await page.selectOption('select[name="noteType"]', 'session');
      await page.fill('input[name="sessionDate"]', '2025-01-14');
      await page.fill('input[name="duration"]', '50');
      await page.selectOption('select[name="sessionType"]', 'individual');
      
      // Fill clinical content
      await page.fill('textarea[name="noteContent"]', 
        'Patient presented with mild anxiety. Discussed coping strategies and practiced mindfulness techniques. ' +
        'Patient engaged well and demonstrated understanding of concepts.'
      );
      
      // Add presenting issues
      await page.fill('input[name="presentingIssues"]', 'Anxiety, Sleep disturbance');
      
      // Add interventions
      await page.fill('input[name="interventions"]', 'CBT, Mindfulness, Sleep hygiene education');
      
      // Mark as billable
      await page.check('input[name="isBillable"]');
      await page.fill('input[name="cptCodes"]', '90834');
      
      // Save note
      await page.click('button:has-text("Save Note")');
      
      // Verify encryption indicator
      await expect(page.locator('.encryption-badge')).toContainText('Encrypted');
      
      // Verify note appears in list
      await expect(page.locator('text=Individual Session - 50 min')).toBeVisible();
    });

    test('Provider can sign notes', async () => {
      // Click on the note
      await page.click('text=Individual Session - 50 min');
      
      // Click sign button
      await page.click('button:has-text("Sign Note")');
      
      // Confirm signature
      await page.fill('input[name="signaturePassword"]', providerPassword);
      await page.click('button:has-text("Confirm Signature")');
      
      // Verify signed status
      await expect(page.locator('.signed-badge')).toContainText('Signed');
      await expect(page.locator('.signed-timestamp')).toBeVisible();
      
      // Verify note is now read-only
      await expect(page.locator('textarea[name="noteContent"]')).toBeDisabled();
    });

    test('Provider can add addendum to signed note', async () => {
      // Click add addendum
      await page.click('button:has-text("Add Addendum")');
      
      // Fill addendum text
      await page.fill('textarea[name="addendumText"]', 
        'Additional observation: Patient reported improved sleep after implementing discussed techniques.'
      );
      
      // Save addendum
      await page.click('button:has-text("Save Addendum")');
      
      // Verify addendum appears
      await expect(page.locator('text=ADDENDUM')).toBeVisible();
      await expect(page.locator('text=Additional observation')).toBeVisible();
    });
  });

  test.describe('Appointment Management', () => {
    test('Provider can set availability', async () => {
      // Navigate to availability settings
      await page.goto('/provider/availability');
      
      // Set Monday availability
      await page.click('input[name="monday"]');
      await page.fill('input[name="mondayStart"]', '09:00');
      await page.fill('input[name="mondayEnd"]', '17:00');
      
      // Set Wednesday availability
      await page.click('input[name="wednesday"]');
      await page.fill('input[name="wednesdayStart"]', '10:00');
      await page.fill('input[name="wednesdayEnd"]', '18:00');
      
      // Set Friday availability
      await page.click('input[name="friday"]');
      await page.fill('input[name="fridayStart"]', '09:00');
      await page.fill('input[name="fridayEnd"]', '15:00');
      
      // Save availability
      await page.click('button:has-text("Save Availability")');
      
      // Verify success message
      await expect(page.locator('.toast-success')).toContainText('Availability updated');
    });

    test('Provider can view appointment calendar', async () => {
      // Navigate to appointments
      await page.goto('/provider/appointments');
      
      // Verify calendar is visible
      await expect(page.locator('.appointment-calendar')).toBeVisible();
      
      // Verify available slots are shown
      await expect(page.locator('.available-slot')).toHaveCount(3); // Based on availability set
      
      // Click on an available slot
      await page.click('.available-slot:first-child');
      
      // Verify booking modal opens
      await expect(page.locator('.booking-modal')).toBeVisible();
    });

    test('Provider can book appointment for patient', async () => {
      // Fill appointment details
      await page.fill('input[name="patientEmail"]', patientEmail);
      await page.selectOption('select[name="appointmentType"]', 'therapy');
      await page.fill('input[name="duration"]', '60');
      await page.selectOption('select[name="locationType"]', 'in_person');
      await page.fill('textarea[name="bookingNotes"]', 'Initial therapy session');
      
      // Book appointment
      await page.click('button:has-text("Book Appointment")');
      
      // Verify appointment appears on calendar
      await expect(page.locator('.booked-appointment')).toBeVisible();
      await expect(page.locator('.booked-appointment')).toContainText('Therapy Session');
    });

    test('Double booking is prevented', async () => {
      // Try to book same slot again
      await page.click('.booked-appointment');
      
      // Verify error message
      await expect(page.locator('.conflict-error')).toContainText('Time slot unavailable');
      
      // Verify booking button is disabled
      await expect(page.locator('button:has-text("Book Appointment")')).toBeDisabled();
    });

    test('Provider can manage appointment requests', async () => {
      // Navigate to appointment requests
      await page.click('tab:has-text("Change Requests")');
      
      // Simulate patient reschedule request (would come from patient portal)
      // For testing, we'll create a mock request
      
      // Verify request appears
      await expect(page.locator('.change-request')).toBeVisible();
      
      // Review request details
      await page.click('.change-request:first-child');
      
      // Approve reschedule
      await page.fill('textarea[name="responseNote"]', 'Approved - new time works');
      await page.click('button:has-text("Approve")');
      
      // Verify appointment updated
      await expect(page.locator('.toast-success')).toContainText('Request approved');
    });
  });

  test.describe('Analytics and Reporting', () => {
    test('Provider can view care plan statistics', async () => {
      // Navigate to analytics
      await page.goto('/provider/analytics');
      
      // Verify statistics are displayed
      await expect(page.locator('.stat-card:has-text("Total Care Plans")')).toBeVisible();
      await expect(page.locator('.stat-card:has-text("Active Plans")')).toBeVisible();
      await expect(page.locator('.stat-card:has-text("Completed Goals")')).toBeVisible();
      
      // Verify charts are rendered
      await expect(page.locator('.goal-completion-chart')).toBeVisible();
      await expect(page.locator('.patient-progress-chart')).toBeVisible();
    });

    test('Provider can export data', async () => {
      // Click export button
      await page.click('button:has-text("Export Data")');
      
      // Select export options
      await page.check('input[name="includeCarePlans"]');
      await page.check('input[name="includeNotes"]');
      await page.check('input[name="includeAppointments"]');
      await page.selectOption('select[name="format"]', 'json');
      
      // Download export
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("Download Export")')
      ]);
      
      // Verify download started
      expect(download).toBeTruthy();
    });
  });

  test.describe('HIPAA Compliance Verification', () => {
    test('Session timeout works correctly', async () => {
      // Wait for 15 minutes of inactivity (simulated)
      await page.evaluate(() => {
        // Simulate 15 minutes passing
        const event = new Event('idle');
        window.dispatchEvent(event);
      });
      
      // Verify timeout warning appears
      await expect(page.locator('.session-timeout-warning')).toBeVisible();
      
      // Verify auto-logout after warning
      await page.waitForTimeout(60000); // Wait 1 minute
      await expect(page).toHaveURL('**/auth');
    });

    test('Audit trail is maintained', async () => {
      // Sign back in
      await page.fill('input[name="email"]', providerEmail);
      await page.fill('input[name="password"]', providerPassword);
      await page.click('button[type="submit"]');
      
      // Navigate to audit log
      await page.goto('/provider/audit-log');
      
      // Verify recent activities are logged
      await expect(page.locator('.audit-entry:has-text("Care plan created")')).toBeVisible();
      await expect(page.locator('.audit-entry:has-text("Provider note created")')).toBeVisible();
      await expect(page.locator('.audit-entry:has-text("Note signed")')).toBeVisible();
      await expect(page.locator('.audit-entry:has-text("Appointment booked")')).toBeVisible();
      
      // Verify timestamp and user info
      await expect(page.locator('.audit-timestamp')).toBeVisible();
      await expect(page.locator('.audit-user')).toContainText(providerEmail);
    });
  });
});

// Mobile responsiveness tests
test.describe('Mobile Provider Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Provider can access core features on mobile', async ({ page }) => {
    // Sign in
    await page.goto('/auth');
    await page.fill('input[name="email"]', `provider-mobile-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', 'TestProvider123!');
    await page.click('button[type="submit"]');
    
    // Navigate using mobile menu
    await page.click('.mobile-menu-toggle');
    
    // Verify menu items are accessible
    await expect(page.locator('a:has-text("Care Plans")')).toBeVisible();
    await expect(page.locator('a:has-text("Notes")')).toBeVisible();
    await expect(page.locator('a:has-text("Appointments")')).toBeVisible();
    
    // Test responsive layout
    await page.click('a:has-text("Care Plans")');
    await expect(page.locator('.care-plans-mobile-view')).toBeVisible();
    
    // Verify cards stack vertically
    const carePlanCards = await page.locator('.care-plan-card').all();
    for (let i = 1; i < carePlanCards.length; i++) {
      const prevBox = await carePlanCards[i - 1].boundingBox();
      const currBox = await carePlanCards[i].boundingBox();
      expect(currBox?.y).toBeGreaterThan(prevBox?.y || 0);
    }
  });
});