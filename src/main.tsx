
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SecurityHeaders } from "./lib/securityHeaders";
import { SecureMonitoring } from "./lib/secureMonitoring";

// Apply enhanced security headers and validate environment on app start
SecurityHeaders.applySecurity();
SecurityHeaders.validateEnvironment();

// Initialize security monitoring
SecureMonitoring.monitorConsoleAccess();
SecureMonitoring.trackPageAccess();

// Additional security checks
if (!SecurityHeaders.isSecureContext()) {
  console.warn('Application is not running in a secure context. Some features may be limited.');
  SecurityHeaders.logSecurityEvent('INSECURE_CONTEXT', { 
    protocol: window.location.protocol,
    hostname: window.location.hostname 
  });
}

// Enhanced security measures for production
if (import.meta.env.PROD) {
  // Disable right-click context menu in production
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    SecurityHeaders.logSecurityEvent('CONTEXT_MENU_BLOCKED');
  });
  
  // Disable common developer shortcuts in production
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J')) {
      e.preventDefault();
      SecurityHeaders.logSecurityEvent('DEV_TOOLS_BLOCKED', { key: e.key });
    }
  });

  // Enhanced console warning
  setTimeout(() => {
    console.clear();
    console.log('%cSECURITY NOTICE', 'color: red; font-size: 24px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);');
    console.log('%cThis is a browser feature intended for developers.', 'color: red; font-size: 16px; font-weight: bold;');
    console.log('%cDo not paste any code here that you do not understand.', 'color: red; font-size: 16px; font-weight: bold;');
    console.log('%cScammers may try to trick you into running malicious code.', 'color: red; font-size: 14px;');
    console.log('%cIf someone told you to copy/paste something here, it is likely a scam.', 'color: red; font-size: 14px;');
  }, 1000);
}

// Enhanced cleanup of potentially sensitive data from localStorage
const sensitivePatterns = ['debug', 'test', 'admin', 'dev', 'temp', 'cache', 'token', 'key', 'secret'];
sensitivePatterns.forEach(pattern => {
  Object.keys(localStorage).forEach(key => {
    if (key.toLowerCase().includes(pattern) && 
        !key.includes('security_') && // Preserve our security monitoring data
        !key.startsWith('supabase.auth.')) { // Preserve auth data
      localStorage.removeItem(key);
      SecurityHeaders.logSecurityEvent('SENSITIVE_STORAGE_CLEANED', { key });
    }
  });
});

// Enhanced monitoring for suspicious activity
let rapidKeyPresses = 0;
let rapidClicks = 0;
let unusualNavigation = 0;

document.addEventListener('keydown', () => {
  rapidKeyPresses++;
  setTimeout(() => rapidKeyPresses--, 1000);
  if (rapidKeyPresses > 30) {
    SecureMonitoring.trackSuspiciousActivity('RAPID_KEY_PRESSES', { count: rapidKeyPresses });
  }
});

document.addEventListener('click', () => {
  rapidClicks++;
  setTimeout(() => rapidClicks--, 1000);
  if (rapidClicks > 20) {
    SecureMonitoring.trackSuspiciousActivity('RAPID_CLICKS', { count: rapidClicks });
  }
});

// Monitor for unusual navigation patterns
let lastNavigationTime = Date.now();
window.addEventListener('popstate', () => {
  const now = Date.now();
  if (now - lastNavigationTime < 100) {
    unusualNavigation++;
    if (unusualNavigation > 10) {
      SecureMonitoring.trackSuspiciousActivity('UNUSUAL_NAVIGATION', { count: unusualNavigation });
    }
  }
  lastNavigationTime = now;
});

// Monitor page visibility changes for potential security analysis
document.addEventListener('visibilitychange', () => {
  SecurityHeaders.logSecurityEvent('PAGE_VISIBILITY_CHANGE', {
    hidden: document.hidden,
    visibilityState: document.visibilityState
  });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
