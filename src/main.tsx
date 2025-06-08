
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SecurityHeaders } from "./lib/securityHeaders";

// Apply security headers and validate environment on app start
SecurityHeaders.applySecurity();
SecurityHeaders.validateEnvironment();

// Additional security checks
if (!SecurityHeaders.isSecureContext()) {
  console.warn('Application is not running in a secure context. Some features may be limited.');
}

// Disable right-click context menu in production for additional security
if (import.meta.env.PROD) {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  
  // Disable common developer shortcuts in production
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'U')) {
      e.preventDefault();
    }
  });
}

// Clear any potentially sensitive data from localStorage on app start
const sensitiveKeys = ['debug', 'test', 'admin'];
sensitiveKeys.forEach(key => {
  Object.keys(localStorage).forEach(storageKey => {
    if (storageKey.toLowerCase().includes(key)) {
      localStorage.removeItem(storageKey);
    }
  });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
