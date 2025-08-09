import { defineConfig, devices } from '@playwright/test';

/**
 * Serenity App E2E Test Configuration
 * 
 * This configuration supports testing across three user journey types:
 * - Patient Journey: Daily check-ins, crisis support, peer support, community features
 * - Provider Journey: Patient management, analytics, care plans
 * - Supporter Journey: Crisis alerts, messaging, location sharing
 * 
 * Test Credentials (to be created in Supabase):
 * - Patient: test-patient@serenity.com / TestPass123!
 * - Provider: test-provider@serenity.com / TestPass123!
 * - Supporter: test-supporter@serenity.com / TestPass123!
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:8080',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on retry */
    video: process.env.CI ? 'off' : 'retain-on-failure',
    
    /* Global timeout for each test */
    actionTimeout: 10000,
    
    /* Global timeout for each assertion */
    expect: {
      timeout: 5000,
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports for crisis scenarios */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Global setup and teardown */
  globalSetup: './tests/utils/global-setup.ts',
  globalTeardown: './tests/utils/global-teardown.ts',

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI
    ? {
        command: 'npm run preview',
        url: 'http://localhost:8080',
        reuseExistingServer: false,
        timeout: 120000,
      }
    : {
        command: 'npm run dev',
        url: 'http://localhost:8080',
        reuseExistingServer: true,
        timeout: 120000,
      },

  /* Test timeout */
  timeout: 30000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Test output directory */
  outputDir: 'test-results/',

  /* Maximum number of failures */
  maxFailures: process.env.CI ? 5 : undefined,
});