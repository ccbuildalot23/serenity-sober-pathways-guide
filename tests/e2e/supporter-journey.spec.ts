import { test, expect } from '@playwright/test';

// Test credentials
const SUPPORTER_CREDENTIALS = {
  email: 'test-supporter@serenity.com',
  password: 'TestSerenity2024!@#'
};

test.describe('Supporter User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the auth page where login button is located
    await page.goto('/auth');
  });

  test('should complete full supporter login and dashboard access', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', SUPPORTER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    // Verify successful login and redirect to supporter dashboard
    await expect(page).toHaveURL('/supporter/dashboard');
    await expect(page.locator('[data-testid="supporter-dashboard"]')).toBeVisible();
    
    // Verify supporter-specific UI elements
    await expect(page.locator('[data-testid="supported-persons-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-alerts-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="communication-center"]')).toBeVisible();
    await expect(page.locator('[data-testid="location-sharing-status"]')).toBeVisible();

    // Verify role-based access - supporter should NOT see patient/provider elements
    await expect(page.locator('[data-testid="patient-dashboard"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="provider-dashboard"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="daily-checkin-section"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="patient-list-section"]')).not.toBeVisible();
  });

  test('should view and manage supported persons list', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', SUPPORTER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access supported persons section
    await page.click('[data-testid="supported-persons-tab"]');
    await expect(page).toHaveURL('/supporter/supported-persons');

    // Verify supported persons interface
    await expect(page.locator('[data-testid="supported-persons-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-supported-person"]')).toBeVisible();
    await expect(page.locator('[data-testid="support-status-overview"]')).toBeVisible();

    // Test viewing supported person details
    await page.click('[data-testid="view-person-details"]'); // First person in list
    await expect(page.locator('[data-testid="person-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="person-basic-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
    await expect(page.locator('[data-testid="support-history"]')).toBeVisible();

    // Test adding a note about the supported person
    await page.fill('[data-testid="supporter-notes"]', 'Regular check-in completed. Person seems to be doing well and staying positive.');
    await page.click('[data-testid="save-notes"]');
    
    // Verify notes saved
    await expect(page.locator('[data-testid="notes-saved-success"]')).toBeVisible();

    // Test communication preferences
    await page.click('[data-testid="communication-preferences"]');
    await expect(page.locator('[data-testid="contact-methods"]')).toBeVisible();
    await page.check('[data-testid="text-messaging"]');
    await page.check('[data-testid="phone-calls"]');
    await page.selectOption('[data-testid="preferred-time"]', 'morning');
    await page.click('[data-testid="save-preferences"]');
    
    // Verify preferences saved
    await expect(page.locator('[data-testid="preferences-saved"]')).toBeVisible();
  });

  test('should receive and respond to crisis alerts', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', SUPPORTER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Check crisis alerts panel
    await expect(page.locator('[data-testid="crisis-alerts-panel"]')).toBeVisible();

    // Test handling a crisis alert (if any exist)
    if (await page.locator('[data-testid="active-crisis-alert"]').isVisible()) {
      // Click on crisis alert
      await page.click('[data-testid="active-crisis-alert"]');
      await expect(page.locator('[data-testid="crisis-alert-modal"]')).toBeVisible();
      
      // Verify crisis alert details
      await expect(page.locator('[data-testid="alert-severity"]')).toBeVisible();
      await expect(page.locator('[data-testid="person-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-timestamp"]')).toBeVisible();
      await expect(page.locator('[data-testid="crisis-message"]')).toBeVisible();

      // Check if location is shared
      if (await page.locator('[data-testid="shared-location"]').isVisible()) {
        await expect(page.locator('[data-testid="location-map"]')).toBeVisible();
        await expect(page.locator('[data-testid="get-directions"]')).toBeVisible();
      }

      // Test response actions
      await page.click('[data-testid="respond-to-alert"]');
      await expect(page.locator('[data-testid="response-options"]')).toBeVisible();

      // Send immediate text response
      await page.click('[data-testid="send-text-response"]');
      await page.fill('[data-testid="response-message"]', 'I received your alert. I\'m here for you. Are you safe right now? Can you call me?');
      await page.click('[data-testid="send-message"]');
      
      // Verify message sent
      await expect(page.locator('[data-testid="message-sent-confirmation"]')).toBeVisible();

      // Initiate phone call
      await page.click('[data-testid="call-person"]');
      await expect(page.locator('[data-testid="call-initiated"]')).toBeVisible();

      // Mark alert as addressed
      await page.click('[data-testid="mark-addressed"]');
      await page.fill('[data-testid="resolution-notes"]', 'Contacted person immediately. Provided emotional support and ensured safety. Person is now stable.');
      await page.click('[data-testid="save-resolution"]');
      
      // Verify alert marked as addressed
      await expect(page.locator('[data-testid="alert-resolved-success"]')).toBeVisible();
    }

    // Test crisis alert preferences
    await page.click('[data-testid="alert-settings"]');
    await expect(page.locator('[data-testid="alert-preferences-modal"]')).toBeVisible();
    
    await page.check('[data-testid="immediate-notifications"]');
    await page.check('[data-testid="push-notifications"]');
    await page.check('[data-testid="email-notifications"]');
    await page.check('[data-testid="sms-notifications"]');
    await page.click('[data-testid="save-alert-settings"]');
    
    // Verify settings saved
    await expect(page.locator('[data-testid="alert-settings-saved"]')).toBeVisible();
  });

  test('should manage communication and messaging', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', SUPPORTER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access communication center
    await page.click('[data-testid="communication-center"]');
    await expect(page).toHaveURL('/supporter/messages');

    // Verify messaging interface
    await expect(page.locator('[data-testid="message-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="compose-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-search"]')).toBeVisible();

    // Test sending a new message
    await page.click('[data-testid="compose-message"]');
    await expect(page.locator('[data-testid="compose-modal"]')).toBeVisible();
    
    await page.selectOption('[data-testid="select-recipient"]', 'test-patient@serenity.com');
    await page.fill('[data-testid="message-subject"]', 'Weekly Check-in');
    await page.fill('[data-testid="message-content"]', 'Hi! Just wanted to check in and see how your week is going. Remember I\'m here if you need anything. Hope you\'re staying strong!');
    await page.click('[data-testid="send-message"]');
    
    // Verify message sent
    await expect(page.locator('[data-testid="message-sent-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-list"]')).toContainText('Weekly Check-in');

    // Test replying to a message
    if (await page.locator('[data-testid="unread-message"]').isVisible()) {
      await page.click('[data-testid="unread-message"]');
      await expect(page.locator('[data-testid="message-detail"]')).toBeVisible();
      
      await page.click('[data-testid="reply-button"]');
      await page.fill('[data-testid="reply-content"]', 'Thank you for reaching out. I\'m glad to hear you\'re doing well. Keep up the great work!');
      await page.click('[data-testid="send-reply"]');
      
      // Verify reply sent
      await expect(page.locator('[data-testid="reply-sent-success"]')).toBeVisible();
    }

    // Test message search
    await page.fill('[data-testid="message-search"]', 'check-in');
    await page.click('[data-testid="search-messages"]');
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    // Test message filtering
    await page.selectOption('[data-testid="filter-messages"]', 'unread');
    await page.click('[data-testid="apply-filter"]');
    await expect(page.locator('[data-testid="filtered-messages"]')).toBeVisible();
  });

  test('should manage location sharing settings and features', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', SUPPORTER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access location sharing settings
    await page.click('[data-testid="location-settings"]');
    await expect(page.locator('[data-testid="location-settings-modal"]')).toBeVisible();

    // Verify location sharing interface
    await expect(page.locator('[data-testid="location-sharing-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="location-permissions"]')).toBeVisible();
    await expect(page.locator('[data-testid="sharing-preferences"]')).toBeVisible();

    // Enable location sharing
    await page.check('[data-testid="location-sharing-toggle"]');
    await expect(page.locator('[data-testid="location-enabled-confirmation"]')).toBeVisible();

    // Configure sharing preferences
    await page.check('[data-testid="share-during-crisis"]');
    await page.check('[data-testid="share-real-time"]');
    await page.selectOption('[data-testid="accuracy-level"]', 'precise');
    await page.click('[data-testid="save-location-settings"]');
    
    // Verify settings saved
    await expect(page.locator('[data-testid="location-settings-saved"]')).toBeVisible();

    // Test viewing current location sharing status
    await page.click('[data-testid="view-location-status"]');
    await expect(page.locator('[data-testid="location-status-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-sharing-status"]')).toBeVisible();

    // Test emergency location sharing
    await page.click('[data-testid="emergency-share-location"]');
    await expect(page.locator('[data-testid="emergency-share-modal"]')).toBeVisible();
    
    await page.selectOption('[data-testid="share-with-person"]', 'test-patient@serenity.com');
    await page.fill('[data-testid="emergency-message"]', 'I\'m sharing my location for emergency support. Coming to help.');
    await page.click('[data-testid="send-emergency-location"]');
    
    // Verify emergency location shared
    await expect(page.locator('[data-testid="emergency-location-shared"]')).toBeVisible();
  });

  test('should access support resources and education', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', SUPPORTER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access support resources
    await page.click('[data-testid="support-resources-tab"]');
    await expect(page).toHaveURL('/supporter/resources');

    // Verify resources interface
    await expect(page.locator('[data-testid="educational-materials"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-response-guides"]')).toBeVisible();
    await expect(page.locator('[data-testid="supporter-training"]')).toBeVisible();
    await expect(page.locator('[data-testid="professional-contacts"]')).toBeVisible();

    // Test accessing educational materials
    await page.click('[data-testid="view-education-materials"]');
    await expect(page.locator('[data-testid="materials-library"]')).toBeVisible();
    await expect(page.locator('[data-testid="addiction-resources"]')).toBeVisible();
    await expect(page.locator('[data-testid="recovery-support-guides"]')).toBeVisible();

    // Test crisis response guides
    await page.click('[data-testid="crisis-response-guides"]');
    await expect(page.locator('[data-testid="crisis-guide-list"]')).toBeVisible();
    
    await page.click('[data-testid="suicide-prevention-guide"]');
    await expect(page.locator('[data-testid="guide-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-contacts"]')).toBeVisible();
    await expect(page.locator('[data-testid="step-by-step-response"]')).toBeVisible();

    // Test professional contacts
    await page.click('[data-testid="professional-contacts"]');
    await expect(page.locator('[data-testid="therapist-contacts"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-hotlines"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-services"]')).toBeVisible();

    // Test adding personal contact
    await page.click('[data-testid="add-personal-contact"]');
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible();
    
    await page.fill('[data-testid="contact-name"]', 'Dr. Smith - Therapist');
    await page.fill('[data-testid="contact-phone"]', '555-0199');
    await page.fill('[data-testid="contact-email"]', 'dr.smith@therapy.com');
    await page.selectOption('[data-testid="contact-type"]', 'therapist');
    await page.click('[data-testid="save-contact"]');
    
    // Verify contact saved
    await expect(page.locator('[data-testid="contact-saved-success"]')).toBeVisible();
  });

  test('should manage supporter profile and preferences', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', SUPPORTER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access supporter profile
    await page.click('[data-testid="supporter-menu"]');
    await page.click('[data-testid="profile-settings"]');
    await expect(page).toHaveURL('/supporter/profile');

    // Verify profile interface
    await expect(page.locator('[data-testid="supporter-profile-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="personal-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="availability-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-preferences"]')).toBeVisible();

    // Update personal information
    await page.fill('[data-testid="supporter-name"]', 'Test Supporter');
    await page.fill('[data-testid="phone-number"]', '555-0100');
    await page.fill('[data-testid="relationship"]', 'Family Member');

    // Set availability preferences
    await page.check('[data-testid="available-24-7"]');
    await page.fill('[data-testid="preferred-contact-method"]', 'Phone Call');
    await page.selectOption('[data-testid="response-time"]', 'immediate');

    // Configure notification preferences
    await page.check('[data-testid="crisis-alerts"]');
    await page.check('[data-testid="daily-checkin-summaries"]');
    await page.check('[data-testid="weekly-reports"]');
    await page.selectOption('[data-testid="notification-frequency"]', 'real-time');

    // Save profile updates
    await page.click('[data-testid="save-profile"]');
    
    // Verify profile updated
    await expect(page.locator('[data-testid="profile-updated-success"]')).toBeVisible();

    // Test emergency contact settings
    await page.click('[data-testid="emergency-contacts-tab"]');
    await page.click('[data-testid="add-emergency-contact"]');
    
    await page.fill('[data-testid="emergency-name"]', 'Backup Support Person');
    await page.fill('[data-testid="emergency-phone"]', '555-0911');
    await page.selectOption('[data-testid="emergency-relationship"]', 'friend');
    await page.click('[data-testid="save-emergency-contact"]');
    
    // Verify emergency contact saved
    await expect(page.locator('[data-testid="emergency-contact-saved"]')).toBeVisible();
  });

  test('should handle navigation and logout properly', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', SUPPORTER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Test navigation between sections
    await page.click('[data-testid="nav-supported-persons"]');
    await expect(page).toHaveURL('/supporter/supported-persons');

    await page.click('[data-testid="nav-messages"]');
    await expect(page).toHaveURL('/supporter/messages');

    await page.click('[data-testid="nav-resources"]');
    await expect(page).toHaveURL('/supporter/resources');

    await page.click('[data-testid="nav-dashboard"]');
    await expect(page).toHaveURL('/supporter/dashboard');

    // Test logout
    await page.click('[data-testid="supporter-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Verify logout and redirect to home
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Verify supporter areas are no longer accessible without authentication
    await page.goto('/supporter/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should verify role-based access control - supporter cannot access patient/provider areas', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', SUPPORTER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Attempt to access patient dashboard directly
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/access-denied');
    await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission to access this area');

    // Attempt to access provider dashboard directly
    await page.goto('/provider/dashboard');
    await expect(page).toHaveURL('/access-denied');
    await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission to access this area');

    // Verify supporter can return to their authorized dashboard
    await page.click('[data-testid="return-to-dashboard"]');
    await expect(page).toHaveURL('/supporter/dashboard');
  });

  test('should handle real-time notifications and alerts', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', SUPPORTER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Test notification system
    await expect(page.locator('[data-testid="notification-center"]')).toBeVisible();

    // Test real-time alert reception (simulated)
    // In a real test environment, this would be triggered by actual system events
    
    // Check for notification badge updates
    if (await page.locator('[data-testid="notification-badge"]').isVisible()) {
      await page.click('[data-testid="notification-center"]');
      await expect(page.locator('[data-testid="notifications-list"]')).toBeVisible();
    }

    // Test browser notification permissions (if supported)
    await page.click('[data-testid="enable-browser-notifications"]');
    // Note: Browser permission requests can't be fully automated in tests
    
    // Test notification history
    await page.click('[data-testid="notification-history"]');
    await expect(page.locator('[data-testid="notification-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-types"]')).toBeVisible();

    // Test notification preferences
    await page.click('[data-testid="notification-preferences"]');
    await expect(page.locator('[data-testid="notification-settings-panel"]')).toBeVisible();
    
    await page.check('[data-testid="sound-alerts"]');
    await page.check('[data-testid="vibration-alerts"]');
    await page.selectOption('[data-testid="alert-tone"]', 'urgent');
    await page.click('[data-testid="save-notification-preferences"]');
    
    // Verify preferences saved
    await expect(page.locator('[data-testid="notification-preferences-saved"]')).toBeVisible();
  });
});