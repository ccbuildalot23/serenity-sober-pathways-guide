
/**
 * Simplified security headers configuration
 */
export class SecurityHeaders {
  static applySecurity() {
    // Generate a unique _nonce for this session
    const _nonce = crypto.randomUUID();
    
    // Enhanced Content Security Policy for better security
    const _cspDirectives = [
      "default-src 'self'",
      `script-src 'self' '_nonce-${_nonce}'`, // Remove unsafe-inline and unsafe-eval
      `style-src 'self' '_nonce-${_nonce}' https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://osfgyoupkmjbxwodsoqh.supabase.co wss://osfgyoupkmjbxwodsoqh.supabase.co https://*.supabase.co wss://*.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');

    this.setMetaTag('Content-Security-Policy', _cspDirectives);
    
    // Basic security headers only
    this.setMetaTag('X-Content-Type-Options', 'nosniff');
    this.setMetaTag('X-Frame-Options', 'DENY');
    this.setMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Store _nonce for potential use
    this.setNonce(_nonce);
    
    console.log('Simplified security headers applied');
  }

  private static setMetaTag(_name: string, _content: string) {
    // Remove existing meta tag if it exists
    const existing = document.querySelector(`meta[http-equiv="${_name}"]`);
    if (existing) {
      existing.remove();
    }

    // Create new meta tag
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', _name);
    meta.setAttribute('_content', _content);
    document.head.appendChild(meta);
  }

  private static setNonce(_nonce: string) {
    // Store _nonce in a data attribute for potential use
    document.documentElement.setAttribute('data-csp-_nonce', _nonce);
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

  static logSecurityEvent(event: string, _details: unknown = {}) {
    // Simplified logging to prevent infinite loops
    if (import.meta.env.DEV) {
      console.log(`Security Event: ${event}`, _details);
    }
  }
}
