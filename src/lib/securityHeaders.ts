
/**
 * Simplified security headers configuration
 */
export class SecurityHeaders {
  static applySecurity() {
    // Enhanced Content Security Policy for better security
    const _cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: https://vercel.live",
      "connect-src 'self' https://tqyiqstpvwztvofrxpuf.supabase.co wss://tqyiqstpvwztvofrxpuf.supabase.co https://*.supabase.co wss://*.supabase.co https://api.ipify.org https://vercel.live https://api.vercel.com",
      "frame-src 'self' https://vercel.live",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ');

    this.setMetaTag('Content-Security-Policy', _cspDirectives);
    
    // Basic security headers only
    this.setMetaTag('X-Content-Type-Options', 'nosniff');
    this.setMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    console.log('Simplified security headers applied');
  }

  private static setMetaTag(name: string, content: string) {
    const existing = document.querySelector(`meta[http-equiv="${name}"]`);
    if (existing) {
      existing.remove();
    }

    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', name);
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  }

  private static setNonce(nonce: string) {
    document.documentElement.setAttribute('data-csp-nonce', nonce);
  }

  static validateEnvironment(): boolean {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.error('Missing required environment variables for Supabase');
      return false;
    }
    return true;
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
