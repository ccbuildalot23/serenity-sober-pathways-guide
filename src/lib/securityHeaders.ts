
/**
 * Enhanced security headers configuration
 * Implements comprehensive CSP and other security measures
 */
export class SecurityHeaders {
  static applySecurity() {
    // Content Security Policy - More restrictive security policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval'", // Required for Vite dev mode only
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Required for Tailwind and Google Fonts
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://tqyiqstpvwztvofrxpuf.supabase.co wss://tqyiqstpvwztvofrxpuf.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "block-all-mixed-content"
    ].join('; ');

    // Apply CSP via meta tag
    this.setMetaTag('Content-Security-Policy', cspDirectives);
    
    // Additional security headers via meta tags
    this.setMetaTag('X-Content-Type-Options', 'nosniff');
    this.setMetaTag('X-Frame-Options', 'DENY');
    this.setMetaTag('X-XSS-Protection', '1; mode=block');
    this.setMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
    this.setMetaTag('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

    // Strict Transport Security (HSTS) for production HTTPS
    if (window.location.protocol === 'https:') {
      this.setMetaTag('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Disable client-side caching for sensitive pages
    if (window.location.pathname.includes('/auth') || window.location.pathname.includes('/crisis')) {
      this.setMetaTag('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      this.setMetaTag('Pragma', 'no-cache');
      this.setMetaTag('Expires', '0');
    }

    console.log('Enhanced security headers applied successfully');
  }

  private static setMetaTag(name: string, content: string) {
    // Remove existing meta tag if it exists
    const existing = document.querySelector(`meta[http-equiv="${name}"]`);
    if (existing) {
      existing.remove();
    }

    // Create new meta tag
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', name);
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  }

  static validateEnvironment() {
    // Ensure no sensitive data is exposed in development
    const sensitiveKeys = ['ENCRYPTION_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'PRIVATE_KEY'];
    
    sensitiveKeys.forEach(key => {
      if (import.meta.env[`VITE_${key}`]) {
        console.error(`CRITICAL SECURITY WARNING: ${key} should NEVER be exposed to client-side code`);
      }
    });

    // Validate Supabase configuration
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.warn('Supabase configuration incomplete - some features may not work');
    }

    // Check for secure context in production
    if (import.meta.env.PROD && !this.isSecureContext()) {
      console.error('SECURITY WARNING: Application should run over HTTPS in production');
    }
  }

  static sanitizeUserInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Enhanced XSS prevention
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/=/g, '&#x3D;')
      .replace(/`/g, '&#x60;')
      .trim()
      .substring(0, 10000); // Prevent extremely long inputs
  }

  static isSecureContext(): boolean {
    return window.isSecureContext || 
           window.location.protocol === 'https:' || 
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  }

  static logSecurityEvent(event: string, details: any = {}) {
    console.log(`Security Event: ${event}`, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100),
      url: window.location.href,
      ...details
    });
  }
}
