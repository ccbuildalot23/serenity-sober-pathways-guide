
/**
 * Enhanced security headers configuration
 * Implements comprehensive CSP and other security measures
 */
export class SecurityHeaders {
  static applySecurity() {
    // Content Security Policy - Strict security policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval'", // Required for Vite dev mode
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Required for Tailwind and Google Fonts
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://tqyiqstpvwztvofrxpuf.supabase.co wss://tqyiqstpvwztvofrxpuf.supabase.co https://api.openai.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');

    // Apply CSP via meta tag
    this.setMetaTag('Content-Security-Policy', cspDirectives);
    
    // Additional security headers via meta tags
    this.setMetaTag('X-Content-Type-Options', 'nosniff');
    this.setMetaTag('X-Frame-Options', 'DENY');
    this.setMetaTag('X-XSS-Protection', '1; mode=block');
    this.setMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
    this.setMetaTag('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Disable client-side caching for sensitive pages
    if (window.location.pathname.includes('/auth') || window.location.pathname.includes('/crisis')) {
      this.setMetaTag('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      this.setMetaTag('Pragma', 'no-cache');
      this.setMetaTag('Expires', '0');
    }

    console.log('Security headers applied successfully');
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
    const sensitiveKeys = ['ENCRYPTION_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'];
    
    sensitiveKeys.forEach(key => {
      if (import.meta.env[`VITE_${key}`]) {
        console.error(`Security Warning: ${key} should not be exposed to client-side code`);
      }
    });

    // Validate Supabase configuration
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.warn('Supabase configuration incomplete - some features may not work');
    }
  }

  static sanitizeUserInput(input: string): string {
    // Basic XSS prevention
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  static isSecureContext(): boolean {
    return window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  }
}
