
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SecurityHeaders } from "./lib/securityHeaders";

// Apply enhanced security headers and validate environment on app start
SecurityHeaders.applySecurity();
SecurityHeaders.validateEnvironment();

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

  // Clear console in production
  setTimeout(() => {
    console.clear();
    console.log('%cSecurity Notice', 'color: red; font-size: 20px; font-weight: bold;');
    console.log('%cThis is a browser feature intended for developers. Do not paste any code here that you do not understand.', 'color: red; font-size: 14px;');
  }, 1000);
}

// Enhanced cleanup of potentially sensitive data from localStorage
const sensitivePatterns = ['debug', 'test', 'admin', 'dev', 'temp', 'cache'];
sensitivePatterns.forEach(pattern => {
  Object.keys(localStorage).forEach(key => {
    if (key.toLowerCase().includes(pattern)) {
      localStorage.removeItem(key);
      SecurityHeaders.logSecurityEvent('SENSITIVE_STORAGE_CLEANED', { key });
    }
  });
});

// Monitor for suspicious activity
let rapidKeyPresses = 0;
document.addEventListener('keydown', () => {
  rapidKeyPresses++;
  setTimeout(() => rapidKeyPresses--, 1000);
  if (rapidKeyPresses > 20) {
    SecurityHeaders.logSecurityEvent('SUSPICIOUS_ACTIVITY', { rapidKeyPresses });
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
