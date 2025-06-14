
/**
 * Simplified security headers configuration
 */
export class SecurityHeaders {
  static applySecurity() {
    // Generate a unique nonce for this session
    const nonce = crypto.randomUUID();
    
    // Simplified Content Security Policy that won't block the UI
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // More permissive for development
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://tqyiqstpvwztvofrxpuf.supabase.co wss://tqyiqstpvwztvofrxpuf.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ');

    this.setMetaTag('Content-Security-Policy', cspDirectives);
    
    // Basic security headers only
    this.setMetaTag('X-Content-Type-Options', 'nosniff');
    this.setMetaTag('X-Frame-Options', 'DENY');
    this.setMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Store nonce for potential use
    this.setNonce(nonce);
    
    console.log('Simplified security headers applied');
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
    // Basic environment validation without excessive logging
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
    
    // Basic XSS prevention
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
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
    // Simplified logging to prevent infinite loops
    if (import.meta.env.DEV) {
      console.log(`Security Event: ${event}`, details);
    }
  }
}
