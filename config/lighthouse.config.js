/**
 * Lighthouse CI Configuration for Serenity Sober Pathways Guide
 * 
 * This configuration ensures consistent performance, accessibility,
 * and best practices auditing for our HIPAA-compliant mental health platform.
 */

export default {
  ci: {
    collect: {
      // URLs will be dynamically set by GitHub Actions
      numberOfRuns: 3,
      settings: {
        // Chrome flags for CI environment
        chromeFlags: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--ignore-certificate-errors'
        ],
        
        // Desktop preset for consistent testing
        preset: 'desktop',
        
        // Throttling settings for realistic performance testing
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        
        // Additional collection settings
        skipAudits: [
          'canonical',          // Skip if not applicable
          'robots-txt',         // Skip if using robots meta tag
          'offline-start-url',  // Skip PWA audit if not applicable
          'apple-touch-icon'    // Skip if not needed
        ],
        
        // Extend default timeout for complex pages
        maxWaitForLoad: 45000,
        maxWaitForFcp: 15000,
        
        // Form factor and device emulation
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        }
      }
    },
    
    assert: {
      assertions: {
        // Core category thresholds
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.95 }], // Strict for HIPAA compliance
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'categories:pwa': 'off', // Disable PWA checks for now
        
        // === CORE WEB VITALS ===
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        
        // === ACCESSIBILITY (CRITICAL for HIPAA compliance) ===
        'color-contrast': 'error',
        'heading-order': 'error',
        'html-has-lang': 'error',
        'html-lang-valid': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'list': 'error',
        'listitem': 'error',
        'aria-valid-attr': 'error',
        'aria-valid-attr-value': 'error',
        'button-name': 'error',
        'form-field-multiple-labels': 'error',
        'frame-title': 'error',
        'input-image-alt': 'error',
        'focus-traps': 'error',
        'focusable-controls': 'error',
        'keyboard-navigation': 'error',
        'aria-required-attr': 'error',
        'aria-roles': 'error',
        'aria-valid-attr-value': 'error',
        'duplicate-id-aria': 'error',
        'duplicate-id-active': 'error',
        
        // === SECURITY & BEST PRACTICES ===
        'uses-https': 'error',
        'no-vulnerable-libraries': 'warn',
        'csp-xss': 'warn',
        'errors-in-console': 'warn',
        'geolocation-on-start': 'error',
        'notification-on-start': 'error',
        'no-unload-listeners': 'warn',
        'uses-rel-preconnect': 'warn',
        'uses-rel-preload': 'warn',
        
        // === PERFORMANCE OPTIMIZATIONS ===
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'uses-webp-images': 'warn',
        'uses-text-compression': 'warn',
        'uses-responsive-images': 'warn',
        'efficient-animated-content': 'warn',
        'offscreen-images': 'warn',
        'render-blocking-resources': 'warn',
        'unminified-css': 'warn',
        'unminified-javascript': 'warn',
        'uses-long-cache-ttl': 'warn',
        'uses-rel-preconnect': 'warn',
        'font-display': 'warn',
        
        // === SEO ===
        'document-title': 'error',
        'meta-description': 'warn',
        'http-status-code': 'error',
        'link-text': 'warn',
        'is-crawlable': 'warn',
        'hreflang': 'warn',
        'plugins': 'error',
        
        // === MENTAL HEALTH PLATFORM SPECIFIC ===
        // Ensure privacy and security for sensitive content
        'no-vulnerable-libraries': 'error',
        'csp-xss': 'error'
      }
    },
    
    upload: {
      target: 'temporary-public-storage',
      reportFilenamePattern: 'lighthouse-%%PATHNAME%%-%%DATETIME%%.report.html'
    },
    
    server: {
      // Configuration for local testing
      port: 9001,
      storage: '.lighthouseci'
    }
  }
};

// For CommonJS compatibility (used by LHCI)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ci: {
      collect: {
        numberOfRuns: 3,
        settings: {
          chromeFlags: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--ignore-certificate-errors'
          ],
          preset: 'desktop',
          throttling: {
            rttMs: 40,
            throughputKbps: 10240,
            cpuSlowdownMultiplier: 1,
            requestLatencyMs: 0,
            downloadThroughputKbps: 0,
            uploadThroughputKbps: 0
          },
          skipAudits: [
            'canonical',
            'robots-txt',
            'offline-start-url',
            'apple-touch-icon'
          ],
          maxWaitForLoad: 45000,
          maxWaitForFcp: 15000,
          formFactor: 'desktop',
          screenEmulation: {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false,
          }
        }
      },
      assert: {
        assertions: {
          'categories:performance': ['warn', { minScore: 0.8 }],
          'categories:accessibility': ['error', { minScore: 0.95 }],
          'categories:best-practices': ['warn', { minScore: 0.9 }],
          'categories:seo': ['warn', { minScore: 0.9 }],
          'categories:pwa': 'off',
          'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
          'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
          'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          'total-blocking-time': ['warn', { maxNumericValue: 300 }],
          'speed-index': ['warn', { maxNumericValue: 3400 }],
          'color-contrast': 'error',
          'heading-order': 'error',
          'html-has-lang': 'error',
          'html-lang-valid': 'error',
          'image-alt': 'error',
          'label': 'error',
          'link-name': 'error',
          'list': 'error',
          'listitem': 'error',
          'aria-valid-attr': 'error',
          'aria-valid-attr-value': 'error',
          'button-name': 'error',
          'form-field-multiple-labels': 'error',
          'frame-title': 'error',
          'input-image-alt': 'error',
          'focus-traps': 'error',
          'focusable-controls': 'error',
          'keyboard-navigation': 'error',
          'aria-required-attr': 'error',
          'aria-roles': 'error',
          'duplicate-id-aria': 'error',
          'duplicate-id-active': 'error',
          'uses-https': 'error',
          'no-vulnerable-libraries': 'warn',
          'csp-xss': 'warn',
          'errors-in-console': 'warn',
          'geolocation-on-start': 'error',
          'notification-on-start': 'error',
          'no-unload-listeners': 'warn',
          'uses-rel-preconnect': 'warn',
          'uses-rel-preload': 'warn',
          'unused-css-rules': 'warn',
          'unused-javascript': 'warn',
          'modern-image-formats': 'warn',
          'uses-optimized-images': 'warn',
          'uses-webp-images': 'warn',
          'uses-text-compression': 'warn',
          'uses-responsive-images': 'warn',
          'efficient-animated-content': 'warn',
          'offscreen-images': 'warn',
          'render-blocking-resources': 'warn',
          'unminified-css': 'warn',
          'unminified-javascript': 'warn',
          'uses-long-cache-ttl': 'warn',
          'font-display': 'warn',
          'document-title': 'error',
          'meta-description': 'warn',
          'http-status-code': 'error',
          'link-text': 'warn',
          'is-crawlable': 'warn',
          'hreflang': 'warn',
          'plugins': 'error'
        }
      },
      upload: {
        target: 'temporary-public-storage',
        reportFilenamePattern: 'lighthouse-%%PATHNAME%%-%%DATETIME%%.report.html'
      },
      server: {
        port: 9001,
        storage: '.lighthouseci'
      }
    }
  };
}