import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
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
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:8080',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },

                /* Test files to include - ONLY MVP and HIPAA tests */
              testMatch: [
                '**/simple-test.spec.ts',
                '**/login-test.spec.ts', 
                '**/auth-reset.spec.ts',
                '**/patient-journey.spec.ts',
                '**/provider-journey.spec.ts',
                '**/supporter-journey.spec.ts',
                '**/crisis-support.spec.ts',
                '**/patient-profile.spec.ts',
                '**/hipaa-compliance.spec.ts',
                '**/basic-checkin.spec.ts',
                '**/simple-checkin-test.spec.ts',
                '**/debug-checkin-route.spec.ts',
                '**/debug-full-checkin.spec.ts',
                '**/debug-supporter-login.spec.ts',
              ],

  /* Exclude SOC 2, NIST, and other advanced compliance tests */
  testIgnore: [
    '**/soc2-compliance.spec.ts',
    '**/nist-cybersecurity.spec.ts',
    '**/accessibility-compliance.spec.ts',
    '**/clinical-workflows.spec.ts',
    '**/realtime-communication.spec.ts',
    '**/debug-checkin.spec.ts',
    '**/debug-checkin.spec.ts',
  ],
});
