export default {
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "chromeFlags": [
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-web-security",
          "--allow-running-insecure-content",
          "--disable-features=TranslateUI",
          "--disable-ipc-flooding-protection",
          "--ignore-certificate-errors"
        ],
        "preset": "desktop",
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240,
          "cpuSlowdownMultiplier": 1,
          "requestLatencyMs": 0,
          "downloadThroughputKbps": 0,
          "uploadThroughputKbps": 0
        },
        "skipAudits": [
          "canonical",
          "robots-txt",
          "offline-start-url",
          "apple-touch-icon"
        ],
        "maxWaitForLoad": 45000,
        "maxWaitForFcp": 15000,
        "formFactor": "desktop",
        "screenEmulation": {
          "mobile": false,
          "width": 1350,
          "height": 940,
          "deviceScaleFactor": 1,
          "disabled": false
        }
      },
      "url": [
        "http://localhost:5173"
      ]
    },
    "assert": {
      "assertions": {
        "categories:performance": [
          "error",
          {
            "minScore": 0.9
          }
        ],
        "categories:accessibility": [
          "error",
          {
            "minScore": 0.95
          }
        ],
        "categories:best-practices": [
          "warn",
          {
            "minScore": 0.9
          }
        ],
        "categories:seo": [
          "warn",
          {
            "minScore": 0.9
          }
        ],
        "categories:pwa": "off",
        "largest-contentful-paint": [
          "error",
          {
            "maxNumericValue": 2500
          }
        ],
        "interaction-to-next-paint": [
          "error",
          {
            "maxNumericValue": 200
          }
        ],
        "first-contentful-paint": [
          "error",
          {
            "maxNumericValue": 1800
          }
        ],
        "cumulative-layout-shift": [
          "error",
          {
            "maxNumericValue": 0.1
          }
        ],
        "total-blocking-time": [
          "error",
          {
            "maxNumericValue": 300
          }
        ],
        "interactive": [
          "error",
          {
            "maxNumericValue": 3000
          }
        ],
        "speed-index": [
          "warn",
          {
            "maxNumericValue": 3400
          }
        ],
        "color-contrast": "error",
        "heading-order": "error",
        "html-has-lang": "error",
        "html-lang-valid": "error",
        "image-alt": "error",
        "label": "error",
        "link-name": "error",
        "list": "error",
        "listitem": "error",
        "aria-valid-attr": "error",
        "aria-valid-attr-value": "error",
        "button-name": "error",
        "form-field-multiple-labels": "error",
        "frame-title": "error",
        "input-image-alt": "error",
        "focus-traps": "error",
        "focusable-controls": "error",
        "keyboard-navigation": "error",
        "aria-required-attr": "error",
        "aria-roles": "error",
        "duplicate-id-aria": "error",
        "duplicate-id-active": "error",
        "uses-https": "error",
        "no-vulnerable-libraries": "error",
        "csp-xss": "error",
        "errors-in-console": "warn",
        "geolocation-on-start": "error",
        "notification-on-start": "error",
        "no-unload-listeners": "warn",
        "uses-rel-preconnect": "warn",
        "uses-rel-preload": "warn",
        "unused-css-rules": "warn",
        "unused-javascript": "warn",
        "modern-image-formats": "warn",
        "uses-optimized-images": "warn",
        "uses-webp-images": "warn",
        "uses-text-compression": "warn",
        "uses-responsive-images": "warn",
        "efficient-animated-content": "warn",
        "offscreen-images": "warn",
        "render-blocking-resources": "warn",
        "unminified-css": "warn",
        "unminified-javascript": "warn",
        "uses-long-cache-ttl": "warn",
        "font-display": "warn",
        "document-title": "error",
        "meta-description": "warn",
        "http-status-code": "error",
        "link-text": "warn",
        "is-crawlable": "warn",
        "hreflang": "warn",
        "plugins": "error"
      }
    },
    "upload": {
      "target": "temporary-public-storage",
      "reportFilenamePattern": "lighthouse-%%PATHNAME%%-%%DATETIME%%.report.html"
    },
    "server": {
      "port": 9001,
      "storage": ".lighthouseci"
    }
  }
};