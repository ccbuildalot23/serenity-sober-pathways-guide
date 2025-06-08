/**
 * Enhanced security headers configuration
 * Implements comprehensive CSP and other security measures
 */
export class SecurityHeaders {
  static applySecurity() {
    // Generate a unique nonce for this session
    const nonce = crypto.randomUUID();
    
    // Content Security Policy - Enhanced with stricter controls
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'strict-dynamic'", // Enhanced with strict-dynamic
      `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`, // Nonce-based styles
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

    // Apply enhanced CSP via meta tag
    this.setMetaTag('Content-Security-Policy', cspDirectives);
    
    // Enhanced security headers
    this.setMetaTag('X-Content-Type-Options', 'nosniff');
    this.setMetaTag('X-Frame-Options', 'DENY');
    this.setMetaTag('X-XSS-Protection', '1; mode=block');
    this.setMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
    this.setMetaTag('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    
    // Enhanced Cross-Origin policies
    this.setMetaTag('Cross-Origin-Embedder-Policy', 'require-corp');
    this.setMetaTag('Cross-Origin-Opener-Policy', 'same-origin');
    this.setMetaTag('Cross-Origin-Resource-Policy', 'cross-origin');

    // Strict Transport Security (HSTS) for production HTTPS
    if (window.location.protocol === 'https:') {
      this.setMetaTag('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Enhanced cache control for sensitive pages
    if (window.location.pathname.includes('/auth') || window.location.pathname.includes('/crisis')) {
      this.setMetaTag('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      this.setMetaTag('Pragma', 'no-cache');
      this.setMetaTag('Expires', '0');
    }

    // Store nonce for potential use in dynamic content
    this.setNonce(nonce);
    
    console.log('Enhanced security headers applied successfully with nonce:', nonce);
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

  private static setNonce(nonce: string) {
    // Store nonce in a data attribute for potential use
    document.documentElement.setAttribute('data-csp-nonce', nonce);
  }

  static validateEnvironment() {
    // Enhanced environment validation
    const sensitiveKeys = ['ENCRYPTION_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'PRIVATE_KEY'];
    
    sensitiveKeys.forEach(key => {
      if (import.meta.env[`VITE_${key}`]) {
        console.error(`CRITICAL SECURITY WARNING: ${key} should NEVER be exposed to client-side code`);
        this.logSecurityEvent('SENSITIVE_KEY_EXPOSED', { key });
      }
    });

    // Enhanced Supabase configuration validation
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.warn('Supabase configuration incomplete - some features may not work');
      this.logSecurityEvent('INCOMPLETE_CONFIG');
    }

    // Validate URL format
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
      console.warn('Supabase URL format may be incorrect');
      this.logSecurityEvent('INVALID_SUPABASE_URL_FORMAT');
    }

    // Check for secure context in production
    if (import.meta.env.PROD && !this.isSecureContext()) {
      console.error('SECURITY WARNING: Application should run over HTTPS in production');
      this.logSecurityEvent('PRODUCTION_INSECURE_CONTEXT');
    }

    // Enhanced development environment checks
    if (import.meta.env.DEV) {
      // Check for common development security issues
      if (window.location.hostname !== 'localhost' && window.location.protocol !== 'https:') {
        console.warn('Development environment detected with non-localhost HTTP');
        this.logSecurityEvent('DEV_INSECURE_REMOTE');
      }
    }
  }

  static sanitizeUserInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Enhanced XSS prevention with additional vectors
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/=/g, '&#x3D;')
      .replace(/`/g, '&#x60;')
      .replace(/\(/g, '&#x28;')
      .replace(/\)/g, '&#x29;')
      .replace(/\{/g, '&#x7B;')
      .replace(/\}/g, '&#x7D;')
      .replace(/\[/g, '&#x5B;')
      .replace(/\]/g, '&#x5D;')
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
    const securityEvent = {
      event,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100),
      url: window.location.href,
      referrer: document.referrer || 'direct',
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      ...details
    };

    console.log(`Security Event: ${event}`, securityEvent);
    
    // Store security events for potential analysis
    try {
      const securityLogs = JSON.parse(localStorage.getItem('security_events') || '[]');
      securityLogs.push(securityEvent);
      
      // Keep only last 50 events to prevent storage bloat
      if (securityLogs.length > 50) {
        securityLogs.splice(0, securityLogs.length - 50);
      }
      
      localStorage.setItem('security_events', JSON.stringify(securityLogs));
    } catch (error) {
      console.warn('Could not store security event:', error);
    }
  }

  static getSecurityEvents(): any[] {
    try {
      return JSON.parse(localStorage.getItem('security_events') || '[]');
    } catch (error) {
      console.warn('Could not retrieve security events:', error);
      return [];
    }
  }

  static clearSecurityEvents(): void {
    localStorage.removeItem('security_events');
    this.logSecurityEvent('SECURITY_EVENTS_CLEARED');
  }
}
