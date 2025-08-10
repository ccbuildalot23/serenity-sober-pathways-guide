import { Page, expect } from '@playwright/test';

// Test user credentials
export const TEST_CREDENTIALS = {
  PATIENT: {
    email: 'test-patient@serenity.com',
    password: 'TestSerenity2024!@#',
    role: 'patient'
  },
  PROVIDER: {
    email: 'test-provider@serenity.com',
    password: 'TestSerenity2024!@#',
    role: 'provider'
  },
  SUPPORTER: {
    email: 'test-supporter@serenity.com',
    password: 'TestSerenity2024!@#',
    role: 'support_member'
  }
} as const;

// Common test data
export const TEST_DATA = {
  PATIENT_INFO: {
    name: 'Test Patient',
    age: 28,
    phone: '555-0101'
  },
  PROVIDER_INFO: {
    name: 'Dr. Test Provider',
    specialty: 'Addiction Counseling',
    license: 'LIC123456',
    phone: '555-0123'
  },
  SUPPORTER_INFO: {
    name: 'Test Supporter',
    relationship: 'Family Member',
    phone: '555-0100'
  },
  CHECK_IN_DATA: {
    positive: {
      mood: 'positive',
      description: 'Feeling great today! Had a good therapy session.',
      activities: ['exercise', 'meditation'],
      sleepRating: 4
    },
    neutral: {
      mood: 'neutral',
      description: 'Having an okay day. Some ups and downs.',
      activities: ['journaling'],
      sleepRating: 3
    },
    negative: {
      mood: 'negative',
      description: 'Having a really tough day. Feeling overwhelmed and struggling.',
      activities: [],
      sleepRating: 1
    }
  },
  MESSAGES: {
    supportive: 'Hi! Just wanted to check in and see how your week is going. Remember I\'m here if you need anything.',
    crisis: 'I received your alert. I\'m here for you. Are you safe right now? Can you call me?',
    weekly: 'Hope you\'re having a good week. Remember to take things one day at a time.',
    milestone: 'Just hit 30 days! Feeling grateful and strong.'
  }
} as const;

// Login helper functions
export async function loginAsPatient(page: Page): Promise<void> {
  await page.goto('/');
  await page.click('[data-testid="login-button"]');
  await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
  await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
  await page.click('[data-testid="submit-login"]');
  await expect(page).toHaveURL('/patient/dashboard');
}

export async function loginAsProvider(page: Page): Promise<void> {
  await page.goto('/');
  await page.click('[data-testid="login-button"]');
  await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PROVIDER.email);
  await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PROVIDER.password);
  await page.click('[data-testid="submit-login"]');
  await expect(page).toHaveURL('/provider/dashboard');
}

export async function loginAsSupporter(page: Page): Promise<void> {
  await page.goto('/');
  await page.click('[data-testid="login-button"]');
  await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
  await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
  await page.click('[data-testid="submit-login"]');
  await expect(page).toHaveURL('/supporter/dashboard');
}

// Generic login function
export async function loginAsRole(page: Page, role: 'patient' | 'provider' | 'supporter'): Promise<void> {
  const credentials = TEST_CREDENTIALS[role.toUpperCase() as keyof typeof TEST_CREDENTIALS];
  await page.goto('/');
  await page.click('[data-testid="login-button"]');
  await page.fill('[data-testid="email-input"]', credentials.email);
  await page.fill('[data-testid="password-input"]', credentials.password);
  await page.click('[data-testid="submit-login"]');
  await expect(page).toHaveURL(`/${role}/dashboard`);
}

// Logout helper
export async function logout(page: Page): Promise<void> {
  const menuSelectors = [
    '[data-testid="user-menu"]',
    '[data-testid="provider-menu"]',
    '[data-testid="supporter-menu"]'
  ];

  // Try to find and click the appropriate menu
  for (const selector of menuSelectors) {
    if (await page.locator(selector).isVisible()) {
      await page.click(selector);
      break;
    }
  }

  await page.click('[data-testid="logout-button"]');
  await expect(page).toHaveURL('/');
  await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
}

// Check-in helper functions
export async function completeCheckIn(page: Page, checkInData: typeof TEST_DATA.CHECK_IN_DATA.positive): Promise<void> {
  await page.click('[data-testid="start-checkin-button"]');
  await expect(page).toHaveURL('/patient/checkin');
  
  await page.click(`[data-testid="mood-${checkInData.mood}"]`);
  await page.fill('[data-testid="mood-description"]', checkInData.description);
  
  // Select activities
  for (const activity of checkInData.activities) {
    await page.check(`[data-testid="activity-${activity}"]`);
  }
  
  await page.click(`[data-testid="sleep-rating-${checkInData.sleepRating}"]`);
  await page.click('[data-testid="submit-checkin"]');
  
  await expect(page.locator('[data-testid="checkin-success-message"]')).toBeVisible();
}

// Navigation helpers
export async function navigateToSection(page: Page, section: string): Promise<void> {
  await page.click(`[data-testid="nav-${section}"]`);
  await expect(page).toHaveURL(new RegExp(`/${section}`));
}

// Wait for element helpers
export async function waitForLoadingToComplete(page: Page): Promise<void> {
  // Wait for common loading indicators to disappear
  await page.waitForLoadState('networkidle');
  
  // Wait for any loading spinners to disappear
  const loadingSelectors = [
    '[data-testid="loading-spinner"]',
    '[data-testid="page-loader"]',
    '.loading',
    '.spinner'
  ];
  
  for (const selector of loadingSelectors) {
    try {
      await page.waitForSelector(selector, { state: 'hidden', timeout: 5000 });
    } catch {
      // Ignore timeout errors - element might not exist
    }
  }
}

// Role-based access control testing helpers
export async function verifyAccessDenied(page: Page, unauthorizedUrl: string): Promise<void> {
  await page.goto(unauthorizedUrl);
  await expect(page).toHaveURL('/access-denied');
  await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission to access this area');
}

export async function verifyRoleBasedAccess(page: Page, role: 'patient' | 'provider' | 'supporter'): Promise<void> {
  const roleUrls = {
    patient: ['/patient/dashboard', '/patient/checkin', '/patient/peer-support'],
    provider: ['/provider/dashboard', '/provider/patients', '/provider/analytics'],
    supporter: ['/supporter/dashboard', '/supporter/supported-persons', '/supporter/messages']
  };
  
  const unauthorizedRoles = Object.keys(roleUrls).filter(r => r !== role) as Array<keyof typeof roleUrls>;
  
  // Test access to unauthorized areas
  for (const unauthorizedRole of unauthorizedRoles) {
    for (const url of roleUrls[unauthorizedRole]) {
      await verifyAccessDenied(page, url);
      
      // Navigate back to authorized dashboard
      await page.click('[data-testid="return-to-dashboard"]');
      await expect(page).toHaveURL(`/${role}/dashboard`);
    }
  }
}

// Message and communication helpers
export async function sendMessage(page: Page, recipient: string, subject: string, content: string): Promise<void> {
  await page.click('[data-testid="compose-message"]');
  await expect(page.locator('[data-testid="compose-modal"]')).toBeVisible();
  
  await page.selectOption('[data-testid="select-recipient"]', recipient);
  await page.fill('[data-testid="message-subject"]', subject);
  await page.fill('[data-testid="message-content"]', content);
  await page.click('[data-testid="send-message"]');
  
  await expect(page.locator('[data-testid="message-sent-success"]')).toBeVisible();
}

// Crisis alert helpers
export async function triggerCrisisAlert(page: Page, message: string, includeLocation = true): Promise<void> {
  await page.click('[data-testid="crisis-support-button"]');
  await page.click('[data-testid="contact-supporter"]');
  
  if (includeLocation) {
    await page.check('[data-testid="send-location-toggle"]');
  }
  
  await page.fill('[data-testid="crisis-message"]', message);
  await page.click('[data-testid="send-crisis-alert"]');
  
  await expect(page.locator('[data-testid="alert-sent-confirmation"]')).toBeVisible();
}

// Form filling helpers
export async function fillProfileForm(page: Page, userType: 'patient' | 'provider' | 'supporter', data: any): Promise<void> {
  const fieldMappings = {
    patient: {
      name: 'patient-name',
      phone: 'phone-number',
      age: 'age'
    },
    provider: {
      name: 'provider-name',
      specialty: 'specialty',
      license: 'license-number',
      phone: 'phone-number'
    },
    supporter: {
      name: 'supporter-name',
      relationship: 'relationship',
      phone: 'phone-number'
    }
  };
  
  const fields = fieldMappings[userType];
  
  for (const [key, testId] of Object.entries(fields)) {
    if (data[key]) {
      await page.fill(`[data-testid="${testId}"]`, data[key]);
    }
  }
  
  await page.click('[data-testid="save-profile"]');
  await expect(page.locator('[data-testid="profile-updated-success"]')).toBeVisible();
}

// Screenshot helpers for debugging
export async function takeDebugScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `tests/screenshots/debug-${name}-${Date.now()}.png` });
}

// Error handling helpers
export async function handleExpectedError(page: Page, errorMessage: string): Promise<void> {
  await expect(page.locator('[data-testid="error-message"]')).toContainText(errorMessage);
  await page.click('[data-testid="dismiss-error"]');
}

// Wait for real-time updates (useful for testing live features)
export async function waitForRealtimeUpdate(page: Page, selector: string, timeout = 10000): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

// Mobile-specific helpers (for responsive testing)
export async function setMobileViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE dimensions
}

export async function setTabletViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 768, height: 1024 }); // iPad dimensions
}

export async function setDesktopViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop HD
}