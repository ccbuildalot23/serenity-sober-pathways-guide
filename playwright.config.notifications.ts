import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Playwright configuration specifically for notification system tests
 * Includes special setup for mock services and extended timeouts
 */
export default defineConfig({
  testDir: './tests/e2e/notifications',
  outputDir: './test-results/notification-tests',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: './playwright-report/notifications' }],
    ['json', { outputFile: './test-results/notification-test-results.json' }],
    ['junit', { outputFile: './test-results/notification-test-results.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],
  
  // Global setup and teardown
  globalSetup: resolve(__dirname, './tests/utils/notification-global-setup.ts'),
  globalTeardown: resolve(__dirname, './tests/utils/notification-global-teardown.ts'),
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Extended timeouts for notification tests
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,
    
    // Additional context options for notification tests
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    },
    
    // Viewport size
    viewport: { width: 1280, height: 720 }
  },

  // Test timeout increased for notification system tests
  timeout: 60000, // 60 seconds
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  // Configure projects for major browsers
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*\.spec\.ts/,
      // Skip Firefox for performance tests due to different timing characteristics
      testIgnore: /performance.*\.spec\.ts/
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /.*\.spec\.ts/,
      // Skip WebKit for some tests that require Chrome-specific APIs
      testIgnore: [
        /performance.*\.spec\.ts/,
        /websocket.*\.spec\.ts/ // WebSocket tests may have different behavior in WebKit
      ]
    },

    // Mobile devices for notification testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: [
        /multi-channel.*\.spec\.ts/,
        /whatsapp.*\.spec\.ts/,
        /crisis.*\.spec\.ts/
      ]
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: [
        /multi-channel.*\.spec\.ts/,
        /crisis.*\.spec\.ts/
      ],
      // Skip WhatsApp tests on iOS Safari due to different behavior
      testIgnore: /whatsapp.*\.spec\.ts/
    },

    // API testing project
    {
      name: 'api',
      testMatch: /api.*\.spec\.ts/,
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000'
      }
    },

    // Performance testing project with specific configuration
    {
      name: 'performance',
      testMatch: /performance.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Performance tests should run in isolation
        channel: 'chrome',
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-extensions'
          ]
        }
      },
      timeout: 300000, // 5 minutes for performance tests
      retries: 0 // No retries for performance tests
    },

    // Security testing project
    {
      name: 'security',
      testMatch: /security.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Security tests may need special configuration
        extraHTTPHeaders: {
          'X-Test-Security-Mode': 'enabled'
        }
      },
      timeout: 120000, // 2 minutes for security tests
      retries: 1
    }
  ],

  // Web server configuration for local development
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 8080,
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  },

  // Global test configuration
  globalTimeout: process.env.CI ? 1800000 : 3600000, // 30 min on CI, 60 min locally
  
  // Metadata for test reporting
  metadata: {
    testSuite: 'Notification System',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'test'
  }
});