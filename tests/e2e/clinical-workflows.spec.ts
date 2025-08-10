import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Clinical Workflows Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should support provider patient assessment workflow', async ({ page }) => {
    // Login as provider
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PROVIDER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PROVIDER.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/provider/dashboard');
    
    // Access patient assessment
    await page.click('[data-testid="patient-list-tab"]');
    await page.click('[data-testid="view-patient-details"]');
    await page.click('[data-testid="conduct-assessment"]');
    
    // Complete clinical assessment
    await page.fill('[data-testid="assessment-notes"]', 'Patient showing signs of improvement in mood tracking');
    await page.selectOption('[data-testid="risk-level"]', 'low');
    await page.selectOption('[data-testid="recovery-stage"]', 'maintenance');
    
    // Document clinical observations
    await page.fill('[data-testid="clinical-observations"]', 'Patient engaged in daily check-ins, mood trending positive');
    await page.fill('[data-testid="treatment-recommendations"]', 'Continue current treatment plan, monitor for relapse signs');
    
    // Save assessment
    await page.click('[data-testid="save-assessment"]');
    await expect(page.locator('[data-testid="assessment-saved"]')).toContainText('Assessment saved successfully');
  });

  test('should support care plan development and management', async ({ page }) => {
    // Login as provider
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PROVIDER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PROVIDER.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/provider/dashboard');
    
    // Create care plan
    await page.click('[data-testid="care-plan-management"]');
    await page.click('[data-testid="create-care-plan"]');
    
    // Define care plan components
    await page.fill('[data-testid="care-plan-title"]', 'Recovery Maintenance Plan');
    await page.fill('[data-testid="care-plan-goals"]', 'Maintain sobriety, improve mental health, build support network');
    
    // Add treatment interventions
    await page.click('[data-testid="add-intervention"]');
    await page.fill('[data-testid="intervention-name"]', 'Daily Check-ins');
    await page.fill('[data-testid="intervention-description"]', 'Complete daily mood and wellness check-ins');
    await page.selectOption('[data-testid="intervention-frequency"]', 'daily');
    await page.click('[data-testid="save-intervention"]');
    
    // Add crisis intervention plan
    await page.click('[data-testid="add-crisis-plan"]');
    await page.fill('[data-testid="crisis-triggers"]', 'High stress, social isolation, negative mood patterns');
    await page.fill('[data-testid="crisis-response"]', 'Contact crisis support, reach out to support network, use coping skills');
    await page.click('[data-testid="save-crisis-plan"]');
    
    // Assign care plan to patient
    await page.click('[data-testid="assign-care-plan"]');
    await expect(page.locator('[data-testid="care-plan-assigned"]')).toContainText('Care plan assigned successfully');
  });

  test('should support medication management and tracking', async ({ page }) => {
    // Login as provider
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PROVIDER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PROVIDER.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/provider/dashboard');
    
    // Access medication management
    await page.click('[data-testid="medication-management"]');
    await page.click('[data-testid="add-medication"]');
    
    // Prescribe medication
    await page.fill('[data-testid="medication-name"]', 'Naltrexone');
    await page.fill('[data-testid="dosage"]', '50mg');
    await page.selectOption('[data-testid="frequency"]', 'daily');
    await page.fill('[data-testid="prescription-notes"]', 'Take daily to reduce alcohol cravings');
    await page.fill('[data-testid="side-effects"]', 'Nausea, headache, fatigue');
    await page.click('[data-testid="save-medication"]');
    
    // Set up medication tracking
    await page.click('[data-testid="medication-tracking"]');
    await expect(page.locator('[data-testid="tracking-enabled"]')).toBeChecked();
    await expect(page.locator('[data-testid="reminder-settings"]')).toBeVisible();
    
    // Configure medication reminders
    await page.click('[data-testid="configure-reminders"]');
    await page.fill('[data-testid="reminder-time"]', '09:00');
    await page.check('[data-testid="enable-notifications"]');
    await page.click('[data-testid="save-reminders"]');
  });

  test('should support progress monitoring and outcome tracking', async ({ page }) => {
    // Login as provider
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PROVIDER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PROVIDER.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/provider/dashboard');
    
    // Access progress monitoring
    await page.click('[data-testid="progress-monitoring"]');
    await page.click('[data-testid="patient-progress"]');
    
    // Review progress metrics
    await expect(page.locator('[data-testid="sobriety-days"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-trends"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkin-compliance"]')).toBeVisible();
    
    // Generate progress report
    await page.click('[data-testid="generate-report"]');
    await page.selectOption('[data-testid="report-period"]', 'last-30-days');
    await page.click('[data-testid="create-report"]');
    
    // Verify report generation
    await expect(page.locator('[data-testid="progress-report"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-summary"]')).toContainText('Progress Report');
  });

  test('should support crisis intervention and emergency response', async ({ page }) => {
    // Login as provider
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PROVIDER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PROVIDER.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/provider/dashboard');
    
    // Access crisis management
    await page.click('[data-testid="crisis-management"]');
    await page.click('[data-testid="active-crises"]');
    
    // Respond to crisis alert
    await page.click('[data-testid="crisis-alert"]');
    await page.fill('[data-testid="crisis-response-notes"]', 'Patient contacted, crisis intervention provided');
    await page.selectOption('[data-testid="crisis-severity"]', 'moderate');
    await page.fill('[data-testid="intervention-provided"]', 'Phone consultation, safety planning, follow-up scheduled');
    await page.click('[data-testid="document-crisis-response"]');
    
    // Verify crisis documentation
    await expect(page.locator('[data-testid="crisis-documented"]')).toContainText('Crisis response documented');
    
    // Schedule follow-up
    await page.click('[data-testid="schedule-followup"]');
    await page.fill('[data-testid="followup-date"]', '2024-01-15');
    await page.fill('[data-testid="followup-time"]', '14:00');
    await page.fill('[data-testid="followup-notes"]', 'Check on patient recovery progress');
    await page.click('[data-testid="save-followup"]');
  });

  test('should support patient self-management and engagement', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/patient/dashboard');
    
    // Complete daily check-in
    await page.click('[data-testid="start-checkin-button"]');
    await page.click('[data-testid="mood-positive"]');
    await page.fill('[data-testid="mood-description"]', 'Feeling motivated and focused on recovery');
    await page.click('[data-testid="continue-checkin"]');
    
    // Log activities
    await page.check('[data-testid="activity-exercise"]');
    await page.check('[data-testid="activity-meditation"]');
    await page.check('[data-testid="activity-therapy"]');
    await page.click('[data-testid="continue-checkin"]');
    
    // Rate sleep and submit
    await page.click('[data-testid="sleep-rating-4"]');
    await page.click('[data-testid="submit-checkin"]');
    
    // Verify check-in completion
    await expect(page.locator('[data-testid="checkin-success"]')).toContainText('Check-in completed successfully');
  });

  test('should support peer support and community features', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/patient/dashboard');
    
    // Access peer support
    await page.click('[data-testid="peer-support"]');
    await page.click('[data-testid="join-group"]');
    
    // Join recovery group
    await page.click('[data-testid="recovery-group"]');
    await page.click('[data-testid="join-group-confirm"]');
    await expect(page.locator('[data-testid="group-joined"]')).toContainText('Successfully joined group');
    
    // Participate in group discussion
    await page.click('[data-testid="group-discussion"]');
    await page.fill('[data-testid="post-message"]', 'Feeling grateful for this supportive community');
    await page.click('[data-testid="submit-post"]');
    
    // Verify post submission
    await expect(page.locator('[data-testid="message-posted"]')).toContainText('Message posted successfully');
  });

  test('should support family and supporter engagement', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/supporter/dashboard');
    
    // View supported person progress
    await page.click('[data-testid="supported-persons"]');
    await page.click('[data-testid="view-progress"]');
    
    // Review progress summary
    await expect(page.locator('[data-testid="progress-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-checkins"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-trends"]')).toBeVisible();
    
    // Send supportive message
    await page.click('[data-testid="send-message"]');
    await page.fill('[data-testid="message-content"]', 'Proud of your progress! Keep up the great work.');
    await page.click('[data-testid="send-support-message"]');
    
    // Verify message sent
    await expect(page.locator('[data-testid="message-sent"]')).toContainText('Message sent successfully');
  });

  test('should support clinical documentation and reporting', async ({ page }) => {
    // Login as provider
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PROVIDER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PROVIDER.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/provider/dashboard');
    
    // Access clinical documentation
    await page.click('[data-testid="clinical-documentation"]');
    await page.click('[data-testid="create-note"]');
    
    // Create clinical note
    await page.fill('[data-testid="note-title"]', 'Progress Review Session');
    await page.fill('[data-testid="subjective"]', 'Patient reports feeling more confident in recovery');
    await page.fill('[data-testid="objective"]', 'Mood tracking shows consistent improvement, check-ins completed daily');
    await page.fill('[data-testid="assessment"]', 'Patient making good progress in recovery maintenance phase');
    await page.fill('[data-testid="plan"]', 'Continue current treatment plan, schedule follow-up in 2 weeks');
    await page.click('[data-testid="save-note"]');
    
    // Generate clinical report
    await page.click('[data-testid="generate-report"]');
    await page.selectOption('[data-testid="report-type"]', 'progress-summary');
    await page.selectOption('[data-testid="report-period"]', 'last-90-days');
    await page.click('[data-testid="create-clinical-report"]');
    
    // Verify report generation
    await expect(page.locator('[data-testid="clinical-report"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-data"]')).toContainText('Progress Summary Report');
  });

  test('should support telehealth and virtual care features', async ({ page }) => {
    // Login as provider
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PROVIDER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PROVIDER.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/provider/dashboard');
    
    // Schedule telehealth session
    await page.click('[data-testid="telehealth"]');
    await page.click('[data-testid="schedule-session"]');
    
    // Set up session details
    await page.fill('[data-testid="session-title"]', 'Recovery Check-in');
    await page.fill('[data-testid="session-date"]', '2024-01-20');
    await page.fill('[data-testid="session-time"]', '15:00');
    await page.fill('[data-testid="session-duration"]', '45');
    await page.fill('[data-testid="session-notes"]', 'Virtual check-in to review progress and adjust treatment plan');
    await page.click('[data-testid="save-session"]');
    
    // Verify session scheduling
    await expect(page.locator('[data-testid="session-scheduled"]')).toContainText('Session scheduled successfully');
    
    // Test video call integration
    await page.click('[data-testid="join-session"]');
    await expect(page.locator('[data-testid="video-call"]')).toBeVisible();
    await expect(page.locator('[data-testid="call-controls"]')).toBeVisible();
  });
});
